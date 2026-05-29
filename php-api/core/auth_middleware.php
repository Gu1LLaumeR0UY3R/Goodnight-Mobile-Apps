<?php
// goodnight/api/core/auth_middleware.php
// Vérifie le token JWT dans le header Authorization
// Rôle: bloquer l'accès aux routes protégées si le Bearer token est absent ou invalide.

require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/helpers.php';

function requireAuth(): array {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? '';

    if ($authHeader === '' && function_exists('getallheaders')) {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

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
