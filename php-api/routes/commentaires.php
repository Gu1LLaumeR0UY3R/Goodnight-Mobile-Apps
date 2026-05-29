<?php
// php-api/routes/commentaires.php
// GET  /commentaires/:id_biens  — liste des avis publiés d'un bien
// POST /commentaires            — poster un avis (authentifié)
// Rôle: contrôleur métier des commentaires et avis publics.
/** @var string      $method */
/** @var string|null $param1 */
/** @var string|null $param2 */
/** @var string|null $param3 */

try {
    $pdo = Database::getInstance();

    // ── GET /commentaires/:id_biens ───────────────────────────────────────────
    if ($method === 'GET' && $param1 !== null && ctype_digit((string) $param1)) {
        $stmt = $pdo->prepare("
            SELECT c.*,
                   l.prenom_locataire AS auteur_prenom,
                   (SELECT COUNT(*) FROM commentaire_likes lk
                    WHERE lk.id_commentaire = c.id_commentaire) AS nb_likes
            FROM commentaires c
            JOIN locataire l ON c.id_locataire = l.id_locataire
            WHERE c.id_biens = ? AND c.statut = 'publie'
            ORDER BY c.date_creation DESC
        ");
        $stmt->execute([(int) $param1]);
        jsonSuccess($stmt->fetchAll());
    }

    // ── POST /commentaires ────────────────────────────────────────────────────
    if ($method === 'POST' && $param1 === null) {
        $payload  = requireAuth();
        $body     = getJsonBody();
        $id_biens = (int) ($body['id_biens'] ?? 0);
        $contenu  = trim($body['contenu'] ?? '');
        $note     = (isset($body['note']) && is_numeric($body['note']))
                     ? (float) $body['note'] : null;
        $titre    = (isset($body['titre']) && $body['titre'] !== '')
                     ? $body['titre'] : null;

        if ($id_biens === 0 || $contenu === '') {
            jsonError('Bien et contenu requis');
        }

        $check = $pdo->prepare(
            'SELECT id_commentaire FROM commentaires
             WHERE id_locataire = ? AND id_biens = ?'
        );
        $check->execute([(int) $payload['id_locataire'], $id_biens]);
        if ($check->fetch()) {
            jsonError('Vous avez déjà commenté ce bien', 409);
        }

        $pdo->prepare(
            "INSERT INTO commentaires
             (id_biens, id_locataire, note, titre, contenu, date_creation, statut)
             VALUES (?, ?, ?, ?, ?, NOW(), 'publie')"
        )->execute([$id_biens, (int) $payload['id_locataire'], $note, $titre, $contenu]);

        jsonSuccess(['id_commentaire' => (int) $pdo->lastInsertId()]);
    }

    jsonError('Route introuvable', 404);

} catch (PDOException $e) {
    jsonError('Erreur base de données', 500);
}
