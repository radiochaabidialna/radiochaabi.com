<?php
/**
 * Chaabi Music Pro — API backend
 * Endpoints: artistes, chansons, emissions, interviews, qacidates, bouqalla,
 * dedicaces, commentaires, contacts, live bar, tracking, search, admin CRUD.
 * Améliorations: config isolée, réponses JSON uniformes, validation renforcée, OPTIONS CORS.
 */
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("X-Content-Type-Options: nosniff");

// Préflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/* ── Config centralisée ── */
require_once dirname(__DIR__) . '/config/bootstrap.php';
$dbCfg = chaabi_db_config();
$host     = $dbCfg['host'];
$dbname   = $dbCfg['name'];
$username = $dbCfg['user'];
$password = $dbCfg['pass'];
$NOTIF    = chaabi_mail_config();

// Lecture du corps JSON (fiable) + verification de la session admin (table users)
function readBody() {
    static $body = false;
    if ($body === false) $body = file_get_contents("php://input");
    return $body;
}
/**
 * Auth admin : session + contrôles anti-abus.
 * - Session HttpOnly / Secure / SameSite
 * - Origin / Referer (requêtes mutantes)
 * - Jeton CSRF (header X-CSRF-Token ou body csrf)
 */
function checkAdminKey($requireCsrf = false) {
    if (empty($_SESSION['admin_id'])) {
        return false;
    }
    // Expiration idle 8h
    $now = time();
    $last = (int)($_SESSION['admin_last'] ?? 0);
    if ($last && ($now - $last) > 28800) {
        unset($_SESSION['admin_id'], $_SESSION['admin_nom'], $_SESSION['admin_role'], $_SESSION['admin_last'], $_SESSION['admin_csrf']);
        return false;
    }
    $_SESSION['admin_last'] = $now;

    // CSRF sur POST/PUT/DELETE admin
    if ($requireCsrf || in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['POST', 'PUT', 'DELETE', 'PATCH'], true)) {
        $token = '';
        if (!empty($_SERVER['HTTP_X_CSRF_TOKEN'])) {
            $token = (string)$_SERVER['HTTP_X_CSRF_TOKEN'];
        } else {
            $body = json_decode(readBody() ?: '[]', true);
            if (is_array($body) && !empty($body['csrf'])) $token = (string)$body['csrf'];
        }
        $sess = (string)($_SESSION['admin_csrf'] ?? '');
        if ($sess === '' || $token === '' || !hash_equals($sess, $token)) {
            return false;
        }
    }

    // Origin optionnelle (même site)
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    $host = $_SERVER['HTTP_HOST'] ?? '';
    if ($origin && $host) {
        $oHost = parse_url($origin, PHP_URL_HOST);
        if ($oHost && strcasecmp($oHost, $host) !== 0) {
            // autoriser sous-domaines du même parent si besoin — strict par défaut
            return false;
        }
    }
    return true;
}


/* ═══════════════════════════════════════════════════════════
   PERMISSIONS ADMIN (rôles)
   superadmin > admin > editor > moderator
   ═══════════════════════════════════════════════════════════ */
function adminRole() {
    return (string)($_SESSION['admin_role'] ?? 'admin');
}

/** Matrice des permissions par rôle */
function adminPermissionsMap() {
    return [
        'superadmin' => ['*'],
        'admin' => [
            'content.read', 'content.write', 'content.delete',
            'moderate', 'contacts', 'logs.read',
            'media.upload', 'stats.read'
            // pas users.manage
        ],
        'editor' => [
            'content.read', 'content.write',
            'media.upload', 'stats.read'
            // pas delete, pas moderate, pas contacts, pas logs
        ],
        'moderator' => [
            'moderate', 'contacts', 'logs.read', 'content.read'
        ],
    ];
}

function adminHasPermission($perm) {
    $role = adminRole();
    $map = adminPermissionsMap();
    if (!isset($map[$role])) return false;
    $perms = $map[$role];
    if (in_array('*', $perms, true)) return true;
    return in_array($perm, $perms, true);
}

function requirePermission($perm) {
    requireAdmin(false);
    if (!adminHasPermission($perm)) {
        jsonOut(["error" => "Permission refusée", "need" => $perm, "role" => adminRole()], 403);
    }
}

