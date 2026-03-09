<?php 
session_start();
require_once 'db.php'; 

// Aktif Uzman Bilgileri (Navbar için)
$aktif_uzman_gorsel = 'https://ui-avatars.com/api/?name=Uzman&background=random';
$aktif_uzman_ad = 'Uzman';

if (isset($_SESSION['uzman_id'])) {
    $stmt_nav = $pdo->prepare("SELECT ad, gorsel FROM psikologlar WHERE id = ?");
    $stmt_nav->execute([$_SESSION['uzman_id']]);
    $nav_uzman = $stmt_nav->fetch();
    
    if ($nav_uzman) {
        $aktif_uzman_ad = explode(' ', $nav_uzman['ad'])[0]; 
        $aktif_uzman_gorsel = !empty($nav_uzman['gorsel']) ? $nav_uzman['gorsel'] : 'https://ui-avatars.com/api/?name='.urlencode($aktif_uzman_ad).'&background=random';
    }
}

// Tüm psikologları çekiyoruz
$stmt = $pdo->query("SELECT * FROM psikologlar");
$db_psikologlar = $stmt->fetchAll();

$psikologlar = [];
$tum_ekoller = [];
$tum_kitleler = [];
$tum_uzmanliklar = []; 

foreach ($db_psikologlar as $row) {
    $row['ekoller'] = json_decode($row['ekoller'] ?? '[]', true) ?? [];
    $row['kitle']   = json_decode($row['kitle'] ?? '[]', true) ?? [];
    $row['format']  = json_decode($row['format'] ?? '[]', true) ?? [];
    $row['uzmanlik_alanlari'] = json_decode($row['uzmanlik_alanlari'] ?? '[]', true) ?? [];
    $row['onayli']  = (bool)$row['onayli'];
    
    $tum_ekoller = array_merge($tum_ekoller, $row['ekoller']);
    $tum_kitleler = array_merge($tum_kitleler, $row['kitle']);
    $tum_uzmanliklar = array_merge($tum_uzmanliklar, $row['uzmanlik_alanlari']);
    
    $psikologlar[] = $row;
}

$sehirler = array_unique(array_column($psikologlar, 'sehir'));
$tum_ekoller = array_unique($tum_ekoller);
$tum_kitleler = array_unique($tum_kitleler);
$tum_uzmanliklar = array_unique($tum_uzmanliklar);

sort($sehirler);
sort($tum_ekoller);
sort($tum_kitleler);
sort($tum_uzmanliklar);

// GET verilerini alıyoruz
$secilen_arama    = $_GET['arama'] ?? '';
$secilen_sehir    = $_GET['sehir'] ?? '';
$secilen_uzmanlik = $_GET['uzmanlik'] ?? ''; 
$secilen_format   = $_GET['format'] ?? '';
$secilen_ekol     = $_GET['ekol'] ?? '';
$secilen_kitle    = $_GET['kitle'] ?? '';
$secilen_deneyim  = $_GET['deneyim'] ?? ''; 
$secilen_sirala   = $_GET['sirala'] ?? 'varsayilan';
$sayfa            = isset($_GET['sayfa']) ? max(1, (int)$_GET['sayfa']) : 1; // YENİ: Sayfa numarası

// Verileri Filtreliyoruz
$filtrelenmis_psikologlar = array_filter($psikologlar, function($psk) use ($secilen_arama, $secilen_sehir, $secilen_format, $secilen_ekol, $secilen_kitle, $secilen_uzmanlik, $secilen_deneyim) {
    if (!$psk['onayli']) return false;
    
    if ($secilen_arama !== '') {
        if (mb_stripos($psk['ad'], $secilen_arama, 0, 'UTF-8') === false) return false;
    }
    
    if ($secilen_sehir !== '' && $psk['sehir'] !== $secilen_sehir) return false;
    if ($secilen_uzmanlik !== '' && !in_array($secilen_uzmanlik, $psk['uzmanlik_alanlari'])) return false;
    
    if ($secilen_deneyim !== '') {
        $uzman_deneyim = (int)($psk['deneyim_yili'] ?? 0);
        if ($secilen_deneyim === '3' && $uzman_deneyim < 3) return false;
        if ($secilen_deneyim === '5' && $uzman_deneyim < 5) return false;
        if ($secilen_deneyim === '10' && $uzman_deneyim < 10) return false;
    }

    if ($secilen_format !== '' && !in_array($secilen_format, $psk['format'])) return false;
    if ($secilen_ekol !== '' && !in_array($secilen_ekol, $psk['ekoller'])) return false;
    if ($secilen_kitle !== '' && !in_array($secilen_kitle, $psk['kitle'])) return false;
    
    return true; 
});

