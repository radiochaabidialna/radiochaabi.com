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
    $stmt = $pdo->prepare($countQuery);
    $stmt->execute($params);
    $total = $stmt->fetchColumn();
    
    $stmt = $pdo->prepare($baseQuery . " LIMIT :offset, :limit");
    foreach ($params as $key => $val) {
        $stmt->bindValue(is_int($key) ? $key + 1 : ':' . $key, $val, PDO::PARAM_STR);
    }
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    
    return [
        "data" => $stmt->fetchAll(PDO::FETCH_ASSOC),
        "pagination" => [
            "current_page" => ($offset / $limit) + 1,
            "total_pages" => ceil($total / $limit),
            "total_items" => (int)$total
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

switch ($action) {
    // --- ARTISTES ---
    case 'get_artistes':
        $q = "SELECT id, nom, nom_ar, bio, image, views, likes, created_at FROM artistes WHERE is_deleted = 0 ORDER BY nom ASC";
        $c = "SELECT COUNT(*) FROM artistes WHERE is_deleted = 0";
        echo json_encode(getPaginatedData($pdo, $q, $c, [], $offset, $limit));
        break;

    case 'get_artiste_complet':
        $id = intval($_GET['id'] ?? 0);
        $stmt = $pdo->prepare("SELECT * FROM artistes WHERE id = ? AND is_deleted = 0");
        $stmt->execute([$id]);
        $artiste = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$artiste) { echo json_encode(["error" => "Non trouvé"]); break; }

        $stmt = $pdo->prepare("SELECT id, titre, titre_ar, audio, duree, views, likes FROM chansons WHERE artiste_id = ? AND status = 'published' AND is_deleted = 0");
        $stmt->execute([$id]);
        $artiste['chansons'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $nom = $artiste['nom'] ?? '';
        $nomAr = $artiste['nom_ar'] ?? '';
        $artiste['interviews'] = chaabiInterviewsForPerson($pdo, $id, $nom, $nomAr);
        $artiste['emissions'] = chaabiEmissionsForPerson($pdo, $id, $nom, $nomAr);

        echo json_encode($artiste, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        break;

    // --- INVITÉ EXTERNE COMPLET ---
    case 'get_guest_complet':
        $invite_nom = trim((string)($_GET['invite_externe_nom'] ?? ''));
        if ($invite_nom === '') { echo json_encode(["error" => "Nom d'invité manquant"]); break; }

        // 1) Une seule lecture invité (égalité indexable, pas de LOWER sur colonne)
        $stmt = $pdo->prepare("SELECT invite_externe_nom, invite_externe_nom_ar, invite_externe_type, invite_externe_type_ar,
                                      invite_externe_bio, invite_externe_bio_ar, invite_externe_image, artiste_id
                               FROM emission_invites
                               WHERE invite_externe_nom = ? OR invite_externe_nom_ar = ?
                               ORDER BY id DESC LIMIT 1");
        $stmt->execute([$invite_nom, $invite_nom]);
        $invData = $stmt->fetch(PDO::FETCH_ASSOC);

        $artisteId = null;
        if (!$invData) {
            $stA = $pdo->prepare("SELECT id, nom, nom_ar, bio, bio_ar, image FROM artistes
                                  WHERE is_deleted = 0 AND (nom = ? OR nom_ar = ?) LIMIT 1");
            $stA->execute([$invite_nom, $invite_nom]);
            $art = $stA->fetch(PDO::FETCH_ASSOC);
            if (!$art) { echo json_encode(["error" => "Invité non trouvé"]); break; }
            $artisteId = (int)$art['id'];
            $guest = [
                'nom' => $art['nom'],
                'nom_ar' => $art['nom_ar'] ?? $art['nom'],
                'bio' => $art['bio'] ?? '',
                'bio_ar' => $art['bio_ar'] ?? '',
                'image' => $art['image'] ?? null,
                'invite_type' => 'Artiste',
                'invite_type_ar' => 'فنان',
                'artiste_id' => $artisteId
            ];
        } else {
            $artisteId = !empty($invData['artiste_id']) ? (int)$invData['artiste_id'] : null;
            $guest = [
                'nom' => $invData['invite_externe_nom'] ?: $invite_nom,
                'nom_ar' => $invData['invite_externe_nom_ar'] ?? $invData['invite_externe_nom'],
                'bio' => $invData['invite_externe_bio'],
                'bio_ar' => $invData['invite_externe_bio_ar'],
                'image' => $invData['invite_externe_image'],
                'invite_type' => $invData['invite_externe_type'] ?? 'Invité Externe',
                'invite_type_ar' => $invData['invite_externe_type_ar'] ?? '',
                'artiste_id' => $artisteId
            ];
            // Si pas d'artiste_id, tenter un match table artistes (1 requête)
            if (!$artisteId) {
                $stA = $pdo->prepare("SELECT id FROM artistes WHERE is_deleted = 0 AND (nom = ? OR nom_ar = ?) LIMIT 1");
                $stA->execute([$guest['nom'], $guest['nom_ar'] ?? '']);
                $aid = $stA->fetchColumn();
                if ($aid) { $artisteId = (int)$aid; $guest['artiste_id'] = $artisteId; }
            }
        }

        $nomCanon = $guest['nom'] ?? $invite_nom;
        $nomAr = $guest['nom_ar'] ?? '';

        $guest['interviews'] = chaabiInterviewsForPerson($pdo, $artisteId, $nomCanon, $nomAr);
        $guest['emissions']  = chaabiEmissionsForPerson($pdo, $artisteId, $nomCanon, $nomAr);
        $guest['chansons']   = [];
        if ($artisteId) {
            $stC = $pdo->prepare("SELECT id, titre, titre_ar, audio, duree, views, likes FROM chansons WHERE artiste_id = ? AND status = 'published' AND is_deleted = 0");
            $stC->execute([$artisteId]);
            $guest['chansons'] = $stC->fetchAll(PDO::FETCH_ASSOC);
        }

        echo json_encode($guest, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        break;

    case 'get_chansons':
        // Liste légère + JOIN artiste (noms seulement)
        $q = "SELECT c.id, c.titre, c.titre_ar, c.audio, c.image, c.duree, c.views, c.likes,
                     a.nom AS artiste_nom, a.nom_ar AS artiste_nom_ar
              FROM chansons c
              LEFT JOIN artistes a ON a.id = c.artiste_id
              WHERE c.is_deleted = 0 AND c.status = 'published'
              ORDER BY c.id DESC";
        $c = "SELECT COUNT(*) FROM chansons c WHERE c.is_deleted = 0 AND c.status = 'published'";
        echo json_encode(getPaginatedData($pdo, $q, $c, [], $offset, $limit));
        break;

    // --- EMISSIONS ---
    case 'get_emissions':
        // Liste : invités optionnels (?with_invites=1) pour alléger le JOIN
        $withInv = !isset($_GET['with_invites']) || ($_GET['with_invites'] !== '0' && $_GET['with_invites'] !== 'false');
        if ($withInv) {
            $q = "SELECT e.id, e.numero_emission, e.titre, e.titre_ar, e.image, e.audio, e.views, e.likes, e.date_emission, e.duree,
                         inv.invites_noms, inv.invites_noms_ar
                  FROM emissions e
                  LEFT JOIN " . chaabiInvitesSubquery() . " inv ON inv.emission_id = e.id
                  WHERE e.status = 'published'
                  ORDER BY e.date_emission DESC, e.numero_emission DESC";
        } else {
            $q = "SELECT e.id, e.numero_emission, e.titre, e.titre_ar, e.image, e.audio, e.views, e.likes, e.date_emission, e.duree
                  FROM emissions e
                  WHERE e.status = 'published'
                  ORDER BY e.date_emission DESC, e.numero_emission DESC";
        }
        $c = "SELECT COUNT(*) FROM emissions e WHERE e.status = 'published'";
        echo json_encode(getPaginatedData($pdo, $q, $c, [], $offset, $limit));
        break;

    case 'get_emission_complet':
        $id = intval($_GET['id'] ?? 0);
        $stmt = $pdo->prepare("SELECT id, numero_emission, titre, titre_ar, description, description_ar,
                                      image, audio, duree, views, likes, date_emission, status
                               FROM emissions WHERE id = ? AND status = 'published' LIMIT 1");
        $stmt->execute([$id]);
        $emission = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$emission) { echo json_encode(["error" => "Émission non trouvée"]); break; }

        // Tous les invités (pas de LIMIT) — ordre puis id
        $stmtInv = $pdo->prepare("SELECT ei.*, a.nom as artiste_nom, a.nom_ar as artiste_nom_ar, a.image as artiste_image 
                               FROM emission_invites ei LEFT JOIN artistes a ON ei.artiste_id = a.id 
                               WHERE ei.emission_id = ? 
                               ORDER BY COALESCE(ei.ordre, 999) ASC, ei.id ASC");
        $stmtInv->execute([$id]);
        $invites = $stmtInv->fetchAll(PDO::FETCH_ASSOC);
        $stmtInt = $pdo->prepare("SELECT id, audio, date_interview FROM interviews WHERE artiste_id = ? AND status = 'published' AND is_deleted = 0");
        foreach ($invites as &$inv) {
            $inv['interviews'] = [];
            if (!empty($inv['artiste_id'])) {
                $stmtInt->execute([(int)$inv['artiste_id']]);
                $inv['interviews'] = $stmtInt->fetchAll(PDO::FETCH_ASSOC);
            }
            // Garantir un nom affichable
            if (empty($inv['artiste_nom']) && empty($inv['invite_externe_nom'])) {
                $inv['invite_externe_nom'] = $inv['invite_externe_nom'] ?? ('Invité #' . ($inv['id'] ?? '?'));
            }
        }
        unset($inv);
        $emission['invites'] = $invites;
        $emission['invites_count'] = count($invites);

        $stmt = $pdo->prepare("SELECT nom, message, created_at FROM emission_comments WHERE emission_id = ? AND status = 'published' ORDER BY created_at DESC LIMIT 10");
        $stmt->execute([$id]);
        $emission['comments'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $pdo->prepare("SELECT ROUND(AVG(rating), 1) as avg, COUNT(id) as total_votes FROM emission_ratings WHERE emission_id = ?");
        $stmt->execute([$id]);
        $emission['rating_stats'] = $stmt->fetch(PDO::FETCH_ASSOC);

        // Noms des invités (FR + AR) pour la live-bar et l'affichage du détail
        $stmt = $pdo->prepare("SELECT GROUP_CONCAT(DISTINCT COALESCE(a.nom, ei.invite_externe_nom) SEPARATOR ', ') AS invites_noms,
                                      GROUP_CONCAT(DISTINCT COALESCE(a.nom_ar, ei.invite_externe_nom_ar, a.nom, ei.invite_externe_nom) SEPARATOR ', ') AS invites_noms_ar
                               FROM emission_invites ei LEFT JOIN artistes a ON ei.artiste_id = a.id
                               WHERE ei.emission_id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $emission['invites_noms'] = $row['invites_noms'] ?: '';
        $emission['invites_noms_ar'] = $row['invites_noms_ar'] ?: '';

        echo json_encode($emission);
        break;

    // --- AUTRES TABLES ---
    case 'get_interviews':
        $q = "SELECT id, artiste_nom, artiste_nom_ar, image, audio, duree, views, likes, date_interview FROM interviews WHERE is_deleted = 0 AND status = 'published' ORDER BY date_interview DESC";
        $c = "SELECT COUNT(*) FROM interviews WHERE is_deleted = 0 AND status = 'published'";
        echo json_encode(getPaginatedData($pdo, $q, $c, [], $offset, $limit));
        break;

    
    case 'get_media':
        $type = $_GET['type'] ?? '';
        $id = intval($_GET['id'] ?? 0);
        if (!$id || !in_array($type, ['chanson', 'emission', 'interview'], true)) {
            echo json_encode(["error" => "type/id invalide"]);
            break;
        }
        if ($type === 'chanson') {
            $st = $pdo->prepare("SELECT c.id, c.titre, c.titre_ar, c.audio, c.duree, c.views, c.likes, c.image,
                                        a.nom AS artiste_nom, a.nom_ar AS artiste_nom_ar, a.image AS artiste_image
                                 FROM chansons c LEFT JOIN artistes a ON c.artiste_id = a.id
                                 WHERE c.id = ? AND c.status = 'published' AND c.is_deleted = 0");
            $st->execute([$id]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            if ($row) { $row['media_type'] = 'chanson'; echo json_encode($row); }
            else echo json_encode(["error" => "introuvable"]);
        } elseif ($type === 'emission') {
            $st = $pdo->prepare("SELECT e.id, e.numero_emission, e.audio, e.duree, e.views, e.likes, e.image,
                                        GROUP_CONCAT(DISTINCT COALESCE(a.nom, ei.invite_externe_nom) SEPARATOR ', ') AS invites_noms
                                 FROM emissions e
                                 LEFT JOIN emission_invites ei ON ei.emission_id = e.id
                                 LEFT JOIN artistes a ON ei.artiste_id = a.id
                                 WHERE e.id = ? AND e.status = 'published'
                                 GROUP BY e.id");
            $st->execute([$id]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            if ($row) { $row['media_type'] = 'emission'; echo json_encode($row); }
            else echo json_encode(["error" => "introuvable"]);
        } else {
            $st = $pdo->prepare("SELECT id, artiste_nom, artiste_nom_ar, audio, duree, views, likes, image, date_interview
                                 FROM interviews WHERE id = ? AND status = 'published' AND is_deleted = 0");
            $st->execute([$id]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            if ($row) { $row['media_type'] = 'interview'; echo json_encode($row); }
            else echo json_encode(["error" => "introuvable"]);
        }
        break;

    case 'get_chanson_featured':
        // 1. Étoile manuelle (admin) — priorité si une chanson est étoilée
        $song = null;
        $st = $pdo->query("SELECT c.id, c.titre, c.titre_ar, c.audio, c.duree, c.views, c.likes, c.image,
                                  a.nom AS artiste_nom, a.nom_ar AS artiste_nom_ar
                           FROM chansons c LEFT JOIN artistes a ON c.artiste_id = a.id
                           WHERE c.featured = 1 AND c.status='published' AND c.is_deleted = 0
                           ORDER BY c.id DESC LIMIT 1");
        $song = $st->fetch(PDO::FETCH_ASSOC);
        // 2. AUTO : la chanson la plus ÉCOUTÉE des 7 derniers jours (vote des internautes)
        if (!$song) {
            $hasStats = (bool)$pdo->query("SHOW TABLES LIKE 'ecoutes_statistiques'")->fetchColumn();
            if ($hasStats) {
                $st = $pdo->query("SELECT s.media_id, COUNT(DISTINCT s.session_id) AS cpt
                                   FROM ecoutes_statistiques s
                                   WHERE s.media_type = 'chanson' AND s.event_type = 'play'
                                     AND s.created_at >= (NOW() - INTERVAL 7 DAY)
                                   GROUP BY s.media_id ORDER BY cpt DESC LIMIT 1");
                $top = $st->fetch(PDO::FETCH_ASSOC);
                if ($top && $top['media_id']) {
                    $st2 = $pdo->prepare("SELECT c.id, c.titre, c.titre_ar, c.audio, c.duree, c.views, c.likes, c.image,
                                                 a.nom AS artiste_nom, a.nom_ar AS artiste_nom_ar
                                          FROM chansons c LEFT JOIN artistes a ON c.artiste_id = a.id
                                          WHERE c.id = ? AND c.status='published' AND c.is_deleted = 0
                                            AND c.audio IS NOT NULL AND c.audio <> ''");
                    $st2->execute([$top['media_id']]);
                    $song = $st2->fetch(PDO::FETCH_ASSOC);
                    if ($song) $song['automatic'] = true;
                }
            }
        }
        // 3. Repli : la plus AIMÉE (❤️ des internautes, cumul)
        if (!$song) {
            $st = $pdo->query("SELECT c.id, c.titre, c.titre_ar, c.audio, c.duree, c.views, c.likes, c.image,
                                      a.nom AS artiste_nom, a.nom_ar AS artiste_nom_ar
                               FROM chansons c LEFT JOIN artistes a ON c.artiste_id = a.id
                               WHERE c.status='published' AND c.is_deleted = 0
                                 AND c.audio IS NOT NULL AND c.audio <> ''
                               ORDER BY c.likes DESC, c.views DESC LIMIT 1");
            $song = $st->fetch(PDO::FETCH_ASSOC);
            if ($song) $song['automatic'] = true;
        }
        // 4. Dernier recours : la plus récente
        if (!$song) {
            $st = $pdo->query("SELECT c.id, c.titre, c.titre_ar, c.audio, c.duree, c.views, c.likes, c.image,
                                      a.nom AS artiste_nom, a.nom_ar AS artiste_nom_ar
                               FROM chansons c LEFT JOIN artistes a ON c.artiste_id = a.id
                               WHERE c.status='published' AND c.is_deleted = 0
                                 AND c.audio IS NOT NULL AND c.audio <> ''
                               ORDER BY c.id DESC LIMIT 1");
            $song = $st->fetch(PDO::FETCH_ASSOC);
            if ($song) $song['automatic'] = true;
        }
        echo json_encode($song ?: null);
        break;

    case 'get_dedicaces':
        $tri = $_GET['tri'] ?? 'recent';
        $order = ($tri === 'likes') ? 'likes DESC, created_at DESC' : 'created_at DESC';
        $q = "SELECT id, nom, nom_ar, pour, pour_ar, description, description_ar, likes, created_at FROM dedicaces WHERE status = 'published' ORDER BY $order";
        $c = "SELECT COUNT(*) FROM dedicaces WHERE status = 'published'";
        echo json_encode(getPaginatedData($pdo, $q, $c, [], $offset, $limit));
        break;

    case 'get_commentaires':
        $q = "SELECT id, nom, message, rating, created_at FROM commentaires WHERE status = 'published' ORDER BY created_at DESC";
        $c = "SELECT COUNT(*) FROM commentaires WHERE status = 'published'";
        echo json_encode(getPaginatedData($pdo, $q, $c, [], $offset, $limit));
        break;

    case 'get_contacts':
        // Afficher uniquement les messages archivés/lu pour éviter de rendre publics les messages privés non traités
        $q = "SELECT id, nom, email, phone, sujet, message, created_at FROM contacts WHERE admin_status = 'archived' ORDER BY created_at DESC";
        $c = "SELECT COUNT(*) FROM contacts WHERE admin_status = 'archived'";
        echo json_encode(getPaginatedData($pdo, $q, $c, [], $offset, $limit));
        break;

    case 'get_bouqalla':
        $q = "SELECT id, num, arabe, phonetic, francais FROM bouqalla ORDER BY num ASC";
        $c = "SELECT COUNT(*) FROM bouqalla";
        echo json_encode(getPaginatedData($pdo, $q, $c, [], $offset, $limit));
        break;

    // --- INTERACTIVITÉ : LIKES & RATINGS ---
    case 'like_item':
        $data = json_decode(file_get_contents("php://input"));
        $type = $data->type ?? '';
        $id = intval($data->id ?? 0);
        $table = '';
        if ($type == 'artiste') $table = 'artistes';
        elseif ($type == 'chanson') $table = 'chansons';
        elseif ($type == 'emission') $table = 'emissions';
        elseif ($type == 'interview') $table = 'interviews';
        elseif ($type == 'qacidate') $table = 'qacidates';
        elseif ($type == 'dedicace') $table = 'dedicaces';
        if ($table && $id) {
            $stmt = $pdo->prepare("UPDATE `$table` SET likes = likes + 1 WHERE id = ?");
            $stmt->execute([$id]);
            $stmt = $pdo->prepare("SELECT likes FROM `$table` WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(["success" => true, "likes" => (int)$stmt->fetchColumn()]);
        } else {
            echo json_encode(["error" => "Type ou id invalide"]);
        }
        break;

    // --- VUES : incrémentation (artiste, chanson, emission, interview) ---

    // --- COMPTEUR VISITEURS SITE (en ligne / jour / total) ---
    case 'track_visit':
        // Corps JSON optionnel : { "vid": "hash-client" }
        $data = json_decode(readBody() ?: '[]', true);
        if (!is_array($data)) $data = [];
        $vid = preg_replace('/[^a-zA-Z0-9_\-]/', '', (string)($data['vid'] ?? $_GET['vid'] ?? ''));
        if (strlen($vid) < 8) {
            // fallback serveur (moins précis)
            $vid = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . ($_SERVER['HTTP_USER_AGENT'] ?? ''));
            $vid = substr($vid, 0, 32);
        }
        $vid = substr($vid, 0, 64);
        try {
            if (!$pdo->query("SHOW TABLES LIKE 'site_visitors'")->fetchColumn()) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS site_visitors (
                  visitor_hash VARCHAR(64) NOT NULL,
                  first_seen DATETIME NOT NULL,
                  last_seen DATETIME NOT NULL,
                  hits INT UNSIGNED NOT NULL DEFAULT 1,
                  PRIMARY KEY (visitor_hash),
                  KEY idx_last_seen (last_seen)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            }
            $st = $pdo->prepare(
                "INSERT INTO site_visitors (visitor_hash, first_seen, last_seen, hits)
                 VALUES (?, NOW(), NOW(), 1)
                 ON DUPLICATE KEY UPDATE last_seen = NOW(), hits = hits + 1"
            );
            $st->execute([$vid]);
        } catch (Exception $e) {
            error_log('[Chaabi] track_visit: ' . $e->getMessage());
            jsonOut(["error" => "track_visit failed"], 500);
        }
        // renvoie aussi les stats pour éviter un 2e appel
        // fallthrough volontaire impossible en PHP switch — on calcule ici
        // no break

    case 'get_visit_stats':
        try {
            if (!$pdo->query("SHOW TABLES LIKE 'site_visitors'")->fetchColumn()) {
                jsonOut([
                    "ok" => true,
                    "online" => 0,
                    "today" => 0,
                    "total" => 0,
                    "table" => false
                ]);
            }
            $online = (int)$pdo->query(
                "SELECT COUNT(*) FROM site_visitors WHERE last_seen >= (NOW() - INTERVAL 5 MINUTE)"
            )->fetchColumn();
            $today = (int)$pdo->query(
                "SELECT COUNT(*) FROM site_visitors WHERE last_seen >= CURDATE()"
            )->fetchColumn();
            $total = (int)$pdo->query("SELECT COUNT(*) FROM site_visitors")->fetchColumn();
            jsonOut([
                "ok" => true,
                "online" => $online,
                "today" => $today,
                "total" => $total,
                "table" => true,
                "window_online_minutes" => 5
            ]);
        } catch (Exception $e) {
            error_log('[Chaabi] get_visit_stats: ' . $e->getMessage());
            jsonOut(["error" => "stats failed"], 500);
        }
        break;

    case 'track_view':
        $data = json_decode(readBody() ?: file_get_contents("php://input"));
        if (!$data) $data = (object)['type' => $_GET['type'] ?? '', 'id' => $_GET['id'] ?? 0];
        $type = $data->type ?? '';
        $id = intval($data->id ?? 0);
        $map = [
            'artiste' => 'artistes',
            'chanson' => 'chansons',
            'emission' => 'emissions',
            'interview' => 'interviews',
            'qacidate' => 'qacidates',
        ];
        $table = $map[$type] ?? '';
        if (!$table || !$id) {
            echo json_encode(["error" => "Type ou id invalide"]);
            break;
        }
        // Anti-spam léger : 1 vue / type+id / session / 30 min
        $vk = 'view_' . $type . '_' . $id;
        if (!empty($_SESSION[$vk]) && (time() - (int)$_SESSION[$vk]) < 1800) {
            $stmt = $pdo->prepare("SELECT views FROM `$table` WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(["success" => true, "views" => (int)$stmt->fetchColumn(), "deduped" => true]);
            break;
        }
        try {
            $stmt = $pdo->prepare("UPDATE `$table` SET views = COALESCE(views, 0) + 1 WHERE id = ?");
            $stmt->execute([$id]);
            $_SESSION[$vk] = time();
            $stmt = $pdo->prepare("SELECT views FROM `$table` WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(["success" => true, "views" => (int)$stmt->fetchColumn()]);
        } catch (Exception $e) {
            error_log('[Chaabi] track_view: ' . $e->getMessage());
            echo json_encode(["error" => "Impossible d'incrémenter la vue"]);
        }
        break;

    case 'rate_emission':
        $data = json_decode(file_get_contents("php://input"));
        $emission_id = intval($data->emission_id ?? 0);
        $rating = intval($data->rating ?? 0);
        $ip = $_SERVER['REMOTE_ADDR'];
        if ($emission_id && $rating > 0 && $rating <= 5) {
            $stmt = $pdo->prepare("SELECT id FROM emission_ratings WHERE emission_id = ? AND user_ip = ?");
            $stmt->execute([$emission_id, $ip]);
            if ($stmt->rowCount() == 0) {
                $stmt = $pdo->prepare("INSERT INTO emission_ratings (emission_id, rating, user_ip, created_at) VALUES (?, ?, ?, NOW())");
                $stmt->execute([$emission_id, $rating, $ip]);
                echo json_encode(["success" => true, "message" => "Merci pour votre vote !"]);
            } else {
                echo json_encode(["error" => "Vous avez déjà voté"]);
            }
        }
        break;

    case 'add_emission_comment':
        $data = json_decode(file_get_contents("php://input"));
        $emission_id = intval($data->emission_id ?? 0);
        $nom = trim((string)($data->nom ?? ''));
        $email = trim((string)($data->email ?? ''));
        $message = trim((string)($data->message ?? ''));
        if ($emission_id && $nom && $message) {
            $stmt = $pdo->prepare("INSERT INTO emission_comments (emission_id, nom, email, message, status, created_at) VALUES (?, ?, ?, ?, 'pending', NOW())");
            $stmt->execute([$emission_id, $nom, $email, $message]);
            $emTitre = $pdo->prepare("SELECT titre FROM emissions WHERE id = ?");
            $emTitre->execute([$emission_id]);
            adminNotif('emission_comment', ['nom' => $nom, 'email' => $email, 'message' => $message, 'emission' => $emTitre->fetchColumn() ?: '#' . $emission_id]);
            echo json_encode(["success" => true, "message" => "Commentaire soumis"]);
        }
        break;

    // --- NOUVEAUX FORMULAIRES (Dedicaces, Commentaires, Contacts) ---
        case 'add_dedicace':

        // Anti-spam : honeypot + rate limit
        $data = json_decode(file_get_contents("php://input"));
        if (!is_object($data)) { echo json_encode(["error" => "Requête invalide"]); break; }
        $hp = trim((string)($data->website ?? $data->url ?? ''));
        if ($hp !== '') {
            // Bot : réponse succès factice
            echo json_encode(["success" => true, "message" => "Envoyé"]);
            break;
        }
        if (!rateLimitHit('form_' . 'add_dedicace', 5, 600)) {
            http_response_code(429);
            echo json_encode(["error" => "Trop de requêtes — réessayez plus tard"]);
            break;
        }

        $nomIn = trim((string)($data->nom ?? ''));
        $pourIn = trim((string)($data->pour ?? ''));
        $descIn = trim((string)($data->description ?? ''));
        if ($nomIn && $pourIn && $descIn) {
            // Traduction auto : un seul formulaire → FR + AR en base
            list($nom, $nom_ar) = bilingualPair($nomIn);
            list($pour, $pour_ar) = bilingualPair($pourIn);
            list($description, $description_ar) = bilingualPair($descIn);
            try {
                $stmt = $pdo->prepare("INSERT INTO dedicaces (nom, nom_ar, pour, pour_ar, description, description_ar, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())");
                $stmt->execute([$nom, $nom_ar ?: null, $pour, $pour_ar ?: null, $description, $description_ar ?: null]);
            } catch (Throwable $e) {
                // Repli si colonnes _ar absentes
                $stmt = $pdo->prepare("INSERT INTO dedicaces (nom, pour, description, status, created_at) VALUES (?, ?, ?, 'pending', NOW())");
                $stmt->execute([$nomIn, $pourIn, $descIn]);
            }
            adminNotif('dedicace', ['nom' => $nomIn, 'pour' => $pourIn, 'description' => $descIn]);
            $msg = isMostlyArabic($descIn)
                ? "تم إرسال الإهداء للمراجعة"
                : "Dédicace soumise pour modération";
            echo json_encode(["success" => true, "message" => $msg]);
        } else {
            echo json_encode(["error" => "Veuillez remplir tous les champs"]);
        }
        break;


    case 'add_commentaire':

        // Anti-spam : honeypot + rate limit
        $data = json_decode(file_get_contents("php://input"));
        if (!is_object($data)) { echo json_encode(["error" => "Requête invalide"]); break; }
        $hp = trim((string)($data->website ?? $data->url ?? ''));
        if ($hp !== '') {
            // Bot : réponse succès factice
            echo json_encode(["success" => true, "message" => "Envoyé"]);
            break;
        }
        if (!rateLimitHit('form_' . 'add_commentaire', 5, 600)) {
            http_response_code(429);
            echo json_encode(["error" => "Trop de requêtes — réessayez plus tard"]);
            break;
        }

        $nom = trim((string)($data->nom ?? ''));
        $email = trim((string)($data->email ?? ''));
        $message = trim((string)($data->message ?? ''));
        $rating = intval($data->rating ?? 5);
        if ($nom && $message) {
            $stmt = $pdo->prepare("INSERT INTO commentaires (nom, email, message, rating, status, created_at) VALUES (?, ?, ?, ?, 'pending', NOW())");
            $stmt->execute([$nom, $email, $message, $rating]);
            adminNotif('commentaire', ['nom' => $nom, 'email' => $data->email ?? '', 'rating' => $rating, 'message' => $message]);
            echo json_encode(["success" => true, "message" => "Commentaire soumis pour modération"]);
        } else {
            echo json_encode(["error" => "Veuillez remplir tous les champs"]);
        }
        break;

    case 'add_contact':

        // Anti-spam : honeypot + rate limit
        $data = json_decode(file_get_contents("php://input"));
        if (!is_object($data)) { echo json_encode(["error" => "Requête invalide"]); break; }
        $hp = trim((string)($data->website ?? $data->url ?? ''));
        if ($hp !== '') {
            // Bot : réponse succès factice
            echo json_encode(["success" => true, "message" => "Envoyé"]);
            break;
        }
        if (!rateLimitHit('form_' . 'add_contact', 5, 600)) {
            http_response_code(429);
            echo json_encode(["error" => "Trop de requêtes — réessayez plus tard"]);
            break;
        }

        $nom = trim((string)($data->nom ?? ''));
        $email = trim((string)($data->email ?? ''));
        $phone = trim((string)($data->phone ?? ''));
        $sujet = trim((string)($data->sujet ?? ''));
        $message = trim((string)($data->message ?? ''));
        if ($nom && $email && $message) {
            $stmt = $pdo->prepare("INSERT INTO contacts (nom, email, phone, sujet, message, admin_status, created_at) VALUES (?, ?, ?, ?, ?, 'new', NOW())");
            $stmt->execute([$nom, $email, $phone, $sujet, $message]);
            adminNotif('contact', ['nom' => $nom, 'email' => $email, 'phone' => $phone, 'sujet' => $sujet, 'message' => $message]);
            echo json_encode(["success" => true, "message" => "Message envoyé avec succès"]);
        } else {
            echo json_encode(["error" => "Veuillez remplir les champs obligatoires"]);
        }
        break;

    // --- RECHERCLE GLOBALE ---
    case 'search':
    $q_raw = isset($_GET['q']) ? trim($_GET['q']) : '';
    if (empty($q_raw)) { echo json_encode([]); break; }

    $results = [];
    
    // DETECTION DU PREFIXE #
    // On utilise preg_match pour s'assurer que c'est bien un nombre après le #
    if (preg_match('/^#(\d+)$/', $q_raw, $matches)) {
        $numero = (int)$matches[1]; // On récupère le numéro extrait
        
        $stmt = $pdo->prepare("SELECT id, numero_emission, titre, titre_ar, image, audio, views, likes, date_emission 
                               FROM emissions 
                               WHERE numero_emission = ? 
                               LIMIT 1");
        $stmt->execute([$numero]);
        $results['emissions'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // On retourne des tableaux vides pour les autres catégories pour garder la structure
        $results['artistes'] = [];
        $results['chansons'] = [];
        $results['interviews'] = [];
        $results['invites'] = [];
        $results['isSpecialSearch'] = true; 
    } else {
        // RECHERCHE CLASSIQUE (Texte)
        $q = '%' . $q_raw . '%';
        
        // Artistes
        $stmt = $pdo->prepare("SELECT id, nom, nom_ar, bio, image, views, likes FROM artistes WHERE nom LIKE ? OR nom_ar LIKE ? LIMIT 5");
        $stmt->execute([$q, $q]);
        $results['artistes'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Chansons
        $stmt = $pdo->prepare("SELECT c.*, a.nom as artiste_nom FROM chansons c LEFT JOIN artistes a ON c.artiste_id = a.id WHERE c.titre LIKE ? OR c.titre_ar LIKE ? LIMIT 5");
        $stmt->execute([$q, $q]);
        $results['chansons'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Emissions (par titre ou par numéro si l'utilisateur tape juste le chiffre sans #)
        $stmt = $pdo->prepare("SELECT id, numero_emission, titre, titre_ar, image, audio, views, likes, date_emission FROM emissions WHERE titre LIKE ? OR titre_ar LIKE ? OR CAST(numero_emission AS CHAR) LIKE ? LIMIT 5");
        $stmt->execute([$q, $q, $q]);
        $results['emissions'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Interviews
        try {
            $stmt = $pdo->prepare("SELECT i.id, i.date_interview, i.audio, i.image, i.views, a.nom as artiste_nom, a.nom_ar as artiste_nom_ar
                                   FROM interviews i LEFT JOIN artistes a ON i.artiste_id = a.id
                                   WHERE a.nom LIKE ? OR a.nom_ar LIKE ? LIMIT 5");
            $stmt->execute([$q, $q]);
            $results['interviews'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Throwable $e) {
            $results['interviews'] = [];
        }

        // Invités externes (noms distincts)
        try {
            $stmt = $pdo->prepare("SELECT invite_externe_nom AS nom, invite_externe_nom_ar AS nom_ar,
                                          MAX(invite_externe_image) AS image, MAX(invite_externe_type) AS invite_type,
                                          COUNT(*) AS nb_emissions
                                   FROM emission_invites
                                   WHERE invite_externe_nom LIKE ? OR invite_externe_nom_ar LIKE ?
                                   GROUP BY invite_externe_nom, invite_externe_nom_ar
                                   ORDER BY nb_emissions DESC
                                   LIMIT 5");
            $stmt->execute([$q, $q]);
            $results['invites'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Throwable $e) {
            $results['invites'] = [];
        }
        
        $results['isSpecialSearch'] = false;
    }
    
    echo json_encode($results);
    break;

    // --- LIVE BAR "EN CE MOMENT..." (uniquement les médias en cours) ---
    case 'get_live_bar':
        // Sécurité : si la table active_tracks n'existe pas, on renvoie une liste vide propre (pas d'erreur PHP)
        if (!$pdo->query("SHOW TABLES LIKE 'active_tracks'")->fetchColumn()) {
            echo json_encode(["data" => [], "generated_at" => date('Y-m-d H:i:s')]);
            break;
        }
        $minutes = isset($_GET['minutes']) ? max(1, min(60, intval($_GET['minutes']))) : 5;

        // Médias en cours (dédupliqués) — tri par nb d'auditeurs puis récence
        $stmt = $pdo->prepare("SELECT media_type, media_id,
                                      MAX(title) AS title, MAX(artist) AS artist, MAX(image) AS image,
                                      MAX(numero) AS numero, MAX(invite) AS invite,
                                      MAX(updated_at) AS last_update,
                                      COUNT(*) AS listeners_count
                               FROM active_tracks
                               WHERE updated_at >= (NOW() - INTERVAL :minutes MINUTE)
                                 AND media_type IS NOT NULL
                                 AND media_type != ''
                               GROUP BY media_type, media_id
                               ORDER BY listeners_count DESC, last_update DESC
                               LIMIT 20");
        $stmt->bindValue(':minutes', $minutes, PDO::PARAM_INT);
        $stmt->execute();
        $live = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Enrichissement : URL audio + champs bilingues (FR + AR) depuis la BDD,
        // vrai invité de l'émission, suppression des médias disparus
        $tableMap = ['chanson' => 'chansons', 'interview' => 'interviews', 'emission' => 'emissions'];
        $kept = [];
        foreach ($live as $item) {
            $tbl = $tableMap[$item['media_type']] ?? null;
            $item['audio'] = null;
            $item['title_ar'] = null;
            $item['artist_ar'] = null;
            $item['invite_ar'] = null;
            if ($tbl && !empty($item['media_id'])) {
                $mid = (int)$item['media_id'];
                if ($item['media_type'] === 'chanson') {
                    $st = $pdo->prepare("SELECT c.audio, c.titre, c.titre_ar, a.nom AS artist, a.nom_ar AS artist_ar
                                         FROM chansons c LEFT JOIN artistes a ON c.artiste_id = a.id WHERE c.id = ?");
                    $st->execute([$mid]);
                    $r = $st->fetch(PDO::FETCH_ASSOC);
                    if (!$r) continue; // média supprimé -> on ne l'affiche pas
                    $item['audio'] = $r['audio'] ?: null;
                    $item['title_ar'] = $r['titre_ar'] ?: null;
                    $item['artist'] = $r['artist'] ?: $item['artist'];
                    $item['artist_ar'] = $r['artist_ar'] ?: null;
                } elseif ($item['media_type'] === 'interview') {
                    $st = $pdo->prepare("SELECT audio, artiste_nom, artiste_nom_ar FROM interviews WHERE id = ?");
                    $st->execute([$mid]);
                    $r = $st->fetch(PDO::FETCH_ASSOC);
                    if (!$r) continue;
                    $item['audio'] = $r['audio'] ?: null;
                    $item['artist'] = $r['artiste_nom'] ?: $item['artist'];
                    $item['artist_ar'] = $r['artiste_nom_ar'] ?: null;
                } elseif ($item['media_type'] === 'emission') {
                    $st = $pdo->prepare("SELECT audio, numero_emission FROM emissions WHERE id = ?");
                    $st->execute([$mid]);
                    $r = $st->fetch(PDO::FETCH_ASSOC);
                    if (!$r) continue;
                    $item['audio'] = $r['audio'] ?: null;
                    if ($r['numero_emission'] !== null) $item['numero'] = $r['numero_emission'];
                    // Vrai invité (FR + AR), corrige les anciens "Invité(s)"
                    $st = $pdo->prepare("SELECT COALESCE(a.nom, ei.invite_externe_nom) AS invite,
                                                COALESCE(a.nom_ar, ei.invite_externe_nom_ar, a.nom, ei.invite_externe_nom) AS invite_ar
                                         FROM emission_invites ei LEFT JOIN artistes a ON ei.artiste_id = a.id
                                         WHERE ei.emission_id = ? ORDER BY ei.ordre ASC LIMIT 1");
                    $st->execute([$mid]);
                    $inv = $st->fetch(PDO::FETCH_ASSOC);
                    if ($inv && $inv['invite']) { $item['invite'] = $inv['invite']; $item['invite_ar'] = $inv['invite_ar'] ?: null; }
                } else {
                    $st = $pdo->prepare("SELECT audio FROM `$tbl` WHERE id = ?");
                    $st->execute([$mid]);
                    if ($st->rowCount() == 0) continue;
                    $item['audio'] = $st->fetchColumn() ?: null;
                }
            }
            $kept[] = $item;
        }

        // Nombre d'auditeurs réellement en train d'écouter (même fenêtre de 5 min)
        // NB: SUBSTRING_INDEX retire le suffixe ":type:id" ajouté par track_play (clé composite)
        $stmt = $pdo->prepare("SELECT COUNT(DISTINCT SUBSTRING_INDEX(session_id, ':', 1)) FROM active_tracks WHERE updated_at >= (NOW() - INTERVAL :minutes MINUTE)");
        $stmt->bindValue(':minutes', $minutes, PDO::PARAM_INT);
        $stmt->execute();
        $listeners = (int)$stmt->fetchColumn();

        // Infos radio en continu (live_settings : "à l'antenne" + URL du flux)
        $radio = null;
        try {
            $radio = $pdo->query("SELECT last_title, last_artist, stream_url, last_update FROM live_settings ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) { $radio = null; }

        echo json_encode(["data" => $kept, "listeners" => $listeners, "radio" => $radio, "generated_at" => date('Y-m-d H:i:s')]);
        break;

    // --- TRACKING LIVE : alimente la table active_tracks ---
    case 'track_play':
        $data = json_decode(file_get_contents("php://input"), true);
        $session_id = substr($data['session_id'] ?? '', 0, 255);
        $media_type = in_array($data['media_type'] ?? '', ['chanson', 'emission', 'interview', 'live']) ? $data['media_type'] : '';
        $media_id = intval($data['media_id'] ?? 0);
        if ($session_id && $media_type && $media_id) {
            // Clé composite (session + média) : chaque média joué garde sa propre ligne,
            // la live-bar affiche donc TOUS les médias en cours côte à côte,
            // même quand un seul visiteur enchaîne plusieurs médias ou ouvre plusieurs onglets
            $session_key = $session_id . ':' . $media_type . ':' . $media_id;
            // Sécurité : si la table active_tracks n'existe pas, on ignore sans casser la page
            if (!$pdo->query("SHOW TABLES LIKE 'active_tracks'")->fetchColumn()) {
                echo json_encode(["error" => "Table active_tracks absente"]);
                break;
            }
            $title  = substr($data['title'] ?? '', 0, 500);
            $artist = substr($data['artist'] ?? '', 0, 255);
            $image  = substr($data['image'] ?? '', 0, 500);
            $numero = substr($data['numero'] ?? '', 0, 50);
            $invite = substr($data['invite'] ?? '', 0, 255);
            $stmt = $pdo->prepare("INSERT INTO active_tracks (session_id, media_type, media_id, title, artist, image, numero, invite, updated_at)
                                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
                                   ON DUPLICATE KEY UPDATE media_type = VALUES(media_type), media_id = VALUES(media_id),
                                   title = VALUES(title), artist = VALUES(artist), image = VALUES(image),
                                   numero = VALUES(numero), invite = VALUES(invite), updated_at = NOW()");
            $stmt->execute([$session_key, $media_type, $media_id, $title, $artist, $image, $numero, $invite]);
            // Nettoyage des sessions inactives (> 30 min)
            $pdo->exec("DELETE FROM active_tracks WHERE updated_at < (NOW() - INTERVAL 30 MINUTE)");
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["error" => "Données manquantes"]);
        }
        break;

    // --- STATISTIQUES D'ÉCOUTE (table ecoutes_statistiques) ---
    case 'track_listen':
        $data = json_decode(file_get_contents("php://input"), true);
        $media_type = in_array($data['media_type'] ?? '', ['chanson', 'emission', 'interview', 'live']) ? $data['media_type'] : '';
        $media_id = intval($data['media_id'] ?? 0);
        $event_type = in_array($data['event_type'] ?? '', ['play', 'progress', 'pause', 'complete']) ? $data['event_type'] : '';
        if (!$media_type || !$media_id || !$event_type) { echo json_encode(["error" => "Données manquantes"]); break; }
        if (!$pdo->query("SHOW TABLES LIKE 'ecoutes_statistiques'")->fetchColumn()) {
            echo json_encode(["error" => "Table ecoutes_statistiques absente"]);
            break;
        }
        $session_id = substr($data['session_id'] ?? '', 0, 36);
        $visitor_hash = substr($data['visitor_hash'] ?? '', 0, 64);
        $position = max(0, intval($data['position'] ?? 0));
        $duration = max(0, intval($data['duration'] ?? 0));
        $listened = max(0, intval($data['listened_seconds'] ?? 0));
        $stmt = $pdo->prepare("INSERT INTO ecoutes_statistiques
                               (media_type, media_id, event_type, listened_seconds, position_seconds, duration_seconds, session_id, visitor_hash, page_path, language_code)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$media_type, $media_id, $event_type, $listened, $position, $duration ?: null, $session_id ?: null, $visitor_hash ?: null, substr($data['page_path'] ?? '', 0, 255), ($data['language_code'] ?? 'fr') === 'ar' ? 'ar' : 'fr']);
        echo json_encode(["success" => true]);
        break;

    // --- TOP DES ÉCOUTES (30 jours, repli sur les vues tant que les stats sont vides) ---
    case 'get_top_ecoutes':
        $limit = isset($_GET['limit']) ? max(1, min(20, intval($_GET['limit']))) : 6;
        $data = [];
        $hasStats = (bool)$pdo->query("SHOW TABLES LIKE 'ecoutes_statistiques'")->fetchColumn();
        if ($hasStats) {
            $stmt = $pdo->query("SELECT s.media_id,
                                        COUNT(DISTINCT CASE WHEN s.event_type='play' THEN s.session_id END) AS demarrages,
                                        SUM(CASE WHEN s.event_type='progress' THEN s.listened_seconds ELSE 0 END) AS secondes
                                 FROM ecoutes_statistiques s
                                 WHERE s.media_type='chanson' AND s.created_at >= (NOW() - INTERVAL 30 DAY)
                                 GROUP BY s.media_id ORDER BY demarrages DESC, secondes DESC LIMIT $limit");
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $st) {
                $st2 = $pdo->prepare("SELECT c.id, c.titre, c.titre_ar, c.audio, c.duree, c.views, c.likes, c.image,
                                             a.nom AS artiste_nom, a.nom_ar AS artiste_nom_ar
                                      FROM chansons c LEFT JOIN artistes a ON c.artiste_id = a.id
                                      WHERE c.id = ? AND c.status='published' AND c.is_deleted = 0");
                $st2->execute([$st['media_id']]);
                $song = $st2->fetch(PDO::FETCH_ASSOC);
                if ($song) { $song['demarrages'] = (int)$st['demarrages']; $song['secondes'] = (int)$st['secondes']; $data[] = $song; }
            }
        }
        if (empty($data)) {
            $stmt = $pdo->query("SELECT c.id, c.titre, c.titre_ar, c.audio, c.duree, c.views, c.likes, c.image,
                                        a.nom AS artiste_nom, a.nom_ar AS artiste_nom_ar
                                 FROM chansons c LEFT JOIN artistes a ON c.artiste_id = a.id
                                 WHERE c.status='published' AND c.is_deleted = 0
                                 ORDER BY c.views DESC, c.created_at DESC LIMIT $limit");
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        echo json_encode(["data" => $data, "source" => ($hasStats && !empty($data) ? 'stats' : 'views')]);
        break;

    // --- BOUQALLA DU JOUR (rotation quotidienne) ---
    case 'get_bouqalla_jour':
        $count = (int)$pdo->query("SELECT COUNT(*) FROM bouqalla")->fetchColumn();
        if ($count === 0) { echo json_encode(["error" => "Aucune bouqalla"]); break; }
        $offset = ((int)date('z')) % $count;
        $stmt = $pdo->query("SELECT id, num, arabe, phonetic, francais FROM bouqalla ORDER BY num ASC LIMIT 1 OFFSET $offset");
        echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
        break;

    // --- MINI-ADMIN : liste des contenus à modérer (clé requise) ---
    case 'admin_list':
        requirePermission('moderate');
        $c = $pdo->query("SELECT id, nom, nom_ar, email, message, rating, created_at, status, moderated_at FROM commentaires ORDER BY created_at DESC LIMIT 50")->fetchAll(PDO::FETCH_ASSOC);
        $d = $pdo->query("SELECT id, nom, nom_ar, pour, pour_ar, description, description_ar, likes, created_at, status, moderated_at FROM dedicaces ORDER BY created_at DESC LIMIT 50")->fetchAll(PDO::FETCH_ASSOC);
        $t = $pdo->query("SELECT id, nom, email, phone, sujet, message, admin_status, created_at FROM contacts ORDER BY created_at DESC LIMIT 50")->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(["commentaires" => $c, "dedicaces" => $d, "contacts" => $t]);
        break;

    // --- MINI-ADMIN : action de modération (clé requise) ---
    case 'admin_action':
        requireAdmin(true);
        requirePermission('moderate');
        $data = json_decode(readBody(), true);
        $table = in_array($data['table'] ?? '', ['commentaire', 'dedicace', 'contact'], true) ? $data['table'] : '';
        $id = intval($data['id'] ?? 0);
        $action = $data['action'] ?? '';
        if (!$table || !$id || !$action) {
            jsonOut(["error" => "Données manquantes"], 400);
        }
        $ok = false; $old = null; $new = null;
        $tblName = null;
        if ($table === 'contact') {
            $tblName = 'contacts';
            $st = $pdo->prepare("SELECT admin_status FROM contacts WHERE id = ?"); $st->execute([$id]); $old = $st->fetchColumn();
            $new = ['mark_read' => 'read', 'archive' => 'archived', 'delete' => 'deleted'][$action] ?? null;
            if ($new === 'deleted') { $ok = (bool)$pdo->prepare("DELETE FROM contacts WHERE id = ?")->execute([$id]); }
            elseif ($new) { $ok = (bool)$pdo->prepare("UPDATE contacts SET admin_status = ? WHERE id = ?")->execute([$new, $id]); }
        } else {
            $tblName = $table . 's'; // commentaires / dedicaces
            $st = $pdo->prepare("SELECT status FROM `$tblName` WHERE id = ?"); $st->execute([$id]); $old = $st->fetchColumn();
            $new = ['approve' => 'published', 'reject' => 'rejected', 'delete' => 'deleted'][$action] ?? null;
            if ($new === 'deleted') { $ok = (bool)$pdo->prepare("DELETE FROM `$tblName` WHERE id = ?")->execute([$id]); }
            elseif ($new) {
                $ok = (bool)$pdo->prepare("UPDATE `$tblName` SET status = ?, moderated_at = NOW(), moderation_note = ? WHERE id = ?")
                    ->execute([$new, isset($data['note']) ? substr((string)$data['note'], 0, 1000) : null, $id]);
            }
        }
        if ($ok) {
            logAdminAction($pdo, $action, $tblName, $id, ['old' => $old, 'new' => $new]);
        }
        echo json_encode(["success" => (bool)$ok]);
        break;

    // --- 5 DERNIÈRES DÉDICACES PUBLIÉES (bandeau défilant) ---
    case 'get_last_dedicaces':
        $stmt = $pdo->query("SELECT id, nom, nom_ar, pour, pour_ar, description, description_ar, created_at FROM dedicaces WHERE status = 'published' ORDER BY created_at DESC LIMIT 5");
        echo json_encode(["data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    // --- COMPTEURS POUR LE HERO ---
    case 'get_stats':
        $out = [];
        $out['chansons'] = (int)$pdo->query("SELECT COUNT(*) FROM chansons")->fetchColumn();
        $out['artistes'] = (int)$pdo->query("SELECT COUNT(*) FROM artistes")->fetchColumn();
        $out['emissions'] = (int)$pdo->query("SELECT COUNT(*) FROM emissions")->fetchColumn();
        $out['interviews'] = (int)$pdo->query("SELECT COUNT(*) FROM interviews")->fetchColumn();
        echo json_encode($out);
        break;

    // --- CONNEXION ADMIN PAR COMPTE (table users, rôle admin) ---
    case 'admin_login':
        // Max 8 tentatives / 15 min / IP
        if (!rateLimitHit('admin_login', 8, 900)) {
            jsonOut(["error" => "Trop de tentatives — réessayez plus tard"], 429);
        }
        $data = json_decode(readBody(), true);
        $email = trim($data['email'] ?? '');
        $pass = (string)($data['password'] ?? '');
        if (!$email || !$pass) { jsonOut(["error" => "Email et mot de passe requis"], 400); }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { jsonOut(["error" => "Email invalide"], 400); }
        $st = $pdo->prepare("SELECT id, nom, password, role FROM users WHERE email = ? LIMIT 1");
        $st->execute([$email]);
        $u = $st->fetch(PDO::FETCH_ASSOC);
        // Délai constant anti-timing (même si user absent)
        $hash = $u['password'] ?? '$2y$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWX012345';
        $okPass = password_verify($pass, $hash);
        $okRole = $u && in_array($u['role'] ?? '', ['superadmin', 'admin', 'editor', 'moderator'], true);
        if ($u && $okPass && $okRole) {
            session_regenerate_id(true);
            $_SESSION['admin_id'] = (int)$u['id'];
            $_SESSION['admin_nom'] = $u['nom'];
            $_SESSION['admin_role'] = $u['role'];
            $_SESSION['admin_last'] = time();
            $csrf = adminIssueCsrf();
            logAdminAction($pdo, 'login', 'users', (int)$u['id'], ['email' => $email, 'role' => $u['role']]);
            $role = $u['role'];
            $map = adminPermissionsMap();
            $perms = $map[$role] ?? [];
            jsonOut([
                "success" => true,
                "nom" => $u['nom'],
                "role" => $role,
                "permissions" => $perms,
                "csrf" => $csrf
            ]);
        }
        logAdminAction($pdo, 'login_failed', 'users', null, ['email' => $email]);
        jsonOut(["error" => "Identifiants invalides"], 401);
        break;

    case 'admin_me':
        if (empty($_SESSION['admin_id'])) { jsonOut(["authenticated" => false], 401); }
        $role = adminRole();
        $map = adminPermissionsMap();
        jsonOut([
            "authenticated" => true,
            "nom" => $_SESSION['admin_nom'] ?? '',
            "role" => $role,
            "permissions" => $map[$role] ?? [],
            "csrf" => adminIssueCsrf()
        ]);
        break;

    case 'admin_logout':
        logAdminAction($pdo, 'logout', 'users', isset($_SESSION['admin_id']) ? (int)$_SESSION['admin_id'] : null, null);
        $_SESSION = [];
        if (ini_get("session.use_cookies")) { $p = session_get_cookie_params(); setcookie(session_name(), '', time() - 42000, $p["path"], $p["domain"], $p["secure"], $p["httponly"]); }
        session_destroy();
        echo json_encode(["success" => true]);
        break;


    // ═══════════════════════════════════════════════════════════
    // QACIDATES (table qacidates)
    // ═══════════════════════════════════════════════════════════

    case 'get_qacidates':
        if (!tableExists($pdo, 'qacidates')) {
            $seed = chaabiLoadQacidatesSeed();
            if ($seed) {
                $rows = $seed['data'];
                $total = count($rows);
                $slice = array_slice($rows, $offset, $limit);
                foreach ($slice as &$r) { unset($r['parts_json']); $r = chaabiScrubQacidateRow($r); }
                unset($r);
                echo json_encode([
                    'available' => true,
                    'source' => $seed['source'] ?? 'demo-json',
                    'schema' => 'legacy-seed',
                    'data' => $slice,
                    'total' => $total,
                    'page' => isset($page) ? $page : 1,
                    'limit' => $limit
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                break;
            }
            jsonOut(['error' => 'Table qacidates absente', 'available' => false], 501);
        }
        // Détecter schéma v2 (colonne interprete) vs legacy (artiste / parts_json)
        $cols = [];
        try {
            $cols = $pdo->query("SHOW COLUMNS FROM qacidates")->fetchAll(PDO::FETCH_COLUMN);
        } catch (Exception $e) { $cols = []; }
        $isV2 = in_array('interprete', $cols, true);
        $where = "status = 'published'";
        if (in_array('is_deleted', $cols, true)) $where .= " AND is_deleted = 0";
        if ($isV2) {
            $q = "SELECT id, slug, titre, titre_ar, sous_titre, sous_titre_ar,
                         auteur, auteur_ar, interprete, interprete_ar,
                         theme, genre, image, thumbnail, audio, duree,
                         views, likes, status, published_at
                  FROM qacidates WHERE $where ORDER BY id ASC";
        } else {
            $order = in_array('ordre', $cols, true) ? 'ordre ASC, id ASC' : 'id ASC';
            $q = "SELECT * FROM qacidates WHERE $where ORDER BY $order";
        }
        $c = "SELECT COUNT(*) FROM qacidates WHERE $where";
        $out = getPaginatedData($pdo, $q, $c, [], $offset, $limit);
        if (is_array($out)) {
            $out['available'] = true;
            $out['source'] = 'database';
            $out['schema'] = $isV2 ? 'v2' : 'legacy';
            if (!empty($out['data']) && is_array($out['data'])) {
                foreach ($out['data'] as &$row) {
                    // alias pour le front
                    if ($isV2 && empty($row['artiste']) && !empty($row['interprete'])) {
                        $row['artiste'] = $row['interprete'];
                        $row['artiste_ar'] = $row['interprete_ar'] ?? '';
                    }
                    $row = chaabiScrubQacidateRow($row);
                }
                unset($row);
            }
        }
        echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        break;

    case 'get_qacidate':
    case 'get_qacidate_complet':
        $id = intval($_GET['id'] ?? 0);
        $slug = preg_replace('/[^a-z0-9\-_]/', '', strtolower((string)($_GET['slug'] ?? '')));
        if ($id <= 0 && $slug === '') {
            jsonOut(["error" => "id ou slug requis"], 400);
        }
        if (!tableExists($pdo, 'qacidates')) {
            $seed = chaabiLoadQacidatesSeed();
            $row = null;
            if ($seed && !empty($seed['data'])) {
                foreach ($seed['data'] as $r) {
                    if (($id > 0 && (int)$r['id'] === $id) || ($slug !== '' && ($r['slug'] ?? '') === $slug)) {
                        $row = $r;
                        break;
                    }
                }
            }
            if (!$row) jsonOut(["error" => "Qacidate introuvable"], 404);
            $row['source'] = $seed['source'] ?? 'demo-json';
            $row['available'] = true;
            jsonOut($row);
        }
        $cols = [];
        try { $cols = $pdo->query("SHOW COLUMNS FROM qacidates")->fetchAll(PDO::FETCH_COLUMN); }
        catch (Exception $e) { $cols = []; }
        $isV2 = in_array('interprete', $cols, true);
        $whereExtra = in_array('is_deleted', $cols, true) ? ' AND is_deleted = 0' : '';
        if ($id > 0) {
            $st = $pdo->prepare("SELECT * FROM qacidates WHERE id = ? AND status = 'published'$whereExtra LIMIT 1");
            $st->execute([$id]);
        } else {
            $st = $pdo->prepare("SELECT * FROM qacidates WHERE slug = ? AND status = 'published'$whereExtra LIMIT 1");
            $st->execute([$slug]);
        }
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) jsonOut(["error" => "Qacidate introuvable"], 404);

        if ($isV2) {
            $row['artiste'] = $row['interprete'] ?? '';
            $row['artiste_ar'] = $row['interprete_ar'] ?? '';
            // sections
            $sections = [];
            if (tableExists($pdo, 'qacidate_sections')) {
                $st2 = $pdo->prepare("SELECT id, numero, label_fr, label_ar, contenu_fr, contenu_ar, images, ordre
                                      FROM qacidate_sections WHERE qacidate_id = ?
                                      ORDER BY COALESCE(NULLIF(ordre,0), numero), numero, id");
                $st2->execute([(int)$row['id']]);
                $sections = $st2->fetchAll(PDO::FETCH_ASSOC);
                foreach ($sections as &$sec) {
                    $cf = $sec['contenu_fr'] ?? '';
                    if (is_string($cf) && $cf !== '' && ($cf[0] === '[' || $cf[0] === '{')) {
                        $decoded = json_decode($cf, true);
                        if (json_last_error() === JSON_ERROR_NONE) $sec['contenu_fr_parsed'] = $decoded;
                    }
                    $imgs = $sec['images'] ?? null;
                    if (is_string($imgs) && $imgs !== '' && ($imgs[0] === '[')) {
                        $decoded = json_decode($imgs, true);
                        if (json_last_error() === JSON_ERROR_NONE) $sec['images'] = $decoded;
                    }
                }
                unset($sec);
            }
            $row['sections'] = $sections;
            // facts, noms, navigation
            if (tableExists($pdo, 'qacidate_facts')) {
                $st3 = $pdo->prepare("SELECT * FROM qacidate_facts WHERE qacidate_id = ? ORDER BY ordre ASC, id ASC");
                $st3->execute([(int)$row['id']]);
                $row['facts'] = $st3->fetchAll(PDO::FETCH_ASSOC);
            } else { $row['facts'] = []; }
            if (tableExists($pdo, 'qacidate_noms')) {
                $st4 = $pdo->prepare("SELECT * FROM qacidate_noms WHERE qacidate_id = ? ORDER BY ordre ASC, id ASC");
                $st4->execute([(int)$row['id']]);
                $row['noms'] = $st4->fetchAll(PDO::FETCH_ASSOC);
            } else { $row['noms'] = []; }
            if (tableExists($pdo, 'qacidate_navigation')) {
                $st5 = $pdo->prepare("SELECT * FROM qacidate_navigation WHERE qacidate_id = ? LIMIT 1");
                $st5->execute([(int)$row['id']]);
                $row['navigation'] = $st5->fetch(PDO::FETCH_ASSOC) ?: null;
            } else { $row['navigation'] = null; }
            $row['schema'] = 'v2';
        } else {
            foreach (['parts_json', 'images_json'] as $jk) {
                if (!empty($row[$jk]) && is_string($row[$jk])) {
                    $decoded = json_decode($row[$jk], true);
                    if (json_last_error() === JSON_ERROR_NONE) $row[$jk] = $decoded;
                }
            }
            $row['schema'] = 'legacy';
        }
        $row['source'] = 'database';
        $row['available'] = true;
        $row = chaabiScrubQacidateRow($row);
        jsonOut($row);
        break;


    case 'admin_tables':
        requireAdmin(false);
        $all = [
            "artistes", "chansons", "emissions", "emission_invites", "interviews",
            "dedicaces", "commentaires", "contacts", "bouqalla", "qacidates", "users"
        ];
        $visible = [];
        foreach ($all as $tb) {
            $need = permissionForTableAction($tb, 'read');
            if ($tb === 'users') $need = 'users.manage';
            if (adminHasPermission($need) || adminHasPermission('*')) $visible[] = $tb;
            elseif ($tb === 'contacts' && adminHasPermission('contacts')) $visible[] = $tb;
            elseif (in_array($tb, ['dedicaces','commentaires'], true) && adminHasPermission('moderate')) $visible[] = $tb;
        }
        jsonOut([
            "tables" => $visible,
            "role" => adminRole(),
            "permissions" => adminPermissionsMap()[adminRole()] ?? []
        ]);
        break;

    case 'admin_get':
        // Liste paginée admin d'une table
        $table = preg_replace('/[^a-z0-9_]/', '', strtolower((string)($_GET['table'] ?? '')));
        if ($table === 'users') requirePermission('users.manage');
        else requireTablePermission($table ?: 'artistes', 'read');

        $allowed = [
            'artistes','chansons','emissions','emission_invites','interviews',
            'dedicaces','commentaires','contacts','bouqalla','qacidates','users'
        ];
        if (!in_array($table, $allowed, true)) {
            jsonOut(["error" => "Table non autorisée"], 400);
        }
        $id = intval($_GET['id'] ?? 0);
        if ($id > 0) {
            $st = $pdo->prepare("SELECT * FROM `$table` WHERE id = ? LIMIT 1");
            $st->execute([$id]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            if (!$row) jsonOut(["error" => "Introuvable"], 404);
            // ne jamais renvoyer le hash password
            if ($table === 'users' && isset($row['password'])) unset($row['password']);
            jsonOut($row);
        }
        $page = max(1, intval($_GET['page'] ?? 1));
        $lim = min(100, max(1, intval($_GET['limit'] ?? 20)));
        $off = ($page - 1) * $lim;
        $status = preg_replace('/[^a-z_]/', '', strtolower((string)($_GET['status'] ?? '')));
        $qsearch = trim((string)($_GET['q'] ?? ''));

        $where = [];
        $params = [];
        if ($status !== '' && in_array($table, ['chansons','emissions','interviews','dedicaces','commentaires','qacidates','artistes'], true)) {
            if ($table === 'contacts') {
                $where[] = 'admin_status = ?';
            } else {
                $where[] = 'status = ?';
            }
            $params[] = $status;
        }
        if ($qsearch !== '') {
            if ($table === 'artistes') { $where[] = '(nom LIKE ? OR nom_ar LIKE ?)'; $params[] = "%$qsearch%"; $params[] = "%$qsearch%"; }
            elseif ($table === 'chansons') { $where[] = '(titre LIKE ? OR titre_ar LIKE ?)'; $params[] = "%$qsearch%"; $params[] = "%$qsearch%"; }
            elseif ($table === 'emissions') { $where[] = '(titre LIKE ? OR titre_ar LIKE ? OR CAST(numero_emission AS CHAR) LIKE ?)'; $params[] = "%$qsearch%"; $params[] = "%$qsearch%"; $params[] = "%$qsearch%"; }
            elseif ($table === 'qacidates') { $where[] = '(titre LIKE ? OR titre_ar LIKE ? OR slug LIKE ? OR artiste LIKE ?)'; $params[] = "%$qsearch%"; $params[] = "%$qsearch%"; $params[] = "%$qsearch%"; $params[] = "%$qsearch%"; }
            elseif ($table === 'bouqalla') { $where[] = '(arabe LIKE ? OR francais LIKE ? OR phonetic LIKE ?)'; $params[] = "%$qsearch%"; $params[] = "%$qsearch%"; $params[] = "%$qsearch%"; }
            elseif (in_array($table, ['dedicaces','commentaires','contacts'], true)) { $where[] = '(nom LIKE ? OR message LIKE ? OR description LIKE ?)'; $params[] = "%$qsearch%"; $params[] = "%$qsearch%"; $params[] = "%$qsearch%"; }
        }
        $sqlWhere = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
        $cst = $pdo->prepare("SELECT COUNT(*) FROM `$table` $sqlWhere");
        $cst->execute($params);
        $total = (int)$cst->fetchColumn();
        $st = $pdo->prepare("SELECT * FROM `$table` $sqlWhere ORDER BY id DESC LIMIT $lim OFFSET $off");
        $st->execute($params);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);
        if ($table === 'users') {
            foreach ($rows as &$r) { unset($r['password']); }
            unset($r);
        }
        jsonOut([
            "data" => $rows,
            "total" => $total,
            "page" => $page,
            "limit" => $lim,
            "pages" => $lim ? (int)ceil($total / $lim) : 1
        ]);
        break;

    case 'admin_save':
        // Création / mise à jour (POST JSON)
        requireAdmin(true);
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { jsonOut(["error" => "POST requis"], 405); }
        $data = json_decode(readBody(), true);
        if (!is_array($data)) { jsonOut(["error" => "JSON invalide"], 400); }
        $table = preg_replace('/[^a-z0-9_]/', '', strtolower((string)($data['table'] ?? '')));
        $allowed = [
            'artistes','chansons','emissions','emission_invites','interviews',
            'dedicaces','commentaires','contacts','bouqalla','qacidates'
        ];
        if (!in_array($table, $allowed, true)) {
            jsonOut(["error" => "Table non autorisée"], 400);
        }
        requireTablePermission($table, 'write');
        $id = intval($data['id'] ?? 0);
        unset($data['table'], $data['id']);
        // champs interdits
        unset($data['password']);
        if (!$data) { jsonOut(["error" => "Aucun champ"], 400); }

        // whitelist colonnes existantes
        $colsStmt = $pdo->query("SHOW COLUMNS FROM `$table`");
        $cols = [];
        foreach ($colsStmt->fetchAll(PDO::FETCH_ASSOC) as $c) {
            if ($c['Field'] === 'id') continue;
            $cols[] = $c['Field'];
        }
        $fields = [];
        $values = [];
        foreach ($data as $k => $v) {
            $k = preg_replace('/[^a-z0-9_]/', '', strtolower((string)$k));
            if (!in_array($k, $cols, true)) continue;
            if (is_array($v) || is_object($v)) $v = json_encode($v, JSON_UNESCAPED_UNICODE);
            $fields[] = $k;
            $values[] = $v;
        }
        if (!$fields) { jsonOut(["error" => "Aucun champ valide"], 400); }

        if ($id > 0) {
            $sets = implode(', ', array_map(function ($f) { return "`$f` = ?"; }, $fields));
            if (in_array('updated_at', $cols, true) && !in_array('updated_at', $fields, true)) {
                $sets .= ', updated_at = NOW()';
            }
            $sql = "UPDATE `$table` SET $sets WHERE id = ?";
            $values[] = $id;
            $st = $pdo->prepare($sql);
            $ok = $st->execute($values);
            if ($ok) logAdminAction($pdo, 'update', $table, $id, ['fields' => $fields]);
            jsonOut(["success" => (bool)$ok, "id" => $id, "action" => "update"]);
        } else {
            $ph = implode(', ', array_fill(0, count($fields), '?'));
            $flist = implode(', ', array_map(function ($f) { return "`$f`"; }, $fields));
            $sql = "INSERT INTO `$table` ($flist) VALUES ($ph)";
            $st = $pdo->prepare($sql);
            $ok = $st->execute($values);
            $newId = (int)$pdo->lastInsertId();
            if ($ok) logAdminAction($pdo, 'insert', $table, $newId, ['fields' => $fields]);
            jsonOut(["success" => (bool)$ok, "id" => $newId, "action" => "insert"]);
        }
        break;

    case 'admin_delete':
        requireAdmin(true);
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { jsonOut(["error" => "POST requis"], 405); }
        $data = json_decode(readBody(), true);
        $table = preg_replace('/[^a-z0-9_]/', '', strtolower((string)($data['table'] ?? '')));
        $id = intval($data['id'] ?? 0);
        $soft = !empty($data['soft']);
        $allowed = [
            'artistes','chansons','emissions','emission_invites','interviews',
            'dedicaces','commentaires','contacts','bouqalla','qacidates'
        ];
        if (!in_array($table, $allowed, true) || $id <= 0) {
            jsonOut(["error" => "Paramètres invalides"], 400);
        }
        requireTablePermission($table, 'delete');
        if ($soft) {
            // soft delete si colonnes disponibles
            $cols = array_column($pdo->query("SHOW COLUMNS FROM `$table`")->fetchAll(PDO::FETCH_ASSOC), 'Field');
            if (in_array('is_deleted', $cols, true)) {
                $ok = $pdo->prepare("UPDATE `$table` SET is_deleted = 1 WHERE id = ?")->execute([$id]);
            } elseif (in_array('status', $cols, true)) {
                $ok = $pdo->prepare("UPDATE `$table` SET status = 'deleted' WHERE id = ?")->execute([$id]);
            } else {
                $ok = $pdo->prepare("DELETE FROM `$table` WHERE id = ?")->execute([$id]);
            }
        } else {
            $ok = $pdo->prepare("DELETE FROM `$table` WHERE id = ?")->execute([$id]);
        }
        if ($ok) logAdminAction($pdo, $soft ? 'soft_delete' : 'delete', $table, $id, null);
        jsonOut(["success" => (bool)$ok, "id" => $id]);
        break;

    case 'admin_logs':
        requirePermission('logs.read');
        $page = max(1, intval($_GET['page'] ?? 1));
        $lim = min(100, max(1, intval($_GET['limit'] ?? 50)));
        $off = ($page - 1) * $lim;
        $actionFilter = preg_replace('/[^a-z0-9_]/', '', strtolower((string)($_GET['action_filter'] ?? '')));
        $tableFilter = preg_replace('/[^a-z0-9_]/', '', strtolower((string)($_GET['table'] ?? '')));
        $where = [];
        $params = [];
        if ($actionFilter !== '') { $where[] = 'action = ?'; $params[] = $actionFilter; }
        if ($tableFilter !== '') { $where[] = 'table_name = ?'; $params[] = $tableFilter; }
        $sqlWhere = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
        try {
            $cst = $pdo->prepare("SELECT COUNT(*) FROM admin_logs $sqlWhere");
            $cst->execute($params);
            $total = (int)$cst->fetchColumn();
            $st = $pdo->prepare("SELECT id, admin_id, admin_nom, action, table_name, record_id, details, ip, created_at
                                 FROM admin_logs $sqlWhere ORDER BY id DESC LIMIT $lim OFFSET $off");
            $st->execute($params);
            $rows = $st->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as &$row) {
                if (!empty($row['details']) && is_string($row['details'])) {
                    $d = json_decode($row['details'], true);
                    if (json_last_error() === JSON_ERROR_NONE) $row['details'] = $d;
                }
            }
            unset($row);
            jsonOut(["data" => $rows, "total" => $total, "page" => $page, "limit" => $lim]);
        } catch (Exception $e) {
            jsonOut(["data" => [], "total" => 0, "page" => $page, "limit" => $lim, "hint" => "Importer sql/admin_logs.sql"]);
        }
        break;

    case 'api_list':
        // Documentation des actions disponibles
        jsonOut([
            "public" => [
                "get_artistes", "get_artiste_complet", "get_guest_complet",
                "get_chansons", "get_chanson_featured",
                "get_emissions", "get_emission_complet",
                "get_interviews", "get_media",
                "get_dedicaces", "get_last_dedicaces", "add_dedicace",
                "get_commentaires", "add_commentaire",
                "get_contacts", "add_contact",
                "get_bouqalla", "get_bouqalla_jour",
                "get_qacidates", "get_qacidate", "get_qacidate_complet",
                "search", "get_live_bar", "get_stats", "get_top_ecoutes",
                "like_item", "track_view", "track_play", "track_listen",
                "rate_emission", "add_emission_comment"
            ],
            "admin" => [
                "admin_login", "admin_logout", "admin_list", "admin_action",
                "admin_tables", "admin_get", "admin_save", "admin_delete", "admin_logs", "admin_me"
            ]
        ]);
        break;


    default:
        echo json_encode(["error" => "Action non reconnue: " . ($action ?? 'aucune')]);
        break;
}
?>