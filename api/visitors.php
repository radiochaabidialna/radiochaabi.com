<?php
/**
 * Compteur de visiteurs — Radio Chaabi
 * POST/GET action=hit   → enregistre une visite (cookie 24h)
 * GET  action=stats     → stats (admin uniquement)
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

if (session_status() !== PHP_SESSION_ACTIVE) {
    @session_start();
}

$file = dirname(__DIR__) . '/data/visitors.json';
$dir  = dirname($file);
if (!is_dir($dir)) {
    @mkdir($dir, 0755, true);
}

function load_stats(string $file): array {
    $defaults = [
        'total' => 0,
        'today' => 0,
        'today_date' => date('Y-m-d'),
        'unique_total' => 0,
        'sessions' => [],
    ];
    if (!is_file($file)) {
        return $defaults;
    }
    $raw = @file_get_contents($file);
    $data = json_decode((string) $raw, true);
    if (!is_array($data)) {
        return $defaults;
    }
    return array_merge($defaults, $data);
}

function save_stats(string $file, array $data): bool {
    /* Ne pas stocker indéfiniment toutes les sessions */
    if (!empty($data['sessions']) && is_array($data['sessions'])) {
        $cut = strtotime('-40 days');
        foreach ($data['sessions'] as $k => $ts) {
            if ((int) $ts < $cut) {
                unset($data['sessions'][$k]);
            }
        }
    }
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    return (bool) @file_put_contents($file, $json, LOCK_EX);
}

function is_admin(): bool {
    return !empty($_SESSION['admin_id']);
}

$action = isset($_GET['action']) ? (string) $_GET['action'] : 'hit';
if ($action === '') {
    $action = 'hit';
}

/* ── Enregistrement visite ── */
if ($action === 'hit') {
    $data = load_stats($file);
    $today = date('Y-m-d');
    if (($data['today_date'] ?? '') !== $today) {
        $data['today'] = 0;
        $data['today_date'] = $today;
    }

    $sid = isset($_COOKIE['chaabi_vid']) ? (string) $_COOKIE['chaabi_vid'] : '';
    if ($sid === '' || !preg_match('/^[a-f0-9]{16,64}$/', $sid)) {
        $sid = bin2hex(random_bytes(16));
        @setcookie('chaabi_vid', $sid, [
            'expires' => time() + 86400 * 365,
            'path' => '/',
            'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    $isNewSession = empty($data['sessions'][$sid]);
    $dayKey = $sid . '_' . $today;
    $alreadyToday = !empty($data['sessions'][$dayKey]);

    $data['total'] = (int) ($data['total'] ?? 0) + 1;
    if (!$alreadyToday) {
        $data['today'] = (int) ($data['today'] ?? 0) + 1;
        $data['sessions'][$dayKey] = time();
    }
    if ($isNewSession) {
        $data['unique_total'] = (int) ($data['unique_total'] ?? 0) + 1;
        $data['sessions'][$sid] = time();
    }

    save_stats($file, $data);

    echo json_encode([
        'ok' => true,
        'tracked' => true,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/* ── Stats admin only ── */
if ($action === 'stats') {
    if (!is_admin()) {
        /* Option : clé secrète locale pour le propriétaire (définir dans config si besoin) */
        $key = isset($_GET['key']) ? (string) $_GET['key'] : '';
        $allowKey = '';
        $local = dirname(__DIR__) . '/config/visitors.local.php';
        if (is_file($local)) {
            $cfg = include $local;
            if (is_array($cfg) && !empty($cfg['stats_key'])) {
                $allowKey = (string) $cfg['stats_key'];
            }
        }
        if ($allowKey === '' || !hash_equals($allowKey, $key)) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => 'forbidden'], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    $data = load_stats($file);
    $today = date('Y-m-d');
    if (($data['today_date'] ?? '') !== $today) {
        $data['today'] = 0;
        $data['today_date'] = $today;
    }

    echo json_encode([
        'ok' => true,
        'admin' => true,
        'total' => (int) ($data['total'] ?? 0),
        'today' => (int) ($data['today'] ?? 0),
        'unique_total' => (int) ($data['unique_total'] ?? 0),
        'date' => $data['today_date'] ?? $today,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(400);
echo json_encode(['ok' => false, 'error' => 'bad_action'], JSON_UNESCAPED_UNICODE);