// Verileri Sıralıyoruz
if ($secilen_sirala === 'fiyat_artan') {
    usort($filtrelenmis_psikologlar, function($a, $b) {
        $fiyatA = (int) preg_replace('/[^0-9]/', '', $a['ucret']);
        $fiyatB = (int) preg_replace('/[^0-9]/', '', $b['ucret']);
        return $fiyatA <=> $fiyatB;
    });
} elseif ($secilen_sirala === 'fiyat_azalan') {
    usort($filtrelenmis_psikologlar, function($a, $b) {
        $fiyatA = (int) preg_replace('/[^0-9]/', '', $a['ucret']);
        $fiyatB = (int) preg_replace('/[^0-9]/', '', $b['ucret']);
        return $fiyatB <=> $fiyatA;
    });
}

// =========================================================
// YENİ: ANA SAYFA SAYFALAMA (PAGINATION) ALGORİTMASI
// =========================================================
$toplam_uzman = count($filtrelenmis_psikologlar);
$limit = 10; // Her sayfada gösterilecek uzman sayısı
$toplam_sayfa = ceil($toplam_uzman / $limit);
$offset = ($sayfa - 1) * $limit;

// Sadece bulunduğumuz sayfaya ait uzmanları diziden kesiyoruz
$gosterilen_psikologlar = array_slice($filtrelenmis_psikologlar, $offset, $limit);
?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terapist.co - Onaylı Psikolog Veritabanı</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Inter', sans-serif; }
        select { -webkit-appearance: none; -moz-appearance: none; appearance: none; }
    </style>
