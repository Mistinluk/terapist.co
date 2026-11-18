"""Birleşik site içi bildirim ve kullanıcılar arası mesajlaşma API'si."""

import re
import time
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import func, or_, select, update

from app.models import (
    Bildirim,
    KonuMesaji,
    Kullanici,
    MesajKonusu,
    Randevu,
    Uzman,
    UzmanEngeli,
)
from app.schemas import (
    MesajKonuOlusturGirdi,
    MesajYanitGirdi,
    YonetimBildirimGonderGirdi,
)
from app.security import (
    AktifKullanici,
    Db,
    Yonetici,
    denetle,
    hiz_siniri,
    istemci,
)
from app.services import ISTANBUL

router = APIRouter(tags=["Bildirimler ve Mesajlar"])

AY_ADLARI = (
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
)

KONU_RE = re.compile(r"[?&]konu=([a-zA-Z0-9-]+)")


def tarih_etiketi(unix_sec: int) -> str:
    dt = datetime.fromtimestamp(unix_sec, ISTANBUL)
    return f"{dt.day} {AY_ADLARI[dt.month - 1]} {dt.hour:02d}:{dt.minute:02d}"


def _konu_id_ayikla(hedef_yol: str) -> str | None:
    match = KONU_RE.search(hedef_yol or "")
    return match.group(1) if match else None


def _kullanici_kimlik_haritasi(
    db: Db, user_ids: set[str]
) -> dict[str, dict[str, str | None]]:
    """Kullanıcı kimliklerini görünen ad, unvan, şehir ve rol ile eşler."""

    clean_ids = {uid for uid in user_ids if uid}
    if not clean_ids:
        return {}

    users = db.scalars(
        select(Kullanici).where(Kullanici.id.in_(clean_ids))
    ).all()
    therapists = db.scalars(
        select(Uzman).where(Uzman.kullanici_id.in_(clean_ids))
    ).all()
    therapist_by_uid = {t.kullanici_id: t for t in therapists}

    result: dict[str, dict[str, str | None]] = {}
    for u in users:
        t = therapist_by_uid.get(u.id)
        if u.rol == "yonetici":
            result[u.id] = {
                "kullanici_id": u.id,
                "uzman_id": t.id if t else None,
                "ad": "Yönetim Ekibi",
                "unvan": "Platform Yönetimi",
                "sehir": t.sehir if t else "",
                "rol": "yonetici",
            }
        elif t:
            result[u.id] = {
                "kullanici_id": u.id,
                "uzman_id": t.id,
                "ad": t.ad,
                "unvan": t.unvan or "Uzman Psikolog",
                "sehir": t.sehir,
                "rol": "uzman",
            }
        else:
            result[u.id] = {
                "kullanici_id": u.id,
                "uzman_id": None,
                "ad": "Uzman Kullanıcı",
                "unvan": "",
                "sehir": "",
                "rol": u.rol,
            }
    return result


def _engelli_uzman_kullanici_idleri(db: Db, user_id: str) -> set[str]:
    """İki yönlü engellenen uzmanların kullanıcı kimliklerini döner."""

    me = db.scalar(select(Uzman).where(Uzman.kullanici_id == user_id))
    if not me:
        return set()
    rows = db.scalars(
        select(UzmanEngeli).where(
            or_(
                UzmanEngeli.engelleyen_uzman_id == me.id,
                UzmanEngeli.engellenen_uzman_id == me.id,
            )
        )
    ).all()
    blocked_therapist_ids = {
        r.engellenen_uzman_id
        if r.engelleyen_uzman_id == me.id
        else r.engelleyen_uzman_id
        for r in rows
    }
    if not blocked_therapist_ids:
        return set()
    return set(
        db.scalars(
            select(Uzman.kullanici_id).where(
                Uzman.id.in_(blocked_therapist_ids)
            )
        ).all()
    )