/** Permission requise selon table + action CRUD */
function permissionForTableAction($table, $action) {
    $table = strtolower((string)$table);
    $action = strtolower((string)$action);
    // tables de contenu éditorial
    $content = ['artistes','chansons','emissions','emission_invites','interviews','bouqalla','qacidates'];
    $mod = ['dedicaces','commentaires'];
    if ($table === 'users') return 'users.manage';
    if ($table === 'contacts') return 'contacts';
    if (in_array($table, $mod, true)) {
        return ($action === 'read' || $action === 'list') ? 'content.read' : 'moderate';
    }
    if (in_array($table, $content, true)) {
        if ($action === 'delete') return 'content.delete';
        if ($action === 'write' || $action === 'insert' || $action === 'update' || $action === 'save') return 'content.write';
        return 'content.read';
    }
    return 'content.read';
}

function requireTablePermission($table, $action) {
    $perm = permissionForTableAction($table, $action);
    requirePermission($perm);
}


function requireAdmin($requireCsrf = false) {
    if (!checkAdminKey($requireCsrf)) {
        jsonOut(["error" => "Non autorisé"], 401);
    }
}

function adminIssueCsrf() {
    if (empty($_SESSION['admin_csrf'])) {
        try {
            $_SESSION['admin_csrf'] = bin2hex(random_bytes(32));
        } catch (Exception $e) {
            $_SESSION['admin_csrf'] = bin2hex(openssl_random_pseudo_bytes(32));
        }
    }
    return $_SESSION['admin_csrf'];
}

/** Rate-limit simple par IP (fichier temporaire) */
function rateLimitHit($key, $max, $windowSec) {
    $dir = sys_get_temp_dir() . '/chaabi_rl';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0';
    $file = $dir . '/' . hash('sha256', $key . '|' . $ip) . '.json';
    $now = time();
    $data = ['t' => [], 'n' => 0];
    if (is_file($file)) {
        $raw = @file_get_contents($file);
        $j = $raw ? json_decode($raw, true) : null;
        if (is_array($j) && isset($j['t']) && is_array($j['t'])) $data = $j;
    }
    $data['t'] = array_values(array_filter($data['t'], function ($ts) use ($now, $windowSec) {
        return ($now - (int)$ts) < $windowSec;
    }));
    if (count($data['t']) >= $max) {
        return false;
    }
    $data['t'][] = $now;
    @file_put_contents($file, json_encode($data), LOCK_EX);
    return true;
}

/**
 * Journalise une action admin (table admin_logs).
 * Échec silencieux : ne bloque jamais la réponse API.
 */
