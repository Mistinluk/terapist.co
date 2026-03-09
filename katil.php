<?php
require_once 'db.php';

$basarili = false;

// Form gönderildiğinde
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $ad = $_POST['ad'] ?? '';
    $sehir = $_POST['sehir'] ?? '';
    $ilce = $_POST['ilce'] ?? '';
    $ucret = $_POST['ucret'] ?? '';
    
    // GÜVENLİK: Uzmanlar bu alanları dolduramaz, sistem otomatik atar!
    $fiyat_seviyesi = 3; // Admin sonradan 1-5 arası değiştirebilir
    $onayli = 0;         // 0 = Bekliyor (Sitede görünmez)
    
    $gorsel = $_POST['gorsel'] ?? '';
    $biyografi = $_POST['biyografi'] ?? '';
    $telefon = $_POST['telefon'] ?? '';
    $email = $_POST['email'] ?? '';
    $adres = $_POST['adres'] ?? '';
    $google_place_id = $_POST['google_place_id'] ?? ''; // Google Yorumları için

    $ekoller = json_encode($_POST['ekol'] ?? [], JSON_UNESCAPED_UNICODE);
    $kitle   = json_encode($_POST['kitle'] ?? [], JSON_UNESCAPED_UNICODE);
    $format  = json_encode($_POST['format'] ?? [], JSON_UNESCAPED_UNICODE);

    // ŞİFRELEME: Uzmanın girdiği şifreyi güvenli (hash) formata çeviriyoruz
    $sifre = password_hash($_POST['sifre'], PASSWORD_DEFAULT);

    // SQL Sorgusu: Şifre ve Google Place ID eklendi
    $sql = "INSERT INTO psikologlar (ad, sehir, ilce, ekoller, kitle, format, ucret, fiyat_seviyesi, onayli, gorsel, biyografi, telefon, email, adres, google_place_id, sifre) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$ad, $sehir, $ilce, $ekoller, $kitle, $format, $ucret, $fiyat_seviyesi, $onayli, $gorsel, $biyografi, $telefon, $email, $adres, $google_place_id, $sifre]);

    $basarili = true;
}

$sabit_ekoller = ['BDT', 'Şema Terapi', 'DBT', 'EMDR', 'Psikanalitik', 'Oyun Terapisi', 'ACT', 'Varoluşçu', 'Gestalt', 'Dinamik'];
$sabit_kitleler = ['Yetişkin', 'Ergen', 'Çocuk', 'Çift', 'Aile'];
$sabit_formatlar = ['Yüz Yüze', 'Online'];
?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Uzman Olarak Katıl - Terapist.co</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
    </style>
