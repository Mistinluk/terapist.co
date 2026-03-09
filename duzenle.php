<?php
session_start();

// Güvenlik: Admin girişi kontrolü
if (!isset($_SESSION['admin_giris'])) {
    header("Location: admin.php");
    exit;
}

require_once 'db.php';

// URL'den gelen ID'yi alıyoruz
$id = $_GET['id'] ?? 0;

// Form gönderildiğinde (Güncelleme İşlemi)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $ad = $_POST['ad'] ?? '';
    $sehir = $_POST['sehir'] ?? '';
    $ilce = $_POST['ilce'] ?? '';
    $ucret = $_POST['ucret'] ?? '';
    $fiyat_seviyesi = (int)($_POST['fiyat_seviyesi'] ?? 3);
    $onayli = isset($_POST['onayli']) ? 1 : 0;
    $gorsel = $_POST['gorsel'] ?? '';
    $biyografi = $_POST['biyografi'] ?? '';
    $telefon = $_POST['telefon'] ?? '';
    $email = $_POST['email'] ?? '';
    $adres = $_POST['adres'] ?? '';

    $ekoller = json_encode($_POST['ekol'] ?? [], JSON_UNESCAPED_UNICODE);
    $kitle   = json_encode($_POST['kitle'] ?? [], JSON_UNESCAPED_UNICODE);
    $format  = json_encode($_POST['format'] ?? [], JSON_UNESCAPED_UNICODE);

    // Güncelleme SQL Sorgusu (UPDATE)
    $sql = "UPDATE psikologlar SET 
            ad = ?, sehir = ?, ilce = ?, ekoller = ?, kitle = ?, format = ?, 
            ucret = ?, fiyat_seviyesi = ?, onayli = ?, gorsel = ?, biyografi = ?, 
            telefon = ?, email = ?, adres = ? 
            WHERE id = ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$ad, $sehir, $ilce, $ekoller, $kitle, $format, $ucret, $fiyat_seviyesi, $onayli, $gorsel, $biyografi, $telefon, $email, $adres, $id]);

    header("Location: admin.php");
    exit;
}

// ---------------------------------------------------------
// Mevcut Veriyi Çekme İşlemi (Formu doldurmak için)
// ---------------------------------------------------------
$stmt = $pdo->prepare("SELECT * FROM psikologlar WHERE id = ?");
$stmt->execute([$id]);
$uzman = $stmt->fetch();

// Eğer URL'ye rastgele bir ID yazılırsa ve uzman bulunamazsa panele geri gönder
if (!$uzman) {
    header("Location: admin.php");
    exit;
}

// Veritabanındaki JSON metinlerini PHP dizisine çeviriyoruz ki checkbox'ları işaretleyebilelim
$mevcut_ekoller = json_decode($uzman['ekoller'], true) ?? [];
$mevcut_kitle   = json_decode($uzman['kitle'], true) ?? [];
$mevcut_format  = json_decode($uzman['format'], true) ?? [];

// Form Seçenekleri
$sabit_ekoller = ['BDT', 'Şema Terapi', 'DBT', 'EMDR', 'Psikanalitik', 'Oyun Terapisi', 'ACT', 'Varoluşçu', 'Gestalt', 'Dinamik'];
$sabit_kitleler = ['Yetişkin', 'Ergen', 'Çocuk', 'Çift', 'Aile'];
$sabit_formatlar = ['Yüz Yüze', 'Online'];
?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Uzman Düzenle - Terapist.co Admin</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
    </style>
