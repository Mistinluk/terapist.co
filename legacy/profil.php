<?php 
session_start();
require_once 'db.php'; 

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

// =========================================================
// 1. RANDEVU TALEBİNİ İŞLEME (POST)
// =========================================================
$randevu_mesaj = '';
$randevu_hata = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['randevu_talep'])) {
    $r_ad = trim($_POST['danisan_ad'] ?? '');
    $r_tel = trim($_POST['danisan_telefon'] ?? '');
    $r_not = trim($_POST['danisan_notu'] ?? '');
    $r_tarih = $_POST['tarih'] ?? '';
    $r_saat = $_POST['saat'] ?? '';

    if ($r_ad && $r_tel && $r_tarih && $r_saat) {
        $kntrl = $pdo->prepare("SELECT id FROM randevular WHERE uzman_id = ? AND tarih = ? AND saat = ? AND durum IN ('bekliyor', 'onaylandi')");
        $kntrl->execute([$id, $r_tarih, $r_saat]);
        
        if ($kntrl->fetch()) {
            $randevu_mesaj = "Maalesef bu saat dilimi az önce doldu. Lütfen takvimden başka bir saat seçin.";
            $randevu_hata = true;
        } else {
            $sql = "INSERT INTO randevular (uzman_id, danisan_ad, danisan_telefon, danisan_notu, tarih, saat, durum) VALUES (?, ?, ?, ?, ?, ?, 'bekliyor')";
            $pdo->prepare($sql)->execute([$id, $r_ad, $r_tel, $r_not, $r_tarih, $r_saat]);
            $randevu_mesaj = "Harika! Randevu talebiniz uzmana iletildi. En kısa sürede sizinle iletişime geçilecektir.";
        }
    } else {
        $randevu_mesaj = "Lütfen adınızı ve telefon numaranızı eksiksiz girin.";
        $randevu_hata = true;
    }
}

// Tavsiye Etme İşlemleri
if (isset($_SESSION['uzman_id']) && isset($_GET['islem']) && $_GET['islem'] == 'tavsiye') {
    $benim_id = $_SESSION['uzman_id'];
    if ($benim_id != $id) {
        $stmt = $pdo->prepare("SELECT onayli FROM psikologlar WHERE id = ?");
        $stmt->execute([$benim_id]);
        $ben = $stmt->fetch();
        if ($ben && $ben['onayli'] == 1) {
            $stmt = $pdo->prepare("SELECT id FROM meslektas_onaylari WHERE onaylayan_id = ? AND onaylanan_id = ?");
            $stmt->execute([$benim_id, $id]);
            $var_mi = $stmt->fetch();
            if ($var_mi) {
                $pdo->prepare("DELETE FROM meslektas_onaylari WHERE id = ?")->execute([$var_mi['id']]);
            } else {
                $pdo->prepare("INSERT INTO meslektas_onaylari (onaylayan_id, onaylanan_id) VALUES (?, ?)")->execute([$benim_id, $id]);
            }
        }
    }
    header("Location: profil.php?id=" . $id);
    exit;
}

if (isset($_SESSION['admin_giris']) && isset($_GET['admin_sil_onay'])) {
    $sil_id = (int)$_GET['admin_sil_onay'];
    $pdo->prepare("DELETE FROM meslektas_onaylari WHERE id = ?")->execute([$sil_id]);
    header("Location: profil.php?id=" . $id);
    exit;
}

// Profil Sahibinin Bilgilerini Çek
$stmt = $pdo->prepare("SELECT * FROM psikologlar WHERE id = ?");
$stmt->execute([$id]);
$uzman = $stmt->fetch();

if(!$uzman) {
    die('<div style="text-align:center; padding: 50px; font-family:sans-serif;">Uzman bulunamadı. <a href="index.php">Ana sayfaya dön</a></div>');
}

