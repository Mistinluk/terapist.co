<?php
session_start();

// Eğer admin zaten giriş yapmışsa, hiç formu göstermeden direkt panele at
if (isset($_SESSION['admin_giris'])) {
    header("Location: admin.php");
    exit;
}

$hata = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $kullanici_adi = trim($_POST['kullanici_adi'] ?? '');
    $sifre = $_POST['sifre'] ?? '';

    // 🔒 ADMIN GİRİŞ BİLGİLERİ (Buraları Kendi İstediğin Gibi Değiştir)
    $dogru_kullanici = 'admin';
    $dogru_sifre = '123456'; 

    if ($kullanici_adi === $dogru_kullanici && $sifre === $dogru_sifre) {
        // Şifre doğruysa "Anahtarı" ver ve içeri al
        $_SESSION['admin_giris'] = true;
        header("Location: admin.php");
        exit;
    } else {
        $hata = 'Kullanıcı adı veya şifre hatalı!';
    }
}
?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yönetici Girişi - Terapist.co</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); body { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-[#F3F4F6] text-gray-900 antialiased min-h-screen flex flex-col justify-center items-center p-4">

    <div class="w-full max-w-md">
        <div class="text-center mb-8">
            <a href="index.php" class="inline-flex items-center gap-2 text-gray-900 hover:opacity-80 transition cursor-pointer mb-2">
                <span class="text-3xl">🛋️</span>
                <span class="font-extrabold text-2xl tracking-tight">Terapist.co</span>
            </a>
            <p class="text-sm font-bold text-gray-500 uppercase tracking-widest">Sistem Yönetimi</p>
        </div>

        <div class="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
            <div class="bg-gray-900 px-8 py-5 border-b border-gray-800">
                <h2 class="text-xl font-extrabold text-white flex items-center gap-2">🛡️ Güvenli Giriş</h2>
            </div>
            
            <div class="p-8">
                <?php if($hata): ?>
                    <div class="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 mb-6 text-sm font-bold text-center flex items-center justify-center gap-2">
                        <span>❌</span> <?= $hata ?>
                    </div>
                <?php endif; ?>

                <form method="POST" action="" class="space-y-5">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1.5">Kullanıcı Adı</label>
                        <input type="text" name="kullanici_adi" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition" placeholder="admin">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1.5">Parola</label>
                        <input type="password" name="sifre" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition" placeholder="••••••••">
                    </div>

                    <div class="pt-2">
                        <button type="submit" class="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition shadow-lg flex items-center justify-center gap-2">
                            Yönetim Paneline Gir 
                        </button>
                    </div>
                </form>
            </div>
        </div>
        
        <p class="text-center text-xs text-gray-400 mt-6 font-medium">Bu alan sadece yetkili sistem yöneticileri içindir.</p>
    </div>

</body>
</html>