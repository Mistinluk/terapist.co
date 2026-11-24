import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppointmentCalendar } from "./AppointmentCalendar";
import { ProfileQrCard } from "./ProfileQrCard";
import { ProfileResources } from "./ProfileResources";
import {
  BUTTON_STYLES,
  DESIGN_STYLES,
  FONT_PAIRINGS,
  SURFACE_STYLES,
  THEME_PRESETS,
  ThemeCustomizer,
  UNSPLASH_BG_PRESETS,
} from "./ThemeCustomizer";
import { TherapistTrafficAnalyticsView } from "./TherapistTrafficAnalytics";
import { AdminTherapistInspectorView } from "./AdminTherapistInspector";
import { WaitlistModal } from "./WaitlistModal";
import { Dashboard } from "../pages/Dashboard";
import {
  ProfileHeroIdentity,
  resolveSafeBackgroundImageUrl,
} from "../pages/Profile";
import type {
  Profil,
  UzmanTrafikAnalitigi,
  YonetimUzmanDetayi,
} from "../lib/api";

const sampleTherapist: Profil = {
  id: "uzman-test-1",
  kullanici_adi: "selin-kaya",
  ad: "Uzm. Kl. Psk. Selin Kaya",
  unvan: "Klinik Psikolog",
  sehir: "İstanbul",
  ilce: "Kadıköy",
  adres: "Bağdat Caddesi",
  deneyim_yili: 8,
  ucret: 2400,
  formatlar: ["Çevrim içi", "Yüz yüze"],
  biyografi: "BDT ve Şema Terapi odaklı çalışan klinik psikolog.",
  terapi_yaklasimi: "Yapılandırılmış BDT",
  uzmanliklar: ["Kaygı Bozuklukları", "Travma"],
  ekoller: ["BDT", "Şema Terapi"],
  kitle: ["Yetişkin"],
  diller: ["Türkçe", "İngilizce"],
  egitim: ["Boğaziçi Üniversitesi"],
  egitim_universite: "Boğaziçi Üniversitesi",
  egitim_program: "Klinik Psikoloji",
  egitim_derece: "Yüksek Lisans",
  kurumlar: ["Klinik"],
  profil_fotografi_url: "",
  sosyal_baglantilar: {},
  calisma_saatleri: [{ gun: 1, baslangic: 9, bitis: 17 }],
  seans_suresi_dakika: 50,
  uye_olma: 1730000000,
  onayli: true,
  arsivli: false,
  kurucu_no: 4,
};

const sampleDetail: YonetimUzmanDetayi = {
  uzman_id: sampleTherapist.id,
  ad: sampleTherapist.ad,
  kullanici_adi: sampleTherapist.kullanici_adi,
  onayli: true,
  davet_limiti: 5,
  kurucu_no: 4,
  dogrulama_durumu: "verified",
  dogrulama_gonderilme: 1730000000,
  dogrulama_incelenme: 1730000500,
  gizlilik: {
    davet_edeni_goster: true,
    mesleki_agi_goster: true,
    uzmanlik_iliskilerini_goster: true,
    tavsiyeleri_goster: true,
    yonlendirme_agini_goster: true,
    kurucu_durumunu_goster: true,
  },
  tema: {
    bekleme_listesi_acik: true,
    tasarim_tarzi: "organik_sakin",
    tema_stili: "orman",
    vurgu_rengi: "#15803d",
    buton_stili: "yastik",
    yazi_tipi: "humanist_sakin",
    yuzey_stili: "pastel",
    terapistco_markasi_gizli: true,
    ozel_tema_yetkisi: true,
    premium_etkin: true,
    marka_gizleme_etkin: true,
  },
  bekleme_ozeti: {
    toplam: 6,
    bekliyor: 2,
    iletisime_gecildi: 4,
  },
  randevu_ozeti: {
    toplam: 18,
    bekliyor: 3,
    onaylandi: 14,
    reddedildi: 1,
    iptal: 0,
    son_7_gun: 4,
    son_30_gun: 12,
    gelecek_aktif: 5,
    onay_orani_yuzde: 77.8,
  },
  takvim: {
    bagli: true,
    durum: "aktif",
    son_senkron: 1730000900,
    webhook_etkin: true,
    webhook_kanal_sayisi: 1,
  },
  rozet: {
    aktif: true,
    tiklama_sayisi: 14,
  },
  kaynaklar: [
    {
      id: "res-1",
      baslik: "BDT Ön Görüşme Formu",
      kategori: "diger",
      url: "",
      tiklama_sayisi: 9,
      vurgulu: true,
      kilitli: true,
      medya_turu: "none",
      zaman_durumu: "aktif",
    },
    {
      id: "res-2",
      baslik: "Mindfulness Spotify Listesi",
      kategori: "podcast",
      url: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
      tiklama_sayisi: 12,
      vurgulu: false,
      kilitli: false,
      medya_turu: "spotify",
      zaman_durumu: "planli",
    },
  ],
  ag: {
    baglanti_sayisi: 4,
    bekleyen_baglanti: 0,
    uzmanlik_iliskisi_sayisi: 3,
    tavsiye_verilen: 2,
    tavsiye_alinan: 5,
  },
  yonlendirme_ozeti: {
    olusturulan_link: 1,
    aktif_link: 1,
    toplam_goruntulenme: 20,
    alinan_yonlendirme: 3,
    profil_tiklamasi: 11,
  },
  davet_ozeti: {
    limit: 5,
    gonderilen: 2,
    kabul_edilen: 1,
    bekleyen: 1,
  },
};

