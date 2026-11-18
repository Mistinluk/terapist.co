let csrf = "";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function setCsrf(value: string) {
  csrf = value;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf,
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 && !path.startsWith("/oturum/")) {
      window.dispatchEvent(new Event("oturum-bitti"));
    }
    throw new ApiError(
      body.detail || "Bağlantı kurulamadı. Lütfen tekrar deneyin.",
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export type ProfilFotografiYuklemeSonucu = {
  url: string;
  boyut_bayt: number;
  genislik: number;
  yukseklik: number;
};

export async function uploadProfilePhoto(
  file: File,
): Promise<ProfilFotografiYuklemeSonucu> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/medya/profil-fotografi", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "X-CSRF-Token": csrf,
    },
    body: formData,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      body.detail || "Fotoğraf yüklenemedi. Lütfen başka bir görsel deneyin.",
      response.status,
    );
  }
  return response.json();
}

export type CalismaSaati = { gun: number; baslangic: number; bitis: number };
export type ProfilGirdi = {
  ad: string;
  unvan: string;
  profil_fotografi_url: string;
  sehir: string;
  ilce: string;
  biyografi: string;
  terapi_yaklasimi: string;
  ucret: number;
  seans_suresi_dakika: 30 | 45 | 50 | 60;
  deneyim_yili: number;
  ekoller: string[];
  kitle: string[];
  formatlar: string[];
  diller: string[];
  uzmanliklar: string[];
  egitim: string[];
  egitim_universite: string;
  egitim_program: string;
  egitim_derece: string;
  kurumlar: string[];
  sosyal_baglantilar: Partial<
    Record<"instagram" | "linkedin" | "x" | "youtube" | "website", string>
  >;
  adres: string;
  calisma_saatleri: CalismaSaati[];
};
export type Profil = ProfilGirdi & {
  id: string;
  kullanici_adi: string;
  uye_olma: number;
  kurucu_no: number | null;
  onayli: boolean;
  arsivli: boolean;
};
export type ProfilKaynagi = {
  id: string;
  baslik: string;
  aciklama: string;
  url: string;
  kategori: "yazi" | "kitap" | "podcast" | "diger";
  sira: number;
  tiklama_sayisi: number;
  olusturma?: number;
  vurgulu?: boolean;
  vurgu_etiketi?: string;
  baslangic_zamani?: number | null;
  bitis_zamani?: number | null;
  kilitli?: boolean;
  zaman_durumu?: "aktif" | "planli" | "suresi_doldu";
  medya_turu?: "none" | "youtube" | "spotify";
  medya_embed_url?: string | null;
};
export type KaynakAcYaniti = {
  id: string;
  url: string;
  medya_turu: "none" | "youtube" | "spotify";
  medya_embed_url: string | null;
};
export type BeklemeListesiKaydi = {
  id: string;
  ad: string;
  telefon: string;
  email?: string | null;
  tercih_format: "farketmez" | "cevrim_ici" | "yuz_yuze";
  tercih_zaman: "esnek" | "sabah" | "ogleden_sonra" | "aksam" | "hafta_sonu";
  durum: "bekliyor" | "iletisime_gecildi" | "kapandi";
  olusturma: number;
  guncelleme?: number | null;
};
export type TasarimTarzi =
  "klinik_modern" | "editoryal_serif" | "organik_sakin" | "yumusak_cam";

export type TemaRengi =
  | "klasik"
  | "toprak"
  | "orman"
  | "okyanus"
  | "gece"
  | "lavanta"
  | "kizilcik"
  | "ada_cayi"
  | "ozel";

export type ButonYapisi =
  | "yuvarlak"
  | "yastik"
  | "keskin"
  | "cerceveli"
  | "yumusak_golge"
  | "cam_efekti";

export type YaziTipi =
  "modern_sans" | "editoryal_serif" | "humanist_sakin" | "geometrik_net";

