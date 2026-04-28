<?php
// php-api/routes/reservations.php
// GET  /reservations  — liste des réservations de l'utilisateur (authentifié)
// POST /reservations  — créer une réservation (authentifié)

$payload = requireAuth();
$userId  = (int) $payload['id_locataire'];

try {
    $pdo = Database::getInstance();
    $hasStatutColumn = false;
    try {
        $colCheck = $pdo->query("SHOW COLUMNS FROM reservations LIKE 'statut'");
        $hasStatutColumn = (bool) $colCheck->fetch();
    } catch (PDOException $ignored) {}

    // ── GET /reservations — liste des réservations de l'utilisateur authentifié
    if ($method === 'GET' && $param1 === null) {
        $whereStatut = $hasStatutColumn ? " AND (r.statut IS NULL OR r.statut <> 'annulee')" : '';
        $stmt = $pdo->prepare("
            SELECT r.*,
                   b.designation_bien,
                   b.id_locataire AS id_proprio,
                   c.ville_nom,
                   t.prix_semaine,
                   (SELECT pb.lien_photo FROM photos pb
                    WHERE pb.id_biens = b.id_biens LIMIT 1) AS photo_principale
            FROM reservations r
            JOIN biens b       ON r.id_biens  = b.id_biens
            LEFT JOIN commune c  ON b.id_commune = c.id_commune
            LEFT JOIN tarifs t   ON r.id_tarif   = t.id_tarif
            WHERE r.id_locataire = ?{$whereStatut}
            ORDER BY r.date_debut DESC
        ");
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll();

        // Calculer montant_total à partir du tarif et des dates
        foreach ($rows as &$row) {
            $d1 = DateTime::createFromFormat('Y-m-d', substr($row['date_debut'], 0, 10));
            $d2 = DateTime::createFromFormat('Y-m-d', substr($row['date_fin'],   0, 10));
            if ($d1 && $d2 && $d2 > $d1) {
                $nbNuits   = (int) $d1->diff($d2)->days;
                $prix      = (float) ($row['prix_semaine'] ?? 0);
                $semaines  = (int) floor($nbNuits / 7);
                $extra     = $nbNuits % 7;
                $prixNuit  = round($prix / 7, 2);
                $row['montant_total'] = round($semaines * $prix + $extra * $prixNuit, 2);
                $row['nb_nuits']      = $nbNuits;
            } else {
                $row['montant_total'] = null;
                $row['nb_nuits']      = null;
            }
        }
        unset($row);
        jsonSuccess($rows);
    }

    // ── POST /reservations ────────────────────────────────────────────────────
    if ($method === 'POST') {
        $body       = getJsonBody();
        $id_biens   = (int) ($body['id_biens']   ?? 0);
        $date_debut = trim($body['date_debut'] ?? '');
        $date_fin   = trim($body['date_fin']   ?? '');
        $id_tarif   = (int) ($body['id_tarif']   ?? 0);

        if ($id_biens === 0 || $date_debut === '' || $date_fin === '' || $id_tarif === 0) {
            jsonError('Données manquantes (id_biens, date_debut, date_fin, id_tarif requis)');
        }

        // Validation des dates
        $d1 = DateTime::createFromFormat('Y-m-d', $date_debut);
        $d2 = DateTime::createFromFormat('Y-m-d', $date_fin);
        if (!$d1 || !$d2 || $d2 <= $d1) jsonError('Dates invalides');

        // Vérifier que le bien existe et est validé
        $bienStmt = $pdo->prepare(
            "SELECT id_locataire, designation_bien FROM biens WHERE id_biens = ? AND statut_validation = 'valide'"
        );
        $bienStmt->execute([$id_biens]);
        $bien = $bienStmt->fetch();
        if (!$bien) jsonError('Bien introuvable ou non disponible', 404);

        // Le propriétaire ne peut pas réserver son propre bien
        if ((int) $bien['id_locataire'] === $userId) {
            jsonError('Vous ne pouvez pas réserver votre propre bien', 403);
        }

        // Vérifier les conflits de réservation (overlap)
        $conflictSql = "
            SELECT id_reservation FROM reservations
            WHERE id_biens = ? AND date_debut < ? AND date_fin > ?";
        if ($hasStatutColumn) {
            $conflictSql .= " AND (statut IS NULL OR statut <> 'annulee')";
        }
        $conflict = $pdo->prepare($conflictSql);
        $conflict->execute([$id_biens, $date_fin, $date_debut]);
        if ($conflict->fetch()) jsonError('Ces dates sont déjà réservées', 409);

        // Vérifier les blocages propriétaire
        try {
            $blocage = $pdo->prepare("
                SELECT id_blocage FROM blocages
                WHERE id_biens = ? AND date_debut < ? AND date_fin > ?
            ");
            $blocage->execute([$id_biens, $date_fin, $date_debut]);
            if ($blocage->fetch()) jsonError('Ces dates sont bloquées par le propriétaire', 409);
        } catch (PDOException $ignored) {}

        // Insérer la réservation
        $pdo->prepare(
            'INSERT INTO reservations (id_locataire, id_biens, date_debut, date_fin, id_tarif)
             VALUES (?, ?, ?, ?, ?)'
        )->execute([$userId, $id_biens, $date_debut, $date_fin, $id_tarif]);
        $newId = (int) $pdo->lastInsertId();

        // Notifier le propriétaire du bien
        if (!empty($bien['id_locataire'])) {
            try {
                $msg = "Nouvelle réservation pour \"" . $bien['designation_bien'] . "\" du $date_debut au $date_fin.";
                $pdo->prepare(
                    "INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'reservation', 'Nouvelle réservation', ?)"
                )->execute([$bien['id_locataire'], $msg]);
            } catch (PDOException $ignored) {}
        }

        jsonSuccess(['id_reservation' => $newId], 201);
    }

    // ── DELETE /reservations/:id — annuler une réservation (locataire ou propriétaire)
    if ($method === 'DELETE' && $param1 !== null && ctype_digit((string) $param1)) {
        $id_reservation = (int) $param1;

        // Récupérer la réservation
        $stmt = $pdo->prepare("
            SELECT r.*, b.designation_bien, b.id_locataire AS id_proprio
            FROM reservations r
            JOIN biens b ON r.id_biens = b.id_biens
            WHERE r.id_reservation = ?
        ");
        $stmt->execute([$id_reservation]);
        $res = $stmt->fetch();

        if (!$res) {
            jsonError('Réservation introuvable', 404);
        }

        // Vérifier que l'utilisateur est soit le locataire soit le propriétaire
        $canCancel = ($userId === (int) $res['id_locataire'] || $userId === (int) $res['id_proprio']);
        if (!$canCancel) {
            jsonError('Accès refusé', 403);
        }

        if ($hasStatutColumn && isset($res['statut']) && $res['statut'] === 'annulee') {
            jsonError('Réservation déjà annulée', 409);
        }

        // Soft delete (si colonne disponible), sinon hard delete.
        if ($hasStatutColumn) {
            $pdo->prepare(
                "UPDATE reservations SET statut = 'annulee' WHERE id_reservation = ?"
            )->execute([$id_reservation]);
        } else {
            $pdo->prepare(
                "DELETE FROM reservations WHERE id_reservation = ?"
            )->execute([$id_reservation]);
        }

        // Notifier le locataire (confirmation annulation)
        try {
            $msgLocataire = "Votre réservation pour \"" . $res['designation_bien'] . "\" du " . $res['date_debut'] . " au " . $res['date_fin'] . " a été annulée.";
            $pdo->prepare(
                "INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'reservation_cancellation', 'Réservation annulée', ?)"
            )->execute([$res['id_locataire'], $msgLocataire]);
        } catch (PDOException $ignored) {}

        // Notifier le propriétaire (réservation annulée)
        try {
            if (!empty($res['id_proprio'])) {
                $msgProprio = "La réservation pour \"" . $res['designation_bien'] . "\" du " . $res['date_debut'] . " au " . $res['date_fin'] . " a été annulée.";
                $pdo->prepare(
                    "INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'reservation_cancellation', 'Réservation annulée', ?)"
                )->execute([$res['id_proprio'], $msgProprio]);
            }
        } catch (PDOException $ignored) {}

        jsonSuccess(['message' => 'Réservation annulée'], 200);
    }

    jsonError('Route introuvable', 404);

} catch (PDOException $e) {
    jsonError('Erreur base de données', 500);
}
