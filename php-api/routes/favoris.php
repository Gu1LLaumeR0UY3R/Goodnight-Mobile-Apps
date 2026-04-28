<?php
// php-api/routes/favoris.php
// GET    /favoris        — liste des favoris (authentifié)
// POST   /favoris        — ajouter un favori (authentifié)
// DELETE /favoris/:id    — supprimer un favori (authentifié)

$payload = requireAuth();
$userId  = (int) $payload['id_locataire'];

try {
    $pdo = Database::getInstance();

    // ── GET /favoris ──────────────────────────────────────────────────────────
    if ($method === 'GET') {
        $stmt = $pdo->prepare("
            SELECT f.*, b.designation_bien, b.rue_biens, c.ville_nom,
                   (SELECT pb.lien_photo FROM photos pb
                    WHERE pb.id_biens = b.id_biens LIMIT 1) AS photo_principale
            FROM favoris f
            JOIN biens b      ON f.id_biens    = b.id_biens
            LEFT JOIN commune c ON b.id_commune = c.id_commune
            WHERE f.id_locataire = ? AND b.statut_validation = 'valide'
            ORDER BY f.date_ajout DESC
        ");
        $stmt->execute([$userId]);
        jsonSuccess($stmt->fetchAll());
    }

    // ── POST /favoris ─────────────────────────────────────────────────────────
    if ($method === 'POST') {
        $id_biens = (int) (getJsonBody()['id_biens'] ?? 0);
        if ($id_biens === 0) jsonError('ID du bien requis');

        $check = $pdo->prepare(
            'SELECT id_favori FROM favoris WHERE id_locataire = ? AND id_biens = ?'
        );
        $check->execute([$userId, $id_biens]);
        if ($check->fetch()) jsonError('Déjà en favori', 409);

        $pdo->prepare(
            'INSERT INTO favoris (id_locataire, id_biens, date_ajout) VALUES (?, ?, NOW())'
        )->execute([$userId, $id_biens]);

        jsonSuccess(['message' => 'Ajouté aux favoris']);
    }

    // ── DELETE /favoris/:id_biens ─────────────────────────────────────────────
    if ($method === 'DELETE' && $param1 !== null && ctype_digit((string) $param1)) {
        $stmt = $pdo->prepare(
            'DELETE FROM favoris WHERE id_biens = ? AND id_locataire = ?'
        );
        $stmt->execute([(int) $param1, $userId]);
        if ($stmt->rowCount() === 0) jsonError('Favori introuvable', 404);
        jsonSuccess(['message' => 'Retiré des favoris']);
    }

    jsonError('Route introuvable', 404);

} catch (PDOException $e) {
    jsonError('Erreur base de données', 500);
}