</head>
<body class="bg-[#FAFAFA] text-gray-900 antialiased relative">

    <nav class="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div class="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <a href="index.php" class="flex items-center gap-2 hover:opacity-80 transition cursor-pointer">
                <span class="text-2xl">🛋️</span>
                <span class="font-extrabold text-xl tracking-tight">Terapist.co</span>
            </a>
            
            <div class="flex items-center gap-4">
                <?php if(isset($_SESSION['admin_giris'])): ?>
                    <div class="relative group inline-block">
                        <button class="flex items-center gap-2 focus:outline-none bg-red-50 px-3 py-1.5 rounded-full border border-red-100 transition hover:bg-red-100 cursor-pointer">
                            <span class="text-lg">🛡️</span><span class="text-sm font-bold text-red-700">Yönetici</span>
                        </button>
                        <div class="absolute right-0 pt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                            <div class="bg-white border border-gray-100 rounded-xl shadow-lg py-2">
                                <a href="admin.php" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 font-medium">Yönetim Paneli</a>
                                <div class="border-t border-gray-100 my-1"></div>
                                <a href="admin.php?cikis=1" class="block px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-bold">Çıkış Yap</a>
                            </div>
                        </div>
                    </div>
                <?php elseif(isset($_SESSION['uzman_id'])): ?>
                    <div class="relative group inline-block">
                        <button class="flex items-center gap-2 focus:outline-none bg-blue-50 px-2 py-1.5 rounded-full border border-blue-100 pr-3 transition hover:bg-blue-100 cursor-pointer">
                            <img src="<?= htmlspecialchars($aktif_uzman_gorsel) ?>" class="w-6 h-6 rounded-full object-cover border border-white shadow-sm">
                            <span class="text-sm font-bold text-blue-800"><?= htmlspecialchars($aktif_uzman_ad) ?></span>
                        </button>
                        <div class="absolute right-0 pt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                            <div class="bg-white border border-gray-100 rounded-xl shadow-lg py-2">
                                <a href="profil.php?id=<?= $_SESSION['uzman_id'] ?>" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 font-medium">Profilimi Gör</a>
                                <a href="uzman-randevular.php" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 font-medium">Yönetim Paneli</a>
                                <div class="border-t border-gray-100 my-1"></div>
                                <a href="uzman-giris.php?cikis=1" class="block px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-bold">Çıkış Yap</a>
                            </div>
                        </div>
                    </div>
                <?php else: ?>
                    <a href="uzman-giris.php" class="text-sm font-bold text-gray-500 hover:text-gray-900 transition hidden sm:inline-block">Uzman Girişi</a>
                    <a href="katil.php" class="bg-black text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition shadow-sm">Uzman Olarak Katıl</a>
                <?php endif; ?>
            </div>
        </div>
    </nav>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 mt-6 md:mt-10 mb-12 relative z-10">
        <header class="relative w-full rounded-[2.5rem] bg-gray-900 shadow-2xl text-center pb-16 pt-20 md:pt-32 md:pb-24">
            
            <div class="absolute inset-0 z-0 rounded-[2.5rem] overflow-hidden">
                <img src="https://images.unsplash.com/photo-1493612276216-ee3925520721?auto=format&fit=crop&q=80&w=2000" alt="Terapi Odası" class="w-full h-full object-cover opacity-60">
                <div class="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/60"></div>
            </div>

            <div class="relative z-10 px-4">
                <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-white drop-shadow-lg">Size En Uygun Uzmanı Bulun</h1>
                <p class="text-lg text-gray-100 mb-10 max-w-2xl mx-auto drop-shadow-md">Doğrulanmış profiller, şeffaf ücretler ve net uzmanlık alanları ile terapi yolculuğunuza güvenle başlayın.</p>
                
                <form id="filter-form" class="w-full max-w-4xl mx-auto">
                    
                    <input type="hidden" name="sayfa" id="sayfa-input" value="<?= $sayfa ?>">

                    <div class="flex flex-col md:flex-row bg-white rounded-3xl md:rounded-full shadow-2xl p-2 md:p-2 gap-2 md:gap-0 md:divide-x divide-gray-100">
                        <div class="flex-1 flex items-center px-4 py-2 hover:bg-gray-50 rounded-full transition">
                            <span class="text-xl mr-3">🔍</span>
                            <input type="text" name="arama" value="<?= htmlspecialchars($secilen_arama) ?>" placeholder="Uzman veya klinik adı..." class="w-full outline-none text-sm font-medium text-gray-700 bg-transparent placeholder-gray-400">
                        </div>
                        
                        <div class="flex-1 flex items-center px-4 py-2 relative hover:bg-gray-50 rounded-full transition cursor-pointer">
                            <span class="text-xl mr-3">📍</span>
                            <select name="sehir" class="w-full outline-none text-sm font-bold text-gray-700 bg-transparent appearance-none cursor-pointer">
                                <option value="">Tüm Şehirler</option>
                                <?php foreach($sehirler as $sehir): ?>
                                    <option value="<?= $sehir ?>" <?= $secilen_sehir === $sehir ? 'selected' : '' ?>><?= $sehir ?></option>
                                <?php endforeach; ?>
                            </select>
                            <span class="absolute right-4 pointer-events-none text-xs text-gray-400">▼</span>
                        </div>
                        
                        <div class="flex-[1.2] flex items-center px-4 py-2 relative hover:bg-gray-50 rounded-full transition cursor-pointer">
                            <span class="text-xl mr-3">🧠</span>
                            <select name="uzmanlik" class="w-full outline-none text-sm font-bold text-gray-700 bg-transparent appearance-none cursor-pointer">
                                <option value="">Neye İhtiyacınız Var?</option>
                                <?php foreach($tum_uzmanliklar as $uzmanlik): ?>
                                    <option value="<?= $uzmanlik ?>" <?= $secilen_uzmanlik === $uzmanlik ? 'selected' : '' ?>><?= $uzmanlik ?></option>
                                <?php endforeach; ?>
                            </select>
                            <span class="absolute right-4 pointer-events-none text-xs text-gray-400">▼</span>
                        </div>
                    </div>

                    <div class="mt-6 flex justify-center items-center gap-6">
                        <button type="button" id="toggle-advanced" class="flex items-center gap-1.5 text-sm font-bold text-white bg-white/10 hover:bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 transition shadow-sm">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
                            <span>Gelişmiş Filtreler</span>
                        </button>
                        <button type="button" id="clear-filters" class="hidden text-sm font-bold text-red-300 hover:text-red-200 transition bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">Filtreleri Temizle ✖</button>
                    </div>

                    <div id="advanced-filters" class="hidden mt-6 bg-white p-6 rounded-3xl shadow-xl text-left border border-white/10">
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5">
                            <div>
                                <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Deneyim</label>
                                <div class="relative">
                                    <select name="deneyim" class="w-full pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                                        <option value="">Tümü</option>
                                        <option value="3" <?= $secilen_deneyim === '3' ? 'selected' : '' ?>>En az 3 Yıl</option>
                                        <option value="5" <?= $secilen_deneyim === '5' ? 'selected' : '' ?>>En az 5 Yıl</option>
                                        <option value="10" <?= $secilen_deneyim === '10' ? 'selected' : '' ?>>10+ Yıl Uzman</option>
                                    </select>
                                    <span class="absolute right-3 top-3 pointer-events-none text-xs text-gray-400">▼</span>
                                </div>
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Görüşme Şekli</label>
                                <div class="relative">
                                    <select name="format" class="w-full pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                                        <option value="">Tümü</option>
                                        <option value="Online" <?= $secilen_format === 'Online' ? 'selected' : '' ?>>Online Terapi</option>
                                        <option value="Yüz Yüze" <?= $secilen_format === 'Yüz Yüze' ? 'selected' : '' ?>>Yüz Yüze Terapi</option>
                                    </select>
                                    <span class="absolute right-3 top-3 pointer-events-none text-xs text-gray-400">▼</span>
                                </div>
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Terapi Ekolü</label>
                                <div class="relative">
                                    <select name="ekol" class="w-full pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                                        <option value="">Tümü</option>
                                        <?php foreach($tum_ekoller as $ekol): ?>
                                            <option value="<?= $ekol ?>" <?= $secilen_ekol === $ekol ? 'selected' : '' ?>><?= $ekol ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                    <span class="absolute right-3 top-3 pointer-events-none text-xs text-gray-400">▼</span>
                                </div>
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Danışan Kitlesi</label>
                                <div class="relative">
                                    <select name="kitle" class="w-full pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                                        <option value="">Tümü</option>
                                        <?php foreach($tum_kitleler as $kitle): ?>
                                            <option value="<?= $kitle ?>" <?= $secilen_kitle === $kitle ? 'selected' : '' ?>><?= $kitle ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                    <span class="absolute right-3 top-3 pointer-events-none text-xs text-gray-400">▼</span>
                                </div>
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Sıralama</label>
                                <div class="relative">
                                    <select name="sirala" class="w-full pl-3 pr-8 py-2.5 bg-blue-50 text-blue-800 border border-blue-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                                        <option value="varsayilan" <?= $secilen_sirala === 'varsayilan' ? 'selected' : '' ?>>Önerilen</option>
                                        <option value="fiyat_artan" <?= $secilen_sirala === 'fiyat_artan' ? 'selected' : '' ?>>Fiyat (Düşükten Yükseğe)</option>
                                        <option value="fiyat_azalan" <?= $secilen_sirala === 'fiyat_azalan' ? 'selected' : '' ?>>Fiyat (Yüksekten Düşüğe)</option>
                                    </select>
                                    <span class="absolute right-3 top-3 pointer-events-none text-xs text-blue-400">▼</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </header>
    </div>

    <main class="max-w-5xl mx-auto px-4 pb-20 relative z-10">
        
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-900">Uzman Listesi</h2>
            <p class="text-sm text-gray-500 font-medium">Kriterlerinize uygun <span id="results-count" class="text-gray-900 font-bold bg-gray-100 px-2 py-0.5 rounded-md ml-1"><?= $toplam_uzman ?></span> uzman bulundu.</p>
        </div>
        
        <div id="loader" class="hidden absolute inset-0 z-10 flex items-start justify-center pt-20 bg-white/60 backdrop-blur-[2px] rounded-2xl transition-all duration-300">
            <div class="bg-white p-3 rounded-full shadow-lg border border-gray-100 flex items-center gap-3">
                <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                <span class="text-sm font-semibold text-gray-700 pr-2">İşleniyor...</span>
            </div>
        </div>

        <div id="results-container" class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden transition-opacity duration-300">
            
            <div class="hidden md:flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-widest">
                <div class="w-2/5 pl-2">Uzman</div>
                <div class="w-1/4">Ekol & Çalışma Alanı</div>
                <div class="w-1/6">Lokasyon</div>
                <div class="w-1/6 text-right pr-2">Ücret Seviyesi</div>
            </div>

            <div id="list-content">
                <?php if($toplam_uzman > 0): ?>
                    <?php foreach($gosterilen_psikologlar as $psk): ?>
                    <a href="profil.php?id=<?= $psk['id'] ?>" class="flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-5 border-b border-gray-100 hover:bg-gray-50 transition group block cursor-pointer">
                        
                        <div class="flex items-center gap-4 w-full md:w-2/5 mb-3 md:mb-0">
                            <div class="relative">
                                <img src="<?= htmlspecialchars($psk['gorsel']) ?>" class="w-12 h-12 rounded-full border border-gray-200 object-cover group-hover:scale-105 transition-transform duration-300 bg-gray-200">
                            </div>
                            <div>
                                <div class="flex items-center gap-1.5">
                                    <h3 class="font-bold text-gray-900 text-base"><?= htmlspecialchars($psk['ad']) ?></h3>
                                    <?php if($psk['onayli']): ?>
                                        <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                        </svg>
                                    <?php endif; ?>
                                </div>
                                <p class="text-sm text-gray-500 truncate mt-0.5"><?= htmlspecialchars(implode(', ', $psk['kitle'])) ?></p>
                            </div>
                        </div>

                        <div class="w-full md:w-1/4 mb-3 md:mb-0 flex flex-wrap gap-1.5">
                            <?php foreach(array_slice($psk['ekoller'], 0, 3) as $ekol): ?>
                                <span class="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                    <?= htmlspecialchars($ekol) ?>
                                </span>
                            <?php endforeach; ?>
                            <?php if(count($psk['ekoller']) > 3): ?>
                                <span class="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-gray-50 text-gray-400">
                                    +<?= count($psk['ekoller']) - 3 ?>
                                </span>
                            <?php endif; ?>
                        </div>

                        <div class="w-full md:w-1/6 mb-3 md:mb-0 text-sm font-medium text-gray-700">
                            <span class="block"><?= htmlspecialchars($psk['sehir']) ?></span>
                            <span class="text-[11px] text-gray-400 font-normal uppercase tracking-wider"><?= htmlspecialchars(implode(', ', $psk['format'])) ?></span>
                        </div>

                        <div class="w-full md:w-1/6 flex items-center justify-between md:justify-end">
                            <span class="md:hidden text-sm text-gray-500 font-medium">Seviye:</span>
                            <div class="flex items-center gap-1">
                                <?php for($i = 1; $i <= 5; $i++): ?>
                                    <div class="w-2 h-5 rounded-sm transition-colors duration-300 <?= $i <= $psk['fiyat_seviyesi'] ? 'bg-gray-800' : 'bg-gray-200 group-hover:bg-gray-300' ?>"></div>
                                <?php endfor; ?>
                            </div>
                        </div>
                    </a>
                    <?php endforeach; ?>

                    <?php if($toplam_sayfa > 1): ?>
                    <div class="p-6 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <span class="text-sm text-gray-500 font-medium">
                            Toplam <b class="text-gray-900"><?= $toplam_sayfa ?></b> sayfadan <b class="text-gray-900"><?= $sayfa ?>.</b> sayfa
                        </span>
                        
                        <div class="flex items-center gap-1.5">
                            <?php if($sayfa > 1): ?>
                                <button type="button" data-page="<?= $sayfa - 1 ?>" class="sayfa-btn px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100 transition shadow-sm">Önceki</button>
                            <?php endif; ?>
                            
                            <div class="hidden sm:flex items-center gap-1">
                                <?php for($i = 1; $i <= $toplam_sayfa; $i++): ?>
                                    <button type="button" data-page="<?= $i ?>" class="sayfa-btn w-10 h-10 rounded-lg text-sm font-bold transition border <?= $i == $sayfa ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100' ?>">
                                        <?= $i ?>
                                    </button>
                                <?php endfor; ?>
                            </div>
                            
                            <?php if($sayfa < $toplam_sayfa): ?>
                                <button type="button" data-page="<?= $sayfa + 1 ?>" class="sayfa-btn px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100 transition shadow-sm">Sonraki</button>
                            <?php endif; ?>
                        </div>
                    </div>
                    <?php endif; ?>

                <?php else: ?>
                    <div class="p-10 text-center">
                        <span class="text-5xl mb-3 block">🕵️‍♂️</span>
                        <h3 class="text-xl font-bold text-gray-900 mb-2">Aramanıza Uygun Uzman Bulunamadı</h3>
                        <p class="text-gray-500 mb-4">Seçtiğiniz kriterlere tam uyan bir uzman şu an sistemimizde bulunmuyor.</p>
                        <button onclick="document.getElementById('clear-filters').click()" class="inline-block px-6 py-2 bg-blue-50 text-blue-600 rounded-full font-bold hover:bg-blue-100 transition">Aramayı Temizle ve Tümünü Gör</button>
                    </div>
                <?php endif; ?>
            </div>

        </div>
    </main>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const form = document.getElementById('filter-form');
            const selects = form.querySelectorAll('select');
            const searchInput = form.querySelector('input[name="arama"]');
            const sayfaInput = document.getElementById('sayfa-input');
            const loader = document.getElementById('loader');
            const resultsContainer = document.getElementById('results-container');
            const listContent = document.getElementById('list-content');
            const resultsCount = document.getElementById('results-count');
            const clearBtn = document.getElementById('clear-filters');
            
            const toggleAdvancedBtn = document.getElementById('toggle-advanced');
            const advancedFiltersArea = document.getElementById('advanced-filters');

            toggleAdvancedBtn.addEventListener('click', () => {
                advancedFiltersArea.classList.toggle('hidden');
                if(advancedFiltersArea.classList.contains('hidden')) {
                    toggleAdvancedBtn.classList.remove('bg-white', 'text-gray-900');
                    toggleAdvancedBtn.classList.add('bg-white/10', 'text-white');
                } else {
                    toggleAdvancedBtn.classList.remove('bg-white/10', 'text-white');
                    toggleAdvancedBtn.classList.add('bg-white', 'text-gray-900');
                }
            });

            let typingTimer;
            const doneTypingInterval = 300;

            const checkFilters = () => {
                let hasFilter = false;
                selects.forEach(s => { 
                    if(s.name !== 'sirala' && s.value !== '') hasFilter = true; 
                    if(s.name === 'sirala' && s.value !== 'varsayilan') hasFilter = true;
                });
                if(searchInput.value.trim() !== '') hasFilter = true;

                if(hasFilter) clearBtn.classList.remove('hidden');
                else clearBtn.classList.add('hidden');
            };

            const attachPaginationEvents = () => {
                document.querySelectorAll('.sayfa-btn').forEach(btn => {
                    btn.addEventListener('click', function(e) {
                        e.preventDefault();
                        sayfaInput.value = this.dataset.page; // Tıklanan sayfa numarasını al
                        fetchResults(true); // AJAX isteği at ve yukarı kaydır
                    });
                });
            };

            const fetchResults = async (scrollUp = false) => {
                loader.classList.remove('hidden');
                resultsContainer.classList.add('opacity-50', 'pointer-events-none');
                checkFilters();

                const formData = new FormData(form);
                const params = new URLSearchParams(formData);
                const url = `${window.location.pathname}?${params.toString()}`;

                try {
                    const response = await fetch(url);
                    const html = await response.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');

                    const newList = doc.getElementById('list-content');
                    const newCount = doc.getElementById('results-count');

                    if (newList && newCount) {
                        listContent.innerHTML = newList.innerHTML;
                        resultsCount.innerHTML = newCount.innerHTML;
                        attachPaginationEvents(); // Yeni gelen sayfa butonlarına tıklama özelliği ekle
                    }

                    window.history.pushState({}, '', url);
                    
                    if(scrollUp) {
                        document.getElementById('results-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                } catch (error) {
                    console.error('Filtreleme hatası:', error);
                } finally {
                    setTimeout(() => {
                        loader.classList.add('hidden');
                        resultsContainer.classList.remove('opacity-50', 'pointer-events-none');
                    }, 300); 
                }
            };

            // Filtre değiştiğinde sayfa 1'e dönsün
            selects.forEach(select => {
                select.addEventListener('change', () => {
                    sayfaInput.value = 1;
                    fetchResults();
                });
            });

            searchInput.addEventListener('input', () => {
                clearTimeout(typingTimer);
                sayfaInput.value = 1;
                typingTimer = setTimeout(fetchResults, doneTypingInterval);
            });

            searchInput.addEventListener('keydown', (e) => {
                if(e.key === 'Enter') {
                    e.preventDefault();
                    clearTimeout(typingTimer);
                    sayfaInput.value = 1;
                    fetchResults();
                }
            });

            clearBtn.addEventListener('click', () => {
                selects.forEach(s => {
                    if (s.name === 'sirala') s.value = 'varsayilan';
                    else s.value = '';
                });
                searchInput.value = '';
                sayfaInput.value = 1;
                fetchResults();
            });

            // Sayfa yüklendiğinde ilk butonlara özellikleri ata
            checkFilters();
            attachPaginationEvents();

            window.addEventListener('popstate', () => {
                window.location.reload();
            });
        });
    </script>
</body>
</html>