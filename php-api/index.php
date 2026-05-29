<?php
// php-api/index.php — Routeur frontal de l'API Goodnight (PHP 8 + PDO)
// Ce fichier reçoit toutes les requêtes API, les découpe par ressource,
// puis délègue aux routes métier. C'est le point d'entrée du contrôleur backend.
// Rôle: contrôleur frontal (front controller) de toute l'API.
//
// ─── Configuration Apache requise (C:\xampp\apache\conf\httpd.conf) ──────────
//   Alias /api "C:/Users/er1go/Projets React/Goodnight/php-api"
//   <Directory "C:/Users/er1go/Projets React/Goodnight/php-api">
//       AllowOverride All
//       Require all granted
//   </Directory>
// ─────────────────────────────────────────────────────────────────────────────
// Redémarrer Apache (XAMPP Control Panel → Apache → Stop / Start) après modification.
// L'API sera accessible sur : http://localhost/api/
// ─────────────────────────────────────────────────────────────────────────────

require_once __DIR__ . '/core/helpers.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/core/jwt.php';
require_once __DIR__ . '/core/auth_middleware.php';

sendCorsHeaders();

// Extraire le chemin API de façon robuste, même si le serveur PHP
// renseigne SCRIPT_NAME sur une pseudo-route (ex: /auth/login).
$rawPath = trim((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');

// Compat: /index.php/auth/login
if ($rawPath === 'index.php') {
    $rawPath = '';
} elseif (str_starts_with($rawPath, 'index.php/')) {
    $rawPath = substr($rawPath, strlen('index.php/'));
}

// Si index.php est servi depuis un sous-dossier (ex: /api/index.php),
// retirer le préfixe /api uniquement quand SCRIPT_NAME pointe bien index.php.
$scriptName = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
if (str_ends_with($scriptName, '/index.php')) {
    $baseDir = trim(dirname($scriptName), '/');
    if ($baseDir !== '' && str_starts_with($rawPath, $baseDir . '/')) {
        $rawPath = substr($rawPath, strlen($baseDir) + 1);
    }
}

$path = trim($rawPath, '/');
$segments  = ($path !== '') ? explode('/', $path) : [];

$resource = $segments[0] ?? '';
$param1   = $segments[1] ?? null;   // ex : id, "types", "login", "me" …
$param2   = $segments[2] ?? null;
$param3   = $segments[3] ?? null;
$method   = $_SERVER['REQUEST_METHOD'];

switch ($resource) {
    case 'auth':         require __DIR__ . '/routes/auth.php';         break;
    case 'biens':        require __DIR__ . '/routes/biens.php';        break;
    case 'commentaires': require __DIR__ . '/routes/commentaires.php'; break;
    case 'favoris':      require __DIR__ . '/routes/favoris.php';      break;
    case 'notifications':require __DIR__ . '/routes/notifications.php'; break;
    case 'reservations': require __DIR__ . '/routes/reservations.php'; break;
    case 'ping':
        try {
            $row = Database::getInstance()->query('SELECT 1+1 AS r')->fetch();
            jsonSuccess(['message' => 'BDD OK', 'result' => (int) $row['r']]);
        } catch (Exception $e) {
            jsonError('BDD inaccessible : ' . $e->getMessage(), 500);
        }
        break;
    default:
        jsonError('Route introuvable', 404);
}
