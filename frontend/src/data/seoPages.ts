export type SeoCategory = "karsilastirma" | "cozumler" | "rehber";

export type SeoComparisonRow = {
  feature: string;
  terapistCo: string;
  competitor: string;
  terapistHighlight?: boolean;
};

export type SeoPillar = {
  badge: string;
  title: string;
  description: string;
};

export type SeoStep = {
  number: string;
  title: string;
  text: string;
};

export type SeoFaqItem = {
  question: string;
  answer: string;
};

export type SeoMetricSummary = {
  label: string;
  terapistValue: string;
  competitorValue: string;
};

export type SeoPageData = {
  slug: string;
  path: string;
  category: SeoCategory;
  categoryLabel: string;
  footerLabel: string;
  eyebrow: string;
  titleDark: string;
  titleAccent: string;
  metaTitle: string;
  metaDescription: string;
  lead: string;
  competitorName: string;
  terapistTagline: string;
  competitorTagline: string;
  heroMetrics: SeoMetricSummary[];
  comparisonTitle: string;
  comparisonSubtitle: string;
  comparisonRows: SeoComparisonRow[];
  pillarsEyebrow: string;
  pillarsTitle: string;
  pillarsSubtitle: string;
  pillars: [SeoPillar, SeoPillar, SeoPillar];
  stepsTitle: string;
  stepsSubtitle: string;
  steps: [SeoStep, SeoStep, SeoStep];
  faqs: SeoFaqItem[];
};