// JSON verilerini çöz
$uzman['ekoller'] = json_decode($uzman['ekoller'] ?? '[]', true) ?? [];
$uzman['kitle']   = json_decode($uzman['kitle'] ?? '[]', true) ?? [];
$uzman['format']  = json_decode($uzman['format'] ?? '[]', true) ?? [];
$uzman['egitim'] = json_decode($uzman['egitim'] ?? '[]', true) ?? [];
$uzman['kurumlar'] = json_decode($uzman['kurumlar'] ?? '[]', true) ?? [];
$uzman['uzmanlik_alanlari'] = json_decode($uzman['uzmanlik_alanlari'] ?? '[]', true) ?? [];
$takvim_verisi = json_decode($uzman['calisma_saatleri'] ?? '[]', true) ?? [];
$uzman['deneyim_yili'] = $uzman['deneyim_yili'] ?? '';

// Google Yorumları
$google_reviews = [];
if (!empty($uzman['google_place_id'])) {
    $api_key = 'SENIN_API_ANAHTARIN_BURAYA_GELECEK'; 
    $place_id = $uzman['google_place_id'];
    if ($api_key !== 'SENIN_API_ANAHTARIN_BURAYA_GELECEK') {
        $api_url = "https://maps.googleapis.com/maps/api/place/details/json?place_id={$place_id}&fields=name,rating,reviews,user_ratings_total&language=tr&key={$api_key}";
        $response = @file_get_contents($api_url);
        if ($response) {
            $data = json_decode($response, true);
            if (isset($data['result']['reviews'])) {
                $google_reviews = $data['result']['reviews'];
                $google_rating = $data['result']['rating'];
                $google_total_reviews = $data['result']['user_ratings_total'];
            }
        }
    }
}

// Meslektaş Onayları
$stmt = $pdo->prepare("SELECT m.id as onay_id, p.id as uzman_id, p.ad, p.gorsel FROM meslektas_onaylari m JOIN psikologlar p ON m.onaylayan_id = p.id WHERE m.onaylanan_id = ? ORDER BY m.id DESC");
$stmt->execute([$id]);
$tum_onaylayanlar = $stmt->fetchAll();
$onay_sayisi = count($tum_onaylayanlar);
$son_onaylayanlar = array_slice($tum_onaylayanlar, 0, 3);
$show_endorse_btn = false;
$ben_onayladim_mi = false;
if (isset($_SESSION['uzman_id']) && $_SESSION['uzman_id'] != $uzman['id']) {
    $stmt = $pdo->prepare("SELECT onayli FROM psikologlar WHERE id = ?");
    $stmt->execute([$_SESSION['uzman_id']]);
    $bakan_uzman = $stmt->fetch();
    if ($bakan_uzman && $bakan_uzman['onayli'] == 1) {
        $show_endorse_btn = true;
        foreach ($tum_onaylayanlar as $o) {
            if ($o['uzman_id'] == $_SESSION['uzman_id']) { $ben_onayladim_mi = true; break; }
        }
    }
}

// =========================================================
// 2. TAKVİM ALGORİTMASI (Boş Saatleri Hesaplama)
// =========================================================
$gun_ceviri = ['Monday' => 'Pazartesi', 'Tuesday' => 'Salı', 'Wednesday' => 'Çarşamba', 'Thursday' => 'Perşembe', 'Friday' => 'Cuma', 'Saturday' => 'Cumartesi', 'Sunday' => 'Pazar'];
$ay_ceviri = ['Jan'=>'Oca', 'Feb'=>'Şub', 'Mar'=>'Mar', 'Apr'=>'Nis', 'May'=>'May', 'Jun'=>'Haz', 'Jul'=>'Tem', 'Aug'=>'Ağu', 'Sep'=>'Eyl', 'Oct'=>'Eki', 'Nov'=>'Kas', 'Dec'=>'Ara'];