def bildirim_ekle(
    db: Db,
    *,
    alici_kullanici_id: str,
    tur: str,
    baslik: str,
    mesaj: str,
    hedef_yol: str = "",
    gonderen_kullanici_id: str | None = None,
    randevu_id: str | None = None,
    kaynak_anahtari: str | None = None,
    now: int | None = None,
) -> Bildirim | None:
    """Yeni bildirim ekler; kaynak_anahtari varsa tekilleştirir."""

    if kaynak_anahtari:
        existing = db.scalar(
            select(Bildirim.id).where(
                Bildirim.kaynak_anahtari == kaynak_anahtari
            )
        )
        if existing:
            return None

    item = Bildirim(
        alici_kullanici_id=alici_kullanici_id,
        gonderen_kullanici_id=gonderen_kullanici_id,
        randevu_id=randevu_id,
        tur=tur,
        baslik=baslik[:120],
        mesaj=mesaj[:600],
        hedef_yol=hedef_yol[:200],
        kaynak_anahtari=kaynak_anahtari,
        okundu=False,
        olusturma=now or int(time.time()),
    )
    db.add(item)
    return item


def sistem_hatirlatmalarini_senkronize_et(db: Db, user: Kullanici) -> None:
    """Yaklaşan veya yanıt süresi dolan randevular için otomatik hatırlatma."""

    now = int(time.time())
    changed = False

    if user.rol == "uzman":
        therapist = db.scalar(
            select(Uzman).where(
                Uzman.kullanici_id == user.id, Uzman.arsivli.is_(False)
            )
        )
        if not therapist:
            return
        upcoming = db.scalars(
            select(Randevu)
            .where(
                Randevu.uzman_id == therapist.id,
                Randevu.durum == "onaylandi",
                Randevu.baslangic >= now,
                Randevu.baslangic <= now + 86400,
            )
            .limit(10)
        ).all()
        for booking in upcoming:
            added = bildirim_ekle(
                db,
                alici_kullanici_id=user.id,
                randevu_id=booking.id,
                tur="sistem_hatirlatma",
                baslik="Yaklaşan randevu hatırlatması",
                mesaj=(
                    f"{tarih_etiketi(booking.baslangic)} tarihli onaylı "
                    "randevunuz 24 saat içinde gerçekleşecek."
                ),
                hedef_yol="/panel?sekme=randevular",
                kaynak_anahtari=(
                    f"yaklasan:{booking.id}:{booking.son_talep_zamani or 0}"
                ),
                now=now,
            )
            if added:
                changed = True

        overdue = db.scalars(
            select(Randevu)
            .where(
                Randevu.uzman_id == therapist.id,
                Randevu.durum == "bekliyor",
                func.coalesce(Randevu.son_talep_zamani, Randevu.olusturma)
                <= now - 86400,
            )
            .limit(10)
        ).all()
        for booking in overdue:
            added = bildirim_ekle(
                db,
                alici_kullanici_id=user.id,
                randevu_id=booking.id,
                tur="sistem_hatirlatma",
                baslik="Yanıt bekleyen randevu",
                mesaj=(
                    f"{tarih_etiketi(booking.baslangic)} tarihli randevu "
                    "talebi 24 saati aşkın süredir yanıt bekliyor."
                ),
                hedef_yol="/panel?sekme=randevular",
                kaynak_anahtari=(
                    f"gecikmis_uzman:{booking.id}:"
                    f"{booking.son_talep_zamani or 0}"
                ),
                now=now,
            )
            if added:
                changed = True

    elif user.rol == "yonetici":
        overdue_rows = db.execute(
            select(Randevu, Uzman.ad)
            .join(Uzman, Uzman.id == Randevu.uzman_id)
            .where(
                Randevu.durum == "bekliyor",
                func.coalesce(Randevu.son_talep_zamani, Randevu.olusturma)
                <= now - 86400,
            )
            .limit(10)
        ).all()
        for booking, therapist_name in overdue_rows:
            added = bildirim_ekle(
                db,
                alici_kullanici_id=user.id,
                randevu_id=booking.id,
                tur="sistem_hatirlatma",
                baslik="Yanıtsız randevu uyarısı",
                mesaj=(
                    f"{therapist_name} için "
                    f"{tarih_etiketi(booking.baslangic)} "
                    "tarihli randevu talebi 24 saattir yanıt bekliyor."
                ),
                hedef_yol="/yonetim?sekme=randevular",
                kaynak_anahtari=(
                    f"gecikmis_yonetim:{booking.id}:{user.id}:"
                    f"{booking.son_talep_zamani or 0}"
                ),
                now=now,
            )
            if added:
                changed = True

    if changed:
        db.commit()


