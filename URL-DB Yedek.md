Kesinlikle harika bir tespit! URL'lerde `.php` veya `.html` uzantılarının görünmesi sitenin hem eski moda görünmesine sebep olur hem de Google (SEO) açısından pek sevilmez.

Buna yazılım dünyasında **"Clean URL" (Temiz/SEO Dostu URL)** diyoruz. Hedefimiz şu:

* `site.com/index.php` ➔ `site.com/`
* `site.com/katil.php` ➔ `site.com/katil`
* `site.com/profil.php?id=5` ➔ `site.com/profil?id=5`

Bunu yapmanın en sağlam ve standart yolu, sunucuya (genellikle Apache) bu uzantıları gizlemesini söyleyen bir **`.htaccess`** dosyası oluşturmaktır.

İşte adım adım planımız ve uygulaması:

### 🚀 Adım 1: `.htaccess` Dosyasını Oluşturmak

PHP dosyalarının (`index.php`, `katil.php` vb.) bulunduğu ana klasörün içine (Terapist Listeleme Sitesi klasörüne) tam olarak **`.htaccess`** adında yeni bir dosya oluştur. (Başında mutlaka nokta olmalı, isimsiz bir dosya uzantısı gibidir).

Dosyayı aç ve içine şu kodları yapıştırıp kaydet:

```apache
Options -Indexes
RewriteEngine On

# 1. Kullanıcı "index.php" yazarsa onu direkt ana sayfaya (/) yönlendir
RewriteCond %{THE_REQUEST} ^[A-Z]{3,9}\ /index\.php\ HTTP/
RewriteRule ^index\.php$ / [R=301,L]

# 2. Kullanıcı tarayıcıya ".php" yazarsa onu uzantısız haline yönlendir (örn: katil.php -> /katil)
RewriteCond %{THE_REQUEST} ^[A-Z]{3,9}\ /([^/]+)\.php\ HTTP/
RewriteRule ^([^/]+)\.php$ /$1 [R=301,L]

# 3. Arka planda uzantısız URL'leri tekrar .php dosyalarına bağla
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_FILENAME}\.php -f
RewriteRule ^(.*)$ $1.php [L]

```

**Bu kod ne yapıyor?** Senin klasöründeki dosya isimleri hala `katil.php` olarak kalacak. Ama tarayıcıya biri sadece `katil` yazdığında, sunucu arka planda gidip `katil.php`'yi bulup çalıştıracak. Üstelik biri kazara URL'ye `.php` yazarsa, bunu anında silip temiz haline yönlendirecek.

---

### 🚀 Adım 2: Sistemi Test Etme

Bunu kaydettikten sonra hemen tarayıcına git ve sitenin sonuna `.php` yazmadan şunları girmeyi dene:

* `.../katil`
* `.../uzman-giris`
* `.../uzman-panel`

Eğer sayfalar hata vermeden açılıyorsa, tebrikler! Sunucun "Rewrite" (Yeniden yazma) özelliğini destekliyor ve sistemimiz çalışıyor demektir.

