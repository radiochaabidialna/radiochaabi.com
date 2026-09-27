<?php
/**
 * En-tête commun aux points d'API du module (JSON).
 * Toute la logique est dans ../_core.php
 */
declare(strict_types=1);


/* Fichier interne : appelé directement, il répond 404 au lieu de s'exécuter. */
if (isset($_SERVER['SCRIPT_FILENAME'])
    && realpath((string) $_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    exit('Not found');
}

require_once dirname(__DIR__) . '/_core.php';

json_headers();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