@router.get("/bildirimler")
def bildirimleri_listele(user: AktifKullanici, db: Db):
    """Giriş yapmış kullanıcının (yönetici veya terapist) bildirimleri."""

    sistem_hatirlatmalarini_senkronize_et(db, user)

    items = db.scalars(
        select(Bildirim)
        .where(Bildirim.alici_kullanici_id == user.id)
        .order_by(Bildirim.okundu.asc(), Bildirim.olusturma.desc())
        .limit(40)
    ).all()
    unread = db.scalar(
        select(func.count())
        .select_from(Bildirim)
        .where(
            Bildirim.alici_kullanici_id == user.id,
            Bildirim.okundu.is_(False),
        )
    )
    sender_ids = {
        item.gonderen_kullanici_id
        for item in items
        if item.gonderen_kullanici_id
    }
    sender_map = _kullanici_kimlik_haritasi(db, sender_ids)

    kayitlar = []
    for item in items:
        sender_info = (
            sender_map.get(item.gonderen_kullanici_id)
            if item.gonderen_kullanici_id
            else None
        )
        if sender_info:
            gonderen_ad = str(sender_info["ad"] or "Kullanıcı")
            gonderen_rol = str(sender_info["rol"] or "uzman")
        elif item.tur == "admin_notu":
            gonderen_ad = "Yönetim Ekibi"
            gonderen_rol = "yonetici"
        else:
            gonderen_ad = "Sistem"
            gonderen_rol = "sistem"

        kayitlar.append(
            {
                "id": item.id,
                "tur": item.tur,
                "baslik": item.baslik,
                "mesaj": item.mesaj,
                "hedef_yol": item.hedef_yol,
                "randevu_id": item.randevu_id,
                "gonderen_kullanici_id": item.gonderen_kullanici_id,
                "gonderen_ad": gonderen_ad,
                "gonderen_rol": gonderen_rol,
                "konu_id": _konu_id_ayikla(item.hedef_yol),
                "okundu": item.okundu,
                "olusturma": item.olusturma,
            }
        )

    return {
        "okunmamis_sayisi": int(unread or 0),
        "kayitlar": kayitlar,
    }


@router.patch("/bildirimler/{bildirim_id}/okundu", status_code=204)
def bildirim_okundu(bildirim_id: str, user: AktifKullanici, db: Db):
    item = db.scalar(
        select(Bildirim).where(
            Bildirim.id == bildirim_id,
            Bildirim.alici_kullanici_id == user.id,
        )
    )
    if not item:
        raise HTTPException(404, "Bildirim bulunamadı.")
    if not item.okundu:
        item.okundu = True
        item.okunma_zamani = int(time.time())
        db.commit()


@router.post("/bildirimler/tumunu-okundu", status_code=204)
def tum_bildirimleri_okundu_yap(user: AktifKullanici, db: Db):
    now = int(time.time())
    db.execute(
        update(Bildirim)
        .where(
            Bildirim.alici_kullanici_id == user.id,
            Bildirim.okundu.is_(False),
        )
        .values(okundu=True, okunma_zamani=now)
    )
    db.commit()


@router.get("/yonetim/bildirim-hedefleri")
def bildirim_hedefleri(user: Yonetici, db: Db):
    """Yönetici bildirim/mesaj gönderimi için aktif terapist seçenekleri."""

    rows = db.execute(
        select(Uzman.id, Uzman.ad, Uzman.sehir, Uzman.kullanici_id)
        .where(Uzman.arsivli.is_(False))
        .order_by(Uzman.ad)
    ).all()
    return [
        {"id": tid, "ad": tad, "sehir": tsehir, "kullanici_id": tuid}
        for tid, tad, tsehir, tuid in rows
    ]