export type YuzeyStili = "temiz" | "krem" | "pastel" | "buzlu";

export type TemaAyarlari = {
  bekleme_listesi_acik: boolean;
  tasarim_tarzi: TasarimTarzi;
  tema_stili: TemaRengi;
  vurgu_rengi: string;
  buton_stili: ButonYapisi;
  yazi_tipi: YaziTipi;
  yuzey_stili: YuzeyStili;
  arka_plan_gorseli_url?: string;
  terapistco_markasi_gizli: boolean;
  ozel_tema_yetkisi: boolean;
  premium_etkin: boolean;
  marka_gizleme_etkin: boolean;
};
export type AlinanTavsiyeler = {
  toplam: number;
  oneriler: Array<{
    id: string;
    ad: string;
    unvan: string;
    kullanici_adi: string;
    profil_fotografi_url: string;
    sehir: string;
    uzmanlik: string;
  }>;
};
export type KurucuProgrami = {
  azami_uye: number;
  atanmis_uye: number;
  kalan: number;
  siradaki_numara: number | null;
};
export type WebsiteRozeti = {
  id: string;
  olusturma: number;
  pasaport_url: string;
  profil_url: string;
  tiklama_url: string;
  gorsel_url: string;
  embed_code: string;
};
export type WebsiteRozetiOzeti = {
  uygun: boolean;
  rozet: WebsiteRozeti | null;
};
export type BuyumeAnalitigi = {
  baglantilar: { toplam: number; bekleyen_istekler: number };
  davetler: {
    gonderilen: number;
    kabul_edilen: number;
    bekleyen: number;
    kalan_hak: number;
  };
  yonlendirmeler: {
    olusturulan_baglanti: number;
    aktif_baglanti: number;
    profil_tiklamalari: number;
  };
  tavsiyeler: { onerilen_terapist: number };
};
export type GorunurlukAyarlari = {
  davet_edeni_goster: boolean;
  mesleki_agi_goster: boolean;
  uzmanlik_iliskilerini_goster: boolean;
  tavsiyeleri_goster: boolean;
  yonlendirme_agini_goster: boolean;
  kurucu_durumunu_goster: boolean;
};
export type Endorsement = {
  id: string;
  uzmanlik: string;
  profesyonel_baglam: MeslektasBaglami;
  meslektas: { id: string; ad: string };
};
export type UzmanEngeli = {
  terapist: { id: string; ad: string };
  olusturma: number;
};
export type ModerasyonRaporu = {
  id: string;
  tur: "connection" | "false_relationship";
  durum: "open" | "resolved" | "dismissed";
  aciklama: string;
  kaynak_id: string;
  olusturma: number;
  raporlayan: { id: string; ad: string };
  hedef: { id: string; ad: string };
};
export type EslesenProfil = Profil & {
  eslesme: {
    puan: number | null;
    eslesen_alanlar: string[];
    eslesen_ekoller: string[];
    eksik_alanlar: string[];
    eksik_ekoller: string[];
  };
  meslektas_alanlari: Array<{
    uzmanlik: string;
    meslektas_sayisi: number;
  }>;
};
export type Aydinlatma = {
  surum: string;
  metin: string;
  veri_sorumlusu: string;
  gelistirme: boolean;
};
export type Randevu = {
  id: string;
  uzman_id: string;
  baslangic: string;
  ad: string;
  telefon: string;
  durum: string;
  bitis?: string | null;
  takvim_durumu?: string | null;
};
export type MfaSonucu = {
  mesaj: string;
  mfa_anahtari: string;
  mfa_uri: string;
};
export type Davet = {
  id: string;
  email: string;
  ad: string;
  durum: "pending" | "accepted" | "expired" | "revoked";
  olusturma: number;
  sure_bitimi: number;
  kabul: number | null;
  iliski_turu: "invited_to_platform";
  onerilen_uzmanlik: string | null;
};
export type DavetOzeti = {
  dogrulama_durumu: "pending" | "verified" | "rejected";
  davet_limiti: number;
  kullanilan: number;
  kalan: number;
  kurucu_no: number | null;
  davetler: Davet[];
};
export type BaglantiTuru = {
  slug:
    | "colleague"
    | "worked_together"
    | "same_institution"
    | "training_colleague"
    | "supervision_relationship"
    | "professional_acquaintance";
  ad: string;
};
export type ProfesyonelBaglanti = {
  id: string;
  terapist: { id: string; ad: string };
  iliski_turu: BaglantiTuru["slug"] | "invited_to_platform";
  iliski_adi: string;
  durum: "pending" | "accepted" | "rejected" | "revoked";
  yon: "incoming" | "outgoing";
  istek_zamani: number;
  yanit_zamani: number | null;
};
export type MeslekiAg = {
  toplam: number;
  baglantilar: ProfesyonelBaglanti[];
};
export type BaglantiOzeti = {
  gelen_istekler: ProfesyonelBaglanti[];
  gonderilen_istekler: ProfesyonelBaglanti[];
  baglantilar: ProfesyonelBaglanti[];
};
export type BaglantiDurumu = {
  durum: "self" | "none" | ProfesyonelBaglanti["durum"];
  baglanti: ProfesyonelBaglanti | null;
};
export type TavsiyeEdilenTerapist = { id: string; ad: string };
export type TerapistTavsiyesi = {
  uzmanlik: string;
  terapist: TavsiyeEdilenTerapist;
  olusturma: number;
  aktif: boolean;
};
export type TavsiyeOzeti = { tavsiyeler: TerapistTavsiyesi[] };
export type PublicTavsiyeler = {
  toplam: number;
  gruplar: Array<{
    uzmanlik: string;
    terapistler: TavsiyeEdilenTerapist[];
  }>;
};
export type YonlendirmeNedeni =
  | "schedule_full"
  | "outside_specialty"
  | "age_group"
  | "location"
  | "budget"
  | "therapy_format"
  | "psychiatry"
  | "other";
