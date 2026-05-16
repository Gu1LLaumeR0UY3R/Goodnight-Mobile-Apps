<?php
// php-api/routes/biens.php
// GET /biens           — liste avec filtres
// GET /biens/types     — liste des types
// GET /biens/communes  — autocomplete communes
// GET /biens/villes    — autocomplete villes
// GET /biens/count     — count avec filtres
// GET /biens/:id       — détail + photos
// POST /biens          — créer un bien (propriétaire)
// POST /biens/upload-photo — upload d'une photo locale (propriétaire)
// GET /biens/:id/blocages    — lister les blocages propriétaire
// POST /biens/:id/blocages   — créer un blocage propriétaire
// DELETE /biens/:id/blocages/:blocageId — supprimer un blocage propriétaire

// Variables injectées par index.php via require (déclarées ici pour l'analyseur statique)
/** @var string      $method */
/** @var string|null $param1 */
/** @var string|null $param2 */
/** @var string|null $param3 */
$method ??= $_SERVER['REQUEST_METHOD'];
$param1 ??= null;
$param2 ??= null;
$param3 ??= null;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function buildFilters(array $q): array
{
    $wheres  = ["b.statut_validation = 'valide'"];
    $params  = [];
    $havings = [];
    $hParams = [];

    // Recherche texte
    if (!empty($q['search'])) {
        $wheres[] = '(b.designation_bien LIKE ? OR b.description_biens LIKE ?)';
        $params[] = '%' . $q['search'] . '%';
        $params[] = '%' . $q['search'] . '%';
    }

    // Villes (supporte ?ville= et ?villes= séparées par virgule)
    $villeList = [];
    if (!empty($q['villes'])) {
        $villeList = array_values(
            array_filter(array_map('trim', explode(',', $q['villes'])))
        );
    } elseif (!empty($q['ville'])) {
        $villeList = [trim($q['ville'])];
    }
    if (count($villeList) === 1) {
        $wheres[] = 'c.ville_nom LIKE ?';
        $params[] = '%' . $villeList[0] . '%';
    } elseif (count($villeList) > 1) {
        $ph = implode(' OR ', array_fill(0, count($villeList), 'c.ville_nom LIKE ?'));
        $wheres[] = "($ph)";
        foreach ($villeList as $v) $params[] = '%' . $v . '%';
    }

    // Types (OR entre eux)
    if (!empty($q['types'])) {
        $ids = array_values(array_filter(
            array_map('intval', explode(',', $q['types'])),
            fn ($v) => $v > 0
        ));
        if ($ids) {
            $ph = implode(',', array_fill(0, count($ids), '?'));
            $wheres[] = "b.id_TypeBien IN ($ph)";
            foreach ($ids as $v) $params[] = $v;
        }
    }

    // Prix (HAVING sur l'alias prix_semaine_min calculé par JOIN dans la requête principale)
    if (isset($q['prix_min']) && is_numeric($q['prix_min'])) {
        $havings[] = 'COALESCE(prix_semaine_min, 0) >= ?';
        $hParams[] = (float) $q['prix_min'];
    }
    if (isset($q['prix_max']) && is_numeric($q['prix_max'])) {
        $havings[] = 'COALESCE(prix_semaine_min, 0) <= ?';
        $hParams[] = (float) $q['prix_max'];
    }

    // Animaux
    if (($q['animaux'] ?? '') === 'true') {
        $wheres[] = 'b.animaux_biens = 1';
    }

    // Voyageurs
    if (isset($q['voyageurs']) && is_numeric($q['voyageurs'])) {
        $wheres[] = 'b.nb_couchage >= ?';
        $params[] = (int) $q['voyageurs'];
    }

    // Exclure les biens d'un propriétaire (ex: utilisateur connecté)
    if (isset($q['exclude_owner_id']) && is_numeric($q['exclude_owner_id'])) {
        $ownerId = (int) $q['exclude_owner_id'];
        if ($ownerId > 0) {
            $wheres[] = 'COALESCE(b.id_locataire, 0) <> ?';
            $params[] = $ownerId;
        }
    }

    // Disponibilité dates
    if (!empty($q['date_debut']) && !empty($q['date_fin'])) {
        $wheres[] = 'b.id_biens NOT IN (
            SELECT r.id_biens FROM reservations r
            WHERE r.date_debut < ? AND r.date_fin > ?
        )';
        $params[] = $q['date_fin'];
        $params[] = $q['date_debut'];
    }

    // Distance géographique
    if (
        isset($q['lat'], $q['lng'], $q['distance_km'])
        && is_numeric($q['lat'])
        && is_numeric($q['lng'])
        && is_numeric($q['distance_km'])
    ) {
        $wheres[] = 'ST_Distance_Sphere(POINT(c.ville_longitude_deg, c.ville_latitude_deg), POINT(?, ?)) <= ?';
        $params[] = (float) $q['lng'];
        $params[] = (float) $q['lat'];
        $params[] = (float) $q['distance_km'] * 1000;
    }

    // Équipements (ET entre eux)
    if (!empty($q['equipements'])) {
        $eids = array_values(array_filter(
            array_map('intval', explode(',', $q['equipements'])),
            fn ($v) => $v > 0
        ));
        foreach ($eids as $eid) {
            $wheres[] = 'EXISTS (
                SELECT 1 FROM bien_equipement be
                WHERE be.id_biens = b.id_biens AND be.id_equipement = ?
            )';
            $params[] = $eid;
        }
    }

    // Note minimum (HAVING après GROUP BY)
    if (isset($q['min_note']) && is_numeric($q['min_note'])) {
        $havings[] = 'COALESCE(AVG(com.note), 0) >= ?';
        $hParams[] = (float) $q['min_note'];
    }

    return [
        'whereSql'    => implode(' AND ', $wheres),
        'whereParams' => $params,
        'havingSql'   => $havings ? ('HAVING ' . implode(' AND ', $havings)) : '',
        'havingParams'=> $hParams,
    ];
}