def _konu_ve_ilk_mesaj_olustur(
    db: Db,
    *,
    gonderen_id: str,
    alici_id: str,
    baslik: str,
    mesaj: str,
    now: int,
) -> MesajKonusu:
    thread = MesajKonusu(
        baslik=baslik[:120],
        katilimci_a_id=gonderen_id,
        katilimci_b_id=alici_id,
        son_mesaj_zamani=now,
        olusturma=now,
    )
    db.add(thread)
    db.flush()
    msg = KonuMesaji(
        konu_id=thread.id,
        gonderen_kullanici_id=gonderen_id,
        alici_kullanici_id=alici_id,
        icerik=mesaj[:2000],
        okundu=False,
        olusturma=now,
    )
    db.add(msg)
    return thread


@router.post("/yonetim/bildirimler", status_code=201)
def yonetim_bildirim_gonder(
    body: YonetimBildirimGonderGirdi, user: Yonetici, db: Db
):
    """Yöneticiden tek terapiste veya tüm terapistlere bildirim/not."""

    now = int(time.time())
    if body.hedef_uzman_id and body.hedef_uzman_id != "tumu":
        therapist = db.scalar(
            select(Uzman).where(
                Uzman.id == body.hedef_uzman_id, Uzman.arsivli.is_(False)
            )
        )
        if not therapist:
            raise HTTPException(404, "Hedef terapist bulunamadı.")
        recipients = [therapist.kullanici_id]
        audit_target = therapist.id
    else:
        recipients = db.scalars(
            select(Uzman.kullanici_id).where(Uzman.arsivli.is_(False))
        ).all()
        audit_target = "tumu"

    sent_count = 0
    for uid in recipients:
        if not uid:
            continue
        target_path = (
            "/panel?sekme=randevular"
            if body.tur == "randevu_hatirlatma"
            else "/panel?sekme=mesajlar"
        )
        if uid != user.id:
            thread = _konu_ve_ilk_mesaj_olustur(
                db,
                gonderen_id=user.id,
                alici_id=uid,
                baslik=body.baslik,
                mesaj=body.mesaj,
                now=now,
            )
            if body.tur == "admin_notu":
                target_path = f"/panel?sekme=mesajlar&konu={thread.id}"
        bildirim_ekle(
            db,
            alici_kullanici_id=uid,
            gonderen_kullanici_id=user.id,
            randevu_id=body.randevu_id,
            tur=body.tur,
            baslik=body.baslik,
            mesaj=body.mesaj,
            hedef_yol=target_path,
            now=now,
        )
        sent_count += 1

    denetle(db, "bildirim.yonetim_gonder", user.id, audit_target)
    db.commit()
    return {"gonderilen": sent_count}


@router.get("/mesajlar/kisiler")
def mesaj_kisileri_listele(user: AktifKullanici, db: Db):
    """Mesaj gönderilebilecek kişileri ve yönetim kanalını döner."""

    blocked_uids = (
        _engelli_uzman_kullanici_idleri(db, user.id)
        if user.rol == "uzman"
        else set()
    )
    rows = db.execute(
        select(
            Uzman.id,
            Uzman.kullanici_id,
            Uzman.ad,
            Uzman.unvan,
            Uzman.sehir,
        )
        .join(Kullanici, Kullanici.id == Uzman.kullanici_id)
        .where(
            Uzman.arsivli.is_(False),
            Kullanici.aktif.is_(True),
            Uzman.kullanici_id != user.id,
        )
        .order_by(Uzman.ad)
    ).all()

    contacts: list[dict[str, str | None]] = []
    if user.rol == "yonetici":
        contacts.append(
            {
                "id": "tumu",
                "kullanici_id": "tumu",
                "uzman_id": None,
                "ad": "Tüm Aktif Terapistler (Toplu Duyuru)",
                "unvan": "Platform Duyurusu",
                "sehir": "",
                "rol": "toplu",
            }
        )
    else:
        contacts.append(
            {
                "id": "yonetim",
                "kullanici_id": "yonetim",
                "uzman_id": None,
                "ad": "Yönetim Ekibi",
                "unvan": "Platform Yönetimi & Destek",
                "sehir": "",
                "rol": "yonetici",
            }
        )

    for tid, tuid, tad, tunvan, tsehir in rows:
        if tuid in blocked_uids:
            continue
        contacts.append(
            {
                "id": tuid,
                "kullanici_id": tuid,
                "uzman_id": tid,
                "ad": tad,
                "unvan": tunvan or "Uzman Psikolog",
                "sehir": tsehir,
                "rol": "uzman",
            }
        )
    return contacts