export type YonlendirmeTerapisti = {
  id: string;
  ad: string;
  sehir: string;
  ilce: string;
  uzmanliklar: string[];
  formatlar: string[];
};
export type DanisanYonlendirme = {
  id: string;
  neden: YonlendirmeNedeni;
  olusturma: number;
  sure_bitimi: number;
  view_count: number;
  terapistler: YonlendirmeTerapisti[];
  url?: string;
  durum?: "active" | "expired" | "revoked";
};
export type PublicYonlendirme = {
  yonlendiren: { id: string; ad: string };
  terapistler: YonlendirmeTerapisti[];
  sure_bitimi: number;
};
export type MeslektasBaglami =
  | "worked_together"
  | "same_training_program"
  | "supervision_context"
  | "referred_client_to"
  | "received_client_referral"
  | "follows_professional_work";
export type MeslektasUzmanlikOzeti = {
  toplam_alan: number;
  alanlar: Array<{ uzmanlik: string; meslektas_sayisi: number }>;
};
export type GoogleTakvimi = {
  id: string;
  ad: string;
  birincil: boolean;
};
export type GoogleTakvimDurumu = {
  randevu_yazma_izni?: boolean;
  bekleyen_aktarim?: number;
  hatali_aktarim?: number;
  yapilandirildi: boolean;
  bagli: boolean;
  email: string | null;
  durum: "aktif" | "koptu" | null;
  son_senkron: number | null;
  hata: string | null;
  takvimler: GoogleTakvimi[];
  musaitlik_takvimi: string | null;
  dolu_takvimleri: string[];
  dolu_aralik_sayisi: number;
  musait_aralik_sayisi: number | null;
  webhook_etkin?: boolean;
  webhook_kanal_sayisi?: number;
  webhook_son_bildirim?: number | null;
};
export type YonetimUzmanOzeti = {
  id: string;
  ad: string;
  kullanici_adi: string;
  sehir: string;
};
export type YonetimRandevuOzeti = {
  tamamlandi?: number;
  toplam: number;
  bekliyor: number;
  onaylandi: number;
  reddedildi: number;
  iptal: number;
  son_7_gun: number;
  son_30_gun: number;
  gelecek_aktif: number;
  gecikmis_bekleyen?: number;
  onay_orani_yuzde: number;
};
export type YonetimAnalitik = {
  ozet: {
    toplam_uzman: number;
    yayindaki_uzman: number;
    bekleyen_uzman: number;
    arsivli_uzman: number;
    kurucu_programi: KurucuProgrami;
    randevular: YonetimRandevuOzeti;
  };
  ag_ve_profil: {
    takvim_bagli_uzman: number;
    takvim_koptu_uzman: number;
    takvim_webhook_aktif_kanal: number;
    rozet_olusturan_uzman: number;
    rozet_toplam_tiklama: number;
    profil_kaynagi_sayisi: number;
    profil_kaynagi_tiklama: number;
    aktif_profesyonel_baglanti: number;
    bekleyen_baglanti_istegi: number;
    uzmanlik_iliskisi_sayisi: number;
    tavsiye_sayisi: number;
    acik_moderasyon_raporu: number;
  };
  buyume_ve_yonlendirme: {
    toplam_davet: number;
    bekleyen_davet: number;
    kabul_edilen_davet: number;
    toplam_yonlendirme_linki: number;
    aktif_yonlendirme_linki: number;
    yonlendirme_goruntulenme: number;
    yonlendirme_hedef_atamasi: number;
    yonlendirme_profil_tiklamasi: number;
  };
  sehir_dagilimi: Array<{ sehir: string; toplam: number; yayinda: number }>;
  format_dagilimi: { cevrim_ici: number; yuz_yuze: number };
  siradaki_adim: {
    anahtar: string;
    baslik: string;
    aciklama: string;
    sekme: string;
  };
};
export type YonetimRandevuBildirimi = {
  id: string;
  tur: "hatirlatma" | "eskalasyon" | "durum_degisikligi";
  mesaj: string;
  okundu: boolean;
  olusturma: number;
  okunma_zamani: number | null;
};