function logAdminAction(PDO $pdo, $action, $tableName = null, $recordId = null, $details = null) {
    try {
        // Créer la table si absente (déploiement simple)
        $pdo->exec("CREATE TABLE IF NOT EXISTS admin_logs (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            admin_id INT UNSIGNED NULL,
            admin_nom VARCHAR(120) NULL,
            action VARCHAR(64) NOT NULL,
            table_name VARCHAR(64) NULL,
            record_id INT UNSIGNED NULL,
            details JSON NULL,
            ip VARCHAR(45) NULL,
            user_agent VARCHAR(255) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_admin_logs_created (created_at),
            INDEX idx_admin_logs_admin (admin_id),
            INDEX idx_admin_logs_action (action),
            INDEX idx_admin_logs_table (table_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $adminId = isset($_SESSION['admin_id']) ? (int)$_SESSION['admin_id'] : null;
        $adminNom = isset($_SESSION['admin_nom']) ? substr((string)$_SESSION['admin_nom'], 0, 120) : null;
        $ip = substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
        $ua = substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);
        $det = null;
        if ($details !== null) {
            if (is_string($details)) $det = $details;
            else $det = json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        $st = $pdo->prepare(
            "INSERT INTO admin_logs (admin_id, admin_nom, action, table_name, record_id, details, ip, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $st->execute([
            $adminId,
            $adminNom,
            substr((string)$action, 0, 64),
            $tableName ? substr((string)$tableName, 0, 64) : null,
            $recordId !== null ? (int)$recordId : null,
            $det,
            $ip ?: null,
            $ua ?: null
        ]);
    } catch (Exception $e) {
        @error_log('[Chaabi] logAdminAction: ' . $e->getMessage());
    }
}


/** Réponse JSON uniforme + code HTTP optionnel */
function jsonOut($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Détecte si un texte est majoritairement en arabe */
function isMostlyArabic($text) {
    $text = trim((string)$text);
    if ($text === '') return false;
    $arabic = preg_match_all('/[\x{0600}-\x{06FF}\x{0750}-\x{077F}\x{08A0}-\x{08FF}]/u', $text);
    $latin  = preg_match_all('/[A-Za-zÀ-ÿ]/u', $text);
    return $arabic > 0 && $arabic >= $latin;
}

/**
 * Traduction auto FR↔AR via MyMemory (gratuit, sans clé, quota limité).
 * Retourne la traduction ou '' en cas d'échec (ne bloque jamais l'envoi).
 */

/**
 * Émissions liées à un invité / artiste — EXISTS (évite DISTINCT + jointures lourdes)
 * Index idéaux : emission_invites(artiste_id), emission_invites(emission_id),
 *                emission_invites(invite_externe_nom), emissions(status, date_emission)
 */
/* INDEX RECOMMENDED (à créer une fois en prod) :
 * ALTER TABLE emission_invites ADD INDEX idx_ei_artiste (artiste_id);
 * ALTER TABLE emission_invites ADD INDEX idx_ei_emission (emission_id);
 * ALTER TABLE emission_invites ADD INDEX idx_ei_nom (invite_externe_nom);
 * ALTER TABLE emissions ADD INDEX idx_em_status_date (status, date_emission);
 * ALTER TABLE interviews ADD INDEX idx_iv_artiste (artiste_id, status);
 * ALTER TABLE chansons ADD INDEX idx_ch_artiste (artiste_id, status, is_deleted);
 */
function chaabiEmissionsForPerson(PDO $pdo, $artisteId = null, $nom = '', $nomAr = '') {
    $nom = trim((string)$nom);
    $nomAr = trim((string)$nomAr);
    $params = [];
    $conds = [];
    if ($artisteId) {
        $conds[] = 'ei.artiste_id = ?';
        $params[] = (int)$artisteId;
    }
    if ($nom !== '') {
        $conds[] = 'ei.invite_externe_nom = ?';
        $params[] = $nom;
    }
    if ($nomAr !== '') {
        $conds[] = 'ei.invite_externe_nom_ar = ?';
        $params[] = $nomAr;
    }
    if (!$conds) return [];
    $or = implode(' OR ', $conds);
    $sql = "SELECT e.id, e.numero_emission, e.titre, e.titre_ar, e.audio, e.date_emission, e.image
            FROM emissions e
            WHERE e.status = 'published'
              AND EXISTS (
                    SELECT 1 FROM emission_invites ei
                    WHERE ei.emission_id = e.id AND ($or)
              )
            ORDER BY e.date_emission DESC, e.numero_emission DESC";
    $st = $pdo->prepare($sql);
    $st->execute($params);
    return $st->fetchAll(PDO::FETCH_ASSOC);
}

/** Interviews liées à un invité / artiste */
function chaabiInterviewsForPerson(PDO $pdo, $artisteId = null, $nom = '', $nomAr = '') {
    $nom = trim((string)$nom);
    $nomAr = trim((string)$nomAr);
    $params = [];
    $conds = [];
    if ($artisteId) {
        $conds[] = 'artiste_id = ?';
        $params[] = (int)$artisteId;
    }
    if ($nom !== '') {
        $conds[] = 'artiste_nom = ?';
        $params[] = $nom;
    }
    if ($nomAr !== '') {
        $conds[] = 'artiste_nom_ar = ?';
        $params[] = $nomAr;
    }
    if (!$conds) return [];
    $or = implode(' OR ', $conds);
    $sql = "SELECT id, artiste_nom, artiste_nom_ar, audio, date_interview, duree, image
            FROM interviews
            WHERE status = 'published' AND is_deleted = 0 AND ($or)
            ORDER BY date_interview DESC";
    $st = $pdo->prepare($sql);
    $st->execute($params);
    return $st->fetchAll(PDO::FETCH_ASSOC);
}

/** Agrégat invités par émission (1 jointure groupée, réutilisable) */
function chaabiInvitesSubquery() {
    return "(SELECT ei.emission_id,
               GROUP_CONCAT(DISTINCT COALESCE(a.nom, ei.invite_externe_nom) ORDER BY ei.ordre SEPARATOR ', ') AS invites_noms,
               GROUP_CONCAT(DISTINCT COALESCE(a.nom_ar, ei.invite_externe_nom_ar, a.nom, ei.invite_externe_nom) ORDER BY ei.ordre SEPARATOR ', ') AS invites_noms_ar
            FROM emission_invites ei
            LEFT JOIN artistes a ON a.id = ei.artiste_id
            GROUP BY ei.emission_id)";
}

function chaabiAutoTranslate($text, $from, $to) {
    $text = trim((string)$text);
    if ($text === '' || $from === $to) return $text;
    // Tronquer pour respecter les limites API (~500 chars recommandé)
    $q = mb_substr($text, 0, 450, 'UTF-8');
    $url = 'https://api.mymemory.translated.net/get?q=' . rawurlencode($q)
         . '&langpair=' . rawurlencode($from . '|' . $to);
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 4,
            'ignore_errors' => true,
            'header' => "User-Agent: ChaabiMusic/1.0\r\n",
        ],
        'ssl' => ['verify_peer' => true, 'verify_peer_name' => true],
    ]);
    $raw = @file_get_contents($url, false, $ctx);
    if ($raw === false || $raw === '') return '';
    $json = json_decode($raw, true);
    if (!is_array($json)) return '';
    $translated = trim((string)($json['responseData']['translatedText'] ?? ''));
    // MyMemory renvoie parfois le texte source en cas d'échec
    if ($translated === '' || mb_strtolower($translated) === mb_strtolower($q)) {
        // accepter si alphabets différents
        if ($to === 'ar' && !isMostlyArabic($translated)) return '';
        if ($to === 'fr' && isMostlyArabic($translated)) return '';
    }
    return $translated;
}