def _kullanici_konulari_sorgusu(db: Db, user: Kullanici):
    if user.rol == "yonetici":
        admin_ids = set(
            db.scalars(
                select(Kullanici.id).where(Kullanici.rol == "yonetici")
            ).all()
        )
        admin_ids.add(user.id)
        return select(MesajKonusu).where(
            or_(
                MesajKonusu.katilimci_a_id.in_(admin_ids),
                MesajKonusu.katilimci_b_id.in_(admin_ids),
            )
        ), admin_ids
    return (
        select(MesajKonusu).where(
            or_(
                MesajKonusu.katilimci_a_id == user.id,
                MesajKonusu.katilimci_b_id == user.id,
            )
        ),
        {user.id},
    )


@router.get("/mesajlar/konular")
def mesaj_konularini_listele(user: AktifKullanici, db: Db):
    """Kullanıcının mesaj konularını ve okunmamış mesaj sayılarını döner."""

    stmt, self_ids = _kullanici_konulari_sorgusu(db, user)
    threads = db.scalars(
        stmt.order_by(MesajKonusu.son_mesaj_zamani.desc()).limit(60)
    ).all()

    if not threads:
        return {"toplam_okunmamis": 0, "konular": []}

    participant_ids: set[str] = set()
    thread_ids: list[str] = []
    for t in threads:
        thread_ids.append(t.id)
        participant_ids.add(t.katilimci_a_id)
        participant_ids.add(t.katilimci_b_id)

    identity_map = _kullanici_kimlik_haritasi(db, participant_ids)

    unread_rows = db.execute(
        select(KonuMesaji.konu_id, func.count())
        .where(
            KonuMesaji.konu_id.in_(thread_ids),
            KonuMesaji.alici_kullanici_id.in_(self_ids),
            KonuMesaji.okundu.is_(False),
        )
        .group_by(KonuMesaji.konu_id)
    ).all()
    unread_by_thread = {kid: int(cnt) for kid, cnt in unread_rows}

    ranked_subq = (
        select(
            KonuMesaji.id.label("mesaj_id"),
            func.row_number()
            .over(
                partition_by=KonuMesaji.konu_id,
                order_by=(
                    KonuMesaji.olusturma.desc(),
                    KonuMesaji.id.desc(),
                ),
            )
            .label("rn"),
        )
        .where(KonuMesaji.konu_id.in_(thread_ids))
        .subquery()
    )
    messages = db.scalars(
        select(KonuMesaji)
        .join(ranked_subq, KonuMesaji.id == ranked_subq.c.mesaj_id)
        .where(ranked_subq.c.rn == 1)
    ).all()
    last_msg_by_thread: dict[str, KonuMesaji] = {
        m.konu_id: m for m in messages
    }

    konular = []
    total_unread = 0
    for t in threads:
        other_id = (
            t.katilimci_b_id
            if t.katilimci_a_id in self_ids
            else t.katilimci_a_id
        )
        other_info = identity_map.get(
            other_id,
            {
                "kullanici_id": other_id,
                "uzman_id": None,
                "ad": "Kullanıcı",
                "unvan": "",
                "sehir": "",
                "rol": "uzman",
            },
        )
        last_msg = last_msg_by_thread.get(t.id)
        sender_info = (
            identity_map.get(last_msg.gonderen_kullanici_id)
            if last_msg
            else None
        )
        unread_cnt = unread_by_thread.get(t.id, 0)
        total_unread += unread_cnt

        konular.append(
            {
                "id": t.id,
                "baslik": t.baslik,
                "son_mesaj_zamani": t.son_mesaj_zamani,
                "olusturma": t.olusturma,
                "okunmamis_sayisi": unread_cnt,
                "karsi_taraf": other_info,
                "son_mesaj": (
                    {
                        "id": last_msg.id,
                        "gonderen_kullanici_id": (
                            last_msg.gonderen_kullanici_id
                        ),
                        "gonderen_ad": (
                            str(sender_info["ad"])
                            if sender_info
                            else "Kullanıcı"
                        ),
                        "icerik": last_msg.icerik,
                        "okundu": last_msg.okundu,
                        "olusturma": last_msg.olusturma,
                    }
                    if last_msg
                    else None
                ),
            }
        )

    return {
        "toplam_okunmamis": total_unread,
        "konular": konular,
    }