$dolu_saatler = [];
$stmt = $pdo->prepare("SELECT tarih, saat FROM randevular WHERE uzman_id = ? AND durum IN ('bekliyor', 'onaylandi') AND tarih >= ?");
$stmt->execute([$id, date('Y-m-d')]);
while($row = $stmt->fetch()) {
    $dolu_saatler[$row['tarih']][] = $row['saat'];
}

$musait_gunler = [];
$bugun_tarih = date('Y-m-d');
$suan_saat = time();

for($i = 0; $i <= 14; $i++) {
    $tarih_obj = strtotime("+$i days");
    $tarih_str = date('Y-m-d', $tarih_obj);
    $ing_gun = date('l', $tarih_obj);
    $tr_gun = $gun_ceviri[$ing_gun];
    
    if (isset($takvim_verisi[$tr_gun])) {
        list($bas, $bit) = explode(' - ', $takvim_verisi[$tr_gun]);
        $guncel_saat = strtotime($bas);
        $bitis_saat = strtotime($bit);
        $gunluk_saatler = [];
        
        while ($guncel_saat < $bitis_saat) {
            if ($tarih_str === $bugun_tarih && $guncel_saat <= $suan_saat) {
                $guncel_saat = strtotime('+1 hour', $guncel_saat);
                continue;
            }
            $saat_format = date('H:i', $guncel_saat);
            if (!isset($dolu_saatler[$tarih_str]) || !in_array($saat_format, $dolu_saatler[$tarih_str])) {
                $gunluk_saatler[] = $saat_format;
            }
            $guncel_saat = strtotime('+1 hour', $guncel_saat);
        }
        
        if (!empty($gunluk_saatler)) {
            $ay_kisa = $ay_ceviri[date('M', $tarih_obj)];
            $musait_gunler[$tarih_str] = [
                'ekran_baslik' => date('d', $tarih_obj) . ' ' . $ay_kisa . ' ' . $tr_gun,
                'saatler' => $gunluk_saatler
            ];
        }
    }
}
?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($uzman['ad']) ?> - Terapist.co</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); body { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-[#FAFAFA] text-gray-900 antialiased relative">

    <nav class="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-40 mb-4">
        <div class="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <a href="index.php" class="flex items-center gap-2 hover:opacity-80 transition cursor-pointer">
                <span class="text-2xl">🛋️</span><span class="font-extrabold text-xl tracking-tight">Terapist.co</span>
            </a>
            <div class="flex items-center gap-4">
                <a href="index.php" class="text-sm font-medium text-gray-500 hover:text-gray-900 transition flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-4 py-2 rounded-lg shadow-sm">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    Aramaya Dön
                </a>
            </div>
        </div>
    </nav>

    <main class="max-w-6xl mx-auto px-4 pb-20 mt-8">
        
        <div class="flex flex-col md:flex-row items-center md:items-start gap-6 mb-10 text-center md:text-left">
            
            <div class="relative inline-flex">
                <img src="<?= htmlspecialchars($uzman['gorsel']) ?>" class="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-md object-cover bg-gray-200 relative z-0">
                
                <?php if($uzman['onayli']): ?>
                    <div class="absolute top-2 -right-1 md:-right-3 bg-blue-500 text-white text-[11px] md:text-xs font-extrabold px-3 py-1 rounded-full border-2 border-white shadow-md flex items-center gap-1 z-10" title="Doğrulanmış Uzman">
                        <svg class="w-3 h-3 md:w-3.5 md:h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                        Onaylı
                    </div>
                <?php endif; ?>

                <?php if(!empty($uzman['deneyim_yili'])): ?>
                    <div class="absolute bottom-2 -right-1 md:-right-3 bg-gray-900 text-white text-[11px] md:text-xs font-bold px-3 py-1 rounded-full border-2 border-white shadow-md z-10">
                        <?= htmlspecialchars($uzman['deneyim_yili']) ?> Yıl Deneyim
                    </div>
                <?php endif; ?>
            </div>
            
            <div class="mt-2 flex-1 w-full">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div class="flex items-center justify-center md:justify-start gap-2 mb-1">
                            <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight"><?= htmlspecialchars($uzman['ad']) ?></h1>
                        </div>
                        <p class="text-lg text-gray-500 font-medium mt-1">Klinik Psikolog</p>
                        
                        <div class="flex items-center justify-center md:justify-start gap-2 mt-4 text-sm text-gray-600 font-medium">
                            <span class="bg-gray-100 px-3 py-1 rounded-full border border-gray-200">📍 <?= htmlspecialchars($uzman['ilce']) ?>, <?= htmlspecialchars($uzman['sehir']) ?></span>
                            <span class="bg-gray-100 px-3 py-1 rounded-full border border-gray-200">💻 <?= implode(', ', $uzman['format']) ?></span>
                        </div>

                        <?php if($onay_sayisi > 0): ?>
                        <div class="inline-flex items-center gap-3 mt-5 p-2 pr-4 bg-blue-50/50 rounded-full border border-blue-100 shadow-sm">
                            <div class="flex -space-x-2">
                                <?php foreach($son_onaylayanlar as $onaylayan): ?>
                                    <img class="w-8 h-8 rounded-full border-2 border-white object-cover bg-gray-200" src="<?= htmlspecialchars($onaylayan['gorsel']) ?>">
                                <?php endforeach; ?>
                            </div>
                            <div class="text-xs text-blue-800 font-medium">
                                <span class="font-bold"><?= htmlspecialchars(explode(' ', $son_onaylayanlar[0]['ad'])[0]) ?></span> 
                                <?php if($onay_sayisi > 1): ?> ve <span class="font-bold"><?= $onay_sayisi - 1 ?></span> meslektaşı <?php endif; ?> tavsiye ediyor.
                            </div>
                        </div>
                        <?php endif; ?>
                    </div>

                    <?php if(!empty($google_reviews)): ?>
                    <div class="bg-white px-5 py-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" class="w-10 h-10">
                        <div>
                            <div class="flex items-center gap-1 text-yellow-500 font-bold text-xl">
                                <?= $google_rating ?> <span class="text-sm text-gray-400 font-normal">/ 5</span>
                            </div>
                            <div class="text-xs text-gray-500 font-medium mt-0.5"><?= $google_total_reviews ?> Google Yorumu</div>
                        </div>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            
            <div class="md:col-span-2 space-y-8">
                
                <?php if(!empty($uzman['egitim']) || !empty($uzman['kurumlar'])): ?>
                <section class="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <?php if(!empty($uzman['egitim'])): ?>
                        <div>
                            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">🎓 Eğitim Bilgileri</h3>
                            <ul class="space-y-3">
                                <?php foreach($uzman['egitim'] as $edu): ?>
                                    <li class="flex items-start gap-2 text-sm text-gray-800 font-medium">
                                        <span class="text-gray-300 mt-0.5">•</span> <?= htmlspecialchars($edu) ?>
                                    </li>
                                <?php endforeach; ?>
                            </ul>
                        </div>
                        <?php endif; ?>
                        
                        <?php if(!empty($uzman['kurumlar'])): ?>
                        <div>
                            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">🏢 Çalıştığı Kurumlar</h3>
                            <ul class="space-y-3">
                                <?php foreach($uzman['kurumlar'] as $kurum): ?>
                                    <li class="flex items-start gap-2 text-sm text-gray-800 font-medium">
                                        <span class="text-gray-300 mt-0.5">•</span> <?= htmlspecialchars($kurum) ?>
                                    </li>
                                <?php endforeach; ?>
                            </ul>
                        </div>
                        <?php endif; ?>
                    </div>
                </section>
                <?php endif; ?>

                <section class="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h2 class="text-xl font-bold mb-4">Uzman Hakkında</h2>
                    <p class="text-gray-600 leading-relaxed"><?= nl2br(htmlspecialchars($uzman['biyografi'])) ?></p>
                </section>

                <?php if(!empty($uzman['uzmanlik_alanlari'])): ?>
                <section class="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h2 class="text-xl font-bold mb-5 flex items-center gap-2">🧠 Uzmanlık ve Çalışma Konuları</h2>
                    <div class="flex flex-wrap gap-2">
                        <?php foreach($uzman['uzmanlik_alanlari'] as $alan): ?>
                            <span class="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                                <?= htmlspecialchars($alan) ?>
                            </span>
                        <?php endforeach; ?>
                    </div>
                </section>
                <?php endif; ?>

                <section class="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Terapi Ekolleri</h3>
                            <div class="flex flex-wrap gap-2">
                                <?php foreach($uzman['ekoller'] as $ekol): ?>
                                    <span class="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200"><?= htmlspecialchars($ekol) ?></span>
                                <?php endforeach; ?>
                            </div>
                        </div>
                        <div>
                            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Çalıştığı Kitle</h3>
                            <div class="flex flex-wrap gap-2">
                                <?php foreach($uzman['kitle'] as $kitle): ?>
                                    <span class="px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-100"><?= htmlspecialchars($kitle) ?></span>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    </div>
                </section>

            </div>

            <div class="md:col-span-1 space-y-6">
                
                <?php if($randevu_mesaj): ?>
                    <div class="p-4 rounded-2xl border <?= $randevu_hata ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700' ?> shadow-sm text-sm font-medium text-center">
                        <?= $randevu_mesaj ?>
                    </div>
                <?php endif; ?>

                <div class="bg-white p-6 rounded-3xl border-2 border-blue-50 shadow-xl relative overflow-hidden">
                    <div class="absolute top-0 left-0 right-0 h-1.5 bg-blue-500"></div>
                    
                    <h3 class="font-extrabold text-xl text-gray-900 mb-1 mt-2">🗓️ Randevu Al</h3>
                    <p class="text-sm text-gray-500 mb-6 font-medium">Uygun bir tarih ve saat seçin.</p>

                    <?php if(empty($musait_gunler)): ?>
                        <div class="bg-orange-50 border border-orange-200 text-orange-700 p-4 rounded-xl text-sm font-medium text-center">
                            Uzmanın önümüzdeki 14 gün için uygun randevu saati bulunmuyor.
                        </div>
                    <?php else: ?>
                        <div class="space-y-5">
                            <div class="relative">
                                <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tarih Seçin</label>
                                <select id="tarihSecici" class="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer shadow-sm transition">
                                    <?php foreach($musait_gunler as $tarih => $veri): ?>
                                        <option value="<?= $tarih ?>"><?= $veri['ekran_baslik'] ?></option>
                                    <?php endforeach; ?>
                                </select>
                                <span class="absolute right-4 bottom-3.5 pointer-events-none text-xs text-gray-500">▼</span>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Uygun Saatler</label>
                                
                                <?php foreach($musait_gunler as $tarih => $veri): ?>
                                    <div id="saatler_<?= $tarih ?>" class="saat-kutusu hidden grid grid-cols-3 gap-2">
                                        <?php foreach($veri['saatler'] as $saat): ?>
                                            <button onclick="randevuModalAc('<?= $tarih ?>', '<?= $saat ?>', '<?= $veri['ekran_baslik'] ?>')" class="py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition shadow-sm">
                                                <?= $saat ?>
                                            </button>
                                        <?php endforeach; ?>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    <?php endif; ?>
                </div>

                <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div class="mb-6 pb-6 border-b border-gray-100">
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Seans Ücreti</p>
                        <div class="flex items-baseline gap-1">
                            <span class="text-4xl font-extrabold text-gray-900"><?= htmlspecialchars($uzman['ucret']) ?></span>
                            <span class="text-gray-500 font-medium">/ 50 dk</span>
                        </div>
                    </div>
                    
                    <div class="space-y-4 mb-6 text-sm">
                        <div class="flex items-start gap-3"><span class="text-gray-400 mt-0.5">📞</span><p class="font-medium text-gray-900"><?= htmlspecialchars($uzman['telefon']) ?></p></div>
                        <div class="flex items-start gap-3"><span class="text-gray-400 mt-0.5">✉️</span><p class="font-medium text-gray-900"><?= htmlspecialchars($uzman['email']) ?></p></div>
                        <div class="flex items-start gap-3"><span class="text-gray-400 mt-0.5">📍</span><p class="font-medium text-gray-900 leading-snug"><?= htmlspecialchars($uzman['adres']) ?></p></div>
                    </div>
                    
                    <a href="https://wa.me/<?= str_replace([' ', '+'], '', $uzman['telefon']) ?>" target="_blank" class="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3.5 px-4 rounded-xl transition shadow-sm">
                       WhatsApp ile Sor
                    </a>
                </div>

            </div>
        </div>
    </main>

    <div id="randevuModal" class="hidden fixed inset-0 z-[100] bg-gray-900/60 flex items-center justify-center backdrop-blur-sm p-4 opacity-0 transition-opacity duration-300">
        <div class="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative transform scale-95 transition-transform duration-300">
            <button onclick="randevuModalKapat()" class="absolute top-5 right-5 text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center transition">✕</button>
            
            <div class="mb-6">
                <span class="bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1 rounded-full border border-blue-100 mb-3 inline-block">Talep Oluştur</span>
                <h3 class="text-2xl font-extrabold text-gray-900 mb-1">Randevunuzu Ayırtın</h3>
                <p class="text-sm text-gray-500 font-medium">Seçilen Zaman: <span id="secilenZamanMetni" class="text-gray-900 font-bold"></span></p>
            </div>

            <form method="POST" action="" class="space-y-4">
                <input type="hidden" name="randevu_talep" value="1">
                <input type="hidden" name="tarih" id="modalTarihInput">
                <input type="hidden" name="saat" id="modalSaatInput">
                
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1.5">Adınız Soyadınız *</label>
                    <input type="text" name="danisan_ad" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1.5">Telefon Numaranız *</label>
                    <input type="tel" name="danisan_telefon" required placeholder="05XX XXX XX XX" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1.5">Uzmana İletmek İstediğiniz Kısa Not (İsteğe bağlı)</label>
                    <textarea name="danisan_notu" rows="2" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition resize-none" placeholder="Hangi konu için başvurduğunuzu kısaca yazabilirsiniz..."></textarea>
                </div>

                <div class="pt-2">
                    <button type="submit" class="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition shadow-lg flex items-center justify-center gap-2">
                        Randevu Talebini Gönder <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    </button>
                    <p class="text-[11px] text-center text-gray-400 mt-3">Ödeme işlemi seanstan sonra gerçekleşecektir. Bu sadece bir rezervasyon talebidir.</p>
                </div>
            </form>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const secici = document.getElementById('tarihSecici');
            const kutular = document.querySelectorAll('.saat-kutusu');
            
            if(!secici) return;

            const saatleriGuncelle = () => {
                const seciliTarih = secici.value;
                kutular.forEach(kutu => {
                    if(kutu.id === 'saatler_' + seciliTarih) {
                        kutu.classList.remove('hidden');
                    } else {
                        kutu.classList.add('hidden');
                    }
                });
            };

            saatleriGuncelle();
            secici.addEventListener('change', saatleriGuncelle);
        });

        const modal = document.getElementById('randevuModal');
        const modalIcerik = modal.querySelector('div');
        
        function randevuModalAc(tarih, saat, tarihMetni) {
            document.getElementById('modalTarihInput').value = tarih;
            document.getElementById('modalSaatInput').value = saat;
            document.getElementById('secilenZamanMetni').innerText = tarihMetni + ' - ' + saat;
            
            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                modalIcerik.classList.remove('scale-95');
            }, 10);
        }

        function randevuModalKapat() {
            modal.classList.add('opacity-0');
            modalIcerik.classList.add('scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }
    </script>

</body>
</html>