export type YonetimRandevuKaydi = {
  id: string;
  baslangic: number;
  olusturma: number;
  durum: "bekliyor" | "onaylandi" | "reddedildi" | "iptal" | "tamamlandi";
  aydinlatma_surumu: string;
  bekleme_suresi_saat?: number;
  yanit_gecikti?: boolean;
  bildirim_sayisi?: number;
  son_bildirim_zamani?: number | null;
  uzman: YonetimUzmanOzeti;
};

export type YonetimRandevularYaniti = {
  ozet: YonetimRandevuOzeti;
  yanit_suresi_saat?: number;
  uzmanlar_filtre: Array<{ id: string; ad: string; sehir: string }>;
  sayfa: number;
  toplam_kayit: number;
  kayitlar: YonetimRandevuKaydi[];
};

export type YonetimRandevuDetay = {
  id: string;
  baslangic: number;
  bitis?: number;
  olusturma: number;
  durum: "bekliyor" | "onaylandi" | "reddedildi" | "iptal" | "tamamlandi";
  aydinlatma_surumu: string;
  bekleme_suresi_saat: number;
  yanit_gecikti: boolean;
  yanit_suresi_saat: number;
  uzman: YonetimUzmanOzeti & { eposta?: string };
  danisan_maskeli: { ad: string; telefon: string };
  bildirimler: YonetimRandevuBildirimi[];
  islem_gecmisi: Array<{ id: string; islem: string; zaman: number }>;
};

export type UzmanBildirim = {
  id: string;
  randevu_id: string;
  tur: "hatirlatma" | "eskalasyon" | "durum_degisikligi";
  mesaj: string;
  okundu: boolean;
  olusturma: number;
  randevu_baslangic: number;
  randevu_durum: string;
};