@router.post("/mesajlar/konular", status_code=201)
def mesaj_konusu_olustur(
    body: MesajKonuOlusturGirdi,
    request: Request,
    user: AktifKullanici,
    db: Db,
):
    """Yeni bir mesaj konusu başlatır ve karşı tarafa bildirim gönderir."""

    hiz_siniri.kontrol("mesaj-konu:" + user.id, 30, 3600)
    hiz_siniri.kontrol("mesaj-konu-ip:" + istemci(request), 60, 3600)
    now = int(time.time())
    target_key = body.alici_id.strip()

    if target_key == "tumu":
        if user.rol != "yonetici":
            raise HTTPException(
                403, "Toplu mesaj yalnızca yöneticiler tarafından gönderilir."
            )
        recipients = db.scalars(
            select(Uzman.kullanici_id).where(
                Uzman.arsivli.is_(False),
                Uzman.kullanici_id != user.id,
            )
        ).all()
        first_thread_id = None
        sent_count = 0
        for uid in recipients:
            if not uid:
                continue
            thread = _konu_ve_ilk_mesaj_olustur(
                db,
                gonderen_id=user.id,
                alici_id=uid,
                baslik=body.baslik,
                mesaj=body.mesaj,
                now=now,
            )
            if first_thread_id is None:
                first_thread_id = thread.id
            bildirim_ekle(
                db,
                alici_kullanici_id=uid,
                gonderen_kullanici_id=user.id,
                tur="admin_notu",
                baslik=body.baslik,
                mesaj=body.mesaj,
                hedef_yol=f"/panel?sekme=mesajlar&konu={thread.id}",
                now=now,
            )
            sent_count += 1
        denetle(db, "mesaj.toplu_gonder", user.id, "tumu")
        db.commit()
        return {"konu_id": first_thread_id, "gonderilen": sent_count}

    if target_key == "yonetim":
        admin_users = db.scalars(
            select(Kullanici)
            .where(
                Kullanici.rol == "yonetici",
                Kullanici.aktif.is_(True),
                Kullanici.id != user.id,
            )
            .order_by(Kullanici.email)
        ).all()
        if not admin_users:
            raise HTTPException(404, "Aktif yönetici hesabı bulunamadı.")
        primary_admin = admin_users[0]
        thread = _konu_ve_ilk_mesaj_olustur(
            db,
            gonderen_id=user.id,
            alici_id=primary_admin.id,
            baslik=body.baslik,
            mesaj=body.mesaj,
            now=now,
        )
        for adm in admin_users:
            bildirim_ekle(
                db,
                alici_kullanici_id=adm.id,
                gonderen_kullanici_id=user.id,
                tur="admin_notu",
                baslik=body.baslik,
                mesaj=body.mesaj,
                hedef_yol=f"/yonetim?sekme=mesajlar&konu={thread.id}",
                now=now,
            )
        denetle(db, "mesaj.konu_olustur", user.id, thread.id)
        db.commit()
        return {"konu_id": thread.id, "gonderilen": 1}

    recipient_user = db.scalar(
        select(Kullanici).where(
            Kullanici.id == target_key, Kullanici.aktif.is_(True)
        )
    )
    if not recipient_user:
        therapist = db.scalar(
            select(Uzman).where(
                Uzman.id == target_key, Uzman.arsivli.is_(False)
            )
        )
        if therapist:
            recipient_user = db.scalar(
                select(Kullanici).where(
                    Kullanici.id == therapist.kullanici_id,
                    Kullanici.aktif.is_(True),
                )
            )

    if not recipient_user or recipient_user.id == user.id:
        raise HTTPException(404, "Alıcı kullanıcı bulunamadı.")

    if user.rol == "uzman" and recipient_user.rol == "uzman":
        blocked_uids = _engelli_uzman_kullanici_idleri(db, user.id)
        if recipient_user.id in blocked_uids:
            raise HTTPException(
                403, "Bu kullanıcı ile mesajlaşma yapılamıyor."
            )

    thread = _konu_ve_ilk_mesaj_olustur(
        db,
        gonderen_id=user.id,
        alici_id=recipient_user.id,
        baslik=body.baslik,
        mesaj=body.mesaj,
        now=now,
    )
    dest_base = "/yonetim" if recipient_user.rol == "yonetici" else "/panel"
    bildirim_ekle(
        db,
        alici_kullanici_id=recipient_user.id,
        gonderen_kullanici_id=user.id,
        tur="admin_notu",
        baslik=body.baslik,
        mesaj=body.mesaj,
        hedef_yol=f"{dest_base}?sekme=mesajlar&konu={thread.id}",
        now=now,
    )
    denetle(db, "mesaj.konu_olustur", user.id, thread.id)
    db.commit()
    return {"konu_id": thread.id, "gonderilen": 1}


