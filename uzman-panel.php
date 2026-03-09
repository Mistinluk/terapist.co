<?php
session_start();
require_once 'db.php';

if (!isset($_SESSION['uzman_id'])) {
    header("Location: uzman-giris.php");
    exit;
}

$id = $_SESSION['uzman_id'];
$basarili = false;

if (isset($_GET['cikis'])) {
    session_destroy();
    header("Location: uzman-giris.php");
    exit;
}

$sabit_uzmanliklar = ['Kaygı / anksiyete', 'Panik atak', 'Depresyon', 'OKB', 'Sosyal kaygı', 'Travma', 'Yas / kayıp', 'İlişki sorunları', 'Çift problemleri', 'Evlilik sorunları', 'Boşanma süreci', 'Öfke kontrolü', 'Tükenmişlik', 'Stres yönetimi', 'Özgüven / özsaygı', 'Sınır koyma', 'Bağlanma sorunları', 'Yalnızlık', 'Erteleme', 'Motivasyon', 'Yeme davranışı sorunları', 'Uyku sorunları', 'İş / kariyer sorunları', 'Aile içi çatışma', 'Ebeveyn danışmanlığı', 'Ergenlik sorunları', 'Çocuk davranış problemleri', 'Cinsel yaşam / cinsel terapi'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $gorsel = $_POST['gorsel'] ?? '';
    $biyografi = $_POST['biyografi'] ?? '';
    $telefon = $_POST['telefon'] ?? '';
    $adres = $_POST['adres'] ?? '';
    $ucret = $_POST['ucret'] ?? '';
    $google_place_id = $_POST['google_place_id'] ?? '';
    $deneyim_yili = (int)($_POST['deneyim_yili'] ?? 0);
    
    $takvim = [];
    $gunler = ['pazartesi' => 'Pazartesi', 'sali' => 'Salı', 'carsamba' => 'Çarşamba', 'persembe' => 'Perşembe', 'cuma' => 'Cuma', 'cumartesi' => 'Cumartesi', 'pazar' => 'Pazar'];
    foreach ($gunler as $slug => $gun_adi) {
        if (!empty($_POST['gun_' . $slug])) {
            $baslangic = $_POST['baslangic_' . $slug] ?? '09:00';
            $bitis = $_POST['bitis_' . $slug] ?? '17:00';
            $takvim[$gun_adi] = $baslangic . ' - ' . $bitis;
        }
    }
    $calisma_saatleri_json = json_encode($takvim, JSON_UNESCAPED_UNICODE);
    
    $egitim_dizi = array_filter(array_map('trim', explode("\n", $_POST['egitim'] ?? '')));
    $egitim_json = json_encode($egitim_dizi, JSON_UNESCAPED_UNICODE);
    
    $kurumlar_dizi = array_filter(array_map('trim', explode("\n", $_POST['kurumlar'] ?? '')));
    $kurumlar_json = json_encode($kurumlar_dizi, JSON_UNESCAPED_UNICODE);
    
    $uzmanlik_json = json_encode($_POST['uzmanlik_alanlari'] ?? [], JSON_UNESCAPED_UNICODE);

    $sql = "UPDATE psikologlar SET 
            gorsel = ?, biyografi = ?, telefon = ?, adres = ?, ucret = ?, google_place_id = ?, 
            deneyim_yili = ?, calisma_saatleri = ?, egitim = ?, kurumlar = ?, uzmanlik_alanlari = ? 
            WHERE id = ?";
            
    $pdo->prepare($sql)->execute([$gorsel, $biyografi, $telefon, $adres, $ucret, $google_place_id, $deneyim_yili, $calisma_saatleri_json, $egitim_json, $kurumlar_json, $uzmanlik_json, $id]);
    $basarili = true;
}

$stmt = $pdo->prepare("SELECT * FROM psikologlar WHERE id = ?");
$stmt->execute([$id]);
$uzman = $stmt->fetch();

