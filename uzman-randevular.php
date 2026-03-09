<?php
session_start();
require_once 'db.php';

if (!isset($_SESSION['uzman_id'])) {
    header("Location: uzman-giris.php");
    exit;
}

$id = $_SESSION['uzman_id'];

// Çıkış İşlemi
if (isset($_GET['cikis'])) {
    session_destroy();
    header("Location: uzman-giris.php");
    exit;
}

// ONAYLAMA / REDDETME İŞLEMLERİ
if (isset($_GET['islem']) && isset($_GET['r_id'])) {
    $r_id = (int)$_GET['r_id'];
    $islem = $_GET['islem'];
    
    if ($islem === 'onayla') {
        $pdo->prepare("UPDATE randevular SET durum = 'onaylandi' WHERE id = ? AND uzman_id = ?")->execute([$r_id, $id]);
    } elseif ($islem === 'reddet') {
        $pdo->prepare("UPDATE randevular SET durum = 'reddedildi' WHERE id = ? AND uzman_id = ?")->execute([$r_id, $id]);
    }
    
    header("Location: uzman-randevular.php");
    exit;
}

// Verileri Çek
$stmt = $pdo->prepare("SELECT ad, gorsel, onayli FROM psikologlar WHERE id = ?");
$stmt->execute([$id]);
$uzman = $stmt->fetch();

// Randevuları Çek
$stmt_bekleyen = $pdo->prepare("SELECT * FROM randevular WHERE uzman_id = ? AND durum = 'bekliyor' ORDER BY tarih ASC, saat ASC");
$stmt_bekleyen->execute([$id]);
$bekleyen_randevular = $stmt_bekleyen->fetchAll();

$stmt_onayli = $pdo->prepare("SELECT * FROM randevular WHERE uzman_id = ? AND durum = 'onaylandi' AND tarih >= ? ORDER BY tarih ASC, saat ASC");
$stmt_onayli->execute([$id, date('Y-m-d')]);
$onayli_randevular = $stmt_onayli->fetchAll();

