<?php
session_start();

// Güvenlik: Admin girişi yapılmamışsa işlemi engelle ve logine at
if (!isset($_SESSION['admin_giris'])) {
    header("Location: admin.php");
    exit;
}

require_once 'db.php';

// URL'den gelen ID'yi alıyoruz (Güvenlik için integer'a çeviriyoruz)
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id > 0) {
    try {
        // Silme İşlemi (PDO Prepare ile SQL Injection korumalı)
        $stmt = $pdo->prepare("DELETE FROM psikologlar WHERE id = ?");
        $stmt->execute([$id]);
    } catch (\PDOException $e) {
        // Eğer silerken bir hata olursa (normalde olmaz ama tedbir)
        die("Silme işlemi sırasında bir hata oluştu: " . $e->getMessage());
    }
}

// İşlem biter bitmez geldiğimiz yere (admin paneline) geri dön
header("Location: admin.php");
exit;
?>