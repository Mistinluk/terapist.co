import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type {
  Profil,
  YonetimKurucuUyeleri,
  YonetimRandevularYaniti,
  YonetimReferansYaniti,
  YonetimUzmanDetayi,
  YonetimYonlendirmeler,
} from "../lib/api";
import { Admin } from "../pages/Admin";
import { AdminAppointmentsView } from "./AdminAppointments";
import { AdminClientReferralsView } from "./AdminClientReferrals";
import { AdminFoundingView } from "./AdminFounding";
import { AdminInvitationsView } from "./AdminInvitations";
import { AdminTherapistInspectorView } from "./AdminTherapistInspector";

const sampleReferrals: YonetimYonlendirmeler = {
  ozet: {
    toplam_link: 5,
    aktif_link: 3,
    suresi_dolan_veya_kapali: 2,
    yonlendiren_uzman_sayisi: 2,
    toplam_yonlendirilen_hedef: 7,
    toplam_goruntulenme: 28,
    toplam_profil_tiklamasi: 9,
  },
  neden_dagilimi: [{ neden: "schedule_full", sayi: 4 }],
  uzman_ozetleri: [
    {
      uzman: {
        id: "u1",
        ad: "Uzm. Psk. Selin Kaya",
        kullanici_adi: "selin-kaya",
        sehir: "İstanbul",
      },
      link_sayisi: 4,
      aktif_link_sayisi: 2,
      toplam_goruntulenme: 20,
      toplam_hedef_gosterimi: 6,
      toplam_profil_tiklamasi: 7,
      hedefler: [
        {
          uzman_id: "u2",
          ad: "Dr. Emre Demir",
          kullanici_adi: "emre-demir",
          sehir: "Ankara",
          sayi: 4,
          tiklama_sayisi: 5,
        },
      ],
    },
  ],
  alan_uzman_ozetleri: [
    {
      uzman: {
        id: "u2",
        ad: "Dr. Emre Demir",
        kullanici_adi: "emre-demir",
        sehir: "Ankara",
      },
      alinan_yonlendirme_sayisi: 4,
      profil_tiklama_sayisi: 5,
      yonlendirenler: [
        {
          uzman_id: "u1",
          ad: "Uzm. Psk. Selin Kaya",
          kullanici_adi: "selin-kaya",
          sayi: 4,
        },
      ],
    },
  ],
  linkler: [
    {
      id: "link-1",
      neden: "schedule_full",
      durum: "active",
      olusturma: 1730000000,
      sure_bitimi: 1730604800,
      goruntulenme_sayisi: 10,
      profil_tiklamasi: 3,
      yonlendiren: {
        id: "u1",
        ad: "Uzm. Psk. Selin Kaya",
        kullanici_adi: "selin-kaya",
        sehir: "İstanbul",
      },
      hedefler: [
        {
          id: "u2",
          ad: "Dr. Emre Demir",
          kullanici_adi: "emre-demir",
          sehir: "Ankara",
          tiklama_sayisi: 3,
        },
      ],
    },
  ],
};

const sampleAppointments: YonetimRandevularYaniti = {
  ozet: {
    toplam: 12,
    bekliyor: 3,
    onaylandi: 7,
    reddedildi: 1,
    iptal: 1,
    son_7_gun: 4,
    son_30_gun: 10,
    gelecek_aktif: 5,
    onay_orani_yuzde: 78,
  },
  uzmanlar_filtre: [
    { id: "u1", ad: "Uzm. Psk. Selin Kaya", sehir: "İstanbul" },
  ],
  sayfa: 1,
  toplam_kayit: 1,
  kayitlar: [
    {
      id: "apt-1",
      baslangic: 1735000000,
      olusturma: 1734000000,
      durum: "bekliyor",
      aydinlatma_surumu: "kvkk-2026",
      uzman: {
        id: "u1",
        ad: "Uzm. Psk. Selin Kaya",
        kullanici_adi: "selin-kaya",
        sehir: "İstanbul",
      },
    },
  ],
};

const sampleFounding: YonetimKurucuUyeleri = {
  program: {
    azami_uye: 500,
    atanmis_uye: 1,
    kalan: 499,
    siradaki_numara: 2,
  },
  uyeler: [
    {
      uzman_id: "u1",
      kurucu_no: 1,
      verilme: 1730000000,
      ad: "Uzm. Psk. Selin Kaya",
      kullanici_adi: "selin-kaya",
      sehir: "İstanbul",
      ilce: "Kadıköy",
      onayli: true,
      arsivli: false,
      kurucu_durumunu_goster: true,
    },
  ],
  adaylar: [
    {
      uzman_id: "u2",
      ad: "Dr. Emre Demir",
      kullanici_adi: "emre-demir",
      sehir: "Ankara",
      ilce: "Çankaya",
      uye_olma: 1730100000,
    },
  ],
};

