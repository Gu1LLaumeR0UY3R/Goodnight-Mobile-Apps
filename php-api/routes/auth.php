<?php
// php-api/routes/auth.php
// Variables disponibles depuis index.php : $method, $param1
/** @var string      $method */
/** @var string|null $param1 */
$method ??= $_SERVER['REQUEST_METHOD'];
$param1 ??= null;

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
                "SELECT l.*,
                        CASE WHEN COALESCE(role_map.is_owner, 0) = 1 THEN 'proprietaire' ELSE 'locataire' END AS type_compte
                 FROM locataire l
                 LEFT JOIN (
                    SELECT ur.id_locataire,
                           MAX(CASE WHEN LOWER(r.nom_roles) IN ('propriétaire', 'proprietaire') THEN 1 ELSE 0 END) AS is_owner
                    FROM user_role ur
                    INNER JOIN roles r ON r.id_roles = ur.id_roles
                    GROUP BY ur.id_locataire
                 ) role_map ON role_map.id_locataire = l.id_locataire
                 WHERE l.email_locataire = ?
                 LIMIT 1"
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
                 (nom_locataire, prenom_locataire, email_locataire, tel_locataire, password_locataire, dateNaissance_locataire, Siret)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
        )->execute([$nom, $prenom, $email, $telephone, $hash, $dateNaissance ?: null, $siret ?: null]);

            $newId = (int) $pdo->lastInsertId();

            $roleStmt = $pdo->prepare(
                "SELECT id_roles FROM roles WHERE LOWER(nom_roles) IN ('propriétaire', 'proprietaire') LIMIT 1"
            );
            if ($typeCompte !== 'proprietaire') {
                $roleStmt = $pdo->prepare(
                    "SELECT id_roles FROM roles WHERE LOWER(nom_roles) = 'locataire' LIMIT 1"
                );
            }
            $roleStmt->execute();
            $roleId = (int) ($roleStmt->fetchColumn() ?: 0);
            if ($roleId === 0) {
                jsonError('Configuration des roles invalide', 500);
            }

            $pdo->prepare('INSERT INTO user_role (id_roles, id_locataire) VALUES (?, ?)')
                ->execute([$roleId, $newId]);

            $sel = $pdo->prepare(
                "SELECT l.*,
                        CASE WHEN COALESCE(role_map.is_owner, 0) = 1 THEN 'proprietaire' ELSE 'locataire' END AS type_compte
                 FROM locataire l
                 LEFT JOIN (
                    SELECT ur.id_locataire,
                           MAX(CASE WHEN LOWER(r.nom_roles) IN ('propriétaire', 'proprietaire') THEN 1 ELSE 0 END) AS is_owner
                    FROM user_role ur
                    INNER JOIN roles r ON r.id_roles = ur.id_roles
                    GROUP BY ur.id_locataire
                 ) role_map ON role_map.id_locataire = l.id_locataire
                 WHERE l.id_locataire = ?
                 LIMIT 1"
            );
            $sel->execute([$newId]);
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
                "SELECT l.*,
                        CASE WHEN COALESCE(role_map.is_owner, 0) = 1 THEN 'proprietaire' ELSE 'locataire' END AS type_compte
                 FROM locataire l
                 LEFT JOIN (
                    SELECT ur.id_locataire,
                           MAX(CASE WHEN LOWER(r.nom_roles) IN ('propriétaire', 'proprietaire') THEN 1 ELSE 0 END) AS is_owner
                    FROM user_role ur
                    INNER JOIN roles r ON r.id_roles = ur.id_roles
                    GROUP BY ur.id_locataire
                 ) role_map ON role_map.id_locataire = l.id_locataire
                 WHERE l.id_locataire = ?
                 LIMIT 1"
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

    // ─── PUT /auth/me ─────────────────────────────────────────────────────────
    case 'PUT:me':
        $payload = requireAuth();
        $id      = (int) ($payload['id_locataire'] ?? 0);
        if ($id === 0) jsonError('Token invalide', 401);

        try {
            $pdo    = Database::getInstance();
            $body   = getJsonBody();
            $nom    = trim((string) ($body['nom_locataire']    ?? ''));
            $prenom = trim((string) ($body['prenom_locataire'] ?? ''));
            $email  = trim((string) ($body['email_locataire']  ?? ''));
            $tel    = trim((string) ($body['tel_locataire']    ?? ''));

            if ($nom === '' || $prenom === '' || $email === '') {
                jsonError('Nom, prénom et email requis');
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                jsonError('Email invalide');
            }

            // Unicité email (hors utilisateur courant)
            $emailCheck = $pdo->prepare(
                'SELECT id_locataire FROM locataire WHERE email_locataire = ? AND id_locataire <> ?'
            );
            $emailCheck->execute([$email, $id]);
            if ($emailCheck->fetch()) {
                jsonError('Cet email est déjà utilisé', 409);
            }

            // Changement de mot de passe (optionnel)
            $ancienMdp  = trim((string) ($body['ancien_mdp']  ?? ''));
            $nouveauMdp = trim((string) ($body['nouveau_mdp'] ?? ''));

            if ($ancienMdp !== '' || $nouveauMdp !== '') {
                if ($ancienMdp === '' || $nouveauMdp === '') {
                    jsonError('Les deux mots de passe sont requis pour le changement');
                }
                if (strlen($nouveauMdp) < 6) {
                    jsonError('Le nouveau mot de passe doit faire au moins 6 caractères');
                }
                $pwRow = $pdo->prepare(
                    'SELECT password_locataire FROM locataire WHERE id_locataire = ?'
                );
                $pwRow->execute([$id]);
                $row = $pwRow->fetch();
                if (!$row || !password_verify($ancienMdp, (string) $row['password_locataire'])) {
                    jsonError('Mot de passe actuel incorrect', 403);
                }
                $pdo->prepare(
                    'UPDATE locataire
                     SET nom_locataire = ?, prenom_locataire = ?, email_locataire = ?,
                         tel_locataire = ?, password_locataire = ?
                     WHERE id_locataire = ?'
                )->execute([
                    $nom, $prenom, $email,
                    $tel !== '' ? $tel : null,
                    password_hash($nouveauMdp, PASSWORD_DEFAULT),
                    $id,
                ]);
            } else {
                $pdo->prepare(
                    'UPDATE locataire
                     SET nom_locataire = ?, prenom_locataire = ?, email_locataire = ?,
                         tel_locataire = ?
                     WHERE id_locataire = ?'
                )->execute([
                    $nom, $prenom, $email,
                    $tel !== '' ? $tel : null,
                    $id,
                ]);
            }

            // Photo de profil (optionnel)
            $pfpLoca = trim((string) ($body['pfp_loca'] ?? ''));
            if ($pfpLoca !== '') {
                $pdo->prepare('UPDATE locataire SET pfp_loca = ? WHERE id_locataire = ?')
                    ->execute([$pfpLoca, $id]);
            }

            // Retourner le profil mis à jour (avec type_compte résolu)
            $stmt = $pdo->prepare(
                "SELECT l.*,
                        CASE WHEN COALESCE(role_map.is_owner, 0) = 1 THEN 'proprietaire' ELSE 'locataire' END AS type_compte
                 FROM locataire l
                 LEFT JOIN (
                    SELECT ur.id_locataire,
                           MAX(CASE WHEN LOWER(r.nom_roles) IN ('propriétaire', 'proprietaire') THEN 1 ELSE 0 END) AS is_owner
                    FROM user_role ur
                    INNER JOIN roles r ON r.id_roles = ur.id_roles
                    GROUP BY ur.id_locataire
                 ) role_map ON role_map.id_locataire = l.id_locataire
                 WHERE l.id_locataire = ?
                 LIMIT 1"
            );
            $stmt->execute([$id]);
            $user = $stmt->fetch();
            unset($user['password_locataire']);
            jsonSuccess($user);

        } catch (PDOException $e) {
            jsonError('Erreur base de données', 500);
        }
        break;

    // ─── POST /auth/refresh ──────────────────────────────────────────────────
    // Émet un nouveau JWT valide 7 jours si le token courant est encore valide.
    case 'POST:refresh':
        $payload = requireAuth();
        $id      = (int) ($payload['id_locataire'] ?? 0);
        $email   = (string) ($payload['email'] ?? '');
        if ($id === 0) jsonError('Token invalide', 401);

        $newToken = JWT::encode([
            'id_locataire' => $id,
            'email'        => $email,
        ]);
        jsonSuccess(['token' => $newToken]);
        break;

    // ─── POST /auth/push-token ─────────────────────────────────────────────
    default:
        jsonError('Route introuvable', 404);
}