function getSortSql(string $sort): string
{
    return match ($sort) {
        'price_asc'   => 'COALESCE(prix_semaine_min, 0) ASC',
        'price_desc'  => 'COALESCE(prix_semaine_min, 0) DESC',
        'rating_desc' => 'note_moyenne DESC',
        default       => 'b.id_biens DESC',
    };
}

function parseYmdDate(string $value): ?DateTime
{
    $date = DateTime::createFromFormat('Y-m-d', $value);
    return ($date && $date->format('Y-m-d') === $value) ? $date : null;
}

function requireOwnedBien(PDO $pdo, int $bienId, int $ownerId): array
{
    $stmt = $pdo->prepare('SELECT * FROM biens WHERE id_biens = ?');
    $stmt->execute([$bienId]);
    $bien = $stmt->fetch();

    if (!$bien) jsonError('Bien introuvable', 404);
    if ((int) ($bien['id_locataire'] ?? 0) !== $ownerId) {
        jsonError('Accès refusé', 403);
    }

    return $bien;
}

// ─── Dispatch ────────────────────────────────────────────────────────────────
if (!in_array($method, ['GET', 'POST', 'PUT', 'DELETE'], true)) jsonError('Méthode non autorisée', 405);

try {
    $pdo = Database::getInstance();

    // ── POST /biens/upload-photo — upload image locale ──────────────────────
    if ($method === 'POST' && $param1 === 'upload-photo') {
        $payload = requireAuth();
        $ownerId = (int) ($payload['id_locataire'] ?? 0);
        if ($ownerId === 0) jsonError('Token invalide', 401);

        if (!isset($_FILES['photo']) || !is_array($_FILES['photo'])) {
            jsonError('Aucun fichier reçu');
        }

        $file = $_FILES['photo'];
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            jsonError('Erreur lors de l\'upload');
        }

        $tmpName = (string) ($file['tmp_name'] ?? '');
        if ($tmpName === '' || !is_uploaded_file($tmpName)) {
            jsonError('Fichier invalide');
        }

        $maxBytes = 8 * 1024 * 1024;
        $size = (int) ($file['size'] ?? 0);
        if ($size <= 0 || $size > $maxBytes) {
            jsonError('Image trop volumineuse (max 8 Mo)');
        }

        $mime = (string) mime_content_type($tmpName);
        $allowed = [
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
        ];
        if (!isset($allowed[$mime])) {
            jsonError('Format non supporté (jpg, png, webp)');
        }

        $uploadDir = __DIR__ . '/../uploads';
        if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true) && !is_dir($uploadDir)) {
            jsonError('Impossible de créer le dossier uploads', 500);
        }

        $ext = $allowed[$mime];
        $filename = 'bien_' . $ownerId . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
        $targetPath = $uploadDir . '/' . $filename;

        if (!move_uploaded_file($tmpName, $targetPath)) {
            jsonError('Upload impossible', 500);
        }

        jsonSuccess([
            'path' => '/uploads/' . $filename,
            'message' => 'Photo uploadée avec succès',
        ], 201);
    }

    // ── POST /biens — créer un bien propriétaire ─────────────────────────────
    if ($method === 'POST' && $param1 === null) {
        $payload = requireAuth();
        $ownerId = (int) ($payload['id_locataire'] ?? 0);
        if ($ownerId === 0) jsonError('Token invalide', 401);

        $body = getJsonBody();
        $designation = trim((string) ($body['designation_bien'] ?? ''));
        $rue = trim((string) ($body['rue_biens'] ?? ''));
        $complement = trim((string) ($body['complement_biens'] ?? ''));
        $description = trim((string) ($body['description_biens'] ?? ''));
        $superficie = (int) ($body['superficie_biens'] ?? 0);
        $nbCouchage = (int) ($body['nb_couchage'] ?? 0);
        $idTypeBien = (int) ($body['id_TypeBien'] ?? 0);
        $idCommune = (int) ($body['id_commune'] ?? 0);
        $prixSemaine = (float) ($body['prix_semaine'] ?? 0);
        $animaux = !empty($body['animaux_biens']) ? 1 : 0;
        $photo = trim((string) ($body['photo_url'] ?? ''));
        $latitude  = isset($body['latitude'])  && is_numeric($body['latitude'])  ? (float) $body['latitude']  : null;
        $longitude = isset($body['longitude']) && is_numeric($body['longitude']) ? (float) $body['longitude'] : null;

        if ($designation === '' || $rue === '') {
            jsonError('Nom du bien et adresse requis');
        }
        if ($superficie <= 0 || $nbCouchage <= 0) {
            jsonError('Superficie et couchages doivent être supérieurs à 0');
        }
        if ($idTypeBien <= 0 || $idCommune <= 0) {
            jsonError('Type de bien et commune requis');
        }
        if ($prixSemaine <= 0) {
            jsonError('Le prix à la semaine doit être supérieur à 0');
        }

        $typeCheck = $pdo->prepare('SELECT id_typebien FROM type_bien WHERE id_typebien = ?');
        $typeCheck->execute([$idTypeBien]);
        if (!$typeCheck->fetch()) jsonError('Type de bien invalide');

        $communeCheck = $pdo->prepare('SELECT id_commune FROM commune WHERE id_commune = ?');
        $communeCheck->execute([$idCommune]);
        if (!$communeCheck->fetch()) jsonError('Commune invalide');

        $pdo->beginTransaction();
        try {
            $pdo->prepare(
                'INSERT INTO biens (
                    designation_bien, rue_biens, complement_biens, superficie_biens,
                    description_biens, animaux_biens, nb_couchage, id_TypeBien,
                    id_commune, id_locataire, statut_validation, latitude, longitude
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "en_attente", ?, ?)'
            )->execute([
                $designation,
                $rue,
                $complement !== '' ? $complement : null,
                $superficie,
                $description !== '' ? $description : null,
                $animaux,
                $nbCouchage,
                $idTypeBien,
                $idCommune,
                $ownerId,
                $latitude,
                $longitude,
            ]);

            $bienId = (int) $pdo->lastInsertId();

            $pdo->prepare(
                'INSERT INTO tarifs (id_biens, annee, id_saison, prix_semaine) VALUES (?, ?, NULL, ?)'
            )->execute([$bienId, (int) date('Y'), $prixSemaine]);

            if ($photo !== '') {
                $pdo->prepare('INSERT INTO photos (id_biens, lien_photo) VALUES (?, ?)')
                    ->execute([$bienId, $photo]);
            }

            $pdo->commit();
            jsonSuccess([
                'id_biens' => $bienId,
                'message' => 'Bien créé avec succès et envoyé en validation',
            ], 201);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $e;
        }
    }

    // ── GET /biens/types ──────────────────────────────────────────────────────
    if ($param1 === 'types') {
        $rows = $pdo->query(
            'SELECT id_typebien, desc_type_bien FROM type_bien ORDER BY desc_type_bien'
        )->fetchAll();
        jsonSuccess($rows);
    }

    // ── GET /biens/communes?q=... ────────────────────────────────────────────
    if ($param1 === 'communes') {
        $q = trim($_GET['q'] ?? '');
        if (strlen($q) < 1) jsonSuccess([]);

        $stmt = $pdo->prepare(
            "SELECT id_commune, ville_nom, ville_code_postal
             FROM commune
             WHERE ville_nom LIKE ? OR ville_code_postal LIKE ?
             ORDER BY ville_nom
             LIMIT 12"
        );
        $stmt->execute([$q . '%', $q . '%']);
        jsonSuccess($stmt->fetchAll());
    }

    // ── GET /biens/villes?q=... ───────────────────────────────────────────────
    if ($param1 === 'villes') {
        $q = trim($_GET['q'] ?? '');
        if (strlen($q) < 1) jsonSuccess([]);

        $stmt = $pdo->prepare(
            "SELECT DISTINCT c.ville_nom
             FROM commune c
             INNER JOIN biens b ON b.id_commune = c.id_commune
             WHERE c.ville_nom LIKE ? AND b.statut_validation = 'valide'
             ORDER BY c.ville_nom
             LIMIT 10"
        );
        $stmt->execute([$q . '%']);
        jsonSuccess(array_column($stmt->fetchAll(), 'ville_nom'));
    }

    // ── GET /biens/mine — biens du propriétaire connecté ─────────────────────
    if ($param1 === 'mine') {
        $payload = requireAuth();
        $ownerId = (int) ($payload['id_locataire'] ?? 0);
        if ($ownerId === 0) jsonError('Token invalide', 401);

        $stmt = $pdo->prepare("
            SELECT b.*, c.ville_nom, c.ville_code_postal, tb.desc_type_bien,
                   p_main.lien_photo     AS photo_principale,
                   t_min.prix_semaine_min
            FROM biens b
            LEFT JOIN commune c    ON b.id_commune  = c.id_commune
            LEFT JOIN type_bien tb ON b.id_TypeBien = tb.id_typebien
            LEFT JOIN (
                SELECT id_biens, MIN(prix_semaine) AS prix_semaine_min
                FROM tarifs
                GROUP BY id_biens
            ) t_min ON t_min.id_biens = b.id_biens
            LEFT JOIN (
                SELECT p.id_biens, p.lien_photo
                FROM photos p
                INNER JOIN (SELECT id_biens, MIN(id_photo) AS min_id FROM photos GROUP BY id_biens) pmin
                    ON p.id_biens = pmin.id_biens AND p.id_photo = pmin.min_id
            ) p_main ON p_main.id_biens = b.id_biens
            WHERE b.id_locataire = ?
            ORDER BY
              CASE b.statut_validation
                WHEN 'en_attente' THEN 1
                WHEN 'valide'     THEN 2
                WHEN 'refuse'     THEN 3
                ELSE 4
              END,
              b.id_biens DESC
        ");
        $stmt->execute([$ownerId]);
        jsonSuccess($stmt->fetchAll());
    }

    // ── GET|POST /biens/:id/blocages — blocages du propriétaire ─────────────
    if ($param1 !== null && ctype_digit((string) $param1) && $param2 === 'blocages' && $param3 === null) {
        $payload = requireAuth();
        $ownerId = (int) ($payload['id_locataire'] ?? 0);
        if ($ownerId === 0) jsonError('Token invalide', 401);

        $bienId = (int) $param1;
        requireOwnedBien($pdo, $bienId, $ownerId);

        if ($method === 'GET') {
            $stmt = $pdo->prepare(
                'SELECT id_blocage, id_biens, date_debut, date_fin, motif
                 FROM blocages
                 WHERE id_biens = ?
                 ORDER BY date_debut ASC'
            );
            $stmt->execute([$bienId]);
            jsonSuccess($stmt->fetchAll());
        }

        if ($method === 'POST') {
            $body = getJsonBody();
            $dateDebut = trim((string) ($body['date_debut'] ?? ''));
            $dateFin = trim((string) ($body['date_fin'] ?? ''));
            $motif = trim((string) ($body['motif'] ?? ''));

            if ($motif === '' || $dateDebut === '' || $dateFin === '') {
                jsonError('Motif, date_debut et date_fin requis');
            }

            $d1 = parseYmdDate($dateDebut);
            $d2 = parseYmdDate($dateFin);
            if (!$d1 || !$d2 || $d2 <= $d1) {
                jsonError('Dates invalides');
            }

            $reservationConflict = $pdo->prepare(
                'SELECT id_reservation FROM reservations
                 WHERE id_biens = ? AND date_debut < ? AND date_fin > ?
                 LIMIT 1'
            );
            $reservationConflict->execute([$bienId, $dateFin, $dateDebut]);
            if ($reservationConflict->fetch()) {
                jsonError('Un voyageur a déjà réservé sur cette période', 409);
            }

            $blocageConflict = $pdo->prepare(
                'SELECT id_blocage FROM blocages
                 WHERE id_biens = ? AND date_debut < ? AND date_fin > ?
                 LIMIT 1'
            );
            $blocageConflict->execute([$bienId, $dateFin, $dateDebut]);
            if ($blocageConflict->fetch()) {
                jsonError('Un blocage existe déjà sur cette période', 409);
            }

            $pdo->prepare(
                'INSERT INTO blocages (id_biens, date_debut, date_fin, motif) VALUES (?, ?, ?, ?)'
            )->execute([$bienId, $dateDebut, $dateFin, $motif]);

            jsonSuccess([
                'id_blocage' => (int) $pdo->lastInsertId(),
                'message' => 'Blocage ajouté avec succès',
            ], 201);
        }
    }

    // ── DELETE /biens/:id/blocages/:blocageId ────────────────────────────────
    if (
        $method === 'DELETE'
        && $param1 !== null && ctype_digit((string) $param1)
        && $param2 === 'blocages'
        && $param3 !== null && ctype_digit((string) $param3)
    ) {
        $payload = requireAuth();
        $ownerId = (int) ($payload['id_locataire'] ?? 0);
        if ($ownerId === 0) jsonError('Token invalide', 401);

        $bienId = (int) $param1;
        $blocageId = (int) $param3;
        requireOwnedBien($pdo, $bienId, $ownerId);

        $stmt = $pdo->prepare('DELETE FROM blocages WHERE id_blocage = ? AND id_biens = ?');
        $stmt->execute([$blocageId, $bienId]);
        if ($stmt->rowCount() === 0) jsonError('Blocage introuvable', 404);

        jsonSuccess(['message' => 'Blocage supprimé']);
    }

    // ── DELETE /biens/:id/photos/:photoId ────────────────────────────────────
    if (
        $method === 'DELETE'
        && $param1 !== null && ctype_digit((string) $param1)
        && $param2 === 'photos'
        && $param3 !== null && ctype_digit((string) $param3)
    ) {
        $payload = requireAuth();
        $ownerId = (int) ($payload['id_locataire'] ?? 0);
        if ($ownerId === 0) jsonError('Token invalide', 401);

        $bienId  = (int) $param1;
        $photoId = (int) $param3;
        requireOwnedBien($pdo, $bienId, $ownerId);

        $stmt = $pdo->prepare('DELETE FROM photos WHERE id_photo = ? AND id_biens = ?');
        $stmt->execute([$photoId, $bienId]);
        if ($stmt->rowCount() === 0) jsonError('Photo introuvable', 404);

        jsonSuccess(['message' => 'Photo supprimée']);
    }

    // ── PUT /biens/:id/photos/:photoId ─ mettre en avant ─────────────────────
    if (
        $method === 'PUT'
        && $param1 !== null && ctype_digit((string) $param1)
        && $param2 === 'photos'
        && $param3 !== null && ctype_digit((string) $param3)
    ) {
        $payload = requireAuth();
        $ownerId = (int) ($payload['id_locataire'] ?? 0);
        if ($ownerId === 0) jsonError('Token invalide', 401);

        $bienId  = (int) $param1;
        $photoId = (int) $param3;
        requireOwnedBien($pdo, $bienId, $ownerId);

        $pdo->beginTransaction();
        try {
            $pdo->prepare('UPDATE photos SET is_principal = 0 WHERE id_biens = ?')
                ->execute([$bienId]);
            
            $stmt = $pdo->prepare('UPDATE photos SET is_principal = 1 WHERE id_photo = ? AND id_biens = ?');
            $stmt->execute([$photoId, $bienId]);
            
            if ($stmt->rowCount() === 0) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                jsonError('Photo introuvable', 404);
            }
            
            $pdo->commit();
            jsonSuccess(['message' => 'Photo définie comme principale']);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $e;
        }
    }

    // ── GET /biens/count ──────────────────────────────────────────────────────
    if ($param1 === 'count') {
        ['whereSql' => $w, 'whereParams' => $wp, 'havingSql' => $h, 'havingParams' => $hp]
            = buildFilters($_GET);

        $stmt = $pdo->prepare("
            SELECT COUNT(*) AS total FROM (
                SELECT b.id_biens,
                       MAX(t_min.prix_semaine_min) AS prix_semaine_min
                FROM biens b
                LEFT JOIN commune c     ON b.id_commune  = c.id_commune
                LEFT JOIN type_bien tb  ON b.id_TypeBien = tb.id_typebien
                LEFT JOIN commentaires com
                       ON b.id_biens = com.id_biens AND com.statut = 'publie'
                LEFT JOIN (
                    SELECT id_biens, MIN(prix_semaine) AS prix_semaine_min
                    FROM tarifs
                    GROUP BY id_biens
                ) t_min ON t_min.id_biens = b.id_biens
                WHERE {$w}
                GROUP BY b.id_biens
                {$h}
            ) filtered
        ");
        $stmt->execute(array_merge($wp, $hp));
        jsonSuccess(['total' => (int) $stmt->fetchColumn()]);
    }

    // ── GET /biens/:id/disponibilites ─────────────────────────────────────────
    if ($param1 !== null && ctype_digit((string) $param1) && $param2 === 'disponibilites') {
        $id = (int) $param1;
        $check = $pdo->prepare("SELECT id_biens FROM biens WHERE id_biens = ? AND statut_validation = 'valide'");
        $check->execute([$id]);
        if (!$check->fetch()) jsonError('Bien introuvable', 404);

        // Tenter la table blocages (peut ne pas exister)
        $ranges = [];
        try {
            $stmt = $pdo->prepare("
                SELECT date_debut, date_fin, 'blocage' AS type FROM blocages WHERE id_biens = ?
                UNION ALL
                SELECT date_debut, date_fin, 'reservation' AS type FROM reservations WHERE id_biens = ?
                ORDER BY date_debut
            ");
            $stmt->execute([$id, $id]);
            $ranges = $stmt->fetchAll();
        } catch (PDOException $ignored) {
            $stmt = $pdo->prepare(
                "SELECT date_debut, date_fin, 'reservation' AS type FROM reservations WHERE id_biens = ? ORDER BY date_debut"
            );
            $stmt->execute([$id]);
            $ranges = $stmt->fetchAll();
        }
        jsonSuccess($ranges);
    }

    // ── GET /biens/:id/tarif?debut=YYYY-MM-DD&fin=YYYY-MM-DD ─────────────────
    if ($param1 !== null && ctype_digit((string) $param1) && $param2 === 'tarif') {
        $id    = (int) $param1;
        $debut = trim($_GET['debut'] ?? '');
        $fin   = trim($_GET['fin']   ?? '');

        if ($debut === '' || $fin === '') jsonError('Paramètres debut et fin requis');

        $d1 = DateTime::createFromFormat('Y-m-d', $debut);
        $d2 = DateTime::createFromFormat('Y-m-d', $fin);
        if (!$d1 || !$d2 || $d2 <= $d1) jsonError('Dates invalides ou date de fin antérieure à date de début');

        $nbNuits = (int) $d1->diff($d2)->days;

        // Chercher le tarif selon la saison (fallback sur le premier tarif dispo)
        $tarif = null;
        try {
            $stmt = $pdo->prepare("
                SELECT t.id_tarif, t.prix_semaine
                FROM tarifs t
                LEFT JOIN saison s ON t.id_saison = s.id_saison
                WHERE t.id_biens = ?
                  AND (s.id_saison IS NULL OR (s.date_debut <= ? AND s.date_fin >= ?))
                ORDER BY (s.id_saison IS NOT NULL) DESC
                LIMIT 1
            ");
            $stmt->execute([$id, $debut, $debut]);
            $tarif = $stmt->fetch();
        } catch (PDOException $ignored) {}

        if (!$tarif) {
            $fb = $pdo->prepare('SELECT id_tarif, prix_semaine FROM tarifs WHERE id_biens = ? LIMIT 1');
            $fb->execute([$id]);
            $tarif = $fb->fetch();
        }
        if (!$tarif) jsonError('Aucun tarif disponible pour ce bien', 404);

        $prixSemaine = (float) $tarif['prix_semaine'];
        $semaines    = (int) floor($nbNuits / 7);
        $nuitsExtra  = $nbNuits % 7;
        $prixNuit    = round($prixSemaine / 7, 2);
        $total       = round($semaines * $prixSemaine + $nuitsExtra * $prixNuit, 2);

        jsonSuccess([
            'id_tarif'     => (int) $tarif['id_tarif'],
            'prix_semaine' => $prixSemaine,
            'nb_nuits'     => $nbNuits,
            'semaines'     => $semaines,
            'nuits_extra'  => $nuitsExtra,
            'prix_nuit'    => $prixNuit,
            'total'        => $total,
        ]);
    }

    // ── GET|POST /biens/:id/photos — galerie propriétaire ──────────────────
    if ($param1 !== null && ctype_digit((string) $param1) && $param2 === 'photos' && $param3 === null) {
        $payload = requireAuth();
        $ownerId = (int) ($payload['id_locataire'] ?? 0);
        if ($ownerId === 0) jsonError('Token invalide', 401);

        $bienId = (int) $param1;
        requireOwnedBien($pdo, $bienId, $ownerId);

        if ($method === 'GET') {
            $stmt = $pdo->prepare(
                'SELECT id_photo, lien_photo FROM photos WHERE id_biens = ? ORDER BY id_photo ASC'
            );
            $stmt->execute([$bienId]);
            jsonSuccess($stmt->fetchAll());
        }

        if ($method === 'POST') {
            $body      = getJsonBody();
            $lienPhoto = trim((string) ($body['lien_photo'] ?? ''));
            if ($lienPhoto === '') jsonError('lien_photo requis');

            $pdo->prepare('INSERT INTO photos (id_biens, lien_photo) VALUES (?, ?)')
                ->execute([$bienId, $lienPhoto]);

            jsonSuccess(['id_photo' => (int) $pdo->lastInsertId(), 'message' => 'Photo ajoutée'], 201);
        }
    }

    // ── PUT /biens/:id — modifier un bien propriétaire ───────────────────────
    if ($method === 'PUT' && $param1 !== null && ctype_digit((string) $param1) && $param2 === null) {
        $payload = requireAuth();
        $ownerId = (int) ($payload['id_locataire'] ?? 0);
        if ($ownerId === 0) jsonError('Token invalide', 401);

        $bienId = (int) $param1;
        requireOwnedBien($pdo, $bienId, $ownerId);

        $body        = getJsonBody();
        $designation = trim((string) ($body['designation_bien'] ?? ''));
        $rue         = trim((string) ($body['rue_biens'] ?? ''));
        $complement  = trim((string) ($body['complement_biens'] ?? ''));
        $description = trim((string) ($body['description_biens'] ?? ''));
        $superficie  = (int) ($body['superficie_biens'] ?? 0);
        $nbCouchage  = (int) ($body['nb_couchage'] ?? 0);
        $idTypeBien  = (int) ($body['id_TypeBien'] ?? 0);
        $idCommune   = (int) ($body['id_commune'] ?? 0);
        $prixSemaine = (float) ($body['prix_semaine'] ?? 0);
        $animaux     = !empty($body['animaux_biens']) ? 1 : 0;

        if ($designation === '' || $rue === '') jsonError('Nom du bien et adresse requis');
        if ($superficie <= 0 || $nbCouchage <= 0) jsonError('Superficie et couchages doivent être supérieurs à 0');
        if ($idTypeBien <= 0 || $idCommune <= 0) jsonError('Type de bien et commune requis');
        if ($prixSemaine <= 0) jsonError('Le prix à la semaine doit être supérieur à 0');

        $pdo->beginTransaction();
        try {
            $pdo->prepare(
                'UPDATE biens SET designation_bien = ?, rue_biens = ?, complement_biens = ?,
                 superficie_biens = ?, description_biens = ?, animaux_biens = ?,
                 nb_couchage = ?, id_TypeBien = ?, id_commune = ?
                 WHERE id_biens = ?'
            )->execute([
                $designation,
                $rue,
                $complement !== '' ? $complement : null,
                $superficie,
                $description !== '' ? $description : null,
                $animaux,
                $nbCouchage,
                $idTypeBien,
                $idCommune,
                $bienId,
            ]);

            $tarifRow = $pdo->prepare(
                'SELECT id_tarif FROM tarifs WHERE id_biens = ? AND id_saison IS NULL LIMIT 1'
            );
            $tarifRow->execute([$bienId]);
            if ($tarifRow->fetch()) {
                $pdo->prepare('UPDATE tarifs SET prix_semaine = ? WHERE id_biens = ? AND id_saison IS NULL')
                    ->execute([$prixSemaine, $bienId]);
            } else {
                $pdo->prepare(
                    'INSERT INTO tarifs (id_biens, annee, id_saison, prix_semaine) VALUES (?, ?, NULL, ?)'
                )->execute([$bienId, (int) date('Y'), $prixSemaine]);
            }

            $pdo->commit();
            jsonSuccess(['message' => 'Bien modifié avec succès']);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $e;
        }
    }

    // ── DELETE /biens/:id — supprimer un bien (propriétaire uniquement) ────────
    if ($method === 'DELETE' && $param1 !== null && ctype_digit((string) $param1) && $param2 === null) {
        $payload = requireAuth();
        $ownerId = (int) ($payload['id_locataire'] ?? 0);
        if ($ownerId === 0) jsonError('Token invalide', 401);

        $bienId = (int) $param1;
        requireOwnedBien($pdo, $bienId, $ownerId);

        $pdo->beginTransaction();
        try {
            $pdo->prepare('DELETE FROM commentaires WHERE id_biens = ?')->execute([$bienId]);
            $pdo->prepare('DELETE FROM favoris WHERE id_biens = ?')->execute([$bienId]);
            $pdo->prepare('DELETE FROM blocages WHERE id_biens = ?')->execute([$bienId]);
            $pdo->prepare('DELETE FROM reservations WHERE id_biens = ?')->execute([$bienId]);
            $pdo->prepare('DELETE FROM tarifs WHERE id_biens = ?')->execute([$bienId]);
            $pdo->prepare('DELETE FROM photos WHERE id_biens = ?')->execute([$bienId]);
            $pdo->prepare('DELETE FROM biens WHERE id_biens = ?')->execute([$bienId]);
            $pdo->commit();
            jsonSuccess(['message' => 'Bien supprimé avec succès']);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $e;
        }
    }

    // ── GET /biens/:id/reservations — réservations d'un bien (propriétaire) ──
    if (
        $method === 'GET'
        && $param1 !== null && ctype_digit((string) $param1)
        && $param2 === 'reservations'
        && $param3 === null
    ) {
        $payload = requireAuth();
        $ownerId = (int) ($payload['id_locataire'] ?? 0);
        if ($ownerId === 0) jsonError('Token invalide', 401);

        $bienId = (int) $param1;
        requireOwnedBien($pdo, $bienId, $ownerId);

        $stmt = $pdo->prepare("
            SELECT r.*,
                   l.nom_locataire, l.prenom_locataire, l.email_locataire, l.tel_locataire,
                   t.prix_semaine,
                   DATEDIFF(r.date_fin, r.date_debut) AS nb_nuits
            FROM reservations r
            LEFT JOIN locataire l ON r.id_locataire = l.id_locataire
            LEFT JOIN tarifs t    ON r.id_tarif     = t.id_tarif
            WHERE r.id_biens = ?
            ORDER BY r.date_debut ASC
        ");
        $stmt->execute([$bienId]);
        jsonSuccess($stmt->fetchAll());
    }

    // ── GET /biens/:id ────────────────────────────────────────────────────────
    if ($param1 !== null && ctype_digit((string) $param1)) {
        $id   = (int) $param1;
        $stmt = $pdo->prepare("
            SELECT b.*, c.ville_nom, c.ville_code_postal,
                   COALESCE(b.latitude,  c.ville_latitude_deg)  AS ville_latitude_deg,
                   COALESCE(b.longitude, c.ville_longitude_deg) AS ville_longitude_deg,
                   tb.desc_type_bien,
                   COALESCE(AVG(com.note), 0)  AS note_moyenne,
                   COUNT(com.id_commentaire)    AS nb_avis,
                   (SELECT MIN(t.prix_semaine) FROM tarifs t
                    WHERE t.id_biens = b.id_biens)  AS prix_semaine_min
            FROM biens b
            LEFT JOIN commune c     ON b.id_commune  = c.id_commune
            LEFT JOIN type_bien tb  ON b.id_TypeBien = tb.id_typebien
            LEFT JOIN commentaires com
                   ON b.id_biens = com.id_biens AND com.statut = 'publie'
            WHERE b.id_biens = ? AND b.statut_validation = 'valide'
            GROUP BY b.id_biens
        ");
        $stmt->execute([$id]);
        $bien = $stmt->fetch();
        if (!$bien) jsonError('Bien introuvable', 404);

        $photos = $pdo->prepare('SELECT lien_photo FROM photos WHERE id_biens = ?');
        $photos->execute([$id]);
        $bien['photos'] = array_column($photos->fetchAll(), 'lien_photo');

        jsonSuccess($bien);
    }

    // ── GET /biens ────────────────────────────────────────────────────────────
    $page   = max(1, (int) ($_GET['page']  ?? 1));
    $limit  = min(50, max(1, (int) ($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;
    $sort   = (string) ($_GET['sort'] ?? 'relevance');

    ['whereSql' => $w, 'whereParams' => $wp, 'havingSql' => $h, 'havingParams' => $hp]
        = buildFilters($_GET);

    $stmt = $pdo->prepare("
        SELECT b.*, c.ville_nom, c.ville_code_postal,
               COALESCE(b.latitude,  c.ville_latitude_deg)  AS ville_latitude_deg,
               COALESCE(b.longitude, c.ville_longitude_deg) AS ville_longitude_deg,
               tb.desc_type_bien,
               COALESCE(AVG(com.note), 0)      AS note_moyenne,
               COUNT(com.id_commentaire)       AS nb_avis,
               MAX(p_main.lien_photo)          AS photo_principale,
               MAX(t_min.prix_semaine_min)     AS prix_semaine_min
        FROM biens b
        LEFT JOIN commune c     ON b.id_commune  = c.id_commune
        LEFT JOIN type_bien tb  ON b.id_TypeBien = tb.id_typebien
        LEFT JOIN commentaires com
               ON b.id_biens = com.id_biens AND com.statut = 'publie'
        LEFT JOIN (
            SELECT id_biens, MIN(prix_semaine) AS prix_semaine_min
            FROM tarifs
            GROUP BY id_biens
        ) t_min ON t_min.id_biens = b.id_biens
        LEFT JOIN (
            SELECT p.id_biens, p.lien_photo
            FROM photos p
            INNER JOIN (SELECT id_biens, MIN(id_photo) AS min_id FROM photos GROUP BY id_biens) pmin
                ON p.id_biens = pmin.id_biens AND p.id_photo = pmin.min_id
        ) p_main ON p_main.id_biens = b.id_biens
        WHERE {$w}
        GROUP BY b.id_biens
        {$h}
        ORDER BY " . getSortSql($sort) . "
        LIMIT ? OFFSET ?
    ");
    $stmt->execute(array_merge($wp, $hp, [$limit, $offset]));
    jsonSuccess($stmt->fetchAll());

} catch (PDOException $e) {
    jsonError('Erreur base de données', 500);
}