/** Remplit les champs FR + AR à partir d'une saisie unique */
function bilingualPair($text) {
    $text = trim((string)$text);
    if ($text === '') return ['', ''];
    if (isMostlyArabic($text)) {
        $ar = $text;
        $fr = chaabiAutoTranslate($text, 'ar', 'fr');
        if ($fr === '') $fr = $text; // repli
        return [$fr, $ar];
    }
    $fr = $text;
    $ar = chaabiAutoTranslate($text, 'fr', 'ar');
    return [$fr, $ar];
}



try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    // Ne pas exposer le détail SQL en production
    error_log('[Chaabi] BDD: ' . $e->getMessage());
    jsonOut(["error" => "Connexion BDD échouée"], 503);
}

// Session PHP sécurisée (HTTPS → cookie Secure)
function isHttpsRequest() {
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') return true;
    if (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443) return true;
    if (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https') return true;
    return false;
}
if (session_status() === PHP_SESSION_NONE) {
    $secure = isHttpsRequest();
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}
// En-têtes sécurité API
if (!headers_sent()) {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    if (isHttpsRequest()) {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }
}

$action = isset($_GET['action']) ? preg_replace('/[^a-z0-9_]/', '', strtolower((string)$_GET['action'])) : '';
$page   = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$limit  = isset($_GET['limit']) ? max(1, min(50, intval($_GET['limit']))) : 8;
$offset = ($page - 1) * $limit;

/* Alias compatibles front (chaabi-home-swiper, etc.) : action=emissions → get_emissions */
$CHAABI_ACTION_ALIASES = [
    'artistes'      => 'get_artistes',
    'artiste'       => 'get_artiste_complet',
    'chansons'      => 'get_chansons',
    'chanson'       => 'get_chansons',
    'emissions'     => 'get_emissions',
    'emission'      => 'get_emission_complet',
    'interviews'    => 'get_interviews',
    'interview'     => 'get_interviews',
    'bouqalla'      => 'get_bouqalla',
    'dedicaces'     => 'get_dedicaces',
    'commentaires'  => 'get_commentaires',
    'contacts'      => 'get_contacts',
    'qacidates'     => 'get_qacidates',
    'qacidate'      => 'get_qacidate_complet',
    'media'         => 'get_media',
    'live_bar'      => 'get_live_bar',
    'livebar'       => 'get_live_bar',
    'stats'         => 'get_stats',
    'top_ecoutes'   => 'get_top_ecoutes',
    'featured'      => 'get_chanson_featured',
];
if ($action !== '' && isset($CHAABI_ACTION_ALIASES[$action])) {
    $action = $CHAABI_ACTION_ALIASES[$action];
}


function tableExists(PDO $pdo, $table) {
    static $cache = [];
    $table = preg_replace('/[^a-z0-9_]/i', '', (string)$table);
    if ($table === '') return false;
    if (array_key_exists($table, $cache)) return $cache[$table];
    try {
        $st = $pdo->query("SHOW TABLES LIKE " . $pdo->quote($table));
        $cache[$table] = (bool)$st->fetch(PDO::FETCH_NUM);
    } catch (Throwable $e) {
        $cache[$table] = false;
    }
    return $cache[$table];
}

/** Démo qacidates sans table MySQL (fichier data/qacidates-seed.json) */

/** Nettoie un champ texte qacidate (anti-résidus CSS d'anciens imports) */
function chaabiScrubQacidField($s) {
    if ($s === null || $s === '') return '';
    $s = (string)$s;
    if (preg_match('/no-repeat|inline-flex|min-height|center\s*\/\s*cover|linear-gradient|\.jpe?g\)/i', $s)) {
        return '';
    }
    return $s;
}
function chaabiScrubQacidateRow(array $row) {
    foreach (['titre','titre_ar','artiste','artiste_ar','auteur','resume','resume_ar'] as $k) {
        if (isset($row[$k])) $row[$k] = chaabiScrubQacidField($row[$k]);
    }
    return $row;
}

function chaabiLoadQacidatesSeed() {
    $paths = [
        __DIR__ . '/../data/qacidates-seed.json',
        dirname(__DIR__) . '/data/qacidates-seed.json',
    ];
    foreach ($paths as $p) {
        if (is_readable($p)) {
            $j = json_decode(file_get_contents($p), true);
            if (is_array($j) && !empty($j['data'])) return $j;
        }
    }
    return null;
}

function getPaginatedData($pdo, $baseQuery, $countQuery, $params, $offset, $limit) {
    /* Important : ne jamais mélanger placeholders "?" et ":nom" dans la même requête PDO. */
    $params = is_array($params) ? array_values($params) : [];
    $stmt = $pdo->prepare($countQuery);
    $stmt->execute($params);
    $total = (int) $stmt->fetchColumn();

    $stmt = $pdo->prepare($baseQuery . " LIMIT ?, ?");
    $i = 1;
    foreach ($params as $val) {
        $stmt->bindValue($i++, $val, PDO::PARAM_STR);
    }
    $stmt->bindValue($i++, (int) $offset, PDO::PARAM_INT);
    $stmt->bindValue($i++, (int) $limit, PDO::PARAM_INT);
    $stmt->execute();

    $limit = max(1, (int) $limit);
    return [
        "data" => $stmt->fetchAll(PDO::FETCH_ASSOC),
        "pagination" => [
            "current_page" => (int) floor($offset / $limit) + 1,
            "total_pages" => (int) max(1, (int) ceil($total / $limit)),
            "total_items" => $total
        ]
    ];
}

/* Notifications email : $NOTIF chargé via chaabi_mail_config() (config/mail.local.php) */

function adminNotif($type, $d) {
    global $NOTIF;
    $to = trim((string)($NOTIF['email'] ?? ''));
    if ($to === '' || stripos($to, 'CHANGEZ-MOI') !== false) return;
    // Anti-spam : 1 envoi max / 60 s par type
    $lock = sys_get_temp_dir() . '/chaabi_notif_' . preg_replace('/[^a-z]/', '', $type) . '.lock';
    if (is_file($lock) && time() - (int)file_get_contents($lock) < 60) return;
    @file_put_contents($lock, time());

    $labels = [
        'dedicace' => 'Nouvelle dedicasse',
        'commentaire' => 'Nouveau commentaire',
        'contact' => 'Nouveau message de contact',
        'emission_comment' => 'Nouveau commentaire sur une emission',
    ];
    $label = $labels[$type] ?? 'Nouvelle soumission';
    $rows = '';
    $map = [
        'Nom' => $d['nom'] ?? '', 'Pour' => $d['pour'] ?? '',
        'Email' => $d['email'] ?? '', 'Telephone' => $d['phone'] ?? '',
        'Sujet' => $d['sujet'] ?? '', 'Note' => $d['rating'] ?? '',
        'Message' => $d['message'] ?? '', 'Description' => $d['description'] ?? '',
        'Emission' => $d['emission'] ?? '',
    ];
    foreach ($map as $k => $v) {
        if ($v !== '' && $v !== null) $rows .= "<tr><td style=\"padding:6px 10px;border-bottom:1px solid #eee;color:#888;white-space:nowrap;vertical-align:top\">$k</td><td style=\"padding:6px 10px;border-bottom:1px solid #eee;color:#222\">" . nl2br(htmlspecialchars((string)$v)) . "</td></tr>";
    }
    $body = "<div style=\"font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;border:1px solid #e5e5e5;border-radius:10px;overflow:hidden\">"
        . "<div style=\"background:#0d1117;color:#f5b942;padding:14px 18px;font-size:15px;font-weight:bold\">Chaabi Music — " . $label . "</div>"
        . "<div style=\"padding:14px 18px;color:#555;font-size:13px\">Recu le <b>" . date('d/m/Y à H:i') . "</b></div>"
        . "<table style=\"width:100%;border-collapse:collapse;font-size:13px\">" . $rows . "</table>"
        . "<div style=\"padding:14px 18px;background:#fafafa;color:#888;font-size:12px\">A gerer depuis le panneau d'administration (section correspondante).</div>"
        . "</div>";
    $subject = '[Chaabi Music] ' . $label . ' — ' . date('d/m H:i');
    $from = $NOTIF['from'] ?? 'Chaabi Music <no-reply@chaabi.dz>';
    $smtp = $NOTIF['smtp'] ?? [];
    if (!empty($smtp['host'])) {
        // From = le compte SMTP authentifié (Gmail rejette un expéditeur qu'il ne possède pas)
        if (!empty($smtp['user'])) $from = 'Chaabi Music <' . $smtp['user'] . '>';
        smtpSend($smtp['host'], $smtp['port'] ?? 587, $smtp['user'] ?? '', $smtp['pass'] ?? '', $smtp['secure'] ?? 'tls', $from, $to, $subject, $body);
    } else {
        $headers = "From: $from\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n";
        @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);
    }
}