const sampleInvitations: YonetimReferansYaniti = {
  ozet: {
    toplam_davet: 3,
    bekleyen_davet: 1,
    kabul_edilen_davet: 2,
    suresi_dolan_davet: 0,
    iptal_davet: 0,
    toplam_oneri: 1,
  },
  davet_ozetleri: [
    {
      uzman_id: "u1",
      ad: "Uzm. Psk. Selin Kaya",
      kullanici_adi: "selin-kaya",
      davet_limiti: 5,
      toplam_gonderilen: 3,
      kabul_edilen: 2,
      bekleyen: 1,
      kalan_hak: 2,
      kabul_edenler: [{ id: "u2", ad: "Dr. Emre Demir" }],
    },
  ],
  davetler: [
    {
      id: "inv-1",
      davet_eden: { id: "u1", ad: "Uzm. Psk. Selin Kaya" },
      davet_edilen: {
        id: null,
        ad: "Yeni Meslektaş",
        email: "yeni@example.com",
      },
      uzmanlik: "EMDR",
      durum: "pending",
      olusturma: 1734000000,
    },
  ],
  oneriler: [
    {
      veren: { id: "u1", ad: "Uzm. Psk. Selin Kaya" },
      onerilen: { id: "u2", ad: "Dr. Emre Demir" },
      uzmanlik: "Ergen Terapisi",
      olusturma: 1734000000,
    },
  ],
};

const sampleProfile: Profil = {
  id: "u1",
  kullanici_adi: "selin-kaya",
  uye_olma: 1730000000,
  kurucu_no: 1,
  onayli: true,
  arsivli: false,
  ad: "Uzm. Psk. Selin Kaya",
  unvan: "Klinik Psikolog",
  profil_fotografi_url: "",
  sehir: "İstanbul",
  ilce: "Kadıköy",
  biyografi: "En az yirmi karakterlik biyografi metni burada yer alır.",
  terapi_yaklasimi: "BDT",
  ucret: 2000,
  seans_suresi_dakika: 50,
  deneyim_yili: 6,
  ekoller: ["BDT"],
  kitle: ["Yetişkin"],
  formatlar: ["Çevrim içi"],
  diller: ["Türkçe"],
  uzmanliklar: ["Kaygı"],
  egitim: ["Boğaziçi"],
  egitim_universite: "Boğaziçi Üniversitesi",
  egitim_program: "Klinik Psikoloji",
  egitim_derece: "Yüksek Lisans",
  kurumlar: ["Merkez"],
  sosyal_baglantilar: {},
  adres: "",
  calisma_saatleri: [{ gun: 1, baslangic: 9, bitis: 17 }],
};

const sampleDetail: YonetimUzmanDetayi = {
  uzman_id: "u1",
  ad: "Uzm. Psk. Selin Kaya",
  kullanici_adi: "selin-kaya",
  onayli: true,
  davet_limiti: 5,
  kurucu_no: 1,
  dogrulama_durumu: "verified",
  dogrulama_gonderilme: 1730000000,
  dogrulama_incelenme: 1730001000,
  gizlilik: {
    davet_edeni_goster: true,
    mesleki_agi_goster: true,
    uzmanlik_iliskilerini_goster: true,
    tavsiyeleri_goster: true,
    yonlendirme_agini_goster: false,
    kurucu_durumunu_goster: true,
  },
  randevu_ozeti: sampleAppointments.ozet,
  takvim: {
    bagli: true,
    durum: "aktif",
    son_senkron: 1734000000,
    webhook_etkin: true,
    webhook_kanal_sayisi: 2,
  },
  rozet: { aktif: true, tiklama_sayisi: 14 },
  kaynaklar: [
    {
      id: "r1",
      baslik: "Kaygı Rehberi",
      kategori: "yazi",
      url: "https://example.com/rehber",
      tiklama_sayisi: 9,
    },
  ],
  ag: {
    baglanti_sayisi: 6,
    bekleyen_baglanti: 1,
    uzmanlik_iliskisi_sayisi: 4,
    tavsiye_verilen: 2,
    tavsiye_alinan: 3,
  },
  yonlendirme_ozeti: {
    olusturulan_link: 4,
    aktif_link: 2,
    toplam_goruntulenme: 20,
    alinan_yonlendirme: 1,
    profil_tiklamasi: 7,
  },
  davet_ozeti: { limit: 5, gonderilen: 3, kabul_edilen: 2, bekleyen: 1 },
};

