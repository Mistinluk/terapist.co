<?php
// Veritabanı bağlantımızı çağırıyoruz
require_once 'db.php';

// Rastgele seçeceğimiz havuzlar
$isimler = ['Zeynep', 'Ayşe', 'Elif', 'Fatma', 'Ahmet', 'Mehmet', 'Mustafa', 'Burak', 'Caner', 'Emre', 'Cemre', 'Selin', 'Gizem', 'Deniz', 'Ozan', 'Efe', 'Sude', 'Merve', 'Kaan', 'Cem'];
$soyadlar = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin'];
$sehirler = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Muğla', 'Eskişehir', 'Gaziantep', 'Kayseri'];
$ilceler = ['Merkez', 'Kadıköy', 'Beşiktaş', 'Çankaya', 'Alsancak', 'Nilüfer', 'Muratpaşa', 'Bodrum', 'Karşıyaka', 'Şişli'];

$sabit_ekoller = ['BDT', 'Şema Terapi', 'DBT', 'EMDR', 'Psikanalitik', 'Oyun Terapisi', 'ACT', 'Varoluşçu', 'Gestalt', 'Dinamik'];
$sabit_kitleler = ['Yetişkin', 'Ergen', 'Çocuk', 'Çift', 'Aile'];
$sabit_formatlar = ['Yüz Yüze', 'Online'];

// İşlemi çok hızlandırmak için SQLite Transaction (Toplu İşlem) başlatıyoruz
$pdo->beginTransaction();

try {
    // Hazırlanmış SQL sorgusu
    $sql = "INSERT INTO psikologlar (ad, sehir, ilce, ekoller, kitle, format, ucret, fiyat_seviyesi, onayli, gorsel, biyografi, telefon, email, adres, sifre) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $pdo->prepare($sql);

    // 100 kere dönecek döngü
    for ($i = 0; $i < 100; $i++) {
        
        // Rastgele verileri oluştur
        $cinsiyet_unvan = (rand(0, 1) == 1) ? 'Uzm. Kln. Psk.' : 'Kln. Psk.';
        $rastgele_ad = $cinsiyet_unvan . ' ' . $isimler[array_rand($isimler)] . ' ' . $soyadlar[array_rand($soyadlar)];
        $rastgele_sehir = $sehirler[array_rand($sehirler)];
        $rastgele_ilce = $ilceler[array_rand($ilceler)];
        
        // Fiyat belirleme
        $fiyat_seviyesi = rand(1, 5);
        $ucret = '₺' . ($fiyat_seviyesi * 500 + rand(0, 4) * 100); // 500₺ ile 2900₺ arası mantıklı fiyatlar
        
        // Dizilerden rastgele 2-3 eleman seçip JSON'a çevirme
        $secilen_ekoller = json_encode((array)array_rand(array_flip($sabit_ekoller), rand(1, 3)), JSON_UNESCAPED_UNICODE);
        $secilen_kitleler = json_encode((array)array_rand(array_flip($sabit_kitleler), rand(1, 3)), JSON_UNESCAPED_UNICODE);
        
        // Formatı bazen tek, bazen ikisi birden yapalım
        $secilen_format = [];
        if(rand(0,1)) $secilen_format[] = 'Online';
        if(rand(0,1)) $secilen_format[] = 'Yüz Yüze';
        if(empty($secilen_format)) $secilen_format[] = 'Online'; // Boş kalmasın
        $secilen_format = json_encode($secilen_format, JSON_UNESCAPED_UNICODE);

        // Rastgele Avatar (ui-avatars'dan ismin baş harflerine göre)
        $isim_sade = str_replace(['Uzm.', 'Kln.', 'Psk.', ' '], ['', '', '', '+'], $rastgele_ad);
        $gorsel = 'https://ui-avatars.com/api/?name=' . trim($isim_sade) . '&background=random&color=fff';

        $biyografi = "Bu, sistem testleri için otomatik olarak oluşturulmuş sahte bir biyografi metnidir. Danışanlarına $rastgele_sehir bölgesinde hizmet vermektedir.";
        $telefon = '+90 5' . rand(10, 55) . ' ' . rand(100, 999) . ' ' . rand(1000, 9999);
        $email = strtolower(explode(' ', $soyadlar[array_rand($soyadlar)])[0]) . rand(10,99) . '@testmail.com';
        $adres = $rastgele_ilce . ' / ' . $rastgele_sehir;
        
        // %80 ihtimalle onaylı (1), %20 ihtimalle onaysız (0 - bekleyen) olsun
        $onayli = (rand(1, 100) <= 80) ? 1 : 0; 
        
        // Varsayılan giriş şifresi: 123456
        $sifre = password_hash('123456', PASSWORD_DEFAULT);

        // Veritabanına kaydet
        $stmt->execute([$rastgele_ad, $rastgele_sehir, $rastgele_ilce, $secilen_ekoller, $secilen_kitleler, $secilen_format, $ucret, $fiyat_seviyesi, $onayli, $gorsel, $biyografi, $telefon, $email, $adres, $sifre]);
    }

    // Toplu işlemi onayla ve bitir
    $pdo->commit();
    echo "<div style='font-family:sans-serif; text-align:center; padding:50px;'>
            <h1 style='color:green;'>Başarılı! 🎉</h1>
            <p>100 adet sahte uzman başarıyla veritabanına eklendi.</p>
            <a href='index.php' style='display:inline-block; margin-top:20px; padding:10px 20px; background:black; color:white; text-decoration:none; border-radius:8px;'>Ana Sayfaya Dön</a>
          </div>";

} catch (Exception $e) {
    // Hata olursa işlemi geri al
    $pdo->rollBack();
    echo "Hata oluştu: " . $e->getMessage();
}
?>