function tr_tarih($tarih) {
    $aylar = ['01'=>'Oca','02'=>'Şub','03'=>'Mar','04'=>'Nis','05'=>'May','06'=>'Haz','07'=>'Tem','08'=>'Ağu','09'=>'Eyl','10'=>'Eki','11'=>'Kas','12'=>'Ara'];
    $parca = explode('-', $tarih);
    return $parca[2] . ' ' . $aylar[$parca[1]] . ' ' . $parca[0];
}
?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Randevu Yönetimi - Terapist.co</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); body { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-[#FAFAFA] text-gray-900 antialiased pb-20">

    <nav class="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div class="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
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

    <main class="max-w-5xl mx-auto px-4 mt-8">
        
        <div class="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div class="flex items-center gap-4">
                <img src="<?= htmlspecialchars($uzman['gorsel']) ?>" class="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover bg-gray-200">
                <div>
                    <h1 class="text-2xl font-extrabold tracking-tight">Randevu Yönetimi</h1>
                    <p class="text-sm text-gray-500">Gelen talepleri ve takviminizi yönetin.</p>
                </div>
            </div>
            
            <div class="inline-flex bg-gray-100 p-1.5 rounded-xl border border-gray-200 shadow-sm">
                <a href="uzman-randevular.php" class="px-5 py-2 rounded-lg text-sm font-bold shadow-sm bg-white text-gray-900">🗓️ Randevularım</a>
                <a href="uzman-panel.php" class="px-5 py-2 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-900 transition">⚙️ Profili Düzenle</a>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div class="lg:col-span-2 space-y-8">
                
                <?php if(count($bekleyen_randevular) > 0): ?>
                <div class="bg-white rounded-3xl border-2 border-orange-100 shadow-lg overflow-hidden">
                    <div class="bg-orange-50 px-6 py-4 border-b border-orange-100 flex items-center justify-between">
                        <h2 class="text-lg font-extrabold text-orange-900 flex items-center gap-2">🔔 Yeni Randevu Talepleri</h2>
                        <span class="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-1 rounded-full"><?= count($bekleyen_randevular) ?> Bekleyen</span>
                    </div>
                    <div class="divide-y divide-gray-100">
                        <?php foreach($bekleyen_randevular as $r): ?>
                            <div class="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-orange-50/30 transition">
                                <div class="flex-1">
                                    <div class="flex items-center gap-3 mb-1">
                                        <h3 class="font-bold text-gray-900 text-lg"><?= htmlspecialchars($r['danisan_ad']) ?></h3>
                                    </div>
                                    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm">
                                        <span class="flex items-center gap-1.5 text-blue-700 bg-blue-50 font-bold px-3 py-1 rounded-lg border border-blue-100">
                                            <?= tr_tarih($r['tarih']) ?> | <?= $r['saat'] ?>
                                        </span>
                                        <span class="flex items-center gap-1.5 text-gray-600 font-medium">📞 <?= htmlspecialchars($r['danisan_telefon']) ?></span>
                                    </div>
                                    <?php if(!empty($r['danisan_notu'])): ?>
                                        <p class="mt-3 text-sm text-gray-500 italic bg-gray-50 p-3 rounded-xl border border-gray-100">"<?= htmlspecialchars($r['danisan_notu']) ?>"</p>
                                    <?php endif; ?>
                                </div>
                                <div class="flex items-center gap-2 md:ml-4">
                                    <a href="?islem=reddet&r_id=<?= $r['id'] ?>" class="px-4 py-2 bg-white border border-gray-200 text-red-500 rounded-xl text-sm font-bold hover:bg-red-50 hover:border-red-100 transition" onclick="return confirm('Bu talebi reddetmek istediğinize emin misiniz?');">Reddet</a>
                                    <a href="?islem=onayla&r_id=<?= $r['id'] ?>" class="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm transition">Onayla</a>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
                <?php endif; ?>

                <div class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                    <div class="px-6 py-5 border-b border-gray-100">
                        <h2 class="text-lg font-bold text-gray-900 flex items-center gap-2">📅 Yaklaşan Randevularınız</h2>
                    </div>
                    
                    <?php if(count($onayli_randevular) > 0): ?>
                        <div class="divide-y divide-gray-100 p-4 space-y-3">
                            <?php foreach($onayli_randevular as $r): ?>
                                <div class="p-4 rounded-2xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-100 hover:shadow-md transition bg-gray-50 hover:bg-white">
                                    <div class="flex items-center gap-4">
                                        <div class="bg-white text-gray-900 text-center rounded-xl p-2 min-w-[70px] border border-gray-200 shadow-sm">
                                            <div class="text-[10px] font-bold uppercase text-gray-400 mb-0.5"><?= explode(' ', tr_tarih($r['tarih']))[1] ?></div>
                                            <div class="text-xl font-extrabold leading-none my-0.5"><?= explode(' ', tr_tarih($r['tarih']))[0] ?></div>
                                        </div>
                                        <div>
                                            <h3 class="font-bold text-gray-900 text-base mb-0.5"><?= htmlspecialchars($r['danisan_ad']) ?></h3>
                                            <div class="flex items-center gap-3 text-sm">
                                                <span class="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">⏰ <?= $r['saat'] ?></span>
                                                <span class="text-gray-500 font-medium">📞 <?= htmlspecialchars($r['danisan_telefon']) ?></span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <a href="https://wa.me/<?= str_replace([' ', '+'], '', $r['danisan_telefon']) ?>" target="_blank" class="w-full sm:w-auto px-5 py-2 bg-[#25D366] text-white rounded-xl text-sm font-bold hover:bg-[#20bd5a] transition flex items-center justify-center gap-2 shadow-sm">
                                            WhatsApp
                                        </a>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    <?php else: ?>
                        <div class="p-10 text-center">
                            <span class="text-4xl mb-3 block opacity-50">☕</span>
                            <p class="text-gray-500 font-medium">Onaylanmış ileri tarihli bir randevunuz bulunmuyor.</p>
                        </div>
                    <?php endif; ?>
                </div>

            </div>

            <div class="lg:col-span-1 space-y-6">
                <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-3xl border border-blue-100 shadow-sm relative overflow-hidden">
                    <div class="absolute -right-4 -top-4 text-6xl opacity-10">🗓️</div>
                    <span class="bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full mb-4 inline-block shadow-sm">Çok Yakında</span>
                    <h3 class="font-extrabold text-xl text-gray-900 mb-2">Gelişmiş Takvim & Google Entegrasyonu</h3>
                    <p class="text-sm text-gray-600 font-medium mb-4 leading-relaxed">Yakında randevularınızı görsel bir takvim üzerinde yönetebilecek ve doğrudan Google Takvim'inizle senkronize edebileceksiniz.</p>
                    <ul class="space-y-2 mb-5">
                        <li class="flex items-center gap-2 text-sm text-blue-800 font-semibold"><svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg> Google Meet Linki Otomatik Oluşturma</li>
                        <li class="flex items-center gap-2 text-sm text-blue-800 font-semibold"><svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg> Tatil Günleri Belirleme</li>
                        <li class="flex items-center gap-2 text-sm text-blue-800 font-semibold"><svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg> 2 Yönlü Senkronizasyon</li>
                    </ul>
                    <button disabled class="w-full py-3 bg-white border-2 border-blue-200 text-blue-400 rounded-xl text-sm font-bold cursor-not-allowed">Google Takvim'e Bağlan</button>
                </div>
            </div>

        </div>
    </main>
</body>
</html>