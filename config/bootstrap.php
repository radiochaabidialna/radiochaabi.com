<?php
/**
 * Bootstrap config Radio Chaabi
 * À inclure en tête de tout script PHP serveur (API, admin, import).
 *
 * Fichiers :
 *   config/database.php       — charge BDD
 *   config/database.local.php — secrets locaux
 *   config/mail.local.php     — email / SMTP (optionnel)
 *   config/app.local.php      — options app (optionnel)
 *
 * Production : variables d'environnement CHAABI_DB_* et CHAABI_MAIL_*
 */
declare(strict_types=1);

if (defined('CHAABI_BOOTSTRAPPED')) {
    return;
}
define('CHAABI_BOOTSTRAPPED', true);

function chaabi_load_local(string $file): array
{
    $path = __DIR__ . '/' . $file;
    if (!is_readable($path)) {
        return [];
    }
    $data = require $path;
    return is_array($data) ? $data : [];
}

/** Config BDD */
function chaabi_db_config(): array
{
    static $cfg = null;
    if ($cfg !== null) {
        return $cfg;
    }
    $local = chaabi_load_local('database.local.php');
    $cfg = [
        'host'    => getenv('CHAABI_DB_HOST') ?: ($local['host'] ?? 'localhost'),
        'name'    => getenv('CHAABI_DB_NAME') ?: ($local['name'] ?? 'chaabi_music_v7_bilingue'),
        'user'    => getenv('CHAABI_DB_USER') ?: ($local['user'] ?? 'root'),
        'pass'    => getenv('CHAABI_DB_PASS') ?: ($local['pass'] ?? 'root'),
        'charset' => $local['charset'] ?? 'utf8mb4',
    ];
    return $cfg;
}

/** PDO singleton */
function chaabi_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $c = chaabi_db_config();
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', $c['host'], $c['name'], $c['charset']);
    $pdo = new PDO($dsn, $c['user'], $c['pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}

/**
 * Notifications email (dédicaces, commentaires, contacts)
 * Désactivé si email vide ou contient CHANGEZ-MOI
 */
function chaabi_mail_config(): array
{
    static $cfg = null;
    if ($cfg !== null) {
        return $cfg;
    }
    $local = chaabi_load_local('mail.local.php');
    $cfg = [
        'email'  => getenv('CHAABI_MAIL_TO')   ?: ($local['email']  ?? 'CHANGEZ-MOI@exemple.com'),
        'from'   => getenv('CHAABI_MAIL_FROM') ?: ($local['from']   ?? 'Chaabi Music <no-reply@chaabi.dz>'),
        'smtp'   => [
            'host'   => getenv('CHAABI_SMTP_HOST') ?: ($local['smtp']['host']   ?? ''),
            'port'   => (int)(getenv('CHAABI_SMTP_PORT') ?: ($local['smtp']['port'] ?? 587)),
            'user'   => getenv('CHAABI_SMTP_USER') ?: ($local['smtp']['user']   ?? ''),
            'pass'   => getenv('CHAABI_SMTP_PASS') ?: ($local['smtp']['pass']   ?? ''),
            'secure' => getenv('CHAABI_SMTP_SECURE') ?: ($local['smtp']['secure'] ?? 'tls'),
        ],
    ];
    return $cfg;
}

/** Options app */
function chaabi_app_config(): array
{
    static $cfg = null;
    if ($cfg !== null) {
        return $cfg;
    }
    $local = chaabi_load_local('app.local.php');
    $cfg = [
        'env'           => getenv('CHAABI_ENV') ?: ($local['env'] ?? 'local'),
        'import_secret' => getenv('CHAABI_IMPORT_SECRET') ?: ($local['import_secret'] ?? 'change-me-import'),
        'media_root'    => $local['media_root'] ?? null, // null = auto DOCUMENT_ROOT/music
    ];
    return $cfg;
}