export type UzmanBildirimlerYaniti = {
  okunmamis_sayisi: number;
  kayitlar: UzmanBildirim[];
};

export type SiteBildirimTuru =
  | "yeni_randevu"
  | "randevu_hatirlatma"
  | "sistem_hatirlatma"
  | "randevu_guncelleme"
  | "admin_notu";

export type SiteBildirim = {
  id: string;
  tur: SiteBildirimTuru;
  baslik: string;
  mesaj: string;
  hedef_yol: string;
  randevu_id: string | null;
  gonderen_kullanici_id?: string | null;
  gonderen_ad?: string;
  gonderen_rol?: "uzman" | "yonetici" | "sistem" | string;
  konu_id?: string | null;
  okundu: boolean;
  olusturma: number;
};

export type SiteBildirimlerYaniti = {
  okunmamis_sayisi: number;
  kayitlar: SiteBildirim[];
};

export type BildirimHedefUzman = {
  id: string;
  ad: string;
  sehir: string;
  kullanici_id?: string;
};

export type MesajKisi = {
  id: string;
  kullanici_id: string;
  uzman_id: string | null;
  ad: string;
  unvan: string;
  sehir: string;
  rol: "uzman" | "yonetici" | "toplu" | string;
};

export type KonuSonMesaj = {
  id: string;
  gonderen_kullanici_id: string;
  gonderen_ad: string;
  icerik: string;
  okundu: boolean;
  olusturma: number;
};

export type MesajKonuOzeti = {
  id: string;
  baslik: string;
  son_mesaj_zamani: number;
  olusturma: number;
  okunmamis_sayisi: number;
  karsi_taraf: MesajKisi;
  son_mesaj: KonuSonMesaj | null;
};

export type MesajKonulariYaniti = {
  toplam_okunmamis: number;
  konular: MesajKonuOzeti[];
};

export type TekilMesaj = {
  id: string;
  gonderen_kullanici_id: string;
  gonderen_ad: string;
  gonderen_rol: string;
  benden_mi: boolean;
  icerik: string;
  okundu: boolean;
  olusturma: number;
};

