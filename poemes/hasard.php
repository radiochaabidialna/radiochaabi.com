<?php
/**
 * PAGE — « Un poème au hasard » : redirige vers une qacidate tirée au sort.
 * URL : /poemes/hasard   (aucun JavaScript requis)
 */
declare(strict_types=1);
require_once __DIR__ . '/_core.php';

try {
    $slug = db()->query(
        "SELECT `slug` FROM `qacidates`
          WHERE `is_deleted` = 0 AND `status` = 'published'
       ORDER BY RAND() LIMIT 1"
    )->fetchColumn();
} catch (Throwable $e) {
    $slug = null;
}

header('Cache-Control: no-store, no-cache, must-revalidate');
header('Location: ' . page_url($slug ? 'q/' . rawurlencode((string) $slug) : ''), true, 302);
exit;