function smtpSend($host, $port, $user, $pass, $secure, $from, $to, $subject, $bodyHtml) {
    $fromClean = preg_replace('/^.*<([^>]+)>.*$/', '$1', $from);
    $scheme = strtolower((string)$secure) === 'ssl' ? 'ssl' : 'tcp';
    $fp = @stream_socket_client($scheme . '://' . $host . ':' . (int)$port, $errno, $errstr, 15);
    if (!$fp) { @error_log('[Chaabi SMTP] Connexion échouée: ' . $errstr); return; }
    // Lecture d'une réponse SMTP complète (multi-lignes : 250-xxx … 250 OK)
    $r = function () use ($fp) {
        $last = '';
        do {
            $last = @fgets($fp, 515);
            if ($last === false) break;
        } while (substr($last, 3, 1) === '-');
        return $last;
    };
    $w = function ($cmd) use ($fp) { @fwrite($fp, $cmd . "\r\n"); };
    $code = $r();
    if (substr($code, 0, 3) !== '220') { @error_log('[Chaabi SMTP] Accueil refusé: ' . trim($code)); @fclose($fp); return; }
    $w('EHLO chaabi.local'); $r();
    if ($scheme === 'tcp') {
        // STARTTLS obligatoire (Gmail, OVH, etc.) avant AUTH sur le port 587
        $w('STARTTLS'); $code = $r();
        if (substr($code, 0, 3) !== '220') { @error_log('[Chaabi SMTP] STARTTLS refusé: ' . trim($code)); @fclose($fp); return; }
        if (!@stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) { @error_log('[Chaabi SMTP] Échec handshake TLS — extension openssl activée ?'); @fclose($fp); return; }
        $w('EHLO chaabi.local'); $r();
    }
    if (!empty($user) && !empty($pass)) {
        $w('AUTH LOGIN'); $r();
        $w(base64_encode($user)); $r();
        $w(base64_encode($pass)); $code = $r();
        if (substr($code, 0, 3) !== '235') { @error_log('[Chaabi SMTP] Auth refusée (' . substr($code, 0, 3) . '): ' . trim($code) . ' — 2FA + mot de passe d\'application requis pour Gmail'); @fclose($fp); return; }
    }
    $w('MAIL FROM: <' . $fromClean . '>'); $code = $r();
    if (substr($code, 0, 3) !== '250') { @error_log('[Chaabi SMTP] MAIL FROM refusé: ' . trim($code)); @fclose($fp); return; }
    $w('RCPT TO: <' . $to . '>'); $code = $r();
    if (substr($code, 0, 3) !== '250') { @error_log('[Chaabi SMTP] RCPT TO refusé: ' . trim($code)); @fclose($fp); return; }
    $w('DATA'); $code = $r();
    if (substr($code, 0, 3) !== '354') { @error_log('[Chaabi SMTP] DATA refusé: ' . trim($code)); @fclose($fp); return; }
    $msg = "From: " . $from . "\r\nTo: " . $to . "\r\nSubject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n" . $bodyHtml;
    $msg = str_replace("\r\n.", "\r\n..", $msg); // dot-stuffing
    $w($msg);
    $w('.');
    $code = $r();
    $w('QUIT');
    @fclose($fp);
    @error_log('[Chaabi SMTP] Envoi terminé (code ' . substr($code, 0, 3) . ')');
}