export type MesajKonuDetayi = {
  id: string;
  baslik: string;
  olusturma: number;
  son_mesaj_zamani: number;
  karsi_taraf: MesajKisi;
  mesajlar: TekilMesaj[];
};
export type KurucuUyeBilgisi = {
  uzman_id: string;
  kurucu_no: number;
  verilme: number;
  ad: string;
  kullanici_adi: string;
  sehir: string;
  ilce: string;
  onayli: boolean;
  arsivli: boolean;
  kurucu_durumunu_goster: boolean;
};
export type KurucuAdayBilgisi = {
  uzman_id: string;
  ad: string;
  kullanici_adi: string;
  sehir: string;
  ilce: string;
  uye_olma: number;
};
export type YonetimKurucuUyeleri = {
  program: KurucuProgrami;
  uyeler: KurucuUyeBilgisi[];
  adaylar: KurucuAdayBilgisi[];
};
export type YonetimYonlendirmeler = {
  ozet: {
    toplam_link: number;
    aktif_link: number;
    suresi_dolan_veya_kapali: number;
    yonlendiren_uzman_sayisi: number;
    toplam_yonlendirilen_hedef: number;
    toplam_goruntulenme: number;
    toplam_profil_tiklamasi: number;
  };
  neden_dagilimi: Array<{ neden: YonlendirmeNedeni | string; sayi: number }>;
  uzman_ozetleri: Array<{
    uzman: YonetimUzmanOzeti;
    link_sayisi: number;
    aktif_link_sayisi: number;
    toplam_goruntulenme: number;
    toplam_hedef_gosterimi: number;
    toplam_profil_tiklamasi: number;
    hedefler: Array<{
      uzman_id: string;
      ad: string;
      kullanici_adi: string;
      sehir: string;
      sayi: number;
      tiklama_sayisi: number;
    }>;
  }>;
  alan_uzman_ozetleri: Array<{
    uzman: YonetimUzmanOzeti;
    alinan_yonlendirme_sayisi: number;
    profil_tiklama_sayisi: number;
    yonlendirenler: Array<{
      uzman_id: string;
      ad: string;
      kullanici_adi: string;
      sayi: number;
    }>;
  }>;
  linkler: Array<{
    id: string;
    neden: YonlendirmeNedeni | string;
    durum: "active" | "expired" | "revoked";
    olusturma: number;
    sure_bitimi: number;
    goruntulenme_sayisi: number;
    profil_tiklamasi: number;
    yonlendiren: YonetimUzmanOzeti;
    hedefler: Array<YonetimUzmanOzeti & { tiklama_sayisi: number }>;
  }>;
};
export type YonetimReferansYaniti = {
  ozet: {
    toplam_davet: number;
    bekleyen_davet: number;
    kabul_edilen_davet: number;
    suresi_dolan_davet: number;
    iptal_davet: number;
    toplam_oneri: number;
  };
  davet_ozetleri: Array<{
    uzman_id: string;
    ad: string;
    kullanici_adi: string;
    davet_limiti: number;
    toplam_gonderilen: number;
    kabul_edilen: number;
    bekleyen: number;
    kalan_hak: number;
    kabul_edenler: Array<{ id: string; ad: string }>;
  }>;
  davetler: Array<{
    id: string;
    davet_eden: { id: string; ad: string };
    davet_edilen: { id: string | null; ad: string; email: string };
    uzmanlik: string | null;
    durum: "pending" | "accepted" | "expired" | "revoked";
    olusturma: number;
  }>;
  oneriler: Array<{
    veren: { id: string; ad: string };
    onerilen: { id: string; ad: string };
    uzmanlik: string;
    olusturma: number;
  }>;
};
export type YonetimUzmanDetayi = {
  uzman_id: string;
  ad: string;
  kullanici_adi: string;
  onayli: boolean;
  davet_limiti: number;
  kurucu_no: number | null;
  dogrulama_durumu: "pending" | "verified" | "rejected";
  dogrulama_gonderilme: number | null;
  dogrulama_incelenme: number | null;
  gizlilik: GorunurlukAyarlari;
  tema?: TemaAyarlari;
  bekleme_ozeti?: {
    toplam: number;
    bekliyor: number;
    iletisime_gecildi: number;
  };
  randevu_ozeti: YonetimRandevuOzeti;
  takvim: {
    bagli: boolean;
    durum: "aktif" | "koptu" | null;
    son_senkron: number | null;
    webhook_etkin: boolean;
    webhook_kanal_sayisi: number;
  };
  rozet: {
    aktif: boolean;
    tiklama_sayisi: number;
  };
  kaynaklar: Array<{
    id: string;
    baslik: string;
    kategori: string;
    url: string;
    tiklama_sayisi: number;
    vurgulu?: boolean;
    kilitli?: boolean;
    medya_turu?: "none" | "youtube" | "spotify";
    zaman_durumu?: "aktif" | "planli" | "suresi_doldu";
  }>;
  ag: {
    baglanti_sayisi: number;
    bekleyen_baglanti: number;
    uzmanlik_iliskisi_sayisi: number;
    tavsiye_verilen: number;
    tavsiye_alinan: number;
  };
  yonlendirme_ozeti: {
    olusturulan_link: number;
    aktif_link: number;
    toplam_goruntulenme: number;
    alinan_yonlendirme: number;
    profil_tiklamasi: number;
  };
  davet_ozeti: {
    limit: number;
    gonderilen: number;
    kabul_edilen: number;
    bekleyen: number;
  };
};
export type GA4Durumu = {
  olcum_kimligi: string | null;
  mulk_kimligi: string | null;
  olcum_etkin: boolean;
  baglanti_durumu: "bagli_degil" | "oauth_bagli" | "hizmet_hesabi" | "koptu";
  hesap_etiketi: string | null;
  son_senkron: number | null;
  hata: string | null;
  oauth_etkin: boolean;
  geri_donus_adresi: string;
};
export type YonetimTrafikAnalitigi = {
  gun: 7 | 30 | 90;
  istenen_kaynak: "karma" | "ga4" | "site_ici";
  aktif_kaynak: "ga4" | "site_ici";
  ga4_durumu: GA4Durumu;
  ga4_veri_hazir: boolean;
  ozet: {
    ziyaretci: number;
    sayfa_goruntuleme: number;
    profil_goruntuleme: number;
    randevu_basvurusu: number;
    en_yuksek_kaynak: string | null;
  };
  gunluk_egilim: Array<{
    tarih: string;
    ziyaretci: number;
    sayfa_goruntuleme: number;
    profil_goruntuleme: number;
  }>;
  en_cok_ziyaret_edilen_uzmanlar: Array<{
    uzman_id: string;
    ad: string;
    kullanici_adi: string;
    sehir: string;
    profil_goruntuleme: number;
    tekil_ziyaretci: number;
    randevu_talebi: number;
  }>;
  yonlendiren_kaynaklar: Array<{
    anahtar: string;
    etiket: string;
    kategori: string;
    ziyaretci: number;
    sayfa_goruntuleme: number;
    pay_yuzde: number;
  }>;
  ziyaretci_konumlari: Array<{
    sehir: string;
    ulke: string;
    ziyaretci: number;
    sayfa_goruntuleme: number;
    pay_yuzde: number;
  }>;
  sayfa_turleri: Array<{
    tur: string;
    etiket: string;
    goruntuleme: number;
  }>;
  donusum_hunisi: {
    dizin_aramasi: number;
    profil_goruntuleme: number;
    randevu_cekmecesi: number;
    randevu_talebi: number;
  };
};
export type UzmanTrafikAnalitigi = {
  gun: 7 | 30 | 90;
  profil_adresi: string;
  ozet: {
    profil_goruntuleme: number;
    tekil_ziyaretci: number;
    randevu_cekmece_acilisi: number;
    randevu_talebi: number;
    donusum_orani_yuzde: number;
    kaynak_ve_rozet_tiklamasi: number;
    en_yuksek_kaynak: string | null;
  };
  gelis_kaynaklari: Array<{
    anahtar: string;
    etiket: string;
    ziyaretci: number;
    pay_yuzde: number;
  }>;
  ziyaretci_konumlari: Array<{
    konum: string;
    ziyaretci: number;
    pay_yuzde: number;
  }>;
  gunluk_egilim: Array<{
    tarih: string;
    goruntuleme: number;
    randevu_talebi: number;
  }>;
  profil_etkilesimleri: {
    bilgi_kaynagi_tiklama: number;
    website_rozet_tiklama: number;
    randevu_form_acilisi: number;
    bekleme_listesi_basvurusu?: number;
    medya_oynatma?: number;
    qr_ziyaret?: number;
    kilitli_link_acilisi?: number;
  };
  baglanti_performansi?: Array<{
    id: string;
    baslik: string;
    kategori: string;
    tiklama_sayisi: number;
    vurgulu: boolean;
    kilitli: boolean;
    medya_turu: "none" | "youtube" | "spotify";
    zaman_durumu: "aktif" | "planli" | "suresi_doldu";
    tiklama_payi_yuzde: number;
    to_orani_yuzde: number;
  }>;
  bekleme_ozeti?: {
    bekleyen: number;
    toplam_donem: number;
  };
  oneri: {
    baslik: string;
    aciklama: string;
  };
};
export const para = (value: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
export const tarih = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