@router.get("/mesajlar/konular/{konu_id}")
def mesaj_konu_detayi(konu_id: str, user: AktifKullanici, db: Db):
    """Seçilen mesaj konusundaki tüm mesajları döner ve okundu işaretler."""

    stmt, self_ids = _kullanici_konulari_sorgusu(db, user)
    thread = db.scalar(stmt.where(MesajKonusu.id == konu_id))
    if not thread:
        raise HTTPException(404, "Mesaj konusu bulunamadı.")

    now = int(time.time())
    db.execute(
        update(KonuMesaji)
        .where(
            KonuMesaji.konu_id == thread.id,
            KonuMesaji.alici_kullanici_id.in_(self_ids),
            KonuMesaji.okundu.is_(False),
        )
        .values(okundu=True, okunma_zamani=now)
    )
    db.execute(
        update(Bildirim)
        .where(
            Bildirim.alici_kullanici_id.in_(self_ids),
            Bildirim.okundu.is_(False),
            Bildirim.hedef_yol.like(f"%konu={thread.id}%"),
        )
        .values(okundu=True, okunma_zamani=now)
    )
    db.commit()

    messages = db.scalars(
        select(KonuMesaji)
        .where(KonuMesaji.konu_id == thread.id)
        .order_by(KonuMesaji.olusturma.asc())
    ).all()

    user_ids = {thread.katilimci_a_id, thread.katilimci_b_id} | {
        m.gonderen_kullanici_id for m in messages
    }
    identity_map = _kullanici_kimlik_haritasi(db, user_ids)
    other_id = (
        thread.katilimci_b_id
        if thread.katilimci_a_id in self_ids
        else thread.katilimci_a_id
    )
    other_info = identity_map.get(
        other_id,
        {
            "kullanici_id": other_id,
            "uzman_id": None,
            "ad": "Kullanıcı",
            "unvan": "",
            "sehir": "",
            "rol": "uzman",
        },
    )

    return {
        "id": thread.id,
        "baslik": thread.baslik,
        "olusturma": thread.olusturma,
        "son_mesaj_zamani": thread.son_mesaj_zamani,
        "karsi_taraf": other_info,
        "mesajlar": [
            {
                "id": m.id,
                "gonderen_kullanici_id": m.gonderen_kullanici_id,
                "gonderen_ad": str(
                    identity_map.get(m.gonderen_kullanici_id, {}).get("ad")
                    or "Kullanıcı"
                ),
                "gonderen_rol": str(
                    identity_map.get(m.gonderen_kullanici_id, {}).get("rol")
                    or "uzman"
                ),
                "benden_mi": m.gonderen_kullanici_id in self_ids,
                "icerik": m.icerik,
                "okundu": m.okundu,
                "olusturma": m.olusturma,
            }
            for m in messages
        ],
    }


