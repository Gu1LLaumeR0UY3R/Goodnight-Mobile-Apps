<?php
// Routeur dédié au serveur PHP intégré.
// Sert les fichiers statiques existants, sinon délègue à index.php.
// Rôle: distribuer les requêtes vers le contrôleur frontal de l'API.

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$path = __DIR__ . $uri;

if ($uri !== '/' && is_file($path)) {
    return false;
}

require __DIR__ . '/index.php';
