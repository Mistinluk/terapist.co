<?php
session_start();
require_once 'db.php';

// Güvenlik
if (!isset($_SESSION['admin_giris'])) {
    header("Location: admin-giris.php");
    exit;
}

if (isset($_GET['cikis'])) {
    session_destroy();
    header("Location: admin-giris.php");
    exit;
}

// UZMAN ONAYLAMA / SİLME İŞLEMLERİ
if (isset($_GET['islem']) && isset($_GET['id'])) {
    $islem_id = (int)$_GET['id'];
    
    if ($_GET['islem'] == 'onayla') {
        $pdo->prepare("UPDATE psikologlar SET onayli = 1 WHERE id = ?")->execute([$islem_id]);
    } elseif ($_GET['islem'] == 'sil') {
        $pdo->prepare("DELETE FROM randevular WHERE uzman_id = ?")->execute([$islem_id]);
        $pdo->prepare("DELETE FROM psikologlar WHERE id = ?")->execute([$islem_id]);
    }
    header("Location: admin.php");
    exit;
}

// =========================================================
// 1. UZMAN BİLGİLERİ VE SAYFALAMA (PAGINATION)
// =========================================================

// Sayfalama ayarları
$sayfa = isset($_GET['sayfa']) ? max(1, (int)$_GET['sayfa']) : 1;
$limit = 10; // Her sayfada kaç uzman görünecek? (Bunu istediğin gibi değiştirebilirsin)
$offset = ($sayfa - 1) * $limit;

// Toplam Onaylı Uzman Sayısını Bul (Sayfa sayısını hesaplamak için)
$toplam_onayli = $pdo->query("SELECT COUNT(id) FROM psikologlar WHERE onayli = 1")->fetchColumn();
$toplam_sayfa = ceil($toplam_onayli / $limit);

// Yayındaki Uzmanları Çek (Sadece o sayfaya ait olanları limitiyle getir)
$stmt_yayinda = $pdo->query("SELECT * FROM psikologlar WHERE onayli = 1 ORDER BY id DESC LIMIT $limit OFFSET $offset");
$yayindaki_uzmanlar = $stmt_yayinda->fetchAll();

// Onay Bekleyenleri Çek (Sayfalamasız, hepsi gelsin ki admin gözden kaçırmasın)
$stmt_bekleyen = $pdo->query("SELECT * FROM psikologlar WHERE onayli = 0 ORDER BY id DESC");
$onay_bekleyenler = $stmt_bekleyen->fetchAll();