/* ═══════════════════════════════════════════════════════════
   ROUTER MODULES — factorisation (URLs publiques inchangées)
   Front : api/radiochaabi.php?action=...
   ═══════════════════════════════════════════════════════════ */
define('CHAABI_API', true);

$CHAABI_MODULES = [
    'artistes'     => __DIR__ . '/modules/artistes.php',
    'chansons'     => __DIR__ . '/modules/chansons.php',
    'emissions'    => __DIR__ . '/modules/emissions.php',
    'interviews'   => __DIR__ . '/modules/interviews.php',
    'bouqalla'     => __DIR__ . '/modules/bouqalla.php',
    'dedicaces'    => __DIR__ . '/modules/dedicaces.php',
    'commentaires' => __DIR__ . '/modules/commentaires.php',
    'contacts'     => __DIR__ . '/modules/contacts.php',
    'qacidates'    => __DIR__ . '/modules/qacidates.php',
    'admin'        => __DIR__ . '/modules/admin.php',
    'media'        => __DIR__ . '/modules/media.php',
];

$CHAABI_ACTION_MODULE = [
    'get_artistes' => 'artistes',
    'get_artiste_complet' => 'artistes',
    'get_guest_complet' => 'artistes',
    'get_chansons' => 'chansons',
    'get_chanson_featured' => 'chansons',
    'get_emissions' => 'emissions',
    'get_emission_complet' => 'emissions',
    'rate_emission' => 'emissions',
    'add_emission_comment' => 'emissions',
    'get_interviews' => 'interviews',
    'get_bouqalla' => 'bouqalla',
    'get_bouqalla_jour' => 'bouqalla',
    'get_dedicaces' => 'dedicaces',
    'get_last_dedicaces' => 'dedicaces',
    'add_dedicace' => 'dedicaces',
    'get_commentaires' => 'commentaires',
    'add_commentaire' => 'commentaires',
    'get_contacts' => 'contacts',
    'add_contact' => 'contacts',
    'get_qacidates' => 'qacidates',
    'get_qacidate' => 'qacidates',
    'get_qacidate_complet' => 'qacidates',
    'admin_list' => 'admin',
    'admin_action' => 'admin',
    'admin_login' => 'admin',
    'admin_me' => 'admin',
    'admin_logout' => 'admin',
    'admin_tables' => 'admin',
    'admin_get' => 'admin',
    'admin_save' => 'admin',
    'admin_delete' => 'admin',
    'admin_logs' => 'admin',
    'get_media' => 'media',
    'search' => 'media',
    'get_live_bar' => 'media',
    'like_item' => 'media',
    'track_visit' => 'media',
    'get_visit_stats' => 'media',
    'track_view' => 'media',
    'track_play' => 'media',
    'track_listen' => 'media',
    'get_top_ecoutes' => 'media',
    'get_stats' => 'media',
    'api_list' => 'media',
] ;

$modName = $CHAABI_ACTION_MODULE[$action] ?? null;
if ($modName && isset($CHAABI_MODULES[$modName])) {
    require_once $CHAABI_MODULES[$modName];
    $fn = 'chaabi_module_' . $modName;
    if (is_callable($fn)) {
        $handled = $fn($pdo, $action, (int)$page, (int)$limit, (int)$offset);
        if ($handled) {
            exit;
        }
    }
}

jsonOut(["error" => "Action non reconnue: " . ($action !== "" ? $action : "aucune")], 400);
