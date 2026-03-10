<?php
// goodnight/api/auth/login.php
// POST /auth/login — connexion avec PDO + vérification mot de passe haché

require_once __DIR__ . '/../core/helpers.php';
require_once __DIR__ . '/../core/jwt.php';
require_once __DIR__ . '/../config/database.php';

sendCorsHeaders();
requireMethod('POST');

$body     = getJsonBody();
$email    = trim($body['email'] ?? '');
$password = $body['password'] ?? '';

if ($email === '' || $password === '') {
    jsonError('Email et mot de passe requis');
}

try {
    $pdo  = Database::getInstance();
    $stmt = $pdo->prepare('SELECT * FROM locataire WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['mot_de_passe'])) {
        jsonError('Email ou mot de passe incorrect', 401);
    }

    $token = JWT::encode([
        'id_locataire' => $user['id_locataire'],
        'email'        => $user['email'],
    ]);

    // Ne jamais renvoyer le mot de passe au client
    unset($user['mot_de_passe']);

    jsonSuccess(['token' => $token, 'user' => $user]);

} catch (PDOException $e) {
    jsonError('Erreur base de données : ' . $e->getMessage(), 500);
}