const sampleLinkAnalytics: UzmanTrafikAnalitigi = {
  gun: 30,
  profil_adresi: "/selin-kaya",
  ozet: {
    profil_goruntuleme: 200,
    tekil_ziyaretci: 150,
    randevu_cekmece_acilisi: 42,
    randevu_talebi: 14,
    donusum_orani_yuzde: 7.0,
    kaynak_ve_rozet_tiklamasi: 34,
    en_yuksek_kaynak: "Instagram",
  },
  gelis_kaynaklari: [
    { anahtar: "instagram", etiket: "Instagram", ziyaretci: 90, pay_yuzde: 60 },
  ],
  ziyaretci_konumlari: [{ konum: "İstanbul", ziyaretci: 110, pay_yuzde: 73.3 }],
  gunluk_egilim: [{ tarih: "2026-11-14", goruntuleme: 24, randevu_talebi: 3 }],
  profil_etkilesimleri: {
    bilgi_kaynagi_tiklama: 26,
    website_rozet_tiklama: 8,
    randevu_form_acilisi: 42,
    bekleme_listesi_basvurusu: 5,
    medya_oynatma: 19,
    qr_ziyaret: 11,
    kilitli_link_acilisi: 7,
  },
  baglanti_performansi: [
    {
      id: "res-1",
      baslik: "BDT Ön Görüşme Formu",
      kategori: "diger",
      tiklama_sayisi: 16,
      vurgulu: true,
      kilitli: true,
      medya_turu: "none",
      zaman_durumu: "aktif",
      tiklama_payi_yuzde: 61.5,
      to_orani_yuzde: 8.0,
    },
    {
      id: "res-2",
      baslik: "Mindfulness Listesi",
      kategori: "podcast",
      tiklama_sayisi: 10,
      vurgulu: false,
      kilitli: false,
      medya_turu: "spotify",
      zaman_durumu: "aktif",
      tiklama_payi_yuzde: 38.5,
      to_orani_yuzde: 5.0,
    },
  ],
  bekleme_ozeti: {
    bekleyen: 2,
    toplam_donem: 5,
  },
  oneri: {
    baslik: "Vurgulu bağlantı dönüşümü yüksek",
    aciklama: "BDT formu ziyaretçilerin %8'i tarafından açıldı.",
  },
};

