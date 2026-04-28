<?php
// php-api/routes/auth.php
// Variables disponibles depuis index.php : $method, $param1

switch ($method . ':' . ($param1 ?? '')) {

    // ─── POST /auth/login ────────────────────────────────────────────────────
    case 'POST:login':
        $body     = getJsonBody();
        $email    = trim($body['email'] ?? '');
        $password = $body['password'] ?? '';

        if ($email === '' || $password === '') {
            jsonError('Email et mot de passe requis');
        }

        try {
            $pdo  = Database::getInstance();
            $stmt = $pdo->prepare(
                'SELECT * FROM locataire WHERE email_locataire = ? LIMIT 1'
            );
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if (!$user || !password_verify($password, $user['password_locataire'])) {
                jsonError('Email ou mot de passe incorrect', 401);
            }

            unset($user['password_locataire']);
            $token = JWT::encode([
                'id_locataire' => $user['id_locataire'],
                'email'        => $user['email_locataire'],
            ]);
            jsonSuccess(['token' => $token, 'user' => $user]);

        } catch (PDOException $e) {
            jsonError('Erreur base de données', 500);
        }
        break;

    // ─── POST /auth/register ─────────────────────────────────────────────────
    case 'POST:register':
$body            = getJsonBody();
    $nom             = trim($body['nom'] ?? '');
    $prenom          = trim($body['prenom'] ?? '');
    $email           = trim($body['email'] ?? '');
    $telephone       = (isset($body['telephone']) && $body['telephone'] !== '')
                         ? $body['telephone'] : null;
    $password        = $body['mot_de_passe'] ?? '';
    $dateNaissance   = trim($body['dateNaissance_locataire'] ?? '');
    $typeCompte      = ($body['type_compte'] ?? 'locataire') === 'proprietaire' ? 'proprietaire' : 'locataire';
    $isEntreprise    = !empty($body['is_entreprise']) ? 1 : 0;
    $siret           = trim($body['Siret'] ?? '');

    if ($nom === '' || $prenom === '' || $email === '' || $password === '') {
        jsonError('Nom, prénom, email et mot de passe sont requis');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonError('Adresse email invalide');
    }
    if (strlen($password) < 6) {
        jsonError('Le mot de passe doit contenir au moins 6 caractères');
    }
    if ($isEntreprise && $siret === '') {
        jsonError('Le numéro de SIRET est requis pour un compte entreprise');
    }
    if (!$isEntreprise && $dateNaissance === '') {
        jsonError('La date de naissance est requise pour un compte individuel');
    }

    try {
        $pdo   = Database::getInstance();
        $check = $pdo->prepare(
            'SELECT id_locataire FROM locataire WHERE email_locataire = ? LIMIT 1'
        );
        $check->execute([$email]);
        if ($check->fetch()) {
            jsonError('Cet email est déjà utilisé', 409);
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $pdo->prepare(
            'INSERT INTO locataire
                 (nom_locataire, prenom_locataire, email_locataire, tel_locataire, password_locataire, dateNaissance_locataire, Siret, type_compte, is_entreprise)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([$nom, $prenom, $email, $telephone, $hash, $dateNaissance ?: null, $siret ?: null, $typeCompte, $isEntreprise]);

            $sel = $pdo->prepare(
                'SELECT * FROM locataire WHERE id_locataire = ? LIMIT 1'
            );
            $sel->execute([(int) $pdo->lastInsertId()]);
            $newUser = $sel->fetch();
            unset($newUser['password_locataire']);

            $token = JWT::encode([
                'id_locataire' => $newUser['id_locataire'],
                'email'        => $newUser['email_locataire'],
            ]);
            jsonSuccess(['token' => $token, 'user' => $newUser], 201);

        } catch (PDOException $e) {
            jsonError('Erreur base de données', 500);
        }
        break;

    // ─── GET /auth/me ────────────────────────────────────────────────────────
    case 'GET:me':
        $payload = requireAuth();
        $id      = (int) ($payload['id_locataire'] ?? 0);
        if ($id === 0) jsonError('Token invalide', 401);

        try {
            $pdo  = Database::getInstance();
            $stmt = $pdo->prepare(
                'SELECT * FROM locataire WHERE id_locataire = ? LIMIT 1'
            );
            $stmt->execute([$id]);
            $user = $stmt->fetch();
            if (!$user) jsonError('Utilisateur introuvable', 404);

            unset($user['password_locataire']);
            jsonSuccess($user);

        } catch (PDOException $e) {
            jsonError('Erreur base de données', 500);
        }
        break;

    default:
        jsonError('Route introuvable', 404);
}