</head>
<body class="bg-[#FAFAFA] text-gray-900 antialiased pb-20">

    <nav class="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div class="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
            <div class="flex items-center gap-2">
                <span class="text-2xl">🛋️</span>
                <span class="font-extrabold text-xl tracking-tight">Terapist.co <span class="text-sm font-medium text-gray-400 ml-1">Admin</span></span>
            </div>
            <a href="admin.php" class="text-sm font-medium text-gray-500 hover:text-gray-900 transition">← Panele Dön</a>
        </div>
    </nav>

    <main class="max-w-4xl mx-auto px-4 mt-8">
        
        <div class="mb-8 flex items-center gap-4">
            <img src="<?= htmlspecialchars($uzman['gorsel']) ?>" class="w-16 h-16 rounded-full border-2 border-white shadow-sm object-cover">
            <div>
                <h1 class="text-3xl font-extrabold tracking-tight mb-1">Profili Düzenle</h1>
                <p class="text-gray-500"><?= htmlspecialchars($uzman['ad']) ?> isimli uzmanın bilgilerini güncelliyorsunuz.</p>
            </div>
        </div>

        <form method="POST" action="" class="space-y-8">
            
            <div class="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm">
                <h2 class="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-2">Temel Bilgiler</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="md:col-span-2">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Ad Soyad ve Unvan *</label>
                        <input type="text" name="ad" value="<?= htmlspecialchars($uzman['ad']) ?>" required class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50 focus:bg-white">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Şehir *</label>
                        <input type="text" name="sehir" value="<?= htmlspecialchars($uzman['sehir']) ?>" required class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50 focus:bg-white">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">İlçe</label>
                        <input type="text" name="ilce" value="<?= htmlspecialchars($uzman['ilce']) ?>" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50 focus:bg-white">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Profil Fotoğrafı URL</label>
                        <input type="text" name="gorsel" value="<?= htmlspecialchars($uzman['gorsel']) ?>" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50 focus:bg-white">
                    </div>
                    <div class="flex items-center gap-3 mt-8">
                        <input type="checkbox" name="onayli" id="onayli" <?= $uzman['onayli'] ? 'checked' : '' ?> class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 accent-blue-600 cursor-pointer">
                        <label for="onayli" class="text-sm font-bold text-gray-900 cursor-pointer">Diploması / Uzmanlığı Onaylanmış</label>
                    </div>
                </div>
            </div>

            <div class="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm">
                <h2 class="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-2">Mesleki Detaylar</h2>
                
                <div class="mb-6">
                    <label class="block text-sm font-semibold text-gray-700 mb-3">Terapi Ekolleri</label>
                    <div class="flex flex-wrap gap-3">
                        <?php foreach($sabit_ekoller as $ekol): ?>
                        <label class="flex items-center gap-2 bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                            <input type="checkbox" name="ekol[]" value="<?= $ekol ?>" <?= in_array($ekol, $mevcut_ekoller) ? 'checked' : '' ?> class="w-4 h-4 accent-blue-600">
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
                                <input type="checkbox" name="kitle[]" value="<?= $kitle ?>" <?= in_array($kitle, $mevcut_kitle) ? 'checked' : '' ?> class="w-4 h-4 accent-blue-600">
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
                                <input type="checkbox" name="format[]" value="<?= $format ?>" <?= in_array($format, $mevcut_format) ? 'checked' : '' ?> class="w-4 h-4 accent-blue-600">
                                <span class="text-sm font-medium text-gray-700"><?= $format ?></span>
                            </label>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm">
                <h2 class="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-2">Ücret, İletişim ve Biyografi</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Net Ücret</label>
                        <input type="text" name="ucret" value="<?= htmlspecialchars($uzman['ucret']) ?>" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50 focus:bg-white">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Ücret Seviyesi</label>
                        <select name="fiyat_seviyesi" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50 focus:bg-white cursor-pointer">
                            <?php for($i=1; $i<=5; $i++): ?>
                                <option value="<?= $i ?>" <?= $uzman['fiyat_seviyesi'] == $i ? 'selected' : '' ?>>Seviye <?= $i ?></option>
                            <?php endfor; ?>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Telefon</label>
                        <input type="text" name="telefon" value="<?= htmlspecialchars($uzman['telefon']) ?>" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50 focus:bg-white">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">E-posta</label>
                        <input type="email" name="email" value="<?= htmlspecialchars($uzman['email']) ?>" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50 focus:bg-white">
                    </div>

                    <div class="md:col-span-2">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Ofis Adresi</label>
                        <input type="text" name="adres" value="<?= htmlspecialchars($uzman['adres']) ?>" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50 focus:bg-white">
                    </div>

                    <div class="md:col-span-2">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Google İşletme Kimliği (Place ID) - İsteğe Bağlı</label>
                        <p class="text-xs text-gray-500 mb-2">Profilinizde Google yorumlarınızın görünmesi için <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" class="text-blue-600 underline">buradan</a> işletmenizin Place ID'sini bulup yapıştırın.</p>
                        <input type="text" name="google_place_id" placeholder="Örn: ChIJ0-5H20S_yhQRAYfDqRvyRuo" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50 focus:bg-white">
                    </div>

                    <div class="md:col-span-2">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Hakkında / Biyografi</label>
                        <textarea name="biyografi" rows="4" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50 focus:bg-white resize-y"><?= htmlspecialchars($uzman['biyografi']) ?></textarea>
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-end gap-4 pt-4">
                <a href="admin.php" class="px-6 py-3 text-gray-500 font-semibold hover:text-gray-900 transition">İptal Et</a>
                <button type="submit" class="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg">Değişiklikleri Kaydet</button>
            </div>

        </form>
    </main>
</body>
</html>