$mevcut_egitim = implode("\n", json_decode($uzman['egitim'] ?? '[]', true) ?? []);
$mevcut_kurumlar = implode("\n", json_decode($uzman['kurumlar'] ?? '[]', true) ?? []);
$mevcut_uzmanlik = json_decode($uzman['uzmanlik_alanlari'] ?? '[]', true) ?? [];
$mevcut_takvim = json_decode($uzman['calisma_saatleri'] ?? '[]', true) ?? [];
?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profili Düzenle - Terapist.co</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); body { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-[#FAFAFA] text-gray-900 antialiased pb-20">

    <nav class="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div class="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
            <div class="flex items-center gap-2">
                <span class="text-2xl">🛋️</span>
                <span class="font-extrabold text-xl tracking-tight">Terapist.co <span class="text-sm font-medium text-gray-400 ml-1 hidden sm:inline-block">Uzman Paneli</span></span>
            </div>
            <div class="flex items-center gap-4">
                <a href="profil.php?id=<?= $id ?>" target="_blank" class="text-sm font-bold text-blue-600 hover:underline">Profilimi Gör ↗</a>
                <a href="?cikis=1" class="text-sm font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition">Çıkış Yap</a>
            </div>
        </div>
    </nav>

    <main class="max-w-4xl mx-auto px-4 mt-8">
        
        <div class="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div class="flex items-center gap-4">
                <img src="<?= htmlspecialchars($uzman['gorsel']) ?>" class="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover bg-gray-200">
                <div>
                    <h1 class="text-2xl font-extrabold tracking-tight">Profil Ayarları</h1>
                    <p class="text-sm text-gray-500">Vitrin bilgilerinizi güncelleyin.</p>
                </div>
            </div>
            
            <div class="inline-flex bg-gray-100 p-1.5 rounded-xl border border-gray-200 shadow-sm">
                <a href="uzman-randevular.php" class="px-5 py-2 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-900 transition">🗓️ Randevularım</a>
                <a href="uzman-panel.php" class="px-5 py-2 rounded-lg text-sm font-bold shadow-sm bg-white text-gray-900">⚙️ Profili Düzenle</a>
            </div>
        </div>

        <?php if($basarili): ?>
            <div class="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200 mb-6 font-medium flex items-center gap-2 shadow-sm">
                <span>✅</span> Profil bilgileriniz başarıyla güncellendi!
            </div>
        <?php endif; ?>

        <form method="POST" action="" class="space-y-6">
            
            <div class="bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-sm">
                <h2 class="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-2">Temel İletişim & Profil</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="md:col-span-2">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Profil Fotoğrafı URL</label>
                        <input type="text" name="gorsel" value="<?= htmlspecialchars($uzman['gorsel']) ?>" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Seans Ücretiniz</label>
                        <input type="text" name="ucret" value="<?= htmlspecialchars($uzman['ucret']) ?>" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">WhatsApp Randevu Numarası</label>
                        <input type="text" name="telefon" value="<?= htmlspecialchars($uzman['telefon']) ?>" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Mesleki Deneyim (Yıl)</label>
                        <input type="number" name="deneyim_yili" value="<?= htmlspecialchars($uzman['deneyim_yili']) ?>" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Ofis Adresi</label>
                        <input type="text" name="adres" value="<?= htmlspecialchars($uzman['adres']) ?>" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                    </div>

                    <div class="md:col-span-2 mt-4">
                        <label class="block text-sm font-semibold text-gray-700 mb-4">Takvim Uygunluğu <span class="text-gray-400 font-normal">(Sistem randevuları bu gün ve saatlere göre açar)</span></label>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <?php 
                            $gunler = ['pazartesi' => 'Pazartesi', 'sali' => 'Salı', 'carsamba' => 'Çarşamba', 'persembe' => 'Perşembe', 'cuma' => 'Cuma', 'cumartesi' => 'Cumartesi', 'pazar' => 'Pazar'];
                            foreach($gunler as $slug => $gun_adi): 
                                $secili_mi = isset($mevcut_takvim[$gun_adi]);
                                $saatler = $secili_mi ? explode(' - ', $mevcut_takvim[$gun_adi]) : ['09:00', '17:00'];
                            ?>
                            <div class="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border <?= $secili_mi ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200' ?> transition hover:border-blue-300">
                                <label class="flex items-center gap-2 w-24 cursor-pointer">
                                    <input type="checkbox" name="gun_<?= $slug ?>" value="1" <?= $secili_mi ? 'checked' : '' ?> class="w-4 h-4 accent-blue-600 cursor-pointer">
                                    <span class="text-sm font-bold <?= $secili_mi ? 'text-blue-800' : 'text-gray-600' ?>"><?= $gun_adi ?></span>
                                </label>
                                <div class="flex items-center gap-1.5 flex-1">
                                    <input type="time" name="baslangic_<?= $slug ?>" value="<?= htmlspecialchars($saatler[0]) ?>" class="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                    <span class="text-gray-400 font-bold">-</span>
                                    <input type="time" name="bitis_<?= $slug ?>" value="<?= htmlspecialchars($saatler[1] ?? '17:00') ?>" class="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                </div>
                            </div>
                            <?php endforeach; ?>
                        </div>
                    </div>

                    <div class="md:col-span-2 p-4 bg-blue-50 rounded-xl border border-blue-100 mt-4">
                        <label class="block text-sm font-bold text-blue-900 mb-2">Google İşletme Kimliği (Place ID)</label>
                        <input type="text" name="google_place_id" value="<?= htmlspecialchars($uzman['google_place_id']) ?>" class="w-full px-4 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Hakkınızda / Biyografi</label>
                        <textarea name="biyografi" rows="5" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-y"><?= htmlspecialchars($uzman['biyografi']) ?></textarea>
                    </div>
                </div>
            </div>

            <div class="bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-sm">
                <h2 class="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-2">Eğitim ve İş Deneyimleri</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Eğitim Bilgileri</label>
                        <textarea name="egitim" rows="4" placeholder="Her satıra bir eğitim yazın..." class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-y"><?= htmlspecialchars($mevcut_egitim) ?></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Çalıştığı Kurumlar</label>
                        <textarea name="kurumlar" rows="4" placeholder="Her satıra bir kurum yazın..." class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-y"><?= htmlspecialchars($mevcut_kurumlar) ?></textarea>
                    </div>
                </div>
            </div>

            <div class="bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-sm">
                <h2 class="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-2">Uzmanlık ve Çalışma Konuları</h2>
                <div class="flex flex-wrap gap-3">
                    <?php foreach($sabit_uzmanliklar as $uzmanlik): ?>
                    <label class="flex items-center gap-2 bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                        <input type="checkbox" name="uzmanlik_alanlari[]" value="<?= $uzmanlik ?>" <?= in_array($uzmanlik, $mevcut_uzmanlik) ? 'checked' : '' ?> class="w-4 h-4 accent-blue-600">
                        <span class="text-sm font-medium text-gray-700"><?= $uzmanlik ?></span>
                    </label>
                    <?php endforeach; ?>
                </div>
            </div>

            <div class="flex justify-end mt-4">
                <button type="submit" class="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg">Değişiklikleri Kaydet</button>
            </div>
        </form>
    </main>
</body>
</html>