@router.post("/mesajlar/konular/{konu_id}/yanit", status_code=201)
def mesaj_konusuna_yanit_gonder(
    konu_id: str,
    body: MesajYanitGirdi,
    request: Request,
    user: AktifKullanici,
    db: Db,
):
    """Mevcut mesaj konusuna yanıt ekler ve karşı tarafa bildirim üretir."""

    hiz_siniri.kontrol("mesaj-yanit:" + user.id, 60, 3600)
    hiz_siniri.kontrol("mesaj-yanit-ip:" + istemci(request), 120, 3600)
    stmt, self_ids = _kullanici_konulari_sorgusu(db, user)
    thread = db.scalar(stmt.where(MesajKonusu.id == konu_id))
    if not thread:
        raise HTTPException(404, "Mesaj konusu bulunamadı.")

    other_id = (
        thread.katilimci_b_id
        if thread.katilimci_a_id in self_ids
        else thread.katilimci_a_id
    )
    other_user = db.scalar(
        select(Kullanici).where(
            Kullanici.id == other_id, Kullanici.aktif.is_(True)
        )
    )
    if not other_user:
        raise HTTPException(404, "Alıcı hesabı aktif değil.")

    if user.rol == "uzman" and other_user.rol == "uzman":
        blocked_uids = _engelli_uzman_kullanici_idleri(db, user.id)
        if other_user.id in blocked_uids:
            raise HTTPException(
                403, "Bu kullanıcı ile mesajlaşma yapılamıyor."
            )

    now = int(time.time())
    msg = KonuMesaji(
        konu_id=thread.id,
        gonderen_kullanici_id=user.id,
        alici_kullanici_id=other_user.id,
        icerik=body.mesaj[:2000],
        okundu=False,
        olusturma=now,
    )
    db.add(msg)
    thread.son_mesaj_zamani = now

    if other_user.rol == "yonetici":
        admin_ids = db.scalars(
            select(Kullanici.id).where(
                Kullanici.rol == "yonetici",
                Kullanici.aktif.is_(True),
            )
        ).all()
        for adm_id in admin_ids:
            bildirim_ekle(
                db,
                alici_kullanici_id=adm_id,
                gonderen_kullanici_id=user.id,
                tur="admin_notu",
                baslik=f"Yanıt: {thread.baslik}"[:120],
                mesaj=body.mesaj[:600],
                hedef_yol=f"/yonetim?sekme=mesajlar&konu={thread.id}",
                now=now,
            )
    else:
        bildirim_ekle(
            db,
            alici_kullanici_id=other_user.id,
            gonderen_kullanici_id=user.id,
            tur="admin_notu",
            baslik=f"Yanıt: {thread.baslik}"[:120],
            mesaj=body.mesaj[:600],
            hedef_yol=f"/panel?sekme=mesajlar&konu={thread.id}",
            now=now,
        )

    denetle(db, "mesaj.yanit_gonder", user.id, thread.id)
    db.commit()

    identity_map = _kullanici_kimlik_haritasi(db, {user.id})
    my_info = identity_map.get(user.id, {})
    return {
        "id": msg.id,
        "gonderen_kullanici_id": user.id,
        "gonderen_ad": str(my_info.get("ad") or "Kullanıcı"),
        "gonderen_rol": str(my_info.get("rol") or user.rol),
        "benden_mi": True,
        "icerik": msg.icerik,
        "okundu": False,
        "olusturma": msg.olusturma,
    }
