<?php
session_start();
require_once 'db.php';

// Zaten giriş yapmışsa direkt panele yönlendir
if (isset($_SESSION['uzman_id'])) {
    header("Location: uzman-panel.php");
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $sifre = $_POST['sifre'] ?? '';

    if (!empty($email) && !empty($sifre)) {
        // E-postaya göre uzmanı bul
        $stmt = $pdo->prepare("SELECT id, ad, sifre FROM psikologlar WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        $uzman = $stmt->fetch();

        // Uzman varsa ve şifre doğruysa (password_verify ile hash kontrolü)
        // (Eski test verilerinde şifre olmadığı için manuel test edebilmen adına şimdilik direkt eşitliğe de izin veriyoruz)
        if ($uzman && (password_verify($sifre, $uzman['sifre'] ?? '') || $sifre === $uzman['sifre'])) {
            $_SESSION['uzman_id'] = $uzman['id'];
            $_SESSION['uzman_ad'] = $uzman['ad'];
            header("Location: uzman-panel.php");
            exit;
        } else {
            $hata = "E-posta veya şifre hatalı!";
        }
    } else {
        $hata = "Lütfen tüm alanları doldurun.";
    }
}
?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Uzman Girişi - Terapist.co</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'); body { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-gray-50 h-screen flex items-center justify-center antialiased">
    <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm text-center">
        <div class="text-4xl mb-4">🩺</div>
        <h1 class="text-2xl font-extrabold text-gray-900 mb-2">Uzman Girişi</h1>
        <p class="text-sm text-gray-500 mb-6">Profilinizi yönetmek için giriş yapın.</p>
        
        <?php if(isset($hata)): ?>
            <div class="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 font-medium"><?= $hata ?></div>
        <?php endif; ?>

        <form method="POST" action="">
            <input type="email" name="email" placeholder="E-posta Adresiniz" required class="w-full px-4 py-3 border border-gray-300 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
            <input type="password" name="sifre" placeholder="Şifreniz" required class="w-full px-4 py-3 border border-gray-300 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
            <button type="submit" class="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition">Giriş Yap</button>
        </form>

        <div class="mt-6 pt-6 border-t border-gray-100">
            <p class="text-sm text-gray-500">Henüz hesabınız yok mu?</p>
            <a href="katil.php" class="inline-block mt-2 text-sm font-semibold text-blue-600 hover:underline">Uzman Olarak Katılın</a>
        </div>
    </div>
</body>
</html>