export const SEO_PAGES: SeoPageData[] = [
  // ============================================================================
  // 1. KARŞILAŞTIRMA SAYFALARI (/karsilastirma/:slug)
  // ============================================================================
  {
    slug: "terapistco-vs-linktree",
    path: "/karsilastirma/terapistco-vs-linktree",
    category: "karsilastirma",
    categoryLabel: "Karşılaştırma",
    footerLabel: "Terapist.co vs Linktr.ee",
    eyebrow: "KARŞILAŞTIRMA · TERAPİST.CO VS LINKTR.EE",
    titleDark: "Terapist.co vs Linktr.ee:",
    titleAccent: "psikologlar için hangisi doğru seçim?",
    metaTitle:
      "Terapist.co vs Linktr.ee | Psikologlar İçin Linktree Alternatifi",
    metaDescription:
      "Klinik psikologlar ve terapistler için Terapist.co ile Linktr.ee karşılaştırması: Doğrulanmış uzman rozeti, şifreli BDT/Şema formları, randevu takvimi ve KVKK uyumu.",
    lead: "Linktr.ee içerik üreticileri ve e-ticaret markaları için harika bir genel bağlantı aracıdır; ancak klinik psikologların ihtiyaç duyduğu diploma doğrulaması, şifreli değerlendirme formları, Google Takvim eşitlemeli randevu akışı ve etik meslektaş yönlendirme ağı yalnızca Terapist.co'da yerleşik olarak sunulur.",
    competitorName: "Linktr.ee",
    terapistTagline:
      "Klinik psikologlar ve terapistler için uzmanlık altyapısı",
    competitorTagline:
      "Genel amaçlı sosyal medya ve içerik üreticisi bağlantı listesi",
    heroMetrics: [
      {
        label: "Mesleki Diploma Doğrulaması",
        terapistValue: "Yerleşik Uzman Rozeti",
        competitorValue: "Yok (Herkes hesap açabilir)",
      },
      {
        label: "Şifreli BDT & Şema Formları",
        terapistValue: "Danışana özel PIN korumalı",
        competitorValue: "Klinik form kilidi yok",
      },
      {
        label: "Randevu & Google Takvim",
        terapistValue: "Tam entegre + Bekleme listesi",
        competitorValue: "Üçüncü parti araç gerekir",
      },
      {
        label: "Etik Meslektaş Yönlendirme",
        terapistValue: "terapist.co/r/... referans ağı",
        competitorValue: "Yok",
      },
    ],
    comparisonTitle: "Terapist.co ve Linktr.ee Özellik Karşılaştırması",
    comparisonSubtitle:
      "Bir ruh sağlığı uzmanı olarak dijital profilinizde danışan güveni ve klinik işlevsellik açısından iki platformun temel farkları.",
    comparisonRows: [
      {
        feature: "Alan Adı ve Mesleki İtibar",
        terapistCo:
          "terapist.co/adiniz — İlk bakışta mesleki kimlik ve güven verir",
        competitor:
          "linktr.ee/adiniz — Fenomen, mağaza ve genel hesaplarla aynı uzantı",
        terapistHighlight: true,
      },
      {
        feature: "Uzmanlık ve Diploma Doğrulaması",
        terapistCo:
          "Yönetici onaylı 'Doğrulanmış Uzman' ve Founding Therapist rozeti",
        competitor:
          "Mesleki doğrulama yok; sahte veya yetkisiz profiller ayırt edilemez",
        terapistHighlight: true,
      },
      {
        feature: "Şifreli Klinik Formlar (Link Lock)",
        terapistCo:
          "BDT ve Şema ölçeklerini yalnızca şifreyi bilen danışanlarınız açabilir",
        competitor:
          "Klinik form sınıflandırması ve danışan odaklı şifreli erişim yok",
        terapistHighlight: true,
      },
      {
        feature: "Online Randevu & Google Takvim",
        terapistCo:
          "Haftalık saatler, çakışma önleyici Google Takvim ve bekleme listesi",
        competitor:
          "Harici ücretli takvim aboneliği (Calendly vb.) bağlamayı gerektirir",
        terapistHighlight: true,
      },
      {
        feature: "Klinik Veri Minimasyonu (KVKK)",
        terapistCo:
          "Tanı ve terapi notu toplamayan, Türkiye KVKK odaklı mimari",
        competitor:
          "Pazarlama çerezleri ve yurt dışı reklam pikseli odaklı altyapı",
        terapistHighlight: true,
      },
      {
        feature: "Meslektaş Ağı ve Etik Yönlendirme",
        terapistCo:
          "Karşılıklı onaylı meslektaş bağları ve terapist.co/r/... yönlendirme linki",
        competitor: "Mesleki referans veya süpervizyon ağı özelliği bulunmuyor",
        terapistHighlight: true,
      },
      {
        feature: "Görüşme Odası Masa QR Kartı",
        terapistCo:
          "Baskıya hazır PNG/SVG klinik masa kartı ve canlı web doğrulama rozeti",
        competitor: "Yalnızca standart QR kod görseli",
        terapistHighlight: true,
      },
      {
        feature: "Terapi Ekolü ve Danışan Filtresi",
        terapistCo:
          "Şema Terapi, BDT, EMDR, Çift Terapisi gibi yapılandırılmış klinik dizin",
        competitor: "Arama motoru veya uzmanlık dizini desteği yok",
        terapistHighlight: true,
      },
    ],
    pillarsEyebrow: "NEDEN TERAPİST.CO?",
    pillarsTitle: "Genel link listesi yerine klinik mikro-site.",
    pillarsSubtitle:
      "Danışanlarınız Instagram veya Google üzerinden profilinize tıkladığında sıradan bir buton listesi değil, güven veren bir uzman sayfası görür.",
    pillars: [
      {
        badge: "KLİNİK GÜVEN",
        title: "terapist.co/adiniz uzantısıyla anında mesleki prestij",
        description:
          "Sosyal medya biyografinizde terapist.co/adiniz paylaşmak, ziyaretçiye daha tıklamadan önce doğrulanmış bir ruh sağlığı uzmanıyla karşılaştığını hissettirir.",
      },
      {
        badge: "HEPSİ BİR ARADA",
        title: "Link ağacı + Takvim + Formlar + QR Kart tek panelde",
        description:
          "Linktr.ee kullanırken ayrıca takvim aracı, form aracı ve QR oluşturucu yönetmek yerine tüm klinik dijital araçlarınızı tek çalışma alanından yönetin.",
      },
      {
        badge: "ETİK MİMARİ",
        title: "Puanlama, yıldız veya yanıltıcı yorum olmadan şeffaf tanıtım",
        description:
          "Terapi sürecini ticari bir ürün gibi yıldızlayan sistemlerin aksine, eğitiminizi, çalıştığınız ekolleri ve meslektaş bağlarınızı etik çerçevede sunun.",
      },
    ],
    stepsTitle: "Linktr.ee'den Terapist.co'ya 3 dakikada geçin.",
    stepsSubtitle:
      "Mevcut bağlantılarınızı kaybetmeden çok daha güçlü bir klinik profile geçiş yapın.",
    steps: [
      {
        number: "01",
        title: "İsminize özel terapist.co adresinizi alın",
        text: "Hero alanındaki kutudan terapist.co/adinizsoyadiniz adresinizi seçin ve uzman başvurunuzu tamamlayın.",
      },
      {
        number: "02",
        title: "Linklerinizi, formlarınızı ve takviminizi ekleyin",
        text: "Daha önce paylaştığınız kaynakları, YouTube/Spotify içeriklerinizi, şifreli BDT/Şema formlarınızı ve uygun saatlerinizi aktarın.",
      },
      {
        number: "03",
        title: "Instagram ve LinkedIn biyografinizi güncelleyin",
        text: "Onaylanan terapist.co adresinizi sosyal medya profillerinize ekleyin ve ziyaretçi dönüşüm istatistiklerinizi takip edin.",
      },
    ],
    faqs: [
      {
        question:
          "Linktr.ee'deki tüm bağlantılarımı Terapist.co'da da paylaşabilir miyim?",
        answer:
          "Evet. Terapist.co üzerinde sınırsız dış bağlantı ekleyebilir, bunlara ek olarak şifreli danışan formları (Link Lock), süresi dolunca gizlenen grup terapisi/atölye linkleri, gömülü Spotify/YouTube oynatıcıları ve vurgulanan kriz/randevu butonları tanımlayabilirsiniz.",
      },
      {
        question:
          "Danışanlarım Terapist.co profilimden doğrudan randevu talep edebilir mi?",
        answer:
          "Evet. Linktr.ee'nin aksine Terapist.co'da yerleşik haftalık randevu takvimi ve Google Takvim eşitlemesi bulunur. Takviminiz doluysa tek tıkla Bekleme Listesi modalını aktif edebilirsiniz.",
      },
      {
        question:
          "Profil görünümümü kendi klinik renklerime göre özelleştirebilir miyim?",
        answer:
          "Evet. Klinik Klasik, Modern Bento, Sıcak Minimal ve Yumuşak Cam olmak üzere 4 tasarım tarzı, 8 renk paleti, 6 buton yapısı, tipografi eşleşmeleri ve White-Label moduyla profilinizi tamamen kişiselleştirebilirsiniz.",
      },
      {
        question: "Terapist.co randevulardan komisyon alır mı?",
        answer:
          "Hayır. Terapist.co bir komisyon pazaryeri değildir; görüşme ücretiniz ve danışan ilişkiniz tamamen sizin kontrolünüzdedir.",
      },
    ],
  },
  {
    slug: "terapistco-vs-klasik-web-sitesi",
    path: "/karsilastirma/terapistco-vs-klasik-web-sitesi",
    category: "karsilastirma",
    categoryLabel: "Karşılaştırma",
    footerLabel: "Terapist.co vs Klasik Web Sitesi",
    eyebrow: "KARŞILAŞTIRMA · TERAPİST.CO VS KLASİK WEB SİTESİ",
    titleDark: "Terapist.co vs Klasik Web Sitesi:",
    titleAccent: "teknik yük olmadan profesyonel klinik vitrin.",
    metaTitle:
      "Terapist.co vs Klasik Psikolog Web Sitesi | Hız, Maliyet ve SEO Karşılaştırması",
    metaDescription:
      "Kişisel psikolog web sitesi yaptırmak mı yoksa Terapist.co mikro-sitesi mi? Hosting, SSL, randevu takvimi, şifreli formlar ve SEO avantajlarını karşılaştırın.",
    lead: "Ajanslara yüksek bütçeler ödeyip aylarca WordPress kurulumu, SSL sertifikası, eklenti güncellemeleri ve mobil uyum sorunlarıyla uğraşmak yerine; klinik psikologlar için hazır tasarlanmış, hızlı ve doğrulanmış mikro-sitenizi dakikalar içinde yayına alın.",
    competitorName: "Klasik Web Sitesi",
    terapistTagline:
      "Dakikalar içinde hazır, sıfır teknik bakım gerektiren klinik profil",
    competitorTagline:
      "Yüksek kurulum maliyeti, sürekli teknik bakım ve eklenti yönetimi",
    heroMetrics: [
      {
        label: "Kurulum Süresi",
        terapistValue: "3 Dakikada Hazır",
        competitorValue: "3 – 8 Hafta Ajans Süreci",
      },
      {
        label: "Teknik Bakım & Güvenlik",
        terapistValue: "Tamamen Otomatik",
        competitorValue: "Hosting, SSL ve Eklenti Yükü",
      },
      {
        label: "Şifreli Form & Takvim",
        terapistValue: "Yerleşik ve Hazır",
        competitorValue: "Ek Yazılım & Entegrasyon Gerekir",
      },
      {
        label: "Doğrulanmış Uzman Rozeti",
        terapistValue: "Yerleşik Güven Sinyali",
        competitorValue: "Bağımsız doğrulama kanıtı yok",
      },
    ],
    comparisonTitle:
      "Terapist.co Mikro-Site vs Klasik WordPress / Ajans Sitesi",
    comparisonSubtitle:
      "Bireysel çalışan veya kliniğini büyüten uzmanlar için zaman, maliyet ve dönüşüm odaklı karşılaştırma.",
    comparisonRows: [
      {
        feature: "Yayına Alma Hızı",
        terapistCo: "Adım adım başvuru sihirbazıyla aynı gün içinde hazır",
        competitor: "Tasarım, kodlama ve revizyonlarla haftalar süren süreç",
        terapistHighlight: true,
      },
      {
        feature: "Mobil Deneyim & Hız",
        terapistCo:
          "Instagram ve WhatsApp içi tarayıcılarda anında açılan ultra hafif arayüz",
        competitor:
          "Ağır temalar ve eklentiler nedeniyle mobilde yavaş açılma riski",
        terapistHighlight: true,
      },
      {
        feature: "Randevu ve Google Takvim",
        terapistCo: "Tek tıkla Google Takvim eşitlemesi ve bekleme listesi",
        competitor:
          "Ücretli randevu eklentileri ve karmaşık SMTP e-posta ayarları",
        terapistHighlight: true,
      },
      {
        feature: "Üçüncü Taraf Uzman Doğrulaması",
        terapistCo:
          "Bağımsız yönetici incelemesinden geçmiş 'Doğrulanmış Uzman' rozeti",
        competitor:
          "Site sahibinin kendi beyanı dışında bağımsız doğrulama yok",
        terapistHighlight: true,
      },
      {
        feature: "Mevcut Web Sitenizle Birlikte Kullanım",
        terapistCo:
          "Canlı SVG doğrulama rozetini mevcut sitenize tek satır kodla ekleyebilirsiniz",
        competitor: "Yalnızca statik tanıtım sayfaları",
        terapistHighlight: true,
      },
      {
        feature: "Meslektaş Ağı ve Dizin Görünürlüğü",
        terapistCo:
          "Hem kişisel adresiniz hem de Terapist.co keşfet dizininde organik görünürlük",
        competitor:
          "Sıfırdan domain otoritesi kazanmak için uzun süreli SEO bütçesi gerekir",
        terapistHighlight: true,
      },
    ],
    pillarsEyebrow: "NEDEN MİKRO-SİTE?",
    pillarsTitle: "Teknik detaylarla değil, danışanlarınızla ilgilenin.",
    pillarsSubtitle:
      "Klasik bir web sitesinin getirdiği sunucu, güvenlik ve güncelleme yükünü tamamen ortadan kaldırıyoruz.",
    pillars: [
      {
        badge: "SIFIR TEKNİK YÜK",
        title: "Sunucu, SSL veya bozulan eklenti derdi yok",
        description:
          "Sağlık alanında güvenli bağlantı ve KVKK uyumu kritiktir. Terapist.co tüm altyapı güvenliğini, hız optimizasyonunu ve mobil uyumu sizin yerinize yönetir.",
      },
      {
        badge: "YÜKSEK DÖNÜŞÜM",
        title: "Danışanın aradığı her bilgi tek ekranda, net hiyerarşide",
        description:
          "Karmaşık menüler arasında kaybolan ziyaretçiler yerine; uzmanlığınızı, ücretinizi, uygun saatlerinizi ve kaynaklarınızı tek bakışta sunan modern yapı.",
      },
      {
        badge: "HİBRİT KULLANIM",
        title: "İster tek başına siteniz, ister mevcut sitenizin randevu üssü",
        description:
          "Halihazırda bir blog veya kurumsal siteniz varsa Terapist.co'yu sosyal medya karşılama sayfanız, randevu motorunuz ve canlı doğrulama rozetiniz olarak kullanabilirsiniz.",
      },
    ],
    stepsTitle: "Ajans beklemeden kendi dijital kliniğinizi kurun.",
    stepsSubtitle:
      "Kodlama veya tasarım bilgisi gerekmeden 3 adımda yayına çıkın.",
    steps: [
      {
        number: "01",
        title: "Kalıcı terapist.co adresinizi rezerve edin",
        text: "İsminizle eşleşen terapist.co/adiniz adresini seçin ve mesleki unvanınızı tanımlayın.",
      },
      {
        number: "02",
        title: "4 hazır klinik temadan tarzınızı seçin",
        text: "Klinik Klasik, Modern Bento, Sıcak Minimal veya Yumuşak Cam temalarından birini ve renk paletinizi belirleyin.",
      },
      {
        number: "03",
        title: "Takviminizi ve şifreli formlarınızı açın",
        text: "Çalışma saatlerinizi girin, Google Takviminizi bağlayın ve masa QR kartınızı indirerek kliniğinizde kullanmaya başlayın.",
      },
    ],
    faqs: [
      {
        question: "Zaten bir web sitem varsa Terapist.co bana ne kazandırır?",
        answer:
          "Mevcut web sitenize canlı 'Doğrulanmış Terapist' rozeti ekleyebilir, Instagram/LinkedIn trafiğinizi çok daha hızlı dönüşüm sağlayan terapist.co/adiniz mikro-sitenize yönlendirebilir ve şifreli BDT/Şema form kilidi ile meslektaş yönlendirme ağından yararlanabilirsiniz.",
      },
      {
        question:
          "Arama motorlarında (Google) ismim arandığında profilim çıkar mı?",
        answer:
          "Evet. Doğrulanmış tüm uzman profilleri Schema.org/Person yapısal verisi, dinamik meta etiketleri ve otomatik sitemap.xml kaydıyla Google'da isminiz ve uzmanlık alanlarınızla hızla indekslenir.",
      },
      {
        question:
          "Profilimdeki bilgileri istediğim zaman değiştirebilir miyim?",
        answer:
          "Evet. Yazılımcıya veya ajansa ihtiyaç duymadan çalışma alanınızdan ücretinizi, saatlerinizi, biyografinizi, temalarınızı ve linklerinizi saniyeler içinde güncelleyebilirsiniz.",
      },
    ],
  },
  {
    slug: "terapistco-vs-pazaryerleri",
    path: "/karsilastirma/terapistco-vs-pazaryerleri",
    category: "karsilastirma",
    categoryLabel: "Karşılaştırma",
    footerLabel: "Terapist.co vs Randevu Pazaryerleri",
    eyebrow: "KARŞILAŞTIRMA · TERAPİST.CO VS PAZARYERLERİ",
    titleDark: "Terapist.co vs Pazaryerleri:",
    titleAccent: "komisyonsuz ve bağımsız mesleki kimlik.",
    metaTitle: "Terapist.co vs Pazaryerleri | Komisyonsuz Psikolog Platformu",
    metaDescription:
      "Yüksek seans komisyonları ve yıldızlı puanlama dayatan online terapi pazaryerleri yerine, Terapist.co ile %0 komisyonlu bağımsız klinik profilinizi oluşturun.",
    lead: "Online terapi pazaryerleri her seanstan yüksek komisyon keser, profilinizin altında rakip uzmanları önerir ve terapi sürecini yıldızlı müşteri yorumlarıyla ticari bir yarışa sokar. Terapist.co ise bağımsızlığınızı koruyan, %0 komisyonlu kişisel dijital adresinizdir.",
    competitorName: "Terapi Pazaryerleri",
    terapistTagline:
      "%0 seans komisyonu, etik tanıtım ve tamamen size ait dijital adres",
    competitorTagline:
      "Yüksek seans kesintileri, yıldız puanlaması ve algoritmik sıralama",
    heroMetrics: [
      {
        label: "Seans Başına Komisyon",
        terapistValue: "%0 (Komisyonsuz)",
        competitorValue: "%25 – %45 Kesinti",
      },
      {
        label: "Klinik Etik & Tanıtım",
        terapistValue: "Yıldız/Puanlama Yok",
        competitorValue: "Ticari yıldız ve yorum baskısı",
      },
      {
        label: "Danışan İlişkisi",
        terapistValue: "Doğrudan Uzman Kontrolünde",
        competitorValue: "Platform aracılığına bağımlı",
      },
      {
        label: "Sayfa İçi Rakip Gösterimi",
        terapistValue: "Yalnızca Sizin Seçtiğiniz Meslektaşlar",
        competitorValue: "Otomatik alternatif uzman reklamları",
      },
    ],
    comparisonTitle: "Bağımsız Uzman Profili vs Komisyonlu Pazaryerleri",
    comparisonSubtitle:
      "Mesleki özerklik, gelir kontrolü ve klinik etik açısından Terapist.co'nun pazaryeri platformlarından farkı.",
    comparisonRows: [
      {
        feature: "Gelir ve Ücret Politikası",
        terapistCo:
          "Seans ücretinizi kendiniz belirlersiniz; hiçbir randevudan komisyon alınmaz",
        competitor:
          "Seans ücretinin önemli bir kısmı platform komisyonu olarak kesilir",
        terapistHighlight: true,
      },
      {
        feature: "Etik Duruş ve Değerlendirme",
        terapistCo:
          "Yıldız, puan veya doğrulanamaz hasta yorumu barındırmaz; uzmanlık ve eğitimi öne çıkarır",
        competitor:
          "E-ticaret mantığıyla 5 yıldız puanlaması ve algoritmik vitrin sıralaması",
        terapistHighlight: true,
      },
      {
        feature: "Marka ve Alan Adı Sahipliği",
        terapistCo:
          "White-Label desteği ve terapist.co/adiniz ile kendi klinik kimliğiniz",
        competitor:
          "Platformun kendi markası ön plandadır; uzmanlar liste elemanı gibidir",
        terapistHighlight: true,
      },
      {
        feature: "Meslektaş Yönlendirmesi",
        terapistCo:
          "Yalnızca sizin güvendiğiniz ve onayladığınız meslektaşlarınız profilinizde yer alır",
        competitor:
          "Profilinizin altında algoritmanın seçtiği başka terapistler önerilir",
        terapistHighlight: true,
      },
      {
        feature: "Klinik Veri Gizliliği",
        terapistCo:
          "Görüşme odası veya terapi notu tutulmaz; veri minimasyonu esastır",
        competitor:
          "Tüm mesajlaşma ve seans trafiği merkezi platform sunucularından geçer",
        terapistHighlight: true,
      },
    ],
    pillarsEyebrow: "MESLEKİ ÖZERKLİK",
    pillarsTitle: "Kendi pratiğinizin kurallarını siz belirleyin.",
    pillarsSubtitle:
      "Terapist.co, klinik psikologların bağımsız çalışırken kurumsal bir dijital altyapıya sahip olması için tasarlandı.",
    pillars: [
      {
        badge: "%0 KOMİSYON",
        title: "Emeğinizin karşılığı kesintisiz sizin kalır",
        description:
          "Randevu talepleriniz doğrudan çalışma alanınıza düşer. Seans ücretiniz üzerinden hiçbir aracılık veya yönlendirme komisyonu ödemezsiniz.",
      },
      {
        badge: "ETİK ÇERÇEVE",
        title: "Ruh sağlığı etiğine saygılı tanıtım standardı",
        description:
          "Tedavi garantisi veren ifadeler, manipülatif yorumlar veya reklam sıralamaları yerine; eğitim, ekol, süpervizyon ve doğrulanmış kimlik bilgisi sunulur.",
      },
      {
        badge: "GERÇEK MESLEKTAŞ AĞI",
        title: "Algoritmik rekabet yerine dayanışma ve etik referans",
        description:
          "Çalışmadığınız bir danışan grubu geldiğinde terapist.co/r/... bağlantısıyla güvendiğiniz doğrulanmış bir meslektaşınıza şeffaf biçimde yönlendirin.",
      },
    ],
    stepsTitle: "Bağımsız dijital pratiğinize hemen başlayın.",
    stepsSubtitle:
      "Üç adımda kendi adresinizi sahiplenin ve komisyonsuz randevu akışına geçin.",
    steps: [
      {
        number: "01",
        title: "terapist.co/adiniz adresinizi seçin",
        text: "Size özel kısa profil adresinizi oluşturun ve uzmanlık bilgilerinizi girin.",
      },
      {
        number: "02",
        title: "Doğrulama ile güven rozetinizi alın",
        text: "Mezuniyet ve uzmanlık bilgileriniz incelendikten sonra Doğrulanmış Uzman rozetiniz aktifleşir.",
      },
      {
        number: "03",
        title: "Doğrudan randevu talepleri alın",
        text: "Sosyal medya, Google ve QR masa kartınızdan gelen danışan taleplerini komisyonsuz yönetin.",
      },
    ],
    faqs: [
      {
        question:
          "Terapist.co üzerinden gelen danışanlar için seans ücreti kesintisi var mı?",
        answer:
          "Hayır, kesinlikle yoktur. Terapist.co seanslarınızdan veya randevu taleplerinizden hiçbir komisyon almaz.",
      },
      {
        question: "Profilimde neden danışan yorumları veya yıldız puanı yok?",
        answer:
          "Klinik psikoloji ve psikoterapi ilkeleri gereği, terapi sürecinin gizliliği ve etik sınırlar nedeniyle yanıltıcı olabilen yıldız/yorum sistemlerine yer vermiyoruz. Bunun yerine diploma doğrulaması, eğitim geçmişi ve doğrulanmış meslektaş bağlarını görünür kılıyoruz.",
      },
      {
        question: "Profilimde başka uzmanların reklamı çıkar mı?",
        answer:
          "Hayır. Profiliniz tamamen size aittir. Yalnızca siz isterseniz, kendi seçtiğiniz ve karşılıklı onaylaştığınız meslektaşlarınızı profilinizde gösterebilirsiniz.",
      },
    ],
  },
  {
    slug: "terapistco-vs-calendly",
    path: "/karsilastirma/terapistco-vs-calendly",
    category: "karsilastirma",
    categoryLabel: "Karşılaştırma",
    footerLabel: "Terapist.co vs Takvim Araçları",
    eyebrow: "KARŞILAŞTIRMA · TERAPİST.CO VS CALENDLY",
    titleDark: "Terapist.co vs Calendly:",
    titleAccent: "satış toplantısı değil, klinik randevu deneyimi.",
    metaTitle:
      "Terapist.co vs Calendly | Psikologlar İçin Online Randevu ve Takvim Sistemi",
    metaDescription:
      "Genel toplantı araçları (Calendly vb.) yerine psikologlar için geliştirilmiş Terapist.co akıllı takvim, Google Takvim eşitlemesi, bekleme listesi ve KVKK aydınlatma akışı.",
    lead: "Calendly gibi araçlar kurumsal satış ve iş toplantıları için tasarlanmıştır. Bir danışanın ilk terapi randevusu talep ederken ihtiyaç duyduğu uzmanlık bağlamı, KVKK aydınlatma onayı, tanı/not istemeyen güvenli form yapısı ve takvim doluyken devreye giren Bekleme Listesi yalnızca Terapist.co'da bir aradadır.",
    competitorName: "Calendly / Genel Takvimler",
    terapistTagline:
      "Psikoterapi sürecine uygun, KVKK onaylı randevu ve bekleme listesi",
    competitorTagline:
      "Genel iş ve satış toplantıları için tasarlanmış takvim bağlantısı",
    heroMetrics: [
      {
        label: "Klinik Profil + Takvim",
        terapistValue: "Tek Sayfada Birleşik",
        competitorValue: "Yalnızca soğuk takvim ekranı",
      },
      {
        label: "Takvim Doluyken Bekleme Listesi",
        terapistValue: "Yerleşik Bekleme Listesi Modalı",
        competitorValue: "Ziyaretçi boş slot göremeyip çıkar",
      },
      {
        label: "KVKK & Veri Minimasyonu",
        terapistValue: "Sürümlü Aydınlatma + Tanı İstemeyen Form",
        competitorValue: "Serbest metin kutusu (Hassas veri riski)",
      },
      {
        label: "Google Takvim Gizliliği",
        terapistValue: "Özel etkinlik başlıklarını gizler",
        competitorValue: "Standart kurumsal entegrasyon",
      },
    ],
    comparisonTitle: "Terapist.co Klinik Takvim vs Genel Toplantı Araçları",
    comparisonSubtitle:
      "Danışanın ilk temas anından randevu onayına kadar uzanan deneyimin karşılaştırması.",
    comparisonRows: [
      {
        feature: "İlk İzlenim ve Uzman Bağlamı",
        terapistCo:
          "Danışan önce uzmanlığınızı, ekolünüzü ve görüşme koşullarınızı görür, aynı sayfada saat seçer",
        competitor:
          "Bağlamsız bir saat seçimi ekranı; güven oluşturmak için ayrı bir site gerekir",
        terapistHighlight: true,
      },
      {
        feature: "Google Takvim Çakışma Kontrolü",
        terapistCo:
          "Kişisel Google Takviminizdeki dolu saatleri detay sızdırmadan otomatik kapatır",
        competitor:
          "Mevcuttur ancak Türkçe klinik arayüz ve mikro-site bütünlüğü yoktur",
        terapistHighlight: true,
      },
      {
        feature: "Dolu Takvim İçin Bekleme Listesi",
        terapistCo:
          "Kontenjanınız dolduğunda danışanlar uygun gün/saat tercihiyle bekleme listesine yazılır",
        competitor:
          "Uygun saat yoksa ziyaretçi sayfayı terk eder, potansiyel danışan kaybolur",
        terapistHighlight: true,
      },
      {
        feature: "KVKK Aydınlatma Sürüm Takibi",
        terapistCo:
          "Her randevu ve bekleme listesi talebinde onaylanan aydınlatma metni sürümü kaydedilir",
        competitor:
          "Türkiye KVKK aydınlatma sürümü doğrulaması yerleşik değildir",
        terapistHighlight: true,
      },
      {
        feature: "Şifreli Değerlendirme Formları",
        terapistCo:
          "Randevu öncesi veya sonrası şifreli BDT/Şema form linkleri aynı profilde sunulur",
        competitor: "Form ve kaynak paylaşımı özelliği yoktur",
        terapistHighlight: true,
      },
    ],
    pillarsEyebrow: "AKILLI KLİNİK TAKVİM",
    pillarsTitle: "Her randevu talebinde güven ve mahremiyet.",
    pillarsSubtitle:
      "Danışanlarınızın size ulaşmasını kolaylaştırırken kişisel takvim mahremiyetinizi koruyun.",
    pillars: [
      {
        badge: "GOOGLE TAKVİM EŞİTLEME",
        title: "Özel etkinliklerinizin adını paylaşmadan çakışmaları önleyin",
        description:
          "Google Takviminizdeki kişisel veya diğer klinik etkinliklerinizin başlık ve açıklamaları dışarıya asla yansımaz; yalnızca o saat dilimi meşgul olarak işaretlenir.",
      },
      {
        badge: "BEKLEME LİSTESİ",
        title: "Takviminiz doluyken bile danışan taleplerini kaçırmayın",
        description:
          "Yeni danışan kontenjanınız dolduğunda Bekleme Listesi modunu açın; danışanlar tercih ettikleri zaman dilimini bıraksın, yer açıldığında çalışma alanınızdan davet edin.",
      },
      {
        badge: "VERİ MİNİMASYONU",
        title: "Tanı veya terapi öyküsü istemeyen güvenli ilk temas",
        description:
          "Randevu talep formu yalnızca iletişim ve görüşme şekli bilgisini alır; danışandan açık metin olarak hassas sağlık verisi girmesini istemez.",
      },
    ],
    stepsTitle: "Takviminizi 3 adımda profilinizle birleştirin.",
    stepsSubtitle:
      "Ayrı bir takvim linki paylaşmak yerine tek adreste her şeyi sunun.",
    steps: [
      {
        number: "01",
        title: "Haftalık çalışma saatlerinizi belirleyin",
        text: "Panelinizdeki haftalık takvim editöründen çevrim içi ve yüz yüze uygun olduğunuz saatleri seçin.",
      },
      {
        number: "02",
        title: "Google Takvim hesabınızı bağlayın",
        text: "Tek tıkla OAuth bağlantısını kurarak kişisel takviminizdeki dolu saatlerin otomatik kapanmasını sağlayın.",
      },
      {
        number: "03",
        title: "Talepleri çalışma alanınızdan onaylayın",
        text: "Gelen randevu ve bekleme listesi taleplerini tek ekrandan inceleyip yönetin.",
      },
    ],
    faqs: [
      {
        question:
          "Google Takvim bağlantısı kişisel etkinliklerimin içeriğini kaydeder mi?",
        answer:
          "Hayır. Sistem yalnızca meşguliyet (free/busy) zaman aralıklarını kontrol eder; özel etkinliklerinizin başlıkları veya katılımcıları danışanlara gösterilmez.",
      },
      {
        question:
          "Danışan saat seçtiğinde randevu doğrudan kesinleşir mi yoksa onayıma mı düşer?",
        answer:
          "Danışanın seçtiği saat çalışma alanınıza 'Randevu Talebi' olarak düşer. Böylece ilk görüşme uygunluğunu değerlendirip onaylama veya alternatif sunma kontrolü tamamen sizde kalır.",
      },
      {
        question:
          "Yeni danışan almıyorsam takvimi kapatıp bekleme listesi açabilir miyim?",
        answer:
          "Evet. Panelinizden bekleme listesini aktif ettiğinizde ziyaretçiler doğrudan hızlı bekleme listesi modalı üzerinden sıraya girebilir.",
      },
    ],
  },
  {
    slug: "terapistco-vs-standart-bio-araclari",
    path: "/karsilastirma/terapistco-vs-standart-bio-araclari",
    category: "karsilastirma",
    categoryLabel: "Karşılaştırma",
    footerLabel: "Terapist.co vs Standart Bio Araçları",
    eyebrow: "KARŞILAŞTIRMA · TERAPİST.CO VS BEACONS & BENTO",
    titleDark: "Terapist.co vs Standart Bio Araçları:",
    titleAccent: "fenomen şablonları değil, klinik tasarım sistemi.",
    metaTitle:
      "Terapist.co vs Beacons, Bento & Standart Bio Araçları | Terapist Profili",
    metaDescription:
      "Beacons, Bento.me ve Campsite gibi içerik üreticisi araçları yerine psikologlar için geliştirilmiş Terapist.co: 4 klinik tema, şifreli formlar ve QR masa kartı.",
    lead: "Beacons, Bento.me veya Stan Store gibi araçlar ürün satışı, sponsorluk ve influencer kitleri için üretilmiştir. Terapist.co ise dingin tipografi, klinik güven veren 4 özel tasarım tarzı, şifreli değerlendirme formları ve meslektaş ağıyla yalnızca ruh sağlığı uzmanları için inşa edilmiştir.",
    competitorName: "Beacons / Bento / Genel Bio",
    terapistTagline:
      "Psikoterapi estetiğine uygun 4 özel tasarım tarzı ve klinik modüller",
    competitorTagline:
      "Influencer satışı, bahşiş kutusu ve sponsorluk odaklı şablonlar",
    heroMetrics: [
      {
        label: "Tasarım Dili",
        terapistValue: "4 Klinik & Dingin Tema",
        competitorValue: "E-ticaret ve fenomen şablonları",
      },
      {
        label: "Dil ve Terminoloji",
        terapistValue: "%100 Türkçe Klinik Terminoloji",
        competitorValue: "İngilizce / Yabancı Arayüz",
      },
      {
        label: "Klinik Kaynak Modülleri",
        terapistValue: "Şifreli Link, Süreli Etkinlik, Medya",
        competitorValue: "Dijital ürün satışı odaklı",
      },
      {
        label: "White-Label & Masa QR",
        terapistValue: "Yerleşik PNG/SVG Masa Kartı",
        competitorValue: "Klinik masa kartı çıktısı yok",
      },
    ],
    comparisonTitle: "Terapist.co vs Influencer Odaklı Bio Araçları",
    comparisonSubtitle:
      "Estetik bütünlük, Türkçe klinik terminoloji ve danışan yönlendirme modüllerinin karşılaştırması.",
    comparisonRows: [
      {
        feature: "Tasarım ve Tipografi",
        terapistCo:
          "Klinik Klasik, Modern Bento, Sıcak Minimal ve Yumuşak Cam ile güven veren dingin görünüm",
        competitor:
          "Yüksek kontrastlı satış butonları ve karmaşık widget blokları",
        terapistHighlight: true,
      },
      {
        feature: "Şifreli ve Zamanlanmış Linkler",
        terapistCo:
          "Danışanlara özel PIN kilitli ölçekler ve bitiş tarihinde otomatik gizlenen grup terapisi linkleri",
        competitor: "Genel bülten veya ödeme duvarı odaklı kilitler",
        terapistHighlight: true,
      },
      {
        feature: "Gömülü Psiko-Eğitim Medyası",
        terapistCo:
          "Sayfadan çıkmadan çalışan Spotify (Mindfulness) ve YouTube (Psiko-eğitim) oynatıcıları",
        competitor:
          "Genel medya gömme var ancak klinik kategori ve şifreleme desteği yok",
        terapistHighlight: true,
      },
      {
        feature: "Klinik Analitik (Trafik & Dönüşüm)",
        terapistCo:
          "Profil görüntüleme, kaynak/form tıklama ve randevu dönüşüm hunisi",
        competitor: "Satış ve gelir takibi odaklı karmaşık grafikler",
        terapistHighlight: true,
      },
    ],
    pillarsEyebrow: "KLİNİK ESTETİK",
    pillarsTitle: "Danışana güven veren sakin ve modern arayüz.",
    pillarsSubtitle:
      "Göz yoran reklam blokları yerine mesleki ciddiyetinizi yansıtan tasarım sistemi.",
    pillars: [
      {
        badge: "4 TASARIM TARZI",
        title: "Kliniğinizin atmosferini dijital ekranlara taşıyın",
        description:
          "8 renk paleti, 6 buton stili, 4 tipografi eşleşmesi ve 4 arka plan dokusuyla profilinizi kendi görsel kimliğinize uyarlayın.",
      },
      {
        badge: "GÖMÜLÜ MEDYA",
        title: "Spotify ve YouTube içeriklerinizi sayfa içinde dinletin",
        description:
          "Hazırladığınız nefes egzersizlerini veya psiko-eğitim videolarını danışanlarınız sayfadan ayrılmadan profilinizde deneyimlesin.",
      },
      {
        badge: "WHITE-LABEL",
        title: "Kendi klinik markanızı tam bağımsız vitrine dönüştürün",
        description:
          "White-Label moduyla platform logosunu gizleyerek yalnızca kendi uzman adınızın ve renklerinizin konuştuğu bir mikro-site kullanın.",
      },
    ],
    stepsTitle: "Klinik mikro-sitenizi hemen özelleştirin.",
    stepsSubtitle:
      "Dakikalar içinde kendi renk ve tipografi dilinizi oluşturun.",
    steps: [
      {
        number: "01",
        title: "Profil adresinizi sahiplenin",
        text: "terapist.co/adiniz adresinizi seçerek başvurunuzu oluşturun.",
      },
      {
        number: "02",
        title: "Görünüm & Tema sekmesinden tarzınızı seçin",
        text: "Canlı önizleme eşliğinde renk paletinizi, buton köşelerini ve yazı tipinizi belirleyin.",
      },
      {
        number: "03",
        title: "Medya ve şifreli kaynaklarınızı ekleyin",
        text: "Danışanlarınız için kilitli formları, ses kayıtlarını ve randevu saatlerinizi yayınlayın.",
      },
    ],
    faqs: [
      {
        question: "Bento.me veya Beacons'tan farkı nedir?",
        answer:
          "Bento ve Beacons genel içerik üreticileri için İngilizce ağırlıklı araçlardır. Terapist.co ise Türkiye'deki klinik psikologlar için Türkçe arayüzle, diploma doğrulaması, şifreli BDT/Şema form kilidi, Google Takvimli randevu ve meslektaş ağıyla geliştirilmiştir.",
      },
      {
        question: "Gömülü Spotify ve YouTube videoları sayfayı yavaşlatır mı?",
        answer:
          "Hayır. Gömülü medya bileşenleri yalnızca danışan ilgili kaynağın önizleme butonuna tıkladığında (lazy-load) yüklenir; böylece sayfa açılış hızı her zaman maksimumda kalır.",
      },
    ],
  },

  // ============================================================================
  // 2. KLİNİK ÇÖZÜMLER (/cozumler/:slug)
  // ============================================================================
  {
    slug: "psikolog-link-in-bio",
    path: "/cozumler/psikolog-link-in-bio",
    category: "cozumler",
    categoryLabel: "Klinik Çözümler",
    footerLabel: "Psikologlar İçin Link in Bio",
    eyebrow: "KLİNİK ÇÖZÜM · PSİKOLOGLAR İÇİN LINK IN BIO",
    titleDark: "Psikologlar için Link in Bio:",
    titleAccent: "tüm mesleki dünyanız tek bir adreste.",
    metaTitle: "Psikologlar İçin Link in Bio ve Dijital Profil | Terapist.co",
    metaDescription:
      "Instagram, LinkedIn ve kartvizitiniz için psikologlara özel Link in Bio: terapist.co/adiniz ile doğrulanmış uzman profili, randevu takvimi ve şifreli formlar.",
    lead: "Instagram ve LinkedIn biyografinizde tek bir bağlantı hakkınız var. Bu bağlantıyı sıradan bir link listesine değil; uzmanlığınızı doğrulayan, uygun saatlerinizi gösteren ve danışanlarınıza şifreli formlar sunan terapist.co/adiniz mikro-sitenize dönüştürün.",
    competitorName: "Standart Bio Linki",
    terapistTagline:
      "Doğrulanmış uzman profili, takvim, şifreli kaynaklar ve meslektaş ağı",
    competitorTagline: "Yalnızca dış sitelere yönlendiren düz buton listesi",
    heroMetrics: [
      {
        label: "Özel Profil Adresi",
        terapistValue: "terapist.co/adiniz",
        competitorValue: "Karmaşık veya genel linkler",
      },
      {
        label: "Tasarım Özelleştirme",
        terapistValue: "4 Stil · 8 Palet · White-Label",
        competitorValue: "Kısıtlı şablonlar",
      },
      {
        label: "Akıllı Link Modülleri",
        terapistValue: "Şifreli, Süreli ve Vurgulu Linkler",
        competitorValue: "Yalnızca düz URL",
      },
      {
        label: "Ziyaretçi Analitiği",
        terapistValue: "Tıklama & Randevu Dönüşüm Hunisi",
        competitorValue: "Yüzeysel sayaç",
      },
    ],
    comparisonTitle: "Neden Psikologlara Özel Bir Link-in-Bio?",
    comparisonSubtitle:
      "Sosyal medyadan gelen ziyaretçinin profilinizde geçirdiği ilk 10 saniyeyi güvene dönüştüren özellikler.",
    comparisonRows: [
      {
        feature: "Üst Profil Başlığı ve Rozetler",
        terapistCo:
          "İsminizin yanında Doğrulanmış Uzman ikonu ve Founding Therapist çemberi",
        competitor: "Herhangi bir mesleki güven rozeti bulunmaz",
        terapistHighlight: true,
      },
      {
        feature: "Vurgulu (Pulse) ve Zamanlanmış Linkler",
        terapistCo:
          "Acil hatlar veya öncelikli randevu için vurgulu buton; atölyeler için otomatik kapanan süreli link",
        competitor: "Tüm linkler aynı standart görünümde listelenir",
        terapistHighlight: true,
      },
      {
        feature: "Gömülü Spotify & YouTube Oynatıcı",
        terapistCo:
          "Mindfulness ses kayıtları ve psiko-eğitim videoları sayfa içinde açılır",
        competitor:
          "Ziyaretçiyi başka uygulamaya göndererek profilinizden koparır",
        terapistHighlight: true,
      },
      {
        feature: "Entegre Randevu & Bekleme Listesi",
        terapistCo:
          "Aynı sayfa içinde uygun saat seçimi veya bekleme listesi kaydı",
        competitor: "Randevu için ayrı bir platforma yönlendirme gerekir",
        terapistHighlight: true,
      },
    ],
    pillarsEyebrow: "MİKRO-SİTE DENEYİMİ",
    pillarsTitle: "Sosyal medya trafiğinizi anlamlı bir ilk adıma dönüştürün.",
    pillarsSubtitle:
      "Hem danışanlar hem de meslektaşlarınız için açık, düzenli ve güven veren bir dijital kartvizit.",
    pillars: [
      {
        badge: "AKILLI KAYNAKLAR",
        title: "Şifreli formlar, süreli etkinlikler ve gömülü medya",
        description:
          "Aktif danışanlarınıza şifreli ölçekler sunarken, yeni ziyaretçilerinize açık okuma listeleri ve psiko-eğitim videoları paylaşın.",
      },
      {
        badge: "WHITE-LABEL TEMA",
        title: "4 farklı tasarım tarzı ile kliniğinizin imzasını taşıyın",
        description:
          "Klinik Klasik, Modern Bento, Sıcak Minimal ve Yumuşak Cam temalarıyla profilinizi kendi estetik anlayışınıza göre şekillendirin.",
      },
      {
        badge: "DÖNÜŞÜM ANALİTİĞİ",
        title: "Hangi kaynağın ve kanalın daha çok ilgi gördüğünü izleyin",
        description:
          "Instagram, Google veya QR karttan gelen ziyaretçilerin hangi bağlantılara tıkladığını ve randevu dönüşüm oranlarını temiz bir panelde görün.",
      },
    ],
    stepsTitle: "Biyografi bağlantınızı bugün yükseltin.",
    stepsSubtitle: "Üç adımda terapist.co/adiniz adresinizi yayına alın.",
    steps: [
      {
        number: "01",
        title: "tire (-) kullanmadan net adresinizi seçin",
        text: "terapist.co/ardaekintuncay gibi akılda kalıcı, doğrudan isminizden oluşan adresinizi alın.",
      },
      {
        number: "02",
        title: "Profilinizi ve bağlantılarınızı düzenleyin",
        text: "Ekollerinizi, çalışma alanlarınızı, sosyal medya ikonlarınızı ve akıllı linklerinizi ekleyin.",
      },
      {
        number: "03",
        title: "Tüm platformlarda tek adres paylaşın",
        text: "Instagram, LinkedIn, X, e-posta imzanız ve masa QR kartınızda aynı kalıcı adresi kullanın.",
      },
    ],
    faqs: [
      {
        question:
          "Kullanıcı adımı tire (-) olmadan doğrudan adsoyad şeklinde alabilir miyim?",
        answer:
          "Evet. Terapist.co üzerinde adresler terapist.co/ardaekintuncay gibi tire içermeyen, yalın ve kolay okunur biçimde oluşturulur.",
      },
      {
        question: "Sosyal medya hesaplarımı ikon olarak ekleyebilir miyim?",
        answer:
          "Evet. Instagram, LinkedIn, X (Twitter), YouTube ve kişisel web siteniz profil başlığınızda şık ikonlar halinde yer alır.",
      },
    ],
  },
  {
    slug: "online-terapi-randevu-takvimi",
    path: "/cozumler/online-terapi-randevu-takvimi",
    category: "cozumler",
    categoryLabel: "Klinik Çözümler",
    footerLabel: "Online Terapi Randevu ve Takvim Sistemi",
    eyebrow: "KLİNİK ÇÖZÜM · ONLINE RANDEVU VE AKILLI TAKVİM",
    titleDark: "Psikologlar için online randevu:",
    titleAccent: "Google Takvim eşitlemeli ve bekleme listeli.",
    metaTitle: "Psikolog Randevu Sistemi & Online Terapi Takvimi | Terapist.co",
    metaDescription:
      "Klinik psikologlar için online ve yüz yüze randevu takvimi: Google Takvim çakışma kontrolü, dolu takvimler için bekleme listesi ve KVKK uyumlu talep formu.",
    lead: "WhatsApp ve DM üzerinden saat sorma trafiğini sonlandırın. Haftalık çalışma saatlerinizi yayınlayın, Google Takvim eşitlemesiyle çakışmaları otomatik önleyin ve takviminiz dolduğunda ziyaretçileri Bekleme Listesine alın.",
    competitorName: "Manuel DM / WhatsApp Trafiği",
    terapistTagline:
      "Otomatik uygunluk gösterimi, Google Takvim senkronu ve bekleme listesi",
    competitorTagline: "Sürekli mesajlaşma, saat çakışmaları ve kaçan talepler",
    heroMetrics: [
      {
        label: "Görüşme Biçimi Seçimi",
        terapistValue: "Çevrim İçi & Yüz Yüze Ayrımlı",
        competitorValue: "Mesajla tek tek teyit",
      },
      {
        label: "Google Takvim Senkronu",
        terapistValue: "Çift Yönlü Çakışma Önleme",
        competitorValue: "Manuel takvim kontrolü",
      },
      {
        label: "Kontenjan Doluluğu",
        terapistValue: "Otomatik Bekleme Listesi",
        competitorValue: "Danışan geri çevrilir",
      },
      {
        label: "KVKK Aydınlatma Onayı",
        terapistValue: "Talep Anında Sürümlü Kayıt",
        competitorValue: "Onay kaydı tutulamaz",
      },
    ],
    comparisonTitle: "Akıllı Klinik Takvim vs Manuel Randevu Yönetimi",
    comparisonSubtitle:
      "Zaman yönetimini kolaylaştıran ve danışana netlik sunan takvim altyapısı.",
    comparisonRows: [
      {
        feature: "Haftalık Uygunluk Gösterimi",
        terapistCo:
          "Danışanlar yalnızca sizin açtığınız ve Google Takviminizde boş olan saatleri görür",
        competitor:
          "Danışan uygun saatleri bilmediği için defalarca mesajlaşma gerekir",
        terapistHighlight: true,
      },
      {
        feature: "Kişisel Etkinlik Gizliliği",
        terapistCo:
          "Google Takvimdeki özel notlarınız gizlenir, sadece ilgili saat dilimi kapatılır",
        competitor:
          "Takvim ekran görüntüsü paylaşmak veya manuel takip yapmak gerekir",
        terapistHighlight: true,
      },
      {
        feature: "Bekleme Listesi Yönetimi",
        terapistCo:
          "Takvim doluyken danışanlar gün/saat tercihiyle sıraya girer; panelden tek tıkla yönetilir",
        competitor: "Not defterinde veya mesaj geçmişinde unutulan talepler",
        terapistHighlight: true,
      },
      {
        feature: "Klinik Veri Minimasyonu",
        terapistCo:
          "Formda tanı veya terapi notu istenmez; KVKK aydınlatma onayı sürümlü kaydedilir",
        competitor:
          "WhatsApp/DM üzerinden kontrolsüzce paylaşılan hassas kişisel veriler",
        terapistHighlight: true,
      },
    ],
    pillarsEyebrow: "RANDEVU AKIŞI",
    pillarsTitle: "Sınırları net, yönetimi zahmetsiz takvim.",
    pillarsSubtitle:
      "Çevrim içi ve yüz yüze seanslarınız için esnek çalışma saatleri tanımlayın.",
    pillars: [
      {
        badge: "HAFTALIK EDİTÖR",
        title: "Gün ve saat aralıklarınızı saniyeler içinde güncelleyin",
        description:
          "Hangi günler çevrim içi, hangi günler kliniğinizde yüz yüze görüşme yaptığınızı haftalık program editöründen kolayca belirleyin.",
      },
      {
        badge: "ÇAKIŞMA KORUMASI",
        title: "Google Takvim ile gerçek zamanlı meşguliyet kontrolü",
        description:
          "Süpervizyonunuz, eğitiminiz veya özel bir işiniz olduğunda Google Takviminize eklemeniz yeterli; profilinizdeki o saat otomatik kapanır.",
      },
      {
        badge: "BEKLEME LİSTESİ",
        title: "Dolu takviminizi danışan kaybına dönüştürmeyin",
        description:
          "Bekleme listesi modalı sayesinde sizinle çalışmak isteyen danışanlar iletişim bilgilerini ve uygun zaman dilimlerini güvenle bırakır.",
      },
    ],
    stepsTitle: "Online randevu takviminizi hemen devreye alın.",
    stepsSubtitle: "Üç adımda DM trafiğinden düzenli randevu akışına geçin.",
    steps: [
      {
        number: "01",
        title: "Profilinizde çalışma saatlerinizi tanımlayın",
        text: "Panelinizden haftalık uygunluk saatlerinizi ve görüşme şeklinizi seçin.",
      },
      {
        number: "02",
        title: "Google Takvim bağlantısını tamamlayın",
        text: "Kişisel takviminizle eşitleyerek çifte randevu riskini sıfırlayın.",
      },
      {
        number: "03",
        title: "Talepleri çalışma alanınızdan yönetin",
        text: "Gelen randevu ve bekleme listesi kayıtlarını bildirimlerle anında görün.",
      },
    ],
    faqs: [
      {
        question:
          "Hem online hem yüz yüze görüşme saatlerimi ayrı ayrı gösterebilir miyim?",
        answer:
          "Evet. Profilinizde çevrim içi, yüz yüze veya hibrit çalışma biçiminizi belirtebilir ve danışanın talep formunda tercihini seçmesini sağlayabilirsiniz.",
      },
      {
        question: "Bekleme listesine yazılan danışanları nasıl takip ederim?",
        answer:
          "Uzman panelinizdeki Bekleme Listesi sekmesinde tüm başvuruları tarih, tercih edilen zaman dilimi ve durum (bekliyor, iletişime geçildi, randevuya dönüştü) filtreleriyle yönetebilirsiniz.",
      },
    ],
  },
  {
    slug: "sifreli-bdt-sema-formlari",
    path: "/cozumler/sifreli-bdt-sema-formlari",
    category: "cozumler",
    categoryLabel: "Klinik Çözümler",
    footerLabel: "Şifreli BDT & Şema Terapi Formları",
    eyebrow: "KLİNİK ÇÖZÜM · ŞİFRELİ LİNKLER (LINK LOCK)",
    titleDark: "Şifreli BDT & Şema formları:",
    titleAccent: "yalnızca danışanınızın açabildiği kaynaklar.",
    metaTitle:
      "Şifreli BDT ve Şema Terapi Form Bağlantıları (Link Lock) | Terapist.co",
    metaDescription:
      "Klinik psikologlar için şifreli link (Link Lock) modülü: BDT düşünce kayıtlarını, Şema ölçeklerini ve seans ödevlerini yalnızca PIN kodunu bilen danışanlarınızla paylaşın.",
    lead: "BDT düşünce kayıt formlarını, Şema Modları öz-değerlendirme ölçeklerini veya seans içi çalışma kağıtlarını herkese açık paylaşmak yerine; Terapist.co'nun Şifreli Link (Link Lock) modülüyle yalnızca belirlediğiniz PIN şifresini bilen aktif danışanlarınızın erişimine açın.",
    competitorName: "Açık PDF / WhatsApp Dosyası",
    terapistTagline:
      "PIN korumalı, sunucu doğrulamalı klinik kaynak ve form bağlantıları",
    competitorTagline:
      "Kontrolsüz paylaşılan dosyalar ve kaybolan form linkleri",
    heroMetrics: [
      {
        label: "Erişim Kontrolü",
        terapistValue: "Sunucu Tarafı PIN Kilidi",
        competitorValue: "Herkese açık URL",
      },
      {
        label: "Süreli Etkinlik Linkleri",
        terapistValue: "Otomatik Gizlenen Tarihli Link",
        competitorValue: "Manuel silme gerekir",
      },
      {
        label: "Klinik Kategorizasyon",
        terapistValue: "Form, Ölçek, Okuma, Egzersiz",
        competitorValue: "Düz dosya paylaşımı",
      },
      {
        label: "Gömülü Medya Desteği",
        terapistValue: "Spotify & YouTube Sayfa İçi",
        competitorValue: "Yalnızca dış bağlantı",
      },
    ],
    comparisonTitle: "Şifreli Klinik Kaynak Modülü vs Klasik Dosya Paylaşımı",
    comparisonSubtitle:
      "Değerlendirme ölçeklerini ve ev ödevlerini profesyonel bir düzende sunmanın avantajları.",
    comparisonRows: [
      {
        feature: "Şifreli Erişim (Link Lock)",
        terapistCo:
          "Şifre doğrulanmadan hedef form URL'si tarayıcıya gönderilmez; tam gizlilik sağlar",
        competitor: "Linki bilen herkes forma veya ölçeğe erişebilir",
        terapistHighlight: true,
      },
      {
        feature: "Zamanlanmış Linkler (Schedule Links)",
        terapistCo:
          "Grup terapisi veya atölye başvuru linki belirlediğiniz tarihte otomatik kapanır",
        competitor: "Süresi geçen formları manuel olarak kaldırmanız gerekir",
        terapistHighlight: true,
      },
      {
        feature: "Vurgulu (Pulse) Butonlar",
        terapistCo:
          "Öncelikli formlar veya acil yönlendirmeler için mikro-animasyonlu vurgu",
        competitor: "Standart metin bağlantısı",
        terapistHighlight: true,
      },
      {
        feature: "Tek Adresten Kolay Erişim",
        terapistCo:
          "Danışan her zaman terapist.co/adiniz adresine girip şifresiyle formuna ulaşır",
        competitor:
          "E-posta veya mesaj geçmişinde form linki aramak zorunda kalır",
        terapistHighlight: true,
      },
    ],
    pillarsEyebrow: "KAYNAK & GİZLİLİK",
    pillarsTitle: "Değerlendirme formlarınızı güvenle yönetin.",
    pillarsSubtitle:
      "Hem açık psiko-eğitim materyallerinizi hem de kilitli klinik ölçeklerinizi aynı profilde düzenli tutun.",
    pillars: [
      {
        badge: "LINK LOCK (ŞİFRELİ)",
        title: "Sadece şifreyi verdiğiniz danışanlar forma ulaşır",
        description:
          "Seans sırasında veya sonrasında danışanınıza özel erişim şifresini iletin; profilinizdeki kilitli butona şifreyi girerek doğrudan formuna geçsin.",
      },
      {
        badge: "ZAMANLANMIŞ LİNKLER",
        title: "Süresi dolduğunda otomatik gizlenen grup ve atölye linkleri",
        description:
          "Belirli bir tarihte gerçekleşecek grup terapisi veya seminer kayıt bağlantısına bitiş tarihi verin; süre dolduğunda profilinizden kendiliğinden kalksın.",
      },
      {
        badge: "MİNDULNESS & MEDYA",
        title: "Sesli egzersiz ve videoları sayfadan çıkmadan oynatın",
        description:
          "Spotify üzerindeki gevşeme egzersizlerinizi veya YouTube psiko-eğitim videolarınızı gömülü oynatıcıyla doğrudan profilinizde sunun.",
      },
    ],
    stepsTitle: "Şifreli formlarınızı 3 adımda profilinize ekleyin.",
    stepsSubtitle:
      "Kullandığınız mevcut form araçlarını (Google Forms, Tally, Typeform vb.) şifreyle koruyun.",
    steps: [
      {
        number: "01",
        title: "Kaynaklar & Linkler sekmesini açın",
        text: "Uzman panelinizde yeni bir kaynak ekleyin ve başlığını (örn. 'Şema Modları Ölçeği') yazın.",
      },
      {
        number: "02",
        title: "Erişim şifresi veya bitiş tarihi tanımlayın",
        text: "'Şifreli Link' seçeneğini işaretleyip PIN kodunuzu belirleyin veya zamanlanmış bitiş tarihi girin.",
      },
      {
        number: "03",
        title: "Danışanınızla profil adresinizi ve şifreyi paylaşın",
        text: "Danışanınız terapist.co/adiniz üzerinden şifresini girerek güvenle formuna erişsin.",
      },
    ],
    faqs: [
      {
        question:
          "Şifreli linklerin hedef adresi sayfa kaynak kodunda görünür mü?",
        answer:
          "Hayır. Şifreli bağlantıların hedef URL'si açık profil verisinde yer almaz; yalnızca danışan doğru şifreyi girdiğinde sunucu tarafından doğrulanarak açılır.",
      },
      {
        question:
          "Hangi form altyapılarını şifreli link olarak bağlayabilirim?",
        answer:
          "Google Forms, Tally, Typeform, Jotform, kendi PDF çalışma kağıtlarınız veya güvenli ölçek bağlantılarınızın tamamını şifreli link olarak ekleyebilirsiniz.",
      },
    ],
  },
  {
    slug: "klinik-masa-qr-karti",
    path: "/cozumler/klinik-masa-qr-karti",
    category: "cozumler",
    categoryLabel: "Klinik Çözümler",
    footerLabel: "Klinik Masa QR Kartı & Dijital Kartvizit",
    eyebrow: "KLİNİK ÇÖZÜM · DİNAMİK MASA QR KARTI",
    titleDark: "Klinik masa QR kartı:",
    titleAccent: "görüşme odanızdan dijital profilinize anında geçiş.",
    metaTitle:
      "Psikologlar İçin Masa QR Kartı ve Dijital Kartvizit | Terapist.co",
    metaDescription:
      "Görüşme odanız, bekleme salonunuz ve kartvizitiniz için dinamik Terapist.co QR masa kartı: Danışanlarınız kamerayla okutarak formlarınıza ve randevu takviminize ulaşsın.",
    lead: "Görüşme odanızdaki sehpanın üzerine veya basılı kartvizitinize yerleştirebileceğiniz yüksek çözünürlüklü PNG ve vektörel SVG QR masa kartı ile danışanlarınız tek okutmada profilinize, şifreli değerlendirme formlarınıza ve sonraki seans takviminize ulaşsın.",
    competitorName: "Kağıt Broşür & Statik QR",
    terapistTagline:
      "Marka renklerinizle uyumlu, UTM analitik takipli masa kartı ve web rozeti",
    competitorTagline:
      "Takibi yapılamayan, süresi geçen standart siyah-beyaz QR kodlar",
    heroMetrics: [
      {
        label: "Çıktı Formatları",
        terapistValue: "Baskıya Hazır PNG + Vektörel SVG",
        competitorValue: "Düşük çözünürlüklü ekran görüntüsü",
      },
      {
        label: "Tema & Renk Uyumu",
        terapistValue: "Seçtiğiniz Klinik Paletle Uyumlu",
        competitorValue: "Standart siyah-beyaz",
      },
      {
        label: "Trafik Kaynağı Takibi",
        terapistValue: "Otomatik ?utm_source=qr Analitiği",
        competitorValue: "Okutma sayısı bilinemez",
      },
      {
        label: "Web Doğrulama Rozeti",
        terapistValue: "Canlı SVG Embed Kodu",
        competitorValue: "Yok",
      },
    ],
    comparisonTitle: "Terapist.co Dinamik Masa Kartı vs Standart QR Kodlar",
    comparisonSubtitle:
      "Yüz yüze klinik deneyimini dijital çalışma alanınızla bütünleştiren tasarım.",
    comparisonRows: [
      {
        feature: "Hazır Masa Kartı Tasarımı",
        terapistCo:
          "Uzman adınız, unvanınız, terapist.co/adiniz adresiniz ve QR kodunuz tek kartta hazır",
        competitor:
          "Ayrı bir grafik tasarım programında kart hazırlamanız gerekir",
        terapistHighlight: true,
      },
      {
        feature: "QR Kaynaklı Ziyaretçi Analitiği",
        terapistCo:
          "Masa kartından kaç kişinin profilinize ulaştığını panelinizdeki analitikte ayrı kalem olarak görürsünüz",
        competitor:
          "QR okutmalarını sosyal medya trafiğinden ayırt edemezsiniz",
        terapistHighlight: true,
      },
      {
        feature: "Değişmeyen Kalıcı Bağlantı",
        terapistCo:
          "Profilinizdeki formları veya saatleri güncellediğinizde basılı QR kartınızı değiştirmeniz gerekmez",
        competitor: "Her form veya link değişiminde yeni QR basmak gerekir",
        terapistHighlight: true,
      },
      {
        feature: "Canlı Web Sitesi Rozeti",
        terapistCo:
          "Kişisel web sitenize veya blogunuza ekleyebileceğiniz canlı 'Doğrulanmış Uzman' SVG rozeti",
        competitor: "Web sitesi doğrulama entegrasyonu yoktur",
        terapistHighlight: true,
      },
    ],
    pillarsEyebrow: "FİZİKSEL & DİJİTAL BÜTÜNLÜK",
    pillarsTitle: "Görüşme odanızda şık ve işlevsel bir dokunuş.",
    pillarsSubtitle:
      "Seans sonunda form linki göndermek veya bir sonraki randevuyu planlamak saniyeler sürer.",
    pillars: [
      {
        badge: "MASA KARTI (PNG & SVG)",
        title: "Matbaa ve masaüstü çerçeve baskısına hazır yüksek kalite",
        description:
          "İster pleksi masa çerçevesine koyun, ister kartvizitinizin arkasına basın; vektörel SVG ve yüksek çözünürlüklü PNG çıktılar her boyutta net kalır.",
      },
      {
        badge: "SEANS SONU KOLAYLIĞI",
        title: "'Masadaki kodu okutarak ölçeğe ulaşabilirsiniz' rahatlığı",
        description:
          "Seans bitiminde danışanınız telefon kamerasıyla QR kartı okutarak doğrudan profilinizdeki şifreli BDT/Şema formuna veya okuma önerisine erişir.",
      },
      {
        badge: "CANLI WEB ROZETİ",
        title: "Kendi sitenizde doğrulanmış uzmanlığınızı sergileyin",
        description:
          "Panelinizdeki tek satırlık HTML/Markdown rozet kodunu kişisel web sitenize yapıştırarak ziyaretçilerinizi doğrulanmış profilinize bağlayın.",
      },
    ],
    stepsTitle: "Masa QR kartınızı hemen indirin.",
    stepsSubtitle:
      "Üç adımda kliniğiniz ve kartvizitiniz için QR kartınızı oluşturun.",
    steps: [
      {
        number: "01",
        title: "Görünüm & Tema sekmesinden renginizi seçin",
        text: "QR kodunuz seçtiğiniz klinik renk paletiyle otomatik olarak uyumlu hale gelir.",
      },
      {
        number: "02",
        title: "Masa Kartı İndir (PNG) veya Vektör (SVG) butonuna tıklayın",
        text: "Panelinizden hazır tasarlanmış masa kartınızı tek tıkla cihazınıza indirin.",
      },
      {
        number: "03",
        title: "Görüşme odanıza yerleştirin ve okutmaları izleyin",
        text: "Analitik sekmesinden QR kod üzerinden gelen ziyaretçilerinizi anlık takip edin.",
      },
    ],
    faqs: [
      {
        question:
          "Profilimdeki linkleri güncellediğimde masamdaki QR kartı yenilemem gerekir mi?",
        answer:
          "Hayır. QR kodunuz kalıcı terapist.co/adiniz adresinize yönlendirir. Panelinizden yeni form, medya veya çalışma saati eklediğinizde aynı QR kod güncel içeriğinizi göstermeye devam eder.",
      },
      {
        question:
          "QR masa kartını matbaada bastırmak için hangi formatı kullanmalıyım?",
        answer:
          "Panelinizde hem doğrudan çıktı alabileceğiniz yüksek çözünürlüklü PNG masa kartı hem de matbaa/kartvizit baskıları için kayıpsız ölçeklenen vektörel SVG formatı sunulmaktadır.",
      },
    ],
  },
  {
    slug: "dogrulanmis-meslektas-agi",
    path: "/cozumler/dogrulanmis-meslektas-agi",
    category: "cozumler",
    categoryLabel: "Klinik Çözümler",
    footerLabel: "Doğrulanmış Meslektaş ve Yönlendirme Ağı",
    eyebrow: "KLİNİK ÇÖZÜM · MESLEKTAŞ AĞI & ETİK YÖNLENDİRME",
    titleDark: "Doğrulanmış meslektaş ağı:",
    titleAccent: "etik yönlendirme ve profesyonel bağlar.",
    metaTitle:
      "Terapistler Arası Meslektaş Ağı ve Etik Danışan Yönlendirme | Terapist.co",
    metaDescription:
      "Klinik psikologlar arasında karşılıklı onaylı mesleki bağlar, süpervizyon ilişkisi gösterimi ve terapist.co/r/... ile etik danışan yönlendirme ağı.",
    lead: "Ruh sağlığı alanında güven, uzmanın içinde bulunduğu mesleki toplulukla güçlenir. Birlikte çalıştığınız, aynı eğitimden geçtiğiniz veya süpervizyon paylaştığınız doğrulanmış meslektaşlarınızla bağlarınızı görünür kılın; kendi çalışma alanınız dışındaki talepleri etik biçimde yönlendirin.",
    competitorName: "Kayıtsız Sözlü Yönlendirme",
    terapistTagline:
      "Karşılıklı onaylı mesleki bağlar ve terapist.co/r/... yönlendirme protokolü",
    competitorTagline: "Dağınık iletişim bilgileri ve bağlamsız isim önerileri",
    heroMetrics: [
      {
        label: "Mesleki Bağ Onayı",
        terapistValue: "Çift Taraflı Uzman Onayı",
        competitorValue: "Tek taraflı beyan",
      },
      {
        label: "Yönlendirme Bağlantısı",
        terapistValue: "terapist.co/r/... Özel Referans",
        competitorValue: "Telefon numarası paylaşımı",
      },
      {
        label: "İlişki Bağlamı",
        terapistValue: "Süpervizyon, Eğitim, Klinik Ekip",
        competitorValue: "Bağlam belirtilemez",
      },
      {
        label: "Meslektaş Mesajlaşması",
        terapistValue: "Panel İçi Bildirim & Mesajlar",
        competitorValue: "Kişisel numara zorunluluğu",
      },
    ],
    comparisonTitle: "Yapılandırılmış Meslektaş Ağı vs Geleneksel Yönlendirme",
    comparisonSubtitle:
      "Hem danışanın doğru uzmana ulaşmasını kolaylaştıran hem de mesleki dayanışmayı güçlendiren mimari.",
    comparisonRows: [
      {
        feature: "Karşılıklı Onaylı Mesleki Bağlar",
        terapistCo:
          "Süpervizyon, ortak eğitim veya klinik çalışma bağları yalnızca iki uzmanın onayıyla yayınlanır",
        competitor:
          "Sosyal medyada takip listeleri dışında mesleki bağlam görünmez",
        terapistHighlight: true,
      },
      {
        feature: "Etik Yönlendirme Bağlantısı (terapist.co/r/...)",
        terapistCo:
          "Çalışmadığınız bir alanda danışana önerdiğiniz uzmanın doğrulama ve çalışma bağlamını gösteren özel sayfa",
        competitor:
          "Danışana yalnızca bir isim veya telefon numarası verilip süreç kopar",
        terapistHighlight: true,
      },
      {
        feature: "Algoritmik Sıralama Yasağı",
        terapistCo:
          "Meslektaş önerileri bir popülerlik puanına veya sıralamaya dönüştürülmez",
        competitor:
          "Ticari platformlarda en çok komisyon kazandıran profiller öne çıkarılır",
        terapistHighlight: true,
      },
      {
        feature: "Uzmanlar Arası Doğrudan İletişim",
        terapistCo:
          "Bildirimler ve Mesajlar sekmesinden meslektaşlarınızla doğrudan iletişim kurabilirsiniz",
        competitor: "Ortak bir mesleki iletişim kanalı bulunmaz",
        terapistHighlight: true,
      },
    ],
    pillarsEyebrow: "MESLEKİ DAYANIŞMA",
    pillarsTitle: "Güven veren bir uzmanlık çevresi inşa edin.",
    pillarsSubtitle:
      "Danışanlar profilinizde kimlerle mesleki bağınız olduğunu ve hangi alanlarda hangi uzmanları önerdiğinizi şeffafça görür.",
    pillars: [
      {
        badge: "DOĞRULANMIŞ BAĞLAR",
        title: "Süpervizyon, eğitim ve birlikte çalışma bağlamı",
        description:
          "Meslektaşlarınızla olan profesyonel ilişkinizi kontrollü bir katalog üzerinden tanımlayın; karşılıklı onay sonrası her iki profilde de güven sinyali olarak görünsün.",
      },
      {
        badge: "ETİK YÖNLENDİRME",
        title: "Çalışmadığınız alanlarda danışanı ortada bırakmayın",
        description:
          "Örneğin yalnızca yetişkinlerle çalışıyorsanız, çocuk-ergen talebi geldiğinde terapist.co/r/... bağlantısıyla o alanda çalışan doğrulanmış meslektaşınıza yönlendirin.",
      },
      {
        badge: "MESLEKTAŞ DAVETİ",
        title: "Güvendiğiniz uzmanları ağa davet edin",
        description:
          "Klinik ekibinizdeki veya süpervizyon grubunuzdaki meslektaşlarınıza davet bağlantısı göndererek doğrulanmış uzman ağına katılmalarını sağlayın.",
      },
    ],
    stepsTitle: "Meslektaş ağınızı 3 adımda oluşturun.",
    stepsSubtitle:
      "Doğrulanmış uzmanlarla profesyonel bağlarınızı görünür kılın.",
    steps: [
      {
        number: "01",
        title: "Meslektaş Ağı sekmesinden uzman arayın veya davet edin",
        text: "Sistemdeki doğrulanmış meslektaşlarınızı bulun ya da e-posta ile davet gönderin.",
      },
      {
        number: "02",
        title: "İlişki bağlamını ve öneri alanlarını seçin",
        text: "Meslektaşınızla çalışma/eğitim bağınızı ve hangi uzmanlık alanlarında kendisini önerdiğinizi belirtin.",
      },
      {
        number: "03",
        title: "terapist.co/r/... yönlendirme linklerini kullanın",
        text: "Uygun olmayan danışan taleplerini etik yönlendirme bağlantısıyla güvenle meslektaşınıza aktarın.",
      },
    ],
    faqs: [
      {
        question:
          "Bir meslektaşım beni onaylamadan profilimde bağımız görünür mü?",
        answer:
          "Hayır. Tüm mesleki bağlantılar çift taraflı onay (karşılıklı kabul) ilkesiyle çalışır. İstediğiniz zaman bağlantıyı kendi panelinizden gizleyebilir veya sonlandırabilirsiniz.",
      },
      {
        question: "Meslektaş önerileri profil sıralamasını etkiler mi?",
        answer:
          "Hayır. Terapist.co'da öneri ve bağlantılar kesinlikle bir kalite puanına veya üst sıraya çıkma algoritmasına dönüştürülmez; yalnızca danışana şeffaf bağlam sunar.",
      },
    ],
  },

  // ============================================================================
  // 3. UZMAN REHBERLERİ (/rehber/:slug)
  // ============================================================================
  {
    slug: "klinik-psikolog-dijital-kimlik",
    path: "/rehber/klinik-psikolog-dijital-kimlik",
    category: "rehber",
    categoryLabel: "Uzman Rehberi",
    footerLabel: "Klinik Psikolog Dijital Kimlik Rehberi",
    eyebrow: "UZMAN REHBERİ · DİJİTAL KİMLİK VE SEO",
    titleDark: "Klinik psikologlar için",
    titleAccent: "etik dijital kimlik ve SEO rehberi.",
    metaTitle:
      "Klinik Psikologlar İçin Dijital Kimlik ve SEO Rehberi | Terapist.co",
    metaDescription:
      "Klinik psikologlar ve psikoterapistler Google ve sosyal medyada etik sınırları koruyarak nasıl görünür olur? Doğrulanmış dijital profil ve SEO rehberi.",
    lead: "Bir danışan adınızı Google'da arattığında veya Instagram profilinize girdiğinde karşılaştığı dijital vitrin, terapötik ittifakın ilk adımıdır. Reklam diline kaçmadan, mesleki etik çerçevesinde güçlü ve anlaşılır bir dijital kimlik kurmanın yol haritası.",
    competitorName: "Dağınık Dijital Varlık",
    terapistTagline:
      "Kanonik URL, Schema.org/Person verisi ve doğrulanmış uzman profili",
    competitorTagline:
      "Güncel olmayan sosyal medya profilleri ve dağınık bilgiler",
    heroMetrics: [
      {
        label: "Arama Motoru Yapısı",
        terapistValue: "Schema.org/Person + Sitemap",
        competitorValue: "Yapısal veri yok",
      },
      {
        label: "Kısa ve Kalıcı URL",
        terapistValue: "terapist.co/adinizsoyadiniz",
        competitorValue: "Karmaşık sosyal medya linkleri",
      },
      {
        label: "Ekol & Uzmanlık Netliği",
        terapistValue: "Yapılandırılmış Klinik Etiketler",
        competitorValue: "Dağınık biyografi metni",
      },
      {
        label: "Güven Sinyalleri",
        terapistValue: "Doğrulanmış Rozet + Meslektaş Ağı",
        competitorValue: "Doğrulanamaz beyan",
      },
    ],
    comparisonTitle: "Etik Dijital Görünürlük Kriterleri",
    comparisonSubtitle:
      "Ruh sağlığı uzmanlarının internette var olurken dikkat etmesi gereken temel unsurlar.",
    comparisonRows: [
      {
        feature: "İsim ve Unvan Aramalarında İlk Sıra (SEO)",
        terapistCo:
          "Adınız ve unvanınız için optimize edilmiş başlık, meta açıklama ve kanonik URL",
        competitor: "Farklı sitelerdeki eski veya eksik kayıtların öne çıkması",
        terapistHighlight: true,
      },
      {
        feature: "Çalışma Alanlarının Anlaşılır Sunumu",
        terapistCo:
          "Çalıştığınız ekoller, danışan grupları ve görüşme biçimi net başlıklarla ayrılır",
        competitor:
          "Instagram biyografisindeki 150 karakter sınırına sıkışmış kısaltmalar",
        terapistHighlight: true,
      },
      {
        feature: "Sınırları Koruyan İlk İletişim",
        terapistCo:
          "Yapılandırılmış randevu talebi ve bekleme listesi ile profesyonel çerçeve",
        competitor: "Gece geç saatlerde gelen DM ve WhatsApp mesajları",
        terapistHighlight: true,
      },
    ],
    pillarsEyebrow: "REHBER İLKELER",
    pillarsTitle: "Dijital kimliğinizi güçlendiren 3 temel sütun.",
    pillarsSubtitle:
      "Hem arama motorlarında bulunabilir olun hem de klinik ciddiyetinizi koruyun.",
    pillars: [
      {
        badge: "01 · TEKİL ADRES",
        title: "İsminizle birebir eşleşen kalıcı bir URL kullanın",
        description:
          "terapist.co/adinizsoyadiniz biçimindeki temiz bir URL, hem danışanların aklında kalır hem de Google'da isminiz arandığında güçlü bir otorite sinyali üretir.",
      },
      {
        badge: "02 · ŞEFFAF ÇERÇEVE",
        title: "Eğitiminizi, ekolünüzü ve görüşme koşullarınızı açıkça yazın",
        description:
          "Danışanların en çok merak ettiği 'Hangi ekolle çalışıyor, hangi yaş gruplarını görüyor, online seans var mı?' sorularını tek sayfada yanıtlayın.",
      },
      {
        badge: "03 · DOĞRULANMIŞ GÜVEN",
        title: "Bağımsız doğrulama ve meslektaş bağlarıyla güveni pekiştirin",
        description:
          "Yetkisiz kişilerin sosyal medyada uzman gibi göründüğü ortamda, Doğrulanmış Uzman rozetiniz ve meslektaş ağınızla farkınızı ortaya koyun.",
      },
    ],
    stepsTitle: "Dijital kimliğinizi bugün yapılandırın.",
    stepsSubtitle: "Dakikalar içinde SEO uyumlu uzman profilinizi oluşturun.",
    steps: [
      {
        number: "01",
        title: "terapist.co/adiniz adresinizi sahiplenin",
        text: "İsminize özel kısa profil adresinizi hemen rezerve edin.",
      },
      {
        number: "02",
        title: "Eğitim, ekol ve biyografi alanlarınızı doldurun",
        text: "Danışanların sizi tanımasını sağlayacak mesleki bilgileri sade bir dille ekleyin.",
      },
      {
        number: "03",
        title: "Profilinizi tüm dijital kanallarınıza bağlayın",
        text: "Sosyal medya hesaplarınızdan ve kişisel sitenizden terapist.co adresinize bağlantı verin.",
      },
    ],
    faqs: [
      {
        question:
          "Terapist.co profilim Google aramalarında ne kadar sürede görünür olur?",
        answer:
          "Profiliniz yönetici onayından geçtiği anda otomatik olarak sitemap.xml dosyasına eklenir ve Schema.org/Person yapısal verisiyle arama motorlarına açılır.",
      },
      {
        question: "Biyografimi yazarken nelere dikkat etmeliyim?",
        answer:
          "Kesin tedavi vaadi içeren ifadelerden kaçınarak; lisans/yüksek lisans eğitiminizi, tamamladığınız terapi ekolü eğitimlerini, çalıştığınız danışan gruplarını ve seans çerçevesini anlaşılır bir dille anlatmanız önerilir.",
      },
    ],
  },
  {
    slug: "bdt-ve-sema-terapistleri-icin",
    path: "/rehber/bdt-ve-sema-terapistleri-icin",
    category: "rehber",
    categoryLabel: "Uzman Rehberi",
    footerLabel: "BDT & Şema Terapistleri İçin Dijital Pratik",
    eyebrow: "UZMAN REHBERİ · BDT & ŞEMA TERAPİ PRATİĞİ",
    titleDark: "BDT ve Şema terapistleri için",
    titleAccent: "dijital form, ödev ve kaynak yönetimi.",
    metaTitle:
      "BDT ve Şema Terapistleri İçin Dijital Profil ve Şifreli Formlar | Terapist.co",
    metaDescription:
      "Bilişsel Davranışçı Terapi (BDT) ve Şema Terapi uzmanları için şifreli ölçek paylaşımı, psiko-eğitim materyalleri, sesli yaşantısal egzersizler ve randevu yönetimi.",
    lead: "Bilişsel Davranışçı Terapi ve Şema Terapi, seanslar arası ev ödevleri, düşünce kayıt formları, mod çalışma kağıtları ve psiko-eğitim okumalarıyla yapılandırılmış ekollerdir. Terapist.co, bu materyalleri danışanlarınızla en güvenli ve düzenli biçimde paylaşmanız için tasarlandı.",
    competitorName: "Dağınık E-Posta & Mesaj Ekleri",
    terapistTagline:
      "PIN kilitli ölçekler, gömülü sesli egzersizler ve ekol rozetleri",
    competitorTagline: "Her danışana tekrar tekrar gönderilen PDF ve linkler",
    heroMetrics: [
      {
        label: "Ölçek ve Ödev Paylaşımı",
        terapistValue: "Şifreli Link (Link Lock)",
        competitorValue: "E-posta / WhatsApp eki",
      },
      {
        label: "Yaşantısal Ses Kayıtları",
        terapistValue: "Gömülü Spotify Oynatıcı",
        competitorValue: "Dış bağlantı",
      },
      {
        label: "Psiko-Eğitim Videoları",
        terapistValue: "Sayfa İçi YouTube Oynatıcı",
        competitorValue: "Dağınık video linkleri",
      },
      {
        label: "Ekol Görünürlüğü",
        terapistValue: "BDT & Şema Terapi Dizin Filtresi",
        competitorValue: "Genel liste",
      },
    ],
    comparisonTitle: "BDT ve Şema Terapi Pratiğinde Terapist.co Avantajları",
    comparisonSubtitle:
      "Yapılandırılmış terapi ekollerinin dijital araç ihtiyaçlarına özel çözümler.",
    comparisonRows: [
      {
        feature: "Şema ve BDT Formlarının Korunması",
        terapistCo:
          "Şema ölçeklerini ve düşünce kayıt formlarını yalnızca danışanınızın bildiği PIN şifresiyle kilitleyin",
        competitor:
          "Form bağlantılarının yetkisiz kişilerce görüntülenmesi riski",
        terapistHighlight: true,
      },
      {
        feature: "Güvenli Yer / Mindfulness Ses Kayıtları",
        terapistCo:
          "İmajinasyon veya nefes egzersizi kayıtlarınızı gömülü oynatıcıyla doğrudan profilinizden dinletin",
        competitor: "Ses dosyalarını mesajlaşma uygulamalarından göndermek",
        terapistHighlight: true,
      },
      {
        feature: "Grup Terapisi ve Atölye Duyuruları",
        terapistCo:
          "Başlangıç tarihi geldiğinde otomatik gizlenen Zamanlanmış Linkler (Schedule Links)",
        competitor: "Süresi geçmiş etkinlik linklerinin profilde kalması",
        terapistHighlight: true,
      },
    ],
    pillarsEyebrow: "YAPILANDIRILMIŞ TERAPİ",
    pillarsTitle: "Ekolünüzün tüm araçları tek bir dijital merkezde.",
    pillarsSubtitle:
      "Danışanlarınız seans aralarında ihtiyaç duydukları tüm form ve egzersizlere profilinizden ulaşsın.",
    pillars: [
      {
        badge: "ŞİFRELİ ÖLÇEKLER",
        title: "Değerlendirme formlarınızı danışana özel PIN ile koruyun",
        description:
          "Young Şema Ölçeği, Mod Envanteri veya BDT otomatik düşünce kayıt bağlantılarınızı kilitli butonlar olarak profilinize yerleştirin.",
      },
      {
        badge: "PSİKO-EĞİTİM KÜTÜPHANESİ",
        title: "Okuma önerilerinizi ve videolarınızı kategorize edin",
        description:
          "Şema terapi kavramlarını veya bilişsel çarpıtmaları anlatan video ve makalelerinizi düzenli kartlar halinde sunun.",
      },
      {
        badge: "DOĞRU EŞLEŞME",
        title: "BDT ve Şema Terapi arayan danışanlar sizi kolayca bulsun",
        description:
          "Keşfet dizinindeki yapılandırılmış terapi yaklaşımı filtreleri sayesinde özellikle sizin ekolünüzde uzman arayan danışanlara ulaşın.",
      },
    ],
    stepsTitle: "BDT & Şema çalışma alanınızı hemen kurun.",
    stepsSubtitle: "Üç adımda formlarınızı ve profilinizi birleştirin.",
    steps: [
      {
        number: "01",
        title: "Profilinizde BDT ve Şema Terapi ekollerini seçin",
        text: "Uzmanlık alanlarınızı ve çalıştığınız terapi yaklaşımlarını işaretleyin.",
      },
      {
        number: "02",
        title: "Şifreli form ve sesli egzersiz bağlantılarınızı ekleyin",
        text: "Link Lock ile ölçeklerinizi kilitleyin, Spotify/YouTube psiko-eğitim içeriklerinizi gömün.",
      },
      {
        number: "03",
        title: "Masa QR kartınızla seans içi geçişi hızlandırın",
        text: "Danışanlarınız seans sonunda QR kartınızı okutarak ödev ve formlarına anında ulaşsın.",
      },
    ],
    faqs: [
      {
        question: "Birden fazla şifreli form ekleyebilir miyim?",
        answer:
          "Evet. BDT formları için ayrı, Şema Terapi ölçekleri için ayrı başlık ve ayrı PIN şifreleriyle dilediğiniz kadar kilitli kaynak tanımlayabilirsiniz.",
      },
      {
        question: "Şifreyi danışanlarıma nasıl iletiyorum?",
        answer:
          "Kaynak oluştururken belirlediğiniz şifreyi seans sırasında sözlü olarak veya masa QR kartınızı okuttuklarında danışanınıza iletebilirsiniz.",
      },
    ],
  },
  {
    slug: "cift-ve-emdr-terapistleri-icin",
    path: "/rehber/cift-ve-emdr-terapistleri-icin",
    category: "rehber",
    categoryLabel: "Uzman Rehberi",
    footerLabel: "Çift, Aile ve EMDR Uzmanları İçin Profil",
    eyebrow: "UZMAN REHBERİ · ÇİFT, AİLE VE EMDR UZMANLARI",
    titleDark: "Çift, Aile ve EMDR uzmanları için",
    titleAccent: "güven odaklı dijital profil kurgusu.",
    metaTitle:
      "Çift, Aile ve EMDR Terapistleri İçin Dijital Profil Rehberi | Terapist.co",
    metaDescription:
      "EMDR, Çift ve Aile Terapisi uzmanları için eğitim ve süpervizyon doğrulaması, stabilizasyon kaynakları, meslektaş yönlendirme ağı ve randevu takvimi.",
    lead: "EMDR ve Çift/Aile Terapisi gibi özel eğitim ve süpervizyon gerektiren alanlarda danışanlar uzmanın yetkinliğini ve çalışma çerçevesini net biçimde görmek ister. Sertifikasyonlarınızı, stabilizasyon egzersizlerinizi ve randevu koşullarınızı güven veren bir düzende sunun.",
    competitorName: "Standart Sosyal Medya Profili",
    terapistTagline:
      "Doğrulanmış eğitim bilgisi, meslektaş ağı ve yapılandırılmış seans çerçevesi",
    competitorTagline:
      "Uzmanlık düzeyinin ve çalışma çerçevesinin belirsiz olduğu sayfalar",
    heroMetrics: [
      {
        label: "Uzmanlık & Eğitim Sunumu",
        terapistValue: "Yapılandırılmış Eğitim & Ekol Alanı",
        competitorValue: "Kısa bio satırı",
      },
      {
        label: "Stabilizasyon Kaynakları",
        terapistValue: "Gömülü Ses & Video Oynatıcı",
        competitorValue: "Harici linkler",
      },
      {
        label: "Bireysel / Çift Yönlendirmesi",
        terapistValue: "terapist.co/r/... Meslektaş Ağı",
        competitorValue: "Manuel yönlendirme",
      },
      {
        label: "Seans Süresi & Koşullar",
        terapistValue: "Şeffaf Ücret ve Takvim",
        competitorValue: "DM ile bilgi alma",
      },
    ],
    comparisonTitle: "Özel Uzmanlık Alanlarında Terapist.co Farkı",
    comparisonSubtitle:
      "EMDR ve Çift/Aile terapistlerinin klinik süreçlerini kolaylaştıran modüller.",
    comparisonRows: [
      {
        feature: "Süpervizyon ve Eğitim Bağlarının Gösterimi",
        terapistCo:
          "Aynı ekolde çalıştığınız veya süpervizyon paylaştığınız doğrulanmış uzmanlarla karşılıklı bağ",
        competitor: "Mesleki topluluk bağını gösteren bir yapı yoktur",
        terapistHighlight: true,
      },
      {
        feature: "Çift Terapisinden Bireysel Terapiye Etik Yönlendirme",
        terapistCo:
          "Çift terapisinde partnerlerden birinin bireysel terapi ihtiyacı doğduğunda terapist.co/r/... ile etik yönlendirme",
        competitor: "İletişim bilgisi paylaşarak takipsiz yönlendirme",
        terapistHighlight: true,
      },
      {
        feature: "Regülasyon ve Kaynak Geliştirme Materyalleri",
        terapistCo:
          "EMDR hazırlık evresi veya çift iletişim egzersizlerini şifreli/gömülü kaynak olarak paylaşma",
        competitor: "Dağınık döküman gönderimi",
        terapistHighlight: true,
      },
    ],
    pillarsEyebrow: "UZMANLIK ODAKLI PROFİL",
    pillarsTitle: "Yetkinliğinizi ve çalışma çerçevenizi netleştirin.",
    pillarsSubtitle:
      "Danışanların ilk başvuruda doğru beklentiyle gelmesini sağlayan profil mimarisi.",
    pillars: [
      {
        badge: "DOĞRULANMIŞ YETKİNLİK",
        title: "Eğitim ve uzmanlık alanlarınızı anlaşılır biçimde sergileyin",
        description:
          "Tamamladığınız EMDR, Gottman, Duygu Odaklı Çift Terapisi veya Sistemik Aile Terapisi eğitimlerinizi profilinizde net bir hiyerarşiyle paylaşın.",
      },
      {
        badge: "ETİK YÖNLENDİRME AĞI",
        title: "Çift ve bireysel terapi sınırlarını meslektaş ağınızla koruyun",
        description:
          "Çift olarak gördüğünüz danışanların bireysel terapi gereksinimlerinde güvendiğiniz doğrulanmış meslektaşlarınıza şeffaf yönlendirme yapın.",
      },
      {
        badge: "BEKLEME LİSTESİ",
        title: "Yoğun seans programınızda yeni talepleri düzenli tutun",
        description:
          "Akşam veya hafta sonu çift seansı saatleriniz dolduğunda Bekleme Listesi özelliğiyle talepleri zaman tercihlerine göre toplayın.",
      },
    ],
    stepsTitle: "Uzmanlık profilinizi 3 adımda oluşturun.",
    stepsSubtitle:
      "Klinik çerçevenizi yansıtan mikro-sitenizi hemen hazırlayın.",
    steps: [
      {
        number: "01",
        title: "terapist.co/adiniz adresinizi seçin",
        text: "İsminize özel kalıcı dijital adresinizi rezerve edin.",
      },
      {
        number: "02",
        title: "Danışan gruplarınızı ve ekollerinizi tanımlayın",
        text: "Çiftler, aileler veya yetişkinler için çalışma çerçevenizi ve ücret bilgilerinizi girin.",
      },
      {
        number: "03",
        title: "Meslektaş ağınızı ve kaynaklarınızı bağlayın",
        text: "Birlikte çalıştığınız uzmanlarla bağ kurun ve danışan kaynaklarınızı yayınlayın.",
      },
    ],
    faqs: [
      {
        question:
          "Profilimde hem bireysel hem çiftlerle çalıştığımı belirtebilir miyim?",
        answer:
          "Evet. Danışan grupları alanında Yetişkin, Çift, Aile, Ergen gibi çalıştığınız tüm grupları seçebilir ve biyografinizde seans koşullarınızı detaylandırabilirsiniz.",
      },
      {
        question:
          "Çalışmadığım bir konuda gelen danışanı başka bir uzmana nasıl yönlendiririm?",
        answer:
          "Panelinizdeki Meslektaş Ağı sekmesinden onaylı bir meslektaşınız için özel terapist.co/r/... bağlantısı oluşturup danışanla paylaşabilirsiniz.",
      },
    ],
  },
  {
    slug: "terapide-kvkk-ve-veri-minimasyonu",
    path: "/rehber/terapide-kvkk-ve-veri-minimasyonu",
    category: "rehber",
    categoryLabel: "Uzman Rehberi",
    footerLabel: "Terapide KVKK ve Veri Minimasyonu",
    eyebrow: "UZMAN REHBERİ · KVKK VE VERİ MİNİMASYONU",
    titleDark: "Psikolojik danışmanlıkta",
    titleAccent: "KVKK ve veri minimasyonu standartları.",
    metaTitle:
      "Psikologlar İçin KVKK, Veri Minimasyonu ve Güvenli Randevu | Terapist.co",
    metaDescription:
      "Klinik psikologların online randevu ve dijital profil süreçlerinde KVKK uyumu, veri minimasyonu, sürümlü aydınlatma metni ve iki aşamalı doğrulama (MFA) rehberi.",
    lead: "Ruh sağlığı alanında dijital araç kullanırken en kritik ilke 'Veri Minimasyonu'dur: Danışandan ilk randevu talebinde tanı, semptom listesi veya terapi öyküsü istememek; aydınlatma metni onayını sürümlü olarak kaydetmek ve uzman hesabını iki aşamalı doğrulama (MFA) ile korumak.",
    competitorName: "Genel İletişim Formları",
    terapistTagline:
      "Tanı ve terapi notu tutmayan, MFA korumalı, veri minimasyonu odaklı mimari",
    competitorTagline:
      "Serbest metin kutularıyla hassas sağlık verisi toplayan kontrolsüz formlar",
    heroMetrics: [
      {
        label: "Tanı & Terapi Notu",
        terapistValue: "Sistemde Tutulmaz (Sıfır Kayıt)",
        competitorValue: "Açık form kutularında birikir",
      },
      {
        label: "Aydınlatma Metni Takibi",
        terapistValue: "Sürümlü Onay Doğrulaması",
        competitorValue: "Belirsiz onay kutusu",
      },
      {
        label: "Uzman Hesap Güvenliği",
        terapistValue: "TOTP İki Aşamalı Doğrulama (MFA)",
        competitorValue: "Yalnızca parola",
      },
      {
        label: "Analitik Gizliliği",
        terapistValue: "1. Parti Anonim Olay Sayımı",
        competitorValue: "Üçüncü taraf reklam izleyicileri",
      },
    ],
    comparisonTitle: "Veri Minimasyonu Odaklı Mimari vs Standart Formlar",
    comparisonSubtitle:
      "Hem danışan mahremiyetini hem de uzmanın hukuki/etik sorumluluğunu gözeten teknik önlemler.",
    comparisonRows: [
      {
        feature: "İlk Randevu Formu İçeriği",
        terapistCo:
          "Yalnızca ad, iletişim, görüşme şekli ve saat tercihi alınır; tanı veya şikayet metni istenmez",
        competitor:
          "'Mesajınız / Şikayetiniz' kutusuyla özel nitelikli sağlık verisi toplanır",
        terapistHighlight: true,
      },
      {
        feature: "Sürümlü Aydınlatma Metni Kontrolü",
        terapistCo:
          "Her randevu ve bekleme listesi kaydında onaylanan aydınlatma metni sürümü sunucu tarafından doğrulanır",
        competitor:
          "Hangi tarihte hangi metnin onaylandığına dair sürüm kaydı tutulmaz",
        terapistHighlight: true,
      },
      {
        feature: "İki Aşamalı Doğrulama (MFA / TOTP)",
        terapistCo:
          "Uzman ve yönetici hesapları için yerleşik Google Authenticator / Authy (TOTP) ve yedek kod desteği",
        competitor: "Basit şifre koruması",
        terapistHighlight: true,
      },
      {
        feature: "Profil Sayfasında İzleyici Kısıtlaması",
        terapistCo:
          "Kısa profil adreslerinde sıkı Content-Security-Policy (CSP) ve no-store önbellek politikası",
        competitor: "Sosyal medya reklam piksellerine açık sayfalar",
        terapistHighlight: true,
      },
    ],
    pillarsEyebrow: "GÜVENLİK MİMARİSİ",
    pillarsTitle: "Tasarımdan itibaren mahremiyet (Privacy by Design).",
    pillarsSubtitle:
      "Terapist.co, klinik veri tutmayan bir iletişim ve randevu köprüsü olarak inşa edilmiştir.",
    pillars: [
      {
        badge: "VERİ MİNİMASYONU",
        title: "Klinik tanı veya seans notu talep etmeyen ilk adım",
        description:
          "Danışanın bir psikologla görüşmek istemesi bile hassas bir bağlamdır. Bu nedenle formlarımızda tanı, ilaç kullanımı veya travma öyküsü gibi alanlar yer almaz.",
      },
      {
        badge: "SÜRÜMLÜ AYDINLATMA",
        title: "Şeffaf ve doğrulanabilir KVKK aydınlatma süreci",
        description:
          "Randevu ve bekleme listesi formları, güncel aydınlatma metni sürümüyle eşleşir; danışan metni inceleyip onaylamadan talep gönderilmez.",
      },
      {
        badge: "MFA & ŞİFRELİ LİNKLER",
        title: "İki aşamalı hesap koruması ve PIN kilitli kaynaklar",
        description:
          "Uzman panelinizi TOTP tabanlı iki aşamalı doğrulamayla koruyun; dış ölçek bağlantılarınızı ise şifreli link (Link Lock) ile paylaşın.",
      },
    ],
    stepsTitle: "Güvenli dijital çalışma alanınıza geçin.",
    stepsSubtitle:
      "Üç adımda veri minimasyonu ilkelerine uygun profilinizi açın.",
    steps: [
      {
        number: "01",
        title: "Uzman başvurunuzu oluşturun",
        text: "terapist.co/adiniz adresinizi seçerek mesleki profilinizi hazırlayın.",
      },
      {
        number: "02",
        title: "Panelinizden iki aşamalı doğrulamayı (MFA) etkinleştirin",
        text: "Hesap güvenliğiniz için doğrulayıcı uygulama (TOTP) kurulumunu tamamlayın.",
      },
      {
        number: "03",
        title: "KVKK uyumlu randevu ve bekleme listesini kullanın",
        text: "Danışan taleplerinizi tanı verisi toplamayan güvenli formlarla kabul edin.",
      },
    ],
    faqs: [
      {
        question:
          "Terapist.co üzerinde danışan seans notları veya tanı bilgileri tutuluyor mu?",
        answer:
          "Hayır. Terapist.co bir elektronik sağlık kaydı (EMR) sistemi değildir; tanı, semptom veya seans notu tutmaz. Yalnızca uzmanın mesleki tanıtımını ve ilk randevu/bekleme listesi iletişim talebini yönetir.",
      },
      {
        question:
          "Uzman hesabımı iki aşamalı doğrulama (MFA) ile nasıl koruyabilirim?",
        answer:
          "Çalışma alanınızdaki güvenlik ayarlarından QR kodu telefonunuzdaki doğrulayıcı uygulamayla (Google Authenticator, Authy vb.) okutarak MFA korumasını ve tek kullanımlık yedek kodlarınızı aktif edebilirsiniz.",
      },
    ],
  },
];

export const SEO_PAGES_BY_PATH: Record<string, SeoPageData> =
  Object.fromEntries(SEO_PAGES.map((page) => [page.path, page]));

export const SEO_PAGES_BY_SLUG: Record<string, SeoPageData> =
  Object.fromEntries(SEO_PAGES.map((page) => [page.slug, page]));

export const SEO_FOOTER_GROUPS = {
  karsilastirma: SEO_PAGES.filter((p) => p.category === "karsilastirma"),
  cozumler: SEO_PAGES.filter((p) => p.category === "cozumler"),
  rehber: SEO_PAGES.filter((p) => p.category === "rehber"),
};