// =========================================================
// 2. RANDEVU TRAFİĞİ VE İSTATİSTİKLER
// =========================================================
$stmt_randevular = $pdo->query("
    SELECT r.*, p.ad as uzman_ad, p.gorsel as uzman_gorsel 
    FROM randevular r 
    LEFT JOIN psikologlar p ON r.uzman_id = p.id 
    ORDER BY r.olusturma_tarihi DESC LIMIT 50
");
$son_randevular = $stmt_randevular->fetchAll();

$stat_toplam_uzman = $toplam_onayli; // Gerçek toplam sayıyı kullanıyoruz
$stat_toplam_randevu = count($son_randevular); 
$stat_bekleyen_randevu = 0;
$stat_onayli_randevu = 0;

foreach ($son_randevular as $r) {
    if ($r['durum'] === 'bekliyor') $stat_bekleyen_randevu++;
    if ($r['durum'] === 'onaylandi') $stat_onayli_randevu++;
}

// Tarih Çevirici
function tr_tarih($tarih) {
    $aylar = ['01'=>'Oca','02'=>'Şub','03'=>'Mar','04'=>'Nis','05'=>'May','06'=>'Haz','07'=>'Tem','08'=>'Ağu','09'=>'Eyl','10'=>'Eki','11'=>'Kas','12'=>'Ara'];
    if(empty($tarih)) return '';
    $parca = explode('-', $tarih);
    if(count($parca) != 3) return $tarih;
    return $parca[2] . ' ' . $aylar[$parca[1]] . ' ' . $parca[0];
}
?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yönetim Paneli - Terapist.co</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); body { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-[#F3F4F6] text-gray-900 antialiased pb-20">

    <nav class="bg-gray-900 text-white border-b border-gray-800 sticky top-0 z-50 shadow-lg">
        <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div class="flex items-center gap-3">
                <span class="text-2xl">🛋️</span>
                <span class="font-extrabold text-xl tracking-tight">Terapist.co <span class="text-sm font-medium text-gray-400 ml-2 border-l border-gray-600 pl-2">Admin Dashboard</span></span>
            </div>
            <div class="flex items-center gap-4">
                <a href="index.php" target="_blank" class="text-sm font-medium text-gray-300 hover:text-white transition">Siteye Git ↗</a>
                <a href="?cikis=1" class="text-sm font-bold text-white bg-red-600 px-4 py-2 rounded-lg hover:bg-red-700 shadow-sm transition">Güvenli Çıkış</a>
            </div>
        </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 mt-8">
        
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div class="bg-blue-50 text-blue-600 p-4 rounded-xl text-2xl">👨‍⚕️</div>
                <div>
                    <p class="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Aktif Uzman</p>
                    <p class="text-3xl font-extrabold text-gray-900"><?= $stat_toplam_uzman ?></p>
                </div>
            </div>
            <div class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div class="bg-purple-50 text-purple-600 p-4 rounded-xl text-2xl">🗓️</div>
                <div>
                    <p class="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Toplam Randevu</p>
                    <p class="text-3xl font-extrabold text-gray-900"><?= $stat_toplam_randevu ?></p>
                </div>
            </div>
            <div class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div class="bg-orange-50 text-orange-600 p-4 rounded-xl text-2xl">⏳</div>
                <div>
                    <p class="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Bekleyen İşlem</p>
                    <p class="text-3xl font-extrabold text-gray-900"><?= $stat_bekleyen_randevu ?></p>
                </div>
            </div>
            <div class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div class="bg-green-50 text-green-600 p-4 rounded-xl text-2xl">✅</div>
                <div>
                    <p class="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Onaylanan Seans</p>
                    <p class="text-3xl font-extrabold text-gray-900"><?= $stat_onayli_randevu ?></p>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
            
            <div class="xl:col-span-2 space-y-8">
                
                <?php if(count($onay_bekleyenler) > 0): ?>
                <div class="bg-white rounded-3xl border-2 border-orange-200 shadow-md overflow-hidden">
                    <div class="bg-orange-50 px-6 py-4 border-b border-orange-100 flex items-center justify-between">
                        <h2 class="text-lg font-extrabold text-orange-900">🔔 Onay Bekleyen Uzmanlar</h2>
                        <span class="bg-orange-200 text-orange-800 text-xs font-bold px-3 py-1 rounded-full"><?= count($onay_bekleyenler) ?> Bekleyen</span>
                    </div>
                    <div class="divide-y divide-gray-100">
                        <?php foreach($onay_bekleyenler as $u): ?>
                        <div class="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div class="flex items-center gap-4">
                                <img src="<?= htmlspecialchars($u['gorsel']) ?>" class="w-12 h-12 rounded-full border border-gray-200 object-cover bg-gray-100">
                                <div>
                                    <h3 class="font-bold text-gray-900"><?= htmlspecialchars($u['ad']) ?></h3>
                                    <p class="text-sm text-gray-500">📍 <?= htmlspecialchars($u['ilce']) ?>, <?= htmlspecialchars($u['sehir']) ?> | 📞 <?= htmlspecialchars($u['telefon']) ?></p>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <a href="?islem=sil&id=<?= $u['id'] ?>" class="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition" onclick="return confirm('Silmek istediğinize emin misiniz?');">Reddet / Sil</a>
                                <a href="?islem=onayla&id=<?= $u['id'] ?>" class="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 shadow-sm transition">Profili Onayla</a>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
                <?php endif; ?>

                <div class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                    <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                        <h2 class="text-lg font-bold text-gray-900">Mevcut Uzmanlar</h2>
                        <span class="text-sm text-gray-500 font-medium border border-gray-200 px-3 py-1 rounded-full bg-gray-50">Toplam: <b><?= $toplam_onayli ?></b> Kayıt</span>
                    </div>
                    
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-widest">
                                    <th class="p-4 font-bold">Uzman</th>
                                    <th class="p-4 font-bold">Lokasyon</th>
                                    <th class="p-4 font-bold">Ücret</th>
                                    <th class="p-4 font-bold text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 text-sm">
                                <?php if(count($yayindaki_uzmanlar) > 0): ?>
                                    <?php foreach($yayindaki_uzmanlar as $u): ?>
                                    <tr class="hover:bg-gray-50 transition">
                                        <td class="p-4">
                                            <div class="flex items-center gap-3">
                                                <img src="<?= htmlspecialchars($u['gorsel']) ?>" class="w-8 h-8 rounded-full object-cover border border-gray-200">
                                                <div>
                                                    <a href="profil.php?id=<?= $u['id'] ?>" target="_blank" class="font-bold text-gray-900 hover:text-blue-600 transition"><?= htmlspecialchars($u['ad']) ?> ↗</a>
                                                    <div class="text-[11px] text-green-600 font-bold flex items-center gap-1 mt-0.5"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg> Yayında</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="p-4 text-gray-600 font-medium"><?= htmlspecialchars($u['sehir']) ?></td>
                                        <td class="p-4 font-bold text-gray-900"><?= htmlspecialchars($u['ucret']) ?></td>
                                        <td class="p-4 text-right">
                                            <a href="?islem=sil&id=<?= $u['id'] ?>" class="text-red-500 hover:text-red-700 font-bold px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg transition" onclick="return confirm('Bu uzmanı kalıcı olarak silmek istediğinize emin misiniz? Tüm randevuları da silinir.');">Sistemden Sil</a>
                                        </td>
                                    </tr>
                                    <?php endforeach; ?>
                                <?php else: ?>
                                    <tr>
                                        <td colspan="4" class="p-8 text-center text-gray-500 font-medium">Bu sayfada gösterilecek uzman bulunamadı.</td>
                                    </tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>

                    <?php if($toplam_sayfa > 1): ?>
                    <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <span class="text-sm text-gray-500">
                            <b><?= $offset + 1 ?></b> - <b><?= min($offset + $limit, $toplam_onayli) ?></b> arası gösteriliyor
                        </span>
                        
                        <div class="flex items-center gap-1.5">
                            <?php if($sayfa > 1): ?>
                                <a href="?sayfa=<?= $sayfa - 1 ?>" class="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100 shadow-sm transition">Önceki</a>
                            <?php endif; ?>
                            
                            <div class="hidden sm:flex items-center gap-1">
                                <?php for($i = 1; $i <= $toplam_sayfa; $i++): ?>
                                    <a href="?sayfa=<?= $i ?>" class="px-3.5 py-1.5 <?= $i == $sayfa ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100' ?> border rounded-lg text-sm font-bold transition">
                                        <?= $i ?>
                                    </a>
                                <?php endfor; ?>
                            </div>
                            
                            <?php if($sayfa < $toplam_sayfa): ?>
                                <a href="?sayfa=<?= $sayfa + 1 ?>" class="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100 shadow-sm transition">Sonraki</a>
                            <?php endif; ?>
                        </div>
                    </div>
                    <?php endif; ?>

                </div>
            </div>

            <div class="xl:col-span-1 space-y-6">
                
                <div class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden sticky top-24">
                    <div class="px-6 py-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                        <h2 class="text-lg font-bold text-gray-900 flex items-center gap-2">🔄 Randevu Trafiği</h2>
                    </div>
                    
                    <?php if(count($son_randevular) > 0): ?>
                        <div class="divide-y divide-gray-100 max-h-[700px] overflow-y-auto hide-scrollbar">
                            <?php foreach($son_randevular as $r): 
                                $durum_renk = 'bg-gray-100 text-gray-600';
                                $durum_yazi = 'Bilinmiyor';
                                if($r['durum'] == 'bekliyor') { $durum_renk = 'bg-orange-100 text-orange-700 border-orange-200'; $durum_yazi = '⏳ Uzman Onayı Bekliyor'; }
                                if($r['durum'] == 'onaylandi') { $durum_renk = 'bg-green-100 text-green-700 border-green-200'; $durum_yazi = '✅ Onaylandı'; }
                                if($r['durum'] == 'reddedildi') { $durum_renk = 'bg-red-100 text-red-700 border-red-200'; $durum_yazi = '❌ Reddedildi / İptal'; }
                            ?>
                                <div class="p-5 hover:bg-gray-50 transition">
                                    <div class="flex items-center justify-between mb-3">
                                        <span class="text-[10px] font-bold border <?= $durum_renk ?> px-2.5 py-1 rounded-full uppercase tracking-wide"><?= $durum_yazi ?></span>
                                        <span class="text-xs text-gray-400 font-medium" title="Oluşturulma Tarihi"><?= date('d.m.Y H:i', strtotime($r['olusturma_tarihi'])) ?></span>
                                    </div>
                                    
                                    <div class="bg-gray-50 rounded-xl p-3 border border-gray-100 mb-3 flex items-center gap-3">
                                        <div class="bg-white p-2 rounded-lg border border-gray-200 shadow-sm text-center min-w-[50px]">
                                            <div class="text-[10px] font-bold text-gray-400 uppercase"><?= explode(' ', tr_tarih($r['tarih']))[1] ?></div>
                                            <div class="text-base font-extrabold text-gray-900 leading-none"><?= explode(' ', tr_tarih($r['tarih']))[0] ?></div>
                                        </div>
                                        <div>
                                            <p class="text-sm font-bold text-blue-600"><?= $r['saat'] ?></p>
                                            <p class="text-xs text-gray-500 font-medium mt-0.5">Danışan: <span class="text-gray-900 font-bold"><?= htmlspecialchars($r['danisan_ad']) ?></span></p>
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-2">
                                        <span class="text-xs text-gray-400">Uzman:</span>
                                        <img src="<?= htmlspecialchars($r['uzman_gorsel'] ?? 'https://ui-avatars.com/api/?name=U') ?>" class="w-5 h-5 rounded-full object-cover">
                                        <span class="text-sm font-semibold text-gray-800 truncate"><?= htmlspecialchars($r['uzman_ad'] ?? 'Bilinmeyen Uzman') ?></span>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    <?php else: ?>
                        <div class="p-8 text-center text-gray-500 text-sm font-medium">
                            Henüz sistemde hiç randevu kaydı bulunmuyor.
                        </div>
                    <?php endif; ?>
                </div>

            </div>

        </div>
    </main>

    <style>
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
</body>
</html>