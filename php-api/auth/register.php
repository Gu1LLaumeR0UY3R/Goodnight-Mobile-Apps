<?php
// goodnight/api/auth/register.php
// POST /auth/register — inscription avec PDO, mot de passe haché avec password_hash

require_once __DIR__ . '/../core/helpers.php';
require_once __DIR__ . '/../core/jwt.php';
require_once __DIR__ . '/../config/database.php';

sendCorsHeaders();
requireMethod('POST');

$body      = getJsonBody();
$nom       = trim($body['nom'] ?? '');
$prenom    = trim($body['prenom'] ?? '');
$email     = trim($body['email'] ?? '');
$telephone = $body['telephone'] ?? null;
$password  = $body['mot_de_passe'] ?? '';

if ($nom === '' || $prenom === '' || $email === '' || $password === '') {
    jsonError('Nom, prénom, email et mot de passe sont requis');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonError('Adresse email invalide');
}

if (strlen($password) < 6) {
    jsonError('Le mot de passe doit contenir au moins 6 caractères');
}

try {
    $pdo = Database::getInstance();

    // Vérifier si l'email est déjà utilisé
    $check = $pdo->prepare('SELECT id_locataire FROM locataire WHERE email = ? LIMIT 1');
    $check->execute([$email]);
    if ($check->fetch()) {
        jsonError('Cet email est déjà utilisé', 409);
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);

    $stmt = $pdo->prepare(
        'INSERT INTO locataire (nom, prenom, email, telephone, mot_de_passe, date_inscription)
         VALUES (?, ?, ?, ?, ?, NOW())'
    );
    $stmt->execute([$nom, $prenom, $email, $telephone, $hash]);

    $newId = (int) $pdo->lastInsertId();

    $user = $pdo->prepare('SELECT * FROM locataire WHERE id_locataire = ?');
    $user->execute([$newId]);
    $newUser = $user->fetch();
    unset($newUser['mot_de_passe']);

    $token = JWT::encode([
        'id_locataire' => $newUser['id_locataire'],
        'email'        => $newUser['email'],
    ]);

    jsonSuccess(['token' => $token, 'user' => $newUser], 201);

} catch (PDOException $e) {
    jsonError('Erreur base de données : ' . $e->getMessage(), 500);
}