describe("Admin dashboard subviews", () => {
  it("kim kaç yönlendirme linki oluşturdu ve kimlere yönlendirdi bilgisini gösterir", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AdminClientReferralsView
          data={sampleReferrals}
          loading={false}
          error=""
          retry={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("Uzm. Psk. Selin Kaya");
    expect(html).toContain("Dr. Emre Demir");
    expect(html).toContain("×4");
    expect(html).toContain("5 tık");
    expect(html).toContain("Takvim dolu");
  });

  it("genel randevularda KVKK güvence notunu ve anonim randevu satırını gösterir", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAppointmentsView
          data={sampleAppointments}
          loading={false}
          error=""
          retry={() => undefined}
          statusFilter="tumu"
          therapistFilter=""
          page={1}
          onStatusChange={() => undefined}
          onTherapistChange={() => undefined}
          onPageChange={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("KVKK koruması");
    expect(html).toContain("Uzm. Psk. Selin Kaya");
    expect(html).toContain("kvkk-2026");
    expect(html).toContain("Yanıt bekliyor");
  });

  it("kurucu programında üye ekleme ve çıkarma kontrollerini gösterir", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AdminFoundingView
          data={sampleFounding}
          loading={false}
          error=""
          retry={() => undefined}
          selectedCandidate=""
          searchTerm=""
          busy=""
          message=""
          onSelectCandidate={() => undefined}
          onSearchChange={() => undefined}
          onSaveCapacity={async () => undefined}
          onAddMember={async () => undefined}
          onRemoveMember={async () => undefined}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("Kurucu programına ekle");
    expect(html).toContain("Dr. Emre Demir");
    expect(html).toContain("#0001");
    expect(html).toContain("Programdan çıkar");
  });

  it("davet kotaları, iptal butonu ve önerileri listeler", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AdminInvitationsView
          data={sampleInvitations}
          loading={false}
          error=""
          retry={() => undefined}
          search=""
          busy=""
          message=""
          onSearchChange={() => undefined}
          onRevokeInvite={async () => undefined}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("5 limit");
    expect(html).toContain("2 kalan");
    expect(html).toContain("Daveti iptal et");
    expect(html).toContain("Ergen Terapisi");
  });

  it("uzman inceleme görünümünde profil, takvim, kaynaklar ve kurucu yönetimini birleştirir", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AdminTherapistInspectorView
          profile={sampleProfile}
          detail={sampleDetail}
          loading={false}
          error=""
          retry={() => undefined}
          inviteLimit=""
          busy=""
          busyAction=""
          message=""
          onInviteLimitChange={() => undefined}
          onSaveInviteLimit={async () => undefined}
          onToggleFounding={async () => undefined}
          onToggleApproval={async () => undefined}
          onSaveProfile={async () => undefined}
          onBack={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("Google Takvim aktif");
    expect(html).toContain("2 webhook kanalı");
    expect(html).toContain("Kurucu programından çıkar");
    expect(html).toContain("Kaygı Rehberi");
    expect(html).toContain("Limiti kaydet");
    expect(html).toContain("Yönlendirme ağı:");
  });

  it("Admin sayfası Dashboard kenar çubuğu hiyerarşisini tüm sekmelerle render eder", () => {
    for (const [path, expectedHeading] of [
      ["/yonetim", "Genel bakış ve analitik"],
      ["/yonetim?sekme=randevular", "Genel randevular"],
      ["/yonetim?sekme=uzmanlar", "Uzmanlar ve profiller"],
      ["/yonetim?sekme=kurucu", "Kurucu programı"],
      ["/yonetim?sekme=yonlendirmeler", "Danışan yönlendirmeleri"],
      ["/yonetim?sekme=referanslar", "Davet ve referanslar"],
      ["/yonetim?sekme=moderasyon", "Moderasyon"],
      ["/yonetim?sekme=denetim", "İşlem kayıtları"],
    ]) {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={[path]}>
          <Admin />
        </MemoryRouter>,
      );
      expect(html).toContain("dashboard-sidebar");
      expect(html).toContain("dashboard-mobile-nav");
      expect(html).toContain("dashboard-workspace");
      expect(html).toContain(expectedHeading);
    }
  });
});
