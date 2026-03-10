<?php
// goodnight/api/auth/me.php
// GET /auth/me — retourne les infos de l'utilisateur connecté via son JWT

require_once __DIR__ . '/../core/helpers.php';
require_once __DIR__ . '/../core/auth_middleware.php';
require_once __DIR__ . '/../config/database.php';

sendCorsHeaders();
requireMethod('GET');

$payload = requireAuth();
$id      = (int) ($payload['id_locataire'] ?? 0);

if ($id === 0) {
    jsonError('Token invalide', 401);
}

try {
    $pdo  = Database::getInstance();
    $stmt = $pdo->prepare('SELECT * FROM locataire WHERE id_locataire = ? LIMIT 1');
    $stmt->execute([$id]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonError('Utilisateur introuvable', 404);
    }

    unset($user['mot_de_passe']);
    jsonSuccess($user);

} catch (PDOException $e) {
    jsonError('Erreur base de données : ' . $e->getMessage(), 500);
}
