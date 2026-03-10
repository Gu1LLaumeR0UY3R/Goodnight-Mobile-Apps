<?php
// goodnight/api/core/auth_middleware.php
// Vérifie le token JWT dans le header Authorization

require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/helpers.php';

function requireAuth(): array {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!str_starts_with($authHeader, 'Bearer ')) {
        jsonError('Token manquant', 401);
    }
    $token   = substr($authHeader, 7);
    $payload = JWT::decode($token);
    if ($payload === null) {
        jsonError('Token invalide ou expiré', 401);
    }
    return $payload;
}