describe("Linktree Pro & Mikro-Site bilesenleri", () => {
  it("WaitlistModal KVKK onaylı, klinik tanı sorusu içermeyen erişilebilir form sunar", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WaitlistModal
          open
          onClose={() => undefined}
          therapistId={sampleTherapist.id}
          therapistName={sampleTherapist.ad}
          therapistUsername={sampleTherapist.kullanici_adi}
          legalText="Kişisel verileriniz şifrelenir."
          legalVersion="taslak-1"
        />
      </MemoryRouter>,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("Bekleme listesine katıl");
    expect(html).toContain("Görüşme şekli tercihi");
    expect(html).toContain("Uygun zaman aralığı");
    expect(html).toContain("Aydınlatma metnini okudum.");
    expect(html).not.toContain("Şikayetiniz");
    expect(html).not.toContain("Tanı");
  });

  it("AppointmentCalendar dolduğunda bekleme listesi CTA butonunu gösterir", () => {
    const emptyHtml = renderToStaticMarkup(
      <MemoryRouter>
        <AppointmentCalendar
          slots={[]}
          chosen=""
          onChoose={() => undefined}
          onSubmit={() => undefined}
          busy={false}
          error=""
          legalReady
          waitlistOpen
          onOpenWaitlist={() => undefined}
        />
      </MemoryRouter>,
    );
    expect(emptyHtml).toContain("Bekleme listesine katıl");

    const openHtml = renderToStaticMarkup(
      <MemoryRouter>
        <AppointmentCalendar
          slots={["2026-11-20T09:00:00+03:00"]}
          chosen=""
          onChoose={() => undefined}
          onSubmit={() => undefined}
          busy={false}
          error=""
          legalReady
          waitlistOpen
          onOpenWaitlist={() => undefined}
        />
      </MemoryRouter>,
    );
    expect(openHtml).toContain("Bekleme listesine kaydolun");
  });

  it("ProfileQrCard SVG QR kodu ve masa kartı indirme seçeneklerini oluşturur", () => {
    const html = renderToStaticMarkup(
      <ProfileQrCard
        username={sampleTherapist.kullanici_adi}
        therapistName={sampleTherapist.ad}
        therapistTitle={sampleTherapist.unvan}
        accentColor="#15803d"
        hideBrand
      />,
    );

    expect(html).toContain("<svg");
    expect(html).toContain("/selin-kaya?utm_source=qr");
    expect(html).toContain("Masa kartını indir (PNG)");
    expect(html).toContain("Vektör olarak indir (SVG)");
  });

  it("ProfileResources sahibi modunda bağlantılar başlığı, alt aksiyon sırası, gömülü bant kaldırma ve paylaş butonunu render eder", () => {
    const initialResources = [
      {
        id: "res-1",
        baslik: "Deneme",
        aciklama: "Nasıl isterseniz onlar olur arkadaşlar.",
        url: "https://example.com/deneme",
        kategori: "yazi" as const,
        sira: 0,
        tiklama_sayisi: 2,
        medya_turu: "none" as const,
      },
      {
        id: "res-2",
        baslik: "Tanıtım Videosu",
        aciklama: "",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        kategori: "diger" as const,
        sira: 1,
        tiklama_sayisi: 0,
        medya_turu: "youtube" as const,
        medya_embed_url: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      },
    ];

    const ownerHtml = renderToStaticMarkup(
      <ProfileResources
        therapistId={sampleTherapist.id}
        isOwner
        initialResources={initialResources}
      />,
    );

    expect(ownerHtml).toContain("BAĞLANTILAR VE KAYNAKLAR");
    expect(ownerHtml).toContain("Bağlantı ekle");
    expect(ownerHtml).toContain("resource-link-shell");
    expect(ownerHtml).toContain("resource-share-button");
    expect(ownerHtml).toContain("Deneme bağlantısını paylaş");
    expect(ownerHtml).toContain("resource-row-owner-bar");
    expect(ownerHtml).toContain("2 açılış");
    expect(ownerHtml).not.toContain("resource-embed-footer");
    expect(ownerHtml).not.toContain("Yeni sekmede aç");
    expect(ownerHtml.indexOf("resource-row-main")).toBeLessThan(
      ownerHtml.indexOf("resource-row-owner-bar"),
    );

    const visitorHtml = renderToStaticMarkup(
      <ProfileResources
        therapistId={sampleTherapist.id}
        isOwner={false}
        initialResources={initialResources}
      />,
    );
    expect(visitorHtml).toContain("resource-embed-frame is-youtube");
    expect(visitorHtml).not.toContain("resource-embed-footer");
    expect(visitorHtml).toContain("resource-share-button");
    expect(visitorHtml).not.toContain("resource-row-owner-bar");
  });

  it("ThemeCustomizer 4 tasarım tarzı, font, buton, zemin ve QR stüdyosunu CSP-güvenli sunar", () => {
    expect(DESIGN_STYLES.map((item) => item.label)).toEqual([
      "Klinik Modern",
      "Editoryal Klinik",
      "Doğal sakinlik",
      "Yumuşak cam",
    ]);
    expect(THEME_PRESETS).toHaveLength(8);
    expect(BUTTON_STYLES).toHaveLength(6);
    expect(BUTTON_STYLES.map((item) => item.label)).toContain("Çerçeveli");
    expect(BUTTON_STYLES.map((item) => item.label)).toContain("Buzlu Cam");
    expect(FONT_PAIRINGS).toHaveLength(4);
    expect(FONT_PAIRINGS.map((item) => item.label)).toContain(
      "Editoryal Serif",
    );
    expect(SURFACE_STYLES).toHaveLength(4);
    expect(SURFACE_STYLES.map((item) => item.label)).toContain("Sıcak Fildişi");
    expect(UNSPLASH_BG_PRESETS.length).toBeGreaterThanOrEqual(6);
    expect(
      UNSPLASH_BG_PRESETS.every((item) =>
        item.url.startsWith("https://images.unsplash.com/"),
      ),
    ).toBe(true);

    const customizerHtml = renderToStaticMarkup(
      <MemoryRouter>
        <ThemeCustomizer
          profile={sampleTherapist}
          initialTheme={{
            bekleme_listesi_acik: true,
            tasarim_tarzi: "klinik_modern",
            tema_stili: "klasik",
            vurgu_rengi: "#3459d1",
            buton_stili: "yuvarlak",
            yazi_tipi: "modern_sans",
            yuzey_stili: "temiz",
            arka_plan_gorseli_url: UNSPLASH_BG_PRESETS[0].url,
            terapistco_markasi_gizli: false,
            ozel_tema_yetkisi: false,
            premium_etkin: false,
            marka_gizleme_etkin: false,
          }}
        />
      </MemoryRouter>,
    );
    expect(customizerHtml).toContain("/selin-kaya?utm_source=qr");
    expect(customizerHtml).toContain("Arka plan görseli");
    expect(customizerHtml).toContain('id="theme-bg-image-url"');
    expect(customizerHtml).toContain("Sakin Kıyı");
    expect(customizerHtml).toContain("microsite-preview-frame has-bg-image");
    expect(customizerHtml).toContain("microsite-preview-backdrop");
    expect(customizerHtml).toContain(
      UNSPLASH_BG_PRESETS[0].url.replace(/&/g, "&amp;"),
    );
    expect(customizerHtml).not.toMatch(/\sstyle="/);

    const dashHtml = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/panel?sekme=gorunum"]}>
        <Dashboard />
      </MemoryRouter>,
    );
    expect(dashHtml).toContain("Görünüm ve QR kodu");
    expect(dashHtml).not.toContain('style="');
  });

  it("TherapistTrafficAnalyticsView bağlantı dönüşüm oranlarını ve yeni etkileşimleri CSP-güvenli sunar", () => {
    const html = renderToStaticMarkup(
      <TherapistTrafficAnalyticsView
        data={sampleLinkAnalytics}
        onEditProfile={() => undefined}
        onOpenBadge={() => undefined}
      />,
    );

    expect(html).toContain("BDT Ön Görüşme Formu");
    expect(html).toContain("Vurgulu");
    expect(html).toContain("Şifreli");
    expect(html).toContain("Spotify");
    expect(html).toContain("%61,5 pay · %8 T.O.");
    expect(html).toContain("Bekleme listesi başvurusu");
    expect(html).toContain("Gömülü medya oynatma");
    expect(html).toContain("QR kart taraması");
    expect(html).toContain("Şifreli bağlantı açılışı");
    expect(html).toContain('<progress class="analytics-link-progress"');
    const linkSection = html.slice(
      html.indexOf("analytics-link-performance-card"),
      html.indexOf("growth-next"),
    );
    expect(linkSection).not.toContain('style="');
  });

  it("AdminTherapistInspectorView tema yetkisi, anonim bekleme sayısı ve Pro link etiketlerini gösterir", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AdminTherapistInspectorView
          profile={sampleTherapist}
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
          onToggleThemeEntitlement={async () => undefined}
          onSaveProfile={async () => undefined}
          onBack={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("Tema ve marka görünürlüğü");
    expect(html).toContain("#15803d");
    expect(html).toContain("Özel tema yetkisini kaldır");
    expect(html).toContain(
      "Bekleme listesi: 2 bekliyor · 4 dönüş yapıldı (6 toplam)",
    );
    expect(html).toContain("Vurgulu");
    expect(html).toContain("Şifreli");
    expect(html).toContain("Spotify");
    expect(html).toContain("Planlı");
  });

  it("ProfileHeroIdentity kurucu çemberi, hizalı onay rozeti ve ekol yerleşimini doğru uygular", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ProfileHeroIdentity
          profile={{
            ...sampleTherapist,
            ad: "Uzm. Klinik Psikolog Dr. Ayşe Nur Demircioğlu",
            profil_fotografi_url: "https://example.com/avatar.jpg",
            sosyal_baglantilar: {
              instagram: "https://instagram.com/deneme",
            },
          }}
          isOwner={false}
          onOpenQr={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(html).not.toContain("Onaylı profil");
    expect(html).not.toContain("founder-badge");
    expect(html).not.toContain("avatar-initials");
    expect(html).toContain("bento-identity-bar");
    expect(html).toContain("profile-brand-mark");
    expect(html).toContain('/brand/terapistco-icon.png"');
    expect(html).toContain("profile-corner-qr");
    expect(html).toContain("bento-avatar is-founding is-verified");
    expect(html).toContain("Kurucu #0004");
    expect(html).toContain('aria-label="Kurucu terapist #0004"');
    expect(html).toContain("profile-name-row has-verified");
    expect(html).toContain("Doğrulanmış Uzman");
    expect(html.indexOf("bento-identity-bar")).toBeLessThan(
      html.indexOf("bento-avatar-stack"),
    );
    expect(html.indexOf("bento-avatar-stack")).toBeLessThan(
      html.indexOf("bento-approaches"),
    );
    expect(html.indexOf("bento-approaches")).toBeLessThan(
      html.indexOf("profile-name-row"),
    );

    const whiteLabelHtml = renderToStaticMarkup(
      <MemoryRouter>
        <ProfileHeroIdentity
          profile={sampleTherapist}
          isOwner={false}
          hideBrand
          onOpenQr={() => undefined}
        />
      </MemoryRouter>,
    );
    expect(whiteLabelHtml).not.toContain("profile-brand-mark");
    expect(whiteLabelHtml).toContain("profile-corner-qr");

    const pendingHtml = renderToStaticMarkup(
      <MemoryRouter>
        <ProfileHeroIdentity
          profile={{
            ...sampleTherapist,
            onayli: false,
            kurucu_no: null,
          }}
          isOwner={false}
          onOpenQr={() => undefined}
        />
      </MemoryRouter>,
    );
    expect(pendingHtml).toContain("Profil inceleme aşamasında");
    expect(pendingHtml).not.toContain("is-founding");
    expect(pendingHtml).not.toContain("has-verified");

    const verifiedOnlyHtml = renderToStaticMarkup(
      <MemoryRouter>
        <ProfileHeroIdentity
          profile={{
            ...sampleTherapist,
            kurucu_no: null,
          }}
          isOwner={false}
          onOpenQr={() => undefined}
        />
      </MemoryRouter>,
    );
    expect(verifiedOnlyHtml).toContain("bento-avatar is-verified");
    expect(verifiedOnlyHtml).not.toContain("is-founding");
    expect(verifiedOnlyHtml).not.toContain("founding-ring-badge");
    expect(verifiedOnlyHtml).toContain("profile-name-row has-verified");
  });

  it("resolveSafeBackgroundImageUrl yalnız güvenli HTTPS görsel adreslerini kabul eder", () => {
    const unsplash =
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80";
    expect(resolveSafeBackgroundImageUrl(unsplash)).toBe(unsplash);
    expect(resolveSafeBackgroundImageUrl("  " + unsplash + " ")).toBe(unsplash);
    expect(resolveSafeBackgroundImageUrl(unsplash, true)).toBe("");
    expect(resolveSafeBackgroundImageUrl("http://images.unsplash.com/x")).toBe(
      "",
    );
    expect(resolveSafeBackgroundImageUrl("javascript:alert(1)")).toBe("");
    expect(resolveSafeBackgroundImageUrl("")).toBe("");
  });
});
