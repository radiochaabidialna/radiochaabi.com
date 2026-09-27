<?php
/**
 * API — GLOSSAIRE du chaâbi
 * ---------------------------------------------------------------
 * GET /poemes/api/glossaire.php          -> tous les termes
 * GET /poemes/api/glossaire.php?q=istikh -> recherche
 *   -> { ok, total, items:[{mot, explication}] }
 */
declare(strict_types=1);

require __DIR__ . '/_db.php';

try {
    $q  = qstr('q', null, 60);
    $all = glossaire();
    ksort($all);

    $items = [];
    foreach ($all as $mot => $expl) {
        if ($q !== null && mb_stripos($mot, $q) === false && mb_stripos($expl, $q) === false) continue;
        $items[] = ['mot' => $mot, 'explication' => $expl];
    }

    json_out(['ok' => true, 'total' => count($items), 'items' => $items]);
} catch (Throwable $e) {
        error_log('[' . basename(__FILE__) . '] ' . $e->getMessage());
    fail('Erreur serveur lors de la lecture du glossaire.', 500, ['error' => 'Erreur interne — réessayez dans un instant.']);
}