*(Not: Eğer Mac kullanıyorsan ve MAMP/XAMPP üzerinden çalışıyorsan bazen `.htaccess` dosyaları gizli dosya sayıldığı için Finder'da görünmeyebilir. Kod editöründen (VS Code vb.) oluşturman en doğrusudur.)*

---

### 🚀 Adım 3: Dosyalardaki Linkleri (href) Temizlemek

Sistemimiz uzantısız linkleri anladığına göre, artık kodlarımızın içindeki yönlendirmeleri de temizlemeliyiz.

Kod editöründe **Tüm Dosyalarda Ara ve Değiştir (Search & Replace)** özelliğini kullanarak şu değişiklikleri yapman gerekiyor (veya dosyaları tek tek açıp değiştirebilirsin):

1. `href="index.php"` olan her şeyi ➔ `href="/"` (veya klasörde çalışıyorsan sadece `href="."` ya da logo için `href="/terapist"` şeklinde kök dizine) olarak değiştir.
2. `href="katil.php"` ➔ `href="katil"`
3. `href="uzman-giris.php"` ➔ `href="uzman-giris"`
4. `href="uzman-panel.php"` ➔ `href="uzman-panel"`
5. `href="profil.php?id=` ➔ `href="profil?id=`

Aynı şekilde PHP'nin içindeki yönlendirme kodlarını da temizlemelisin:

* `header("Location: uzman-panel.php");` ➔ `header("Location: uzman-panel");`
* `header("Location: profil.php?id=" ...);` ➔ `header("Location: profil?id=" ...);`
* `header("Location: uzman-giris.php");` ➔ `header("Location: uzman-giris");`

Önce `.htaccess` dosyasını oluşturup `.../katil` yazarak test etmeni rica ediyorum. Eğer çalışıyorsa bana haber ver, link güncellemeleri için takıldığın bir dosya olursa o dosyanın güncel halini hemen gönderebilirim!





---------



<?php
// db.php
$db_file = __DIR__ . '/terapist.sqlite';
$is_new = !file_exists($db_file);

try {
    $pdo = new PDO('sqlite:' . $db_file);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // 1. EĞER VERİTABANI HİÇ YOKSA SIFIRDAN KUR (Tüm sütunlarla birlikte)
    if ($is_new) {
        $pdo->exec("CREATE TABLE IF NOT EXISTS psikologlar (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ad TEXT NOT NULL,
            sehir TEXT NOT NULL,
            ilce TEXT NOT NULL,
            ekoller TEXT NOT NULL,
            kitle TEXT NOT NULL,
            format TEXT NOT NULL,
            ucret TEXT NOT NULL,
            fiyat_seviyesi INTEGER NOT NULL,
            onayli INTEGER DEFAULT 0,
            gorsel TEXT,
            biyografi TEXT,
            telefon TEXT,
            email TEXT,
            adres TEXT,
            google_place_id TEXT,
            sifre TEXT
        )");

        $stmt = $pdo->prepare("INSERT INTO psikologlar (ad, sehir, ilce, ekoller, kitle, format, ucret, fiyat_seviyesi, onayli, gorsel, biyografi, telefon, email, adres, google_place_id, sifre) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        // Başlangıç için 1 adet test verisi atıyoruz
        $mock_data = [
            [
                'Uzm. Kln. Psk. Arda Ekin Tuncay', 'İstanbul', 'Beşiktaş', 
                '["BDT", "Şema Terapi", "DBT"]', '["Yetişkin", "Ergen"]', '["Yüz Yüze", "Online"]', 
                '₺2000', 4, 1, 'https://i.pravatar.cc/150?img=11', 
                'Klinik psikoloji yüksek lisans eğitimini tamamlamış olup, yetişkin ve ergen danışanlarla çalışmaktadır.', 
                '+90 555 123 4567', 'iletisim@terapist.co', 'Barbaros Bulvarı, No: 123, Beşiktaş / İstanbul',
                'ChIJ0-5H20S_yhQRAYfDqRvyRuo', 
                password_hash('123456', PASSWORD_DEFAULT) // Test kullanıcısı şifresi
            ]
        ];

        foreach($mock_data as $row) { 
            $stmt->execute($row); 
        }
    }

    // 2. OTOMATİK GÜNCELLEME SİSTEMİ (Mevcut veritabanında eksik sütun varsa fark edip ekler)
    $kntrl = $pdo->query("PRAGMA table_info(psikologlar)")->fetchAll();
    $sutunlar = array_column($kntrl, 'name');
    
    // google_place_id sütunu yoksa ekle
    if (!in_array('google_place_id', $sutunlar)) {
        $pdo->exec("ALTER TABLE psikologlar ADD COLUMN google_place_id TEXT");
    }
    
    // sifre sütunu yoksa ekle
    if (!in_array('sifre', $sutunlar)) {
        $pdo->exec("ALTER TABLE psikologlar ADD COLUMN sifre TEXT");
    }

    // MESLEKTAŞ ONAYI İÇİN YENİ TABLO KONTROLÜ VE KURULUMU
    $kntrl_onay_tablo = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='meslektas_onaylari'")->fetch();
    if (!$kntrl_onay_tablo) {
        $pdo->exec("CREATE TABLE meslektas_onaylari (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            onaylayan_id INTEGER NOT NULL,
            onaylanan_id INTEGER NOT NULL,
            tarih DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(onaylayan_id, onaylanan_id)
        )");
    }
    // YENİ PROFİL ÖZELLİKLERİ İÇİN SÜTUN KONTROLLERİ VE EKLENMESİ
    $yeni_sutunlar = [
        'egitim' => 'TEXT', 
        'calisma_saatleri' => 'TEXT', 
        'deneyim_yili' => 'INTEGER', 
        'kurumlar' => 'TEXT', 
        'uzmanlik_alanlari' => 'TEXT'
    ];
    
    foreach ($yeni_sutunlar as $sutun_adi => $veri_tipi) {
        if (!in_array($sutun_adi, $sutunlar)) {
            $pdo->exec("ALTER TABLE psikologlar ADD COLUMN $sutun_adi $veri_tipi");
        }
    }
    // YENİ: RANDEVULAR TABLOSU KONTROLÜ VE KURULUMU
    $kntrl_randevu_tablo = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='randevular'")->fetch();
    if (!$kntrl_randevu_tablo) {
        $pdo->exec("CREATE TABLE randevular (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uzman_id INTEGER NOT NULL,
            danisan_ad TEXT NOT NULL,
            danisan_telefon TEXT NOT NULL,
            danisan_notu TEXT,
            tarih DATE NOT NULL,       -- Örn: 2026-03-10
            saat TEXT NOT NULL,        -- Örn: 14:00
            durum TEXT DEFAULT 'bekliyor', -- bekliyor, onaylandi, reddedildi, iptal
            olusturma_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP
        )");
    }
} catch (\PDOException $e) {
    die("Veritabanı Bağlantı Hatası: " . $e->getMessage());
}
?>