</head>
<body class="bg-[#FAFAFA] text-gray-900 antialiased pb-20">

    <nav class="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div class="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
            <a href="index.php" class="flex items-center hover:opacity-80 transition cursor-pointer">
             <img src="Terapistco.png" alt="Terapist.co Logo" class="h-8 md:h-10 w-auto object-contain">
            </a>
            <div class="flex items-center gap-4">
                <a href="uzman-giris.php" class="text-sm font-bold text-blue-600 hover:underline">Uzman Girişi</a>
                <a href="index.php" class="text-sm font-medium text-gray-500 hover:text-gray-900 transition hidden sm:inline-block">Ana Sayfaya Dön</a>
            </div>
        </div>
    </nav>

    <main class="max-w-4xl mx-auto px-4 mt-10">
        
        <?php if($basarili): ?>
            <div class="bg-green-50 border border-green-200 p-10 rounded-2xl text-center max-w-2xl mx-auto mt-10 shadow-sm">
                <div class="text-5xl mb-4">🎉</div>
                <h2 class="text-2xl font-extrabold text-gray-900 mb-2">Başvurunuz Alındı!</h2>
                <p class="text-gray-600 mb-6">Profil bilgileriniz sistemimize ulaştı. Ekibimiz tarafından incelenip onaylandıktan sonra Terapist.co üzerinde yayınlanacaktır.</p>
                <a href="uzman-giris.php" class="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition">Uzman Paneline Giriş Yap</a>
            </div>
        <?php else: ?>
            <div class="mb-8 text-center max-w-2xl mx-auto">
                <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">Uzman Ağımıza Katılın</h1>
                <p class="text-gray-500 text-lg">Danışanların size kolayca ulaşabilmesi için profilinizi oluşturun. Başvurunuz incelendikten sonra yayına alınacaktır.</p>
            </div>

            <form method="POST" action="" class="space-y-8">
                
                <div class="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm">
                    <h2 class="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-2">Kişisel Bilgiler</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="md:col-span-2">
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Ad Soyad ve Unvanınız *</label>
                            <input type="text" name="ad" placeholder="Örn: Uzm. Kln. Psk. Adınız Soyadınız" required class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50 focus:bg-white">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Bulunduğunuz Şehir *</label>
                            <input type="text" name="sehir" placeholder="Örn: İstanbul" required class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50 focus:bg-white">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">İlçe</label>
                            <input type="text" name="ilce" placeholder="Örn: Kadıköy" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50 focus:bg-white">
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Profil Fotoğrafı URL (İsteğe Bağlı)</label>
                            <input type="text" name="gorsel" placeholder="Fotoğrafınızın linkini yapıştırın" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50 focus:bg-white">
                        </div>
                    </div>
                </div>

                <div class="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm">
                    <h2 class="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-2">Çalışma Alanlarınız</h2>
                    
                    <div class="mb-6">
                        <label class="block text-sm font-semibold text-gray-700 mb-3">Terapi Ekolleri (Birden fazla seçebilirsiniz)</label>
                        <div class="flex flex-wrap gap-3">
                            <?php foreach($sabit_ekoller as $ekol): ?>
                            <label class="flex items-center gap-2 bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                                <input type="checkbox" name="ekol[]" value="<?= $ekol ?>" class="w-4 h-4 accent-blue-600">
                                <span class="text-sm font-medium text-gray-700"><?= $ekol ?></span>
                            </label>
                            <?php endforeach; ?>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-3">Danışan Kitlesi</label>
                            <div class="flex flex-col gap-2">
                                <?php foreach($sabit_kitleler as $kitle): ?>
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" name="kitle[]" value="<?= $kitle ?>" class="w-4 h-4 accent-blue-600">
                                    <span class="text-sm font-medium text-gray-700"><?= $kitle ?></span>
                                </label>
                                <?php endforeach; ?>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-3">Terapi Formatı</label>
                            <div class="flex flex-col gap-2">
                                <?php foreach($sabit_formatlar as $format): ?>
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" name="format[]" value="<?= $format ?>" class="w-4 h-4 accent-blue-600">
                                    <span class="text-sm font-medium text-gray-700"><?= $format ?></span>
                                </label>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm">
                    <h2 class="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-2">İletişim ve Hesap Bilgileri</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Net Seans Ücretiniz *</label>
                            <input type="text" name="ucret" placeholder="Örn: ₺1500" required class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50 focus:bg-white">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">İletişim Numarası (WhatsApp) *</label>
                            <input type="text" name="telefon" placeholder="Örn: +90 555..." required class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50 focus:bg-white">
                        </div>

                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">E-posta (Giriş İçin Kullanılacak) *</label>
                            <input type="email" name="email" required placeholder="ornek@mail.com" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50 focus:bg-white">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Şifre Belirleyin (Giriş İçin) *</label>
                            <input type="password" name="sifre" required placeholder="En az 6 karakter" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50 focus:bg-white">
                        </div>

                        <div class="md:col-span-2">
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Açık Ofis Adresi</label>
                            <input type="text" name="adres" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50 focus:bg-white">
                        </div>
                        
                        <div class="md:col-span-2 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                            <label class="block text-sm font-bold text-blue-900 mb-2">Google İşletme Kimliği (Place ID) - İsteğe Bağlı</label>
                            <p class="text-xs text-blue-700 mb-3">Profilinizde Google Yıldızlarınızın ve Yorumlarınızın görünmesi için işletmenizin kimlik numarasını buraya yapıştırabilirsiniz.</p>
                            <input type="text" name="google_place_id" placeholder="Örn: ChIJ0-5H20S_yhQRAYfDqRvyRuo" class="w-full px-4 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white text-gray-900">
                        </div>

                        <div class="md:col-span-2">
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Kısa Biyografiniz *</label>
                            <textarea name="biyografi" rows="4" required placeholder="Eğitiminiz, uzmanlık alanlarınız ve terapi yaklaşımınız hakkında bilgi verin..." class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50 focus:bg-white resize-y"></textarea>
                        </div>
                    </div>
                </div>

                <div class="flex items-center justify-center pt-4">
                    <button type="submit" class="w-full md:w-auto bg-blue-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg">Başvuruyu Tamamla</button>
                </div>

            </form>
        <?php endif; ?>
    </main>
</body>
</html>