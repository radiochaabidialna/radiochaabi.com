<?php
/**
 * API recherche qacidates — barre globale site principal
 * GET /poemes/api/search.php?q=...&limit=8
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');

try {
    /* _core peut être parent ou via _db */
    if (is_file(__DIR__ . '/_db.php')) {
        require_once __DIR__ . '/_db.php';
    } elseif (is_file(dirname(__DIR__) . '/_core.php')) {
        require_once dirname(__DIR__) . '/_core.php';
    } else {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'core missing']);
        exit;
    }

    $q = isset($_GET['q']) ? trim((string) $_GET['q']) : '';
    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 8;
    if ($limit < 1) $limit = 1;
    if ($limit > 24) $limit = 24;

    if ($q === '' || mb_strlen($q) < 2) {
        echo json_encode(['ok' => true, 'items' => [], 'total' => 0], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (!function_exists('get_liste')) {
        echo json_encode(['ok' => true, 'items' => [], 'total' => 0, 'warn' => 'get_liste missing'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $rows = get_liste(['q' => $q, 'sort' => 'vues']);
    if (!is_array($rows)) $rows = [];
    $total = count($rows);
    $rows = array_slice($rows, 0, $limit);

    $items = [];
    foreach ($rows as $r) {
        if (!is_array($r)) continue;
        $slug = (string) ($r['slug'] ?? '');
        $url = function_exists('page_url')
            ? page_url('q/' . rawurlencode($slug))
            : ('poemes/q/' . rawurlencode($slug));
        $img = null;
        if (!empty($r['image']) && function_exists('image_url')) {
            $img = image_url($r['image']);
        } elseif (!empty($r['image'])) {
            $img = $r['image'];
        }
        $items[] = [
            'type'     => 'qacida',
            'id'       => (int) ($r['id'] ?? 0),
            'slug'     => $slug,
            'title'    => (string) ($r['titre'] ?? ''),
            'title_ar' => (string) ($r['titre_ar'] ?? ''),
            'subtitle' => trim(((string)($r['auteur'] ?? '')) . ' · ' . ((string)($r['interprete'] ?? '')), ' ·'),
            'url'      => $url,
            'image'    => $img,
        ];
    }

    echo json_encode(['ok' => true, 'total' => $total, 'items' => $items], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    error_log('[poemes/api/search] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Erreur recherche'], JSON_UNESCAPED_UNICODE);
}
