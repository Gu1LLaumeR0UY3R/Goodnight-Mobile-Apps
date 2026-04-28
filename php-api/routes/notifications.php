<?php
// php-api/routes/notifications.php
// GET /notifications        — liste des notifications utilisateur
// PUT /notifications/:id    — marquer une notification comme lue

$payload = requireAuth();
$userId  = (int) $payload['id_locataire'];

try {
    $pdo = Database::getInstance();

    if ($method === 'GET' && $param1 === null) {
        $stmt = $pdo->prepare(
            'SELECT id_notification, user_id, type, title, message, link, is_read, created_at
             FROM notifications
             WHERE user_id = ?
             ORDER BY created_at DESC, id_notification DESC'
        );
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$row) {
            $row['is_read'] = (bool) ($row['is_read'] ?? false);
        }
        unset($row);

        jsonSuccess($rows);
    }

    if ($method === 'PUT' && $param1 !== null && ctype_digit((string) $param1)) {
        $id = (int) $param1;
        $body = getJsonBody();
        $isRead = array_key_exists('is_read', $body) ? (bool) $body['is_read'] : true;

        $stmt = $pdo->prepare(
            'UPDATE notifications
             SET is_read = ?
             WHERE id_notification = ? AND user_id = ?'
        );
        $stmt->execute([$isRead ? 1 : 0, $id, $userId]);

        if ($stmt->rowCount() === 0) {
            $exists = $pdo->prepare(
                'SELECT id_notification FROM notifications WHERE id_notification = ? AND user_id = ? LIMIT 1'
            );
            $exists->execute([$id, $userId]);
            if (!$exists->fetch()) {
                jsonError('Notification introuvable', 404);
            }
        }

        jsonSuccess(['message' => 'Notification mise à jour']);
    }

    jsonError('Route introuvable', 404);

} catch (PDOException $e) {
    jsonError('Erreur base de données', 500);
}