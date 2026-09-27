<?php
/* ══════════════════════════════════════════════════════════════════
   CHAABI MUSIC — admin/_api.php
   API CRUD complète du panneau d'administration
   Tables : artistes, chansons, emissions, interviews, emission_invites
   Médias : /music/ — chansons → img_<categorie> / audio_<categorie>
            autres   → img_artistes, img_emissions, audio_emissions,
                       img_interviews, audio_interviews, img_invites
   Auth   : UNIQUEMENT par compte — table users (password_verify)
   ══════════════════════════════════════════════════════════════════ */
header("Content-Type: application/json; charset=UTF-8");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("Referrer-Policy: no-referrer");
// CORS : admin = same-origin uniquement (pas de *)
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$host = (isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '');
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https');
if ($https) {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}
// Autoriser seulement le même host
if ($origin && $host && preg_match('#^https?://' . preg_quote($host, '#') . '$#i', $origin)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once dirname(__DIR__) . '/config/bootstrap.php';
$dbCfg = chaabi_db_config();
$host = $dbCfg['host'];
$dbname = $dbCfg['name'];
$username = $dbCfg['user'];
$password = $dbCfg['pass'];

// Racine web réelle : /music est à la racine du serveur (http://localhost/music),
// le site (et admin/) vit dans un sous-dossier comme api_radiochaabi/
$webRoot = !empty($_SERVER['DOCUMENT_ROOT'])
    ? rtrim(str_replace('\\', '/', $_SERVER['DOCUMENT_ROOT']), '/')
    : dirname(__DIR__, 2); // fallback CLI
define('MEDIA_ROOT', $webRoot . '/music');

function readBody() { static $b = false; if ($b === false) $b = file_get_contents("php://input"); return $b; }
function jsonIn() { $d = json_decode(readBody(), true); return is_array($d) ? $d : []; }

try {
    try {
    $pdo = chaabi_pdo();
} catch (PDOException $e) {
    error_log('[Chaabi admin] BDD: ' . $e->getMessage());
    http_response_code(503);
    echo json_encode(['error' => 'Connexion BDD échouée']);
    exit;
}
} catch (PDOException $e) { die(json_encode(["error" => "Connexion BDD échouée: " . $e->getMessage()])); }
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.gc_maxlifetime', 604800);
    $__secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https')
        || (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443);
    session_set_cookie_params([
        'lifetime' => 604800,
        'path' => '/',
        'secure' => $__secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}


/** PDO dédié BDD qacidates (chaabi_music_qacidats_v1) */
function qacidates_pdo(): PDO {
    static $qpdo = null;
    if ($qpdo instanceof PDO) return $qpdo;
    $file = dirname(__DIR__) . '/config/qacidates.local.php';
    $local = is_readable($file) ? (require $file) : [];
    if (!is_array($local)) $local = [];
    $host = $local['host'] ?? 'localhost';
    $name = $local['name'] ?? 'chaabi_music_qacidats_v1';
    $user = $local['user'] ?? 'root';
    $pass = $local['pass'] ?? 'root';
    $charset = $local['charset'] ?? 'utf8mb4';
    $dsn = "mysql:host={$host};dbname={$name};charset={$charset}";
    $qpdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    return $qpdo;
}

function qacidates_table_exists(PDO $pdo, string $name): bool {
    $st = $pdo->prepare('SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1');
    $st->execute([$name]);
    return (bool)$st->fetchColumn();
}

function handleQacidatesAdmin(string $op): void {
    needAuth();
    try {
        $qpdo = qacidates_pdo();
    } catch (Throwable $e) {
        http_response_code(503);
        echo json_encode(['error' => 'BDD qacidates inaccessible: ' . $e->getMessage()]);
        exit;
    }

    if ($op === 'list') {
        $q = trim($_GET['q'] ?? '');
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(500, max(1, (int)($_GET['limit'] ?? 50)));
        $offset = ($page - 1) * $limit;
        $where = '1=1';
        $params = [];
        if ($q !== '') {
            $where .= ' AND (titre LIKE ? OR titre_ar LIKE ? OR interprete LIKE ? OR auteur LIKE ? OR slug LIKE ? OR theme LIKE ?)';
            $like = '%' . $q . '%';
            $params = [$like, $like, $like, $like, $like, $like];
        }
        $stc = $qpdo->prepare("SELECT COUNT(*) FROM qacidates WHERE $where");
        $stc->execute($params);
        $total = (int)$stc->fetchColumn();
        $sql = "SELECT id, slug, titre, titre_ar, interprete, interprete_ar, auteur, auteur_ar, theme, image, views, status, updated_at
                FROM qacidates WHERE $where ORDER BY id ASC LIMIT $offset, $limit";
        $st = $qpdo->prepare($sql);
        $st->execute($params);
        $rows = $st->fetchAll();
        foreach ($rows as &$r) {
            $r['artiste'] = $r['interprete'] ?? '';
            $r['artiste_ar'] = $r['interprete_ar'] ?? '';
        }
        unset($r);
        echo json_encode(['ok' => true, 'data' => $rows, 'total' => $total, 'page' => $page, 'db' => 'qacidates']);
        exit;
    }

    if ($op === 'get') {
        $id = (int)($_GET['id'] ?? 0);
        $st = $qpdo->prepare('SELECT * FROM qacidates WHERE id = ? LIMIT 1');
        $st->execute([$id]);
        $row = $st->fetch();
        if (!$row) {
            echo json_encode(['error' => 'Qacidate introuvable']);
            exit;
        }
        $row['artiste'] = $row['interprete'] ?? '';
        $row['artiste_ar'] = $row['interprete_ar'] ?? '';
        $row['artiste_image'] = $row['image'] ?? '';
        $parts = [];
        if (qacidates_table_exists($qpdo, 'qacidate_sections')) {
            $st2 = $qpdo->prepare('SELECT id, numero, label_fr, label_ar, contenu_fr, contenu_ar, images, ordre FROM qacidate_sections WHERE qacidate_id = ? ORDER BY ordre ASC, numero ASC, id ASC');
            $st2->execute([$id]);
            foreach ($st2->fetchAll() as $sec) {
                $img = $sec['images'];
                $img0 = '';
                if (is_string($img) && $img !== '') {
                    $decoded = json_decode($img, true);
                    if (is_array($decoded) && isset($decoded[0])) {
                        $img0 = is_array($decoded[0]) ? ($decoded[0]['src'] ?? '') : (string)$decoded[0];
                    } else {
                        $img0 = $img;
                    }
                }
                $fr = $sec['contenu_fr'] ?? '';
                $frText = $fr;
                if (is_string($fr) && $fr !== '' && ($fr[0] === '[' || $fr[0] === '{')) {
                    $blocks = json_decode($fr, true);
                    if (is_array($blocks)) {
                        $lines = [];
                        foreach ($blocks as $b) {
                            if (is_array($b) && isset($b['texte'])) $lines[] = $b['texte'];
                            elseif (is_string($b)) $lines[] = $b;
                        }
                        $frText = implode("\n\n", $lines);
                    }
                }
                $parts[] = [
                    'numero' => (int)($sec['numero'] ?? 1),
                    'label_fr' => $sec['label_fr'] ?? '',
                    'label_ar' => $sec['label_ar'] ?? '',
                    'texte_fr' => $frText,
                    'texte_ar' => $sec['contenu_ar'] ?? '',
                    'image_ar' => is_string($img0) ? $img0 : '',
                ];
            }
        }
        $row['parts_json'] = $parts;

        $facts = [];
        if (qacidates_table_exists($qpdo, 'qacidate_facts')) {
            $stf = $qpdo->prepare('SELECT icone, titre, valeur, ordre FROM qacidate_facts WHERE qacidate_id = ? ORDER BY ordre ASC, id ASC');
            $stf->execute([$id]);
            $facts = $stf->fetchAll();
        }
        $row['facts'] = $facts;

        $nav = ['prev_slug'=>'','prev_titre'=>'','next_slug'=>'','next_titre'=>''];
        if (qacidates_table_exists($qpdo, 'qacidate_navigation')) {
            $stn = $qpdo->prepare('SELECT prev_slug, prev_titre, next_slug, next_titre FROM qacidate_navigation WHERE qacidate_id = ? LIMIT 1');
            $stn->execute([$id]);
            $nr = $stn->fetch();
            if ($nr) $nav = $nr;
        }
        $row['navigation'] = $nav;

        // list for nav select
        $stAll = $qpdo->query("SELECT id, slug, titre FROM qacidates WHERE is_deleted=0 AND id <> ".(int)$id." ORDER BY titre ASC LIMIT 200");
        $row['nav_options'] = $stAll ? $stAll->fetchAll() : [];

        echo json_encode(['ok' => true, 'data' => $row]);
        exit;
    }

    if ($op === 'save') {
        $d = jsonIn();
        $id = (int)($d['id'] ?? 0);
        $data = is_array($d['data'] ?? null) ? $d['data'] : [];
        $titre = trim((string)($data['titre'] ?? ''));
        if ($titre === '') {
            echo json_encode(['error' => 'Titre requis']);
            exit;
        }
        $slug = trim((string)($data['slug'] ?? ''));
        if ($slug === '') {
            $slug = preg_replace('/[^a-z0-9\-]+/', '-', strtolower(@iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $titre) ?: $titre));
            $slug = trim($slug, '-') ?: ('qacidate-' . time());
        }
        $fields = [
            'slug' => $slug,
            'titre' => $titre,
            'titre_ar' => trim((string)($data['titre_ar'] ?? '')),
            'sous_titre' => trim((string)($data['sous_titre'] ?? '')),
            'sous_titre_ar' => trim((string)($data['sous_titre_ar'] ?? '')),
            'auteur' => trim((string)($data['auteur'] ?? '')),
            'auteur_ar' => trim((string)($data['auteur_ar'] ?? '')),
            'interprete' => trim((string)($data['interprete'] ?? $data['artiste'] ?? '')),
            'interprete_ar' => trim((string)($data['interprete_ar'] ?? $data['artiste_ar'] ?? '')),
            'genre' => trim((string)($data['genre'] ?? 'Chaabi')),
            'theme' => trim((string)($data['theme'] ?? '')),
            'image' => trim((string)($data['image'] ?? '')),
            'thumbnail' => trim((string)($data['thumbnail'] ?? '')),
            'audio' => trim((string)($data['audio'] ?? '')),
            'duree' => trim((string)($data['duree'] ?? '')),
            'img_folder' => trim((string)($data['img_folder'] ?? '')),
            'web_path' => trim((string)($data['web_path'] ?? '')),
            'refrain_fr' => (string)($data['refrain_fr'] ?? ''),
            'refrain_ar' => (string)($data['refrain_ar'] ?? ''),
            'status' => trim((string)($data['status'] ?? 'published')) ?: 'published',
            'meta_title' => trim((string)($data['meta_title'] ?? '')),
            'meta_title_ar' => trim((string)($data['meta_title_ar'] ?? '')),
            'meta_description' => (string)($data['meta_description'] ?? ''),
            'meta_description_ar' => (string)($data['meta_description_ar'] ?? ''),
            'updated_at' => date('Y-m-d H:i:s'),
        ];
        // empty strings -> null for optional cols
        foreach ($fields as $k => $v) {
            if ($v === '' && !in_array($k, ['titre', 'slug', 'status', 'updated_at', 'genre'], true)) {
                $fields[$k] = null;
            }
        }

        if ($id > 0) {
            $sets = [];
            $params = [];
            foreach ($fields as $k => $v) {
                $sets[] = "`$k` = ?";
                $params[] = $v;
            }
            $params[] = $id;
            $qpdo->prepare('UPDATE qacidates SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
        } else {
            $fields['created_at'] = date('Y-m-d H:i:s');
            $fields['is_deleted'] = 0;
            $fields['views'] = 0;
            $fields['likes'] = 0;
            $cols = array_keys($fields);
            $ph = array_fill(0, count($cols), '?');
            $qpdo->prepare('INSERT INTO qacidates (`' . implode('`, `', $cols) . '`) VALUES (' . implode(', ', $ph) . ')')->execute(array_values($fields));
            $id = (int)$qpdo->lastInsertId();
        }

        $parts = $data['parts_json'] ?? $data['parts'] ?? [];
        if (is_string($parts)) {
            $parts = json_decode($parts, true) ?: [];
        }
        if (qacidates_table_exists($qpdo, 'qacidate_sections') && is_array($parts)) {
            $qpdo->prepare('DELETE FROM qacidate_sections WHERE qacidate_id = ?')->execute([$id]);
            $ins = $qpdo->prepare('INSERT INTO qacidate_sections (qacidate_id, numero, label_fr, label_ar, contenu_fr, contenu_ar, images, ordre) VALUES (?,?,?,?,?,?,?,?)');
            $num = 1;
            foreach ($parts as $p) {
                if (!is_array($p)) continue;
                $fr = trim((string)($p['texte_fr'] ?? $p['contenu_fr'] ?? ''));
                $ar = trim((string)($p['texte_ar'] ?? $p['contenu_ar'] ?? ''));
                $img = trim((string)($p['image_ar'] ?? ''));
                $labFr = trim((string)($p['label_fr'] ?? ('Partie ' . $num)));
                $labAr = trim((string)($p['label_ar'] ?? ''));
                $contenuFr = $fr !== '' ? json_encode([['type' => 'normal', 'texte' => $fr]], JSON_UNESCAPED_UNICODE) : '';
                $images = $img !== '' ? json_encode([['src' => $img, 'alt' => 'Manuscrit — Partie ' . $num]], JSON_UNESCAPED_UNICODE) : null;
                $ins->execute([$id, $num, $labFr, $labAr, $contenuFr, $ar, $images, $num]);
                $num++;
            }
        }
        // Facts
        if (qacidates_table_exists($qpdo, 'qacidate_facts')) {
            $qpdo->prepare('DELETE FROM qacidate_facts WHERE qacidate_id = ?')->execute([$id]);
            $facts = $data['facts'] ?? [];
            if (is_array($facts)) {
                $insF = $qpdo->prepare('INSERT INTO qacidate_facts (qacidate_id, icone, titre, valeur, ordre) VALUES (?,?,?,?,?)');
                $o = 1;
                foreach ($facts as $f) {
                    if (!is_array($f)) continue;
                    $ico = trim((string)($f['icone'] ?? ''));
                    $ft = trim((string)($f['titre'] ?? ''));
                    $fv = trim((string)($f['valeur'] ?? ''));
                    if ($ico === '' && $ft === '' && $fv === '') continue;
                    $insF->execute([$id, $ico, $ft, $fv, $o++]);
                }
            }
        }

        // Navigation
        if (qacidates_table_exists($qpdo, 'qacidate_navigation')) {
            $nav = is_array($data['navigation'] ?? null) ? $data['navigation'] : [];
            $qpdo->prepare('DELETE FROM qacidate_navigation WHERE qacidate_id = ?')->execute([$id]);
            $ps = trim((string)($nav['prev_slug'] ?? ''));
            $pt = trim((string)($nav['prev_titre'] ?? ''));
            $ns = trim((string)($nav['next_slug'] ?? ''));
            $nt = trim((string)($nav['next_titre'] ?? ''));
            if ($ps !== '' || $ns !== '') {
                $qpdo->prepare('INSERT INTO qacidate_navigation (qacidate_id, prev_slug, prev_titre, next_slug, next_titre) VALUES (?,?,?,?,?)')
                    ->execute([$id, $ps, $pt, $ns, $nt]);
            }
        }

        echo json_encode(['ok' => true, 'id' => $id]);
        exit;
    }

    if ($op === 'delete') {
        $d = jsonIn();
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) $id = (int)($d['id'] ?? 0);
        if ($id <= 0) {
            echo json_encode(['error' => 'id requis']);
            exit;
        }
        if (qacidates_table_exists($qpdo, 'qacidate_sections')) {
            $qpdo->prepare('DELETE FROM qacidate_sections WHERE qacidate_id = ?')->execute([$id]);
        }
        if (qacidates_table_exists($qpdo, 'qacidate_facts')) {
            $qpdo->prepare('DELETE FROM qacidate_facts WHERE qacidate_id = ?')->execute([$id]);
        }
        if (qacidates_table_exists($qpdo, 'qacidate_navigation')) {
            $qpdo->prepare('DELETE FROM qacidate_navigation WHERE qacidate_id = ?')->execute([$id]);
        }
        $qpdo->prepare('DELETE FROM qacidates WHERE id = ?')->execute([$id]);
        echo json_encode(['ok' => true]);
        exit;
    }

    echo json_encode(['error' => 'Opération qacidates inconnue: ' . $op]);
    exit;
}


function isAuthed() {
    return !empty($_SESSION['admin_id']);
}
function needAuth() { if (!isAuthed()) { http_response_code(401); die(json_encode(["error" => "Non authentifié"])); } }

/* ── Utils SEO / meta automatiques ─────────────────────────────── */
function slugify($s) {
    $s = trim(mb_strtolower((string)$s, 'UTF-8'));
    $map = ['à'=>'a','á'=>'a','â'=>'a','ä'=>'a','ã'=>'a','å'=>'a','æ'=>'ae','ç'=>'c','è'=>'e','é'=>'e','ê'=>'e','ë'=>'e','ì'=>'i','í'=>'i','î'=>'i','ï'=>'i','ñ'=>'n','ò'=>'o','ó'=>'o','ô'=>'o','ö'=>'o','õ'=>'o','ø'=>'o','ù'=>'u','ú'=>'u','û'=>'u','ü'=>'u','ý'=>'y','ÿ'=>'y','œ'=>'oe','ğ'=>'g','ş'=>'s','ı'=>'i','đ'=>'d','č'=>'c','š'=>'s','ž'=>'z'];
    $s = strtr($s, $map);
    $s = preg_replace('/[^a-z0-9]+/', '-', $s);
    return trim($s, '-') ?: 'item';
}
function excerpt($s, $len = 160) {
    $s = trim(preg_replace('/\s+/', ' ', strip_tags((string)$s)));
    if (mb_strlen($s, 'UTF-8') <= $len) return $s;
    return mb_substr($s, 0, $len, 'UTF-8') . '…';
}
function uniqueSlug($pdo, $table, $base, $excludeId = 0) {
    $slug = $base; $i = 2;
    while (true) {
        $st = $pdo->prepare("SELECT COUNT(*) FROM `$table` WHERE slug = ? AND id != ?");
        $st->execute([$slug, $excludeId]);
        if (!$st->fetchColumn()) return $slug;
        $slug = $base . '-' . ($i++);
    }
}
function buildMeta($titre, $titreAr, $desc, $descAr) {
    return [
        'meta_title'        => mb_substr(trim((string)$titre), 0, 60, 'UTF-8'),
        'meta_title_ar'     => $titreAr !== '' ? mb_substr(trim((string)$titreAr), 0, 60, 'UTF-8') : null,
        'meta_description'  => excerpt($desc),
        'meta_description_ar' => $descAr !== '' ? excerpt($descAr) : null
    ];
}
function pick($data, $keys) {
    $out = [];
    foreach ($keys as $k) if (array_key_exists($k, $data)) $out[$k] = $data[$k];
    return $out;
}
function emptyToNull(&$v) { if ($v === '') $v = null; }
function applyStatus(&$fields) {
    if (isset($fields['status'])) {
        if ($fields['status'] === 'published') {
            $fields['published_at'] = $fields['published_at'] ?? date('Y-m-d H:i:s');
        }
        emptyToNull($fields['status']);
    }
}

/* ── Upload ────────────────────────────────────────────────────── */
/* Garde le nom d'origine (nettoyé), suffixe -1/-2 en cas de collision */
function safeFileName($name) {
    $name = preg_replace('/[\x00-\x1F\/\\\\:*?"<>|]/', '-', trim($name));
    $name = preg_replace('/\s+/', '-', $name);
    $name = preg_replace('/-+/', '-', $name);
    return trim($name, '.-');
}
function handleUpload() {
    needAuth();
    $target = $_POST['target'] ?? '';
    if (!preg_match('#^(img_|audio_)[a-zA-Z0-9_\-]+$#', $target)) {
        die(json_encode(["error" => "Cible d'upload invalide"]));
    }
    if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        die(json_encode(["error" => "Aucun fichier reçu (erreur " . ($_FILES['file']['error'] ?? '?') . ")"]));
    }
    $imgExt = ['jpg','jpeg','png','gif','webp'];
    $audExt = ['mp3','wav','ogg','m4a','aac','flac'];
    $orig = $_FILES['file']['name'];
    $ext = strtolower(pathinfo($orig, PATHINFO_EXTENSION));
    $allowed = strpos($target, 'img_') === 0 ? $imgExt : $audExt;
    if (!in_array($ext, $allowed, true)) die(json_encode(["error" => "Extension .$ext non autorisée pour $target"]));
    $maxBytes = strpos($target, 'img_') === 0 ? 8 * 1024 * 1024 : 80 * 1024 * 1024;
    if ($_FILES['file']['size'] > $maxBytes) die(json_encode(["error" => "Fichier trop volumineux (max " . round($maxBytes / 1048576) . " Mo)"]));
    $dir = MEDIA_ROOT . '/' . $target;
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        die(json_encode(["error" => "Impossible de créer le dossier /music/$target — vérifiez les permissions"]));
    }
    // Nom d'origine conservé (nettoyé) ; anti-collision -1, -2…
    $base = safeFileName(pathinfo($orig, PATHINFO_FILENAME));
    if ($base === '') $base = 'fichier';
    $final = $base . '.' . $ext;
    $i = 1;
    while (file_exists($dir . '/' . $final)) { $final = $base . '-' . ($i++) . '.' . $ext; }
    $dest = $dir . '/' . $final;
    if (!move_uploaded_file($_FILES['file']['tmp_name'], $dest)) {
        die(json_encode(["error" => "Échec de l'enregistrement du fichier"]));
    }
    echo json_encode(["ok" => true, "path" => "/music/$target/$final", "name" => $final]);
    exit;
}

/* ── Login / session ───────────────────────────────────────────── */
function doLogin($pdo) {
    $d = jsonIn();
    $email = trim($d['email'] ?? ''); $pass = $d['password'] ?? '';
    if ($email === '' || $pass === '') die(json_encode(["error" => "Email et mot de passe requis"]));
    $st = $pdo->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
    $st->execute([$email]);
    $u = $st->fetch();
    if ($u && password_verify($pass, $u['password']) && in_array($u['role'], ['admin', 'superadmin'], true)) {
        session_regenerate_id(true);
        $_SESSION['admin_id'] = $u['id'];
        $_SESSION['admin_name'] = $u['nom'];
        echo json_encode(["ok" => true, "user" => ["nom" => $u['nom'], "role" => $u['role']]]);
    } else {
        die(json_encode(["error" => "Email ou mot de passe invalide"]));
    }
}

/* ── CRUD générique par table ──────────────────────────────────── */
$SPEC = [
    'artistes' => [
        'title' => 'nom',
        'search' => "AND (a.nom LIKE :q OR a.nom_ar LIKE :q)",
        'list' => "SELECT a.*, c.nom AS categorie_nom FROM artistes a LEFT JOIN categories c ON c.id = a.categorie_id WHERE a.is_deleted = 0 :q ORDER BY a.id DESC",
        'count' => "SELECT COUNT(*) FROM artistes a WHERE a.is_deleted = 0 :q",
        'fields' => ['nom','nom_ar','bio','bio_ar','image','thumbnail','categorie_id','slug','meta_title','meta_title_ar','meta_description','meta_description_ar'],
        'slugTable' => 'artistes', 'slugField' => 'nom'
    ],
    'chansons' => [
        'title' => 'titre',
        'search' => "AND (ch.titre LIKE :q OR ch.titre_ar LIKE :q OR a.nom LIKE :q)",
        'list' => "SELECT ch.*, a.nom AS artiste_nom, c.nom AS categorie_nom, c.slug AS categorie_slug FROM chansons ch LEFT JOIN artistes a ON a.id = ch.artiste_id LEFT JOIN categories c ON c.id = ch.categorie_id WHERE ch.is_deleted = 0 :q ORDER BY ch.id DESC",
        'count' => "SELECT COUNT(*) FROM chansons ch LEFT JOIN artistes a ON a.id = ch.artiste_id WHERE ch.is_deleted = 0 :q",
        'fields' => ['titre','titre_ar','artiste_id','categorie_id','image','audio','duree','status','published_at'],
        'slugTable' => 'chansons', 'slugField' => 'titre'
    ],
    'emissions' => [
        'title' => 'titre',
        'search' => "AND (e.titre LIKE :q OR e.titre_ar LIKE :q OR e.numero_emission LIKE :q)",
        'list' => "SELECT e.*, u.nom AS animateur_nom, (SELECT COUNT(*) FROM emission_invites ei WHERE ei.emission_id = e.id) AS invites_count FROM emissions e LEFT JOIN users u ON u.id = e.animateur_id WHERE 1 = 1 :q ORDER BY e.id DESC",
        'count' => "SELECT COUNT(*) FROM emissions e WHERE 1 = 1 :q",
        'fields' => ['numero_emission','titre','titre_ar','description','description_ar','image','audio','animateur_id','date_emission','duree','status','published_at','date_modification'],
        'slugTable' => 'emissions', 'slugField' => 'titre'
    ],
    'interviews' => [
        'title' => 'artiste_nom',
        'search' => "AND (i.artiste_nom LIKE :q OR i.artiste_nom_ar LIKE :q OR a.nom LIKE :q)",
        'list' => "SELECT i.*, a.nom AS artiste_ref_nom FROM interviews i LEFT JOIN artistes a ON a.id = i.artiste_id WHERE i.is_deleted = 0 :q ORDER BY i.id DESC",
        'count' => "SELECT COUNT(*) FROM interviews i LEFT JOIN artistes a ON a.id = i.artiste_id WHERE i.is_deleted = 0 :q",
        'fields' => ['artiste_nom','artiste_nom_ar','artiste_id','image','audio','date_interview','duree','status','published_at'],
        'slugTable' => 'interviews', 'slugField' => 'artiste_nom'
    ],
    'dedicaces' => [
        'title' => 'nom',
        'search' => "AND (d.nom LIKE :q OR d.nom_ar LIKE :q OR d.pour LIKE :q OR d.pour_ar LIKE :q OR d.description LIKE :q OR d.description_ar LIKE :q OR c.titre LIKE :q)",
        'list' => "SELECT d.*, c.titre AS chanson_titre, a.nom AS chanson_artiste FROM dedicaces d LEFT JOIN chansons c ON c.id = d.chanson_id LEFT JOIN artistes a ON a.id = c.artiste_id WHERE 1 = 1 :q ORDER BY d.created_at DESC",
        'count' => "SELECT COUNT(*) FROM dedicaces d WHERE 1 = 1 :q",
        'fields' => ['nom','nom_ar','pour','pour_ar','description','description_ar','chanson_id','status','moderation_note','created_at'],
        'slugTable' => null
    ],
    'commentaires' => [
        'title' => 'nom',
        'search' => "AND (c.nom LIKE :q OR c.nom_ar LIKE :q OR c.message LIKE :q OR c.message_ar LIKE :q OR c.email LIKE :q)",
        'list' => "SELECT * FROM commentaires c WHERE 1 = 1 :q ORDER BY c.created_at DESC",
        'count' => "SELECT COUNT(*) FROM commentaires c WHERE 1 = 1 :q",
        'fields' => ['nom','nom_ar','email','message','message_ar','rating','status','moderation_note','created_at'],
        'slugTable' => null
    ],
    'emission_comments' => [
        'title' => 'nom',
        'search' => "AND (c.nom LIKE :q OR c.nom_ar LIKE :q OR c.message LIKE :q OR c.message_ar LIKE :q OR c.email LIKE :q OR e.titre LIKE :q)",
        'list' => "SELECT c.*, e.titre AS emission_titre, e.numero_emission FROM emission_comments c LEFT JOIN emissions e ON e.id = c.emission_id WHERE 1 = 1 :q ORDER BY c.created_at DESC",
        'count' => "SELECT COUNT(*) FROM emission_comments c LEFT JOIN emissions e ON e.id = c.emission_id WHERE 1 = 1 :q",
        'fields' => ['emission_id','nom','nom_ar','email','message','message_ar','status','moderation_note','created_at','country','city'],
        'slugTable' => null
    ],
    'contacts' => [
        'title' => 'nom',
        'search' => "AND (ct.nom LIKE :q OR ct.email LIKE :q OR ct.phone LIKE :q OR ct.sujet LIKE :q OR ct.message LIKE :q)",
        'list' => "SELECT * FROM contacts ct WHERE 1 = 1 :q ORDER BY ct.created_at DESC",
        'count' => "SELECT COUNT(*) FROM contacts ct WHERE 1 = 1 :q",
        'fields' => ['nom','email','phone','sujet','message','admin_status'],
        'slugTable' => null
    ],
    'bouqalla' => [
        'title' => 'arabe',
        'search' => "AND (b.arabe LIKE :q OR b.phonetic LIKE :q OR b.francais LIKE :q)",
        'list' => "SELECT * FROM bouqalla b WHERE 1 = 1 :q ORDER BY b.num ASC",
        'count' => "SELECT COUNT(*) FROM bouqalla b WHERE 1 = 1 :q",
        'fields' => ['num','arabe','phonetic','francais'],
        'slugTable' => null
    ],
    'emission_invites' => [
        'title' => 'invite',
        'search' => "AND (ei.invite_externe_nom LIKE :q OR a.nom LIKE :q)",
        'list' => "SELECT ei.*, a.nom AS artiste_nom FROM emission_invites ei LEFT JOIN artistes a ON a.id = ei.artiste_id WHERE ei.emission_id = :emission_id :q ORDER BY ei.ordre ASC, ei.id ASC",
        'count' => "SELECT COUNT(*) FROM emission_invites ei LEFT JOIN artistes a ON a.id = ei.artiste_id WHERE ei.emission_id = :emission_id :q",
        'fields' => ['emission_id','artiste_id','invite_externe_nom','invite_externe_nom_ar','invite_externe_type','invite_externe_type_ar','invite_externe_image','invite_externe_bio','invite_externe_bio_ar','ordre'],
        'slugTable' => null, 'slugField' => null
    ],
    'qacidates' => [
        'title' => 'titre',
        'search' => "AND (titre LIKE :q OR titre_ar LIKE :q OR artiste LIKE :q OR auteur LIKE :q OR slug LIKE :q)",
        'list' => "SELECT id, slug, titre, titre_ar, artiste, auteur, image, artiste_image, ordre, views, status, source_html, updated_at FROM qacidates WHERE 1=1 :q ORDER BY ordre ASC, id ASC",
        'count' => "SELECT COUNT(*) FROM qacidates WHERE 1=1 :q",
        'fields' => ['slug','titre','titre_ar','artiste','artiste_ar','auteur','artiste_image','resume','resume_ar','image','ordre','views','status','parts_json','source_html'],
        'slugTable' => null, 'slugField' => 'titre'
    ],
];

/* ── Réponses ──────────────────────────────────────────────────── */
function respond($spec, $table, $page, $limit) {
    global $pdo;
    $q = trim($_GET['q'] ?? '');
    $trash = ($_GET['trash'] ?? '') === '1';
    $params = [];
    $extra = [];
    $searchSql = $spec['search'];
    if ($q !== '') {
        /* PDO MySQL : ne pas réutiliser :q — placeholders uniques :q0, :q1, … */
        $like = '%' . $q . '%';
        $n = 0;
        $searchExpanded = preg_replace_callback('/:q\b/', function () use (&$n, &$params, $like) {
            $key = 'q' . $n;
            $params[$key] = $like;
            $n++;
            return ':' . $key;
        }, $searchSql);
        /* Remplacer UNIQUEMENT le jeton " :q" du template (pas les :q0 déjà créés) */
        $listSql = str_replace(' :q', ' ' . $searchExpanded, $spec['list']);
        $countSql = str_replace(' :q', ' ' . $searchExpanded, $spec['count']);
        if ($n === 0) {
            /* search sans :q — injecter un param générique */
            $params['q0'] = $like;
        }
    } else {
        $listSql = str_replace(' :q', '', $spec['list']);
        $countSql = str_replace(' :q', '', $spec['count']);
    }
    if ($trash) {
        // Corbeille : ne montrer que les éléments supprimés (soft delete)
        $listSql = str_replace('is_deleted = 0', 'is_deleted = 1', $listSql);
        $countSql = str_replace('is_deleted = 0', 'is_deleted = 1', $countSql);
    }
    if ($table === 'emission_invites' && isset($_GET['emission_id'])) {
        $extra['emission_id'] = intval($_GET['emission_id']);
    }
    try {
    $countSt = $pdo->prepare($countSql);
    $countSt->execute($params + $extra);
    $total = (int)$countSt->fetchColumn();
    $offset = (int)(($page - 1) * $limit);
    $lim = (int)$limit;
    $st = $pdo->prepare($listSql . " LIMIT $offset, $lim");
    $st->execute($params + $extra);
    $rows = [];
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        foreach (['artiste_id', 'animateur_id', 'categorie_id'] as $fk) {
            if (array_key_exists($fk, $row) && $row[$fk] !== null) {
                $row[$fk] = (int)$row[$fk];
            }
        }
        $rows[] = $row;
    }
    echo json_encode(["ok" => true, "data" => $rows, "total" => $total, "page" => $page, "pages" => max(1, (int)ceil($total / max(1, (int)$limit)))]);
    exit;
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode([
            "ok" => false,
            "error" => "Erreur liste SQL",
            "message" => $e->getMessage(),
            "table" => $table ?? null,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

function getOne($pdo, $table, $id) {
    $st = $pdo->prepare("SELECT * FROM `$table` WHERE id = ? LIMIT 1");
    $st->execute([$id]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row) die(json_encode(["error" => "Élément introuvable"]));
    if ($table === 'emissions') {
        $st2 = $pdo->prepare("SELECT * FROM emission_invites WHERE emission_id = ? ORDER BY ordre ASC, id ASC");
        $st2->execute([$id]);
        $row['invites'] = $st2->fetchAll(PDO::FETCH_ASSOC);
    }
    echo json_encode(["ok" => true, "data" => $row]);
    exit;
}

function saveRow($pdo, $table, $spec) {
    $d = jsonIn();
    $id = intval($d['id'] ?? 0);
    $data = is_array($d['data'] ?? null) ? $d['data'] : [];
    $fields = pick($data, $spec['fields']);
    // Slugs & metas automatiques (SEO)
    if ($spec['slugTable'] !== null) {
        $title = trim((string)($fields[$spec['slugField']] ?? ''));
        if ($title === '') die(json_encode(["error" => "Le champ titre/nom est requis"]));
        $titleAr = trim((string)($fields[$spec['slugField'] . '_ar'] ?? ''));
        $descField = $table === 'artistes' ? 'bio' : ($table === 'emissions' ? 'description' : '');
        $desc = trim((string)($fields[$descField] ?? ''));
        $descAr = $descField !== '' ? trim((string)($fields[$descField . '_ar'] ?? '')) : '';
        $meta = buildMeta($title, $titleAr, $desc, $descAr);
        if ($data['meta_title'] ?? '') $meta['meta_title'] = strip_tags(trim($data['meta_title']));
        if ($data['meta_title_ar'] ?? '') $meta['meta_title_ar'] = strip_tags(trim($data['meta_title_ar']));
        if ($data['meta_description'] ?? '') $meta['meta_description'] = strip_tags(trim($data['meta_description']));
        if ($data['meta_description_ar'] ?? '') $meta['meta_description_ar'] = strip_tags(trim($data['meta_description_ar']));
        $slug = trim((string)($data['slug'] ?? ''));
        $fields['slug'] = uniqueSlug($pdo, $spec['slugTable'], slugify($slug !== '' ? $slug : $title), $id);
        $fields += $meta;
    }
    applyStatus($fields);
    // Tables sans colonne published_at : on retire le champ ajouté par applyStatus
    if (!in_array('published_at', $spec['fields'], true)) unset($fields['published_at']);
    // Modération : horodatage + admin connecté
    if (in_array($table, ['dedicaces', 'commentaires', 'emission_comments'], true) && isset($fields['status'])) {
        $fields['moderated_at'] = $fields['moderated_at'] ?? date('Y-m-d H:i:s');
        $fields['moderated_by'] = $_SESSION['admin_id'] ?? null;
    }
    if ($table === 'emissions') $fields['date_modification'] = date('Y-m-d H:i:s');
    // Qacidates : parties JSON + slug auto
    if ($table === 'qacidates') {
        $parts = $data['parts_json'] ?? $data['parts'] ?? null;
        if (is_array($parts)) {
            // normaliser [{n, type, fr, ar, image_ar}, ...]
            $norm = [];
            $n = 1;
            foreach ($parts as $p) {
                if (!is_array($p)) continue;
                $fr = trim((string)($p['fr'] ?? $p['texte_fr'] ?? ''));
                $ar = trim((string)($p['ar'] ?? $p['texte_ar'] ?? ''));
                $img = trim((string)($p['image_ar'] ?? ''));
                if ($fr === '' && $ar === '' && $img === '') continue;
                $norm[] = [
                    'n' => $n++,
                    'type' => ($fr || $ar) && $img ? 'mixte' : (($fr || $ar) ? 'texte' : 'image'),
                    'fr' => $fr,
                    'ar' => $ar,
                    'image_ar' => $img,
                ];
            }
            $fields['parts_json'] = json_encode($norm, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } elseif (is_string($parts) && $parts !== '') {
            $fields['parts_json'] = $parts;
        }
        $title = trim((string)($fields['titre'] ?? ''));
        if ($title === '') die(json_encode(["error" => "Le titre est requis"]));
        $slug = trim((string)($fields['slug'] ?? $data['slug'] ?? ''));
        $fields['slug'] = uniqueSlug($pdo, 'qacidates', slugify($slug !== '' ? $slug : $title), $id);
        if (!isset($fields['status']) || $fields['status'] === '') $fields['status'] = 'published';
        if (!isset($fields['ordre'])) $fields['ordre'] = 0;
    }
    // valeurs NULL pour chaînes vides
    foreach ($fields as $k => $v) {
        if ($k === 'parts_json') continue; // ne pas nullifier le JSON
        emptyToNull($fields[$k]);
    }

    if ($id > 0) {
        if (!$fields) die(json_encode(["error" => "Aucune donnée à mettre à jour"]));
        $sets = []; $params = [];
        foreach ($fields as $k => $v) { $sets[] = "`$k` = ?"; $params[] = $v; }
        $params[] = $id;
        $pdo->prepare("UPDATE `$table` SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params);
    } else {
        $cols = array_keys($fields);
        $ph = array_fill(0, count($cols), '?');
        $pdo->prepare("INSERT INTO `$table` (" . implode(', ', $cols) . ") VALUES (" . implode(', ', $ph) . ")")->execute(array_values($fields));
        $id = (int)$pdo->lastInsertId();
    }
    echo json_encode(["ok" => true, "id" => $id]);
    exit;
}

function deleteRow($pdo, $table, $id) {
    if ($table === 'emissions') {
        $pdo->prepare("DELETE FROM emission_invites WHERE emission_id = ?")->execute([$id]);
        $st = $pdo->prepare("DELETE FROM emissions WHERE id = ?");
    } elseif ($table === 'emission_invites') {
        $st = $pdo->prepare("DELETE FROM emission_invites WHERE id = ?");
    } elseif ($table === 'dedicaces' || $table === 'commentaires' || $table === 'contacts' || $table === 'bouqalla' || $table === 'emission_comments' || $table === 'qacidates') {
        $st = $pdo->prepare("DELETE FROM `$table` WHERE id = ?");
    } else {
        $st = $pdo->prepare("UPDATE `$table` SET is_deleted = 1 WHERE id = ?");
    }
    $st->execute([$id]);
    echo json_encode(["ok" => true]);
    exit;
}

/* ── Routage ───────────────────────────────────────────────────── */
$action = $_GET['action'] ?? '';
switch ($action) {
    case 'login': doLogin($pdo); break;
    case 'logout':
        $_SESSION = []; session_destroy();
        echo json_encode(["ok" => true]); break;
    case 'me':
        echo json_encode(["ok" => true, "authed" => isAuthed(), "user" => isset($_SESSION['admin_name']) ? ["nom" => $_SESSION['admin_name']] : null]); break;
    case 'upload': handleUpload(); break;

    case 'featured':
        needAuth();
        $d = json_decode(file_get_contents("php://input"), true);
        $id = intval($d['id'] ?? 0);
        $val = !empty($d['featured']) ? 1 : 0;
        $pdo->prepare("UPDATE chansons SET featured = ? WHERE id = ?")->execute([$val, $id]);
        echo json_encode(["ok" => true]);
        break;

    case 'backup':
        needAuth();
        header('Content-Type: application/sql; charset=utf-8');
        header('Content-Disposition: attachment; filename="chaabi_backup_' . date('Y-m-d_His') . '.sql"');
        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        $out = "-- Chaabi Music - sauvegarde du " . date('Y-m-d H:i:s') . "\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n";
        foreach ($tables as $tb) {
            $out .= "\nDROP TABLE IF EXISTS `$tb`;\n";
            $create = $pdo->query("SHOW CREATE TABLE `$tb`")->fetch(PDO::FETCH_NUM);
            $out .= ($create[1] ?? '') . ";\n";
            $rows = $pdo->query("SELECT * FROM `$tb`");
            foreach ($rows as $row) {
                $cols = array_map(function($c) { return "`$c`"; }, array_keys($row));
                $vals = array_map(function($v) use ($pdo) { return $v === null ? 'NULL' : $pdo->quote((string)$v); }, array_values($row));
                $out .= "INSERT INTO `$tb` (" . implode(', ', $cols) . ") VALUES (" . implode(', ', $vals) . ");\n";
            }
        }
        $out .= "\nSET FOREIGN_KEY_CHECKS=1;\n";
        echo $out;
        exit;

    case 'export':
        needAuth();
        $table = $_GET['table'] ?? '';
        if (!isset($SPEC[$table])) { echo json_encode(["error" => "Table inconnue"]); break; }
        $rows = $pdo->query(str_replace(':q', '', $SPEC[$table]['list']))->fetchAll(PDO::FETCH_ASSOC);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $table . '_' . date('Y-m-d') . '.csv"');
        $out = fopen('php://output', 'w');
        if ($rows) {
            fputcsv($out, array_keys($rows[0]), ';');
            foreach ($rows as $r) fputcsv($out, $r, ';');
        }
        fclose($out);
        exit;

    case 'import_chansons':
        needAuth();
        $d = json_decode(file_get_contents("php://input"), true);
        $csv = (string)($d['csv'] ?? '');
        $lines = preg_split('/\r\n|\r|\n/', trim($csv));
        $imported = 0; $errors = []; $artCache = []; $catCache = [];
        foreach ($lines as $i => $line) {
            $line = trim($line);
            if ($line === '') continue;
            $col = str_getcsv($line, ';');
            if ($i === 0 && strtolower(trim($col[0] ?? '')) === 'titre') continue; // ligne d'en-tête
            $titre = trim($col[0] ?? '');
            if ($titre === '') { $errors[] = 'Ligne ' . ($i + 1) . ' : titre vide'; continue; }
            $titre_ar = trim($col[1] ?? '');
            $artisteNom = trim($col[2] ?? '');
            $categorieNom = trim($col[3] ?? '');
            $audio = trim($col[4] ?? '');
            $duree = trim($col[5] ?? '');
            $status = trim($col[6] ?? 'published');
            if ($status !== 'draft') $status = 'published';
            $artiste_id = null;
            if ($artisteNom !== '') {
                if (!isset($artCache[$artisteNom])) {
                    $st = $pdo->prepare("SELECT id FROM artistes WHERE nom = ? LIMIT 1");
                    $st->execute([$artisteNom]);
                    $artiste_id = $st->fetchColumn();
                    if (!$artiste_id) {
                        $pdo->prepare("INSERT INTO artistes (nom, status, created_at) VALUES (?, 'published', NOW())")->execute([$artisteNom]);
                        $artiste_id = (int)$pdo->lastInsertId();
                    }
                    $artCache[$artisteNom] = $artiste_id;
                }
                $artiste_id = $artCache[$artisteNom];
            }
            $categorie_id = null;
            if ($categorieNom !== '') {
                if (!isset($catCache[$categorieNom])) {
                    $st = $pdo->prepare("SELECT id FROM categories WHERE nom = ? LIMIT 1");
                    $st->execute([$categorieNom]);
                    $categorie_id = $st->fetchColumn();
                    if (!$categorie_id) {
                        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $categorieNom), '-'));
                        $pdo->prepare("INSERT INTO categories (nom, slug) VALUES (?, ?)")->execute([$categorieNom, $slug]);
                        $categorie_id = (int)$pdo->lastInsertId();
                    }
                    $catCache[$categorieNom] = $categorie_id;
                }
                $categorie_id = $catCache[$categorieNom];
            }
            $pdo->prepare("INSERT INTO chansons (titre, titre_ar, artiste_id, categorie_id, audio, duree, status, views, likes, is_deleted, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, NOW())")
                ->execute([$titre, $titre_ar, $artiste_id, $categorie_id, $audio, $duree, $status]);
            $imported++;
        }
        echo json_encode(["ok" => true, "imported" => $imported, "errors" => $errors]);
        break;

    case 'stats_ecoutes':
        needAuth();
        $days = isset($_GET['days']) ? intval($_GET['days']) : 30;
        if (!in_array($days, [7, 30, 90], true)) $days = 30;
        $out = ['summary' => ['starts' => 0, 'listeners' => 0, 'seconds' => 0, 'completed' => 0], 'daily' => [], 'top' => [], 'languages' => [], 'sources' => [], 'hasTable' => false];
        $hasT = (bool)$pdo->query("SHOW TABLES LIKE 'ecoutes_statistiques'")->fetchColumn();
        $out['hasTable'] = $hasT;
        if ($hasT) {
            $from = date('Y-m-d 00:00:00', strtotime('-' . ($days - 1) . ' days'));
            $st = $pdo->prepare("SELECT COUNT(DISTINCT CASE WHEN event_type='play' THEN session_id END) AS starts, COUNT(DISTINCT visitor_hash) AS listeners, COALESCE(SUM(CASE WHEN event_type='progress' THEN listened_seconds ELSE 0 END),0) AS seconds, COUNT(DISTINCT CASE WHEN event_type='complete' THEN session_id END) AS completed FROM ecoutes_statistiques WHERE created_at >= ?");
            $st->execute([$from]);
            $out['summary'] = array_map('intval', $st->fetch() ?: $out['summary']);
            $st = $pdo->prepare("SELECT DATE(created_at) AS day, COUNT(DISTINCT CASE WHEN event_type='play' THEN session_id END) AS starts FROM ecoutes_statistiques WHERE created_at >= ? GROUP BY DATE(created_at) ORDER BY day ASC");
            $st->execute([$from]);
            $out['daily'] = $st->fetchAll(PDO::FETCH_ASSOC);
            $st = $pdo->prepare("SELECT media_type, media_id, COUNT(DISTINCT CASE WHEN event_type='play' THEN session_id END) AS starts, COUNT(DISTINCT visitor_hash) AS listeners, COALESCE(SUM(CASE WHEN event_type='progress' THEN listened_seconds ELSE 0 END),0) AS seconds, COUNT(DISTINCT CASE WHEN event_type='complete' THEN session_id END) AS completed FROM ecoutes_statistiques WHERE created_at >= ? GROUP BY media_type, media_id ORDER BY starts DESC, seconds DESC LIMIT 10");
            $st->execute([$from]);
            $top = $st->fetchAll(PDO::FETCH_ASSOC);
            $labelCache = [];
            $mapT = [
                'chanson' => ['chansons', 'titre'],
                'emission' => ['emissions', 'numero_emission', 'titre'],
                'interview' => ['interviews', 'artiste_nom']
            ];
            foreach ($top as &$m) {
                $key = $m['media_type'] . ':' . $m['media_id'];
                if (!isset($labelCache[$key])) {
                    if ($m['media_type'] === 'live') {
                        $label = 'Flux radio (live)';
                    } else {
                        $label = ucfirst($m['media_type']) . ' #' . $m['media_id'];
                        if (isset($mapT[$m['media_type']])) {
                            $cfg = $mapT[$m['media_type']];
                            if (count($cfg) === 2) {
                                $s2 = $pdo->prepare("SELECT `" . $cfg[1] . "` FROM `" . $cfg[0] . "` WHERE id = ? LIMIT 1");
                                $s2->execute([(int)$m['media_id']]);
                                $nm = (string)$s2->fetchColumn();
                                if ($nm !== '') $label = $nm;
                            } else {
                                $s2 = $pdo->prepare("SELECT `" . $cfg[1] . "`, `" . $cfg[2] . "` FROM `" . $cfg[0] . "` WHERE id = ? LIMIT 1");
                                $s2->execute([(int)$m['media_id']]);
                                $row = $s2->fetch(PDO::FETCH_NUM);
                                if ($row && trim((string)$row[0]) !== '') $label = 'Émission N° ' . $row[0];
                                elseif ($row && trim((string)$row[1]) !== '') $label = $row[1];
                            }
                        }
                    }
                    $labelCache[$key] = $label;
                }
                $m['label'] = $labelCache[$key];
            }
            unset($m);
            $out['top'] = $top;
            $st = $pdo->prepare("SELECT language_code, COUNT(DISTINCT CASE WHEN event_type='play' THEN session_id END) AS starts FROM ecoutes_statistiques WHERE created_at >= ? GROUP BY language_code ORDER BY starts DESC");
            $st->execute([$from]);
            $out['languages'] = $st->fetchAll(PDO::FETCH_ASSOC);
            $st = $pdo->prepare("SELECT COALESCE(NULLIF(page_path,''), 'Non renseignée') AS page_path, COUNT(DISTINCT CASE WHEN event_type='play' THEN session_id END) AS starts FROM ecoutes_statistiques WHERE created_at >= ? GROUP BY page_path ORDER BY starts DESC LIMIT 6");
            $st->execute([$from]);
            $out['sources'] = $st->fetchAll(PDO::FETCH_ASSOC);
        }
        echo json_encode(["ok" => true, "data" => $out]);
        break;

    case 'stats':
        needAuth();
        $stats = [];
        $queries = [
            'artistes' => "SELECT COUNT(*) FROM artistes WHERE is_deleted = 0",
            'chansons' => "SELECT COUNT(*) FROM chansons WHERE is_deleted = 0",
            'emissions' => "SELECT COUNT(*) FROM emissions",
            'interviews' => "SELECT COUNT(*) FROM interviews WHERE is_deleted = 0",
            'categories' => "SELECT COUNT(*) FROM categories",
            'ecoutes_30j' => "SELECT COUNT(DISTINCT session_id) FROM ecoutes_statistiques WHERE created_at >= NOW() - INTERVAL 30 DAY",
            'dedicaces_pending' => "SELECT COUNT(*) FROM dedicaces WHERE status = 'pending'",
            'commentaires_pending' => "SELECT COUNT(*) FROM commentaires WHERE status = 'pending'",
            'emission_comments_pending' => "SELECT COUNT(*) FROM emission_comments WHERE status = 'pending'",
            'contacts_new' => "SELECT COUNT(*) FROM contacts WHERE admin_status = 'new'",
            'bouqalla' => "SELECT COUNT(*) FROM bouqalla"
        ];
        foreach ($queries as $k => $sql) $stats[$k] = (int)$pdo->query($sql)->fetchColumn();
        $hasStats = (bool)$pdo->query("SHOW TABLES LIKE 'ecoutes_statistiques'")->fetchColumn();
        $top = [];
        if ($hasStats) {
            $st = $pdo->query("SELECT s.media_id, COUNT(DISTINCT s.session_id) AS demarrages FROM ecoutes_statistiques s WHERE s.media_type = 'chanson' AND s.created_at >= (NOW() - INTERVAL 30 DAY) GROUP BY s.media_id ORDER BY demarrages DESC LIMIT 5");
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $t) {
                $s2 = $pdo->prepare("SELECT c.id, c.titre, a.nom AS artiste_nom FROM chansons c LEFT JOIN artistes a ON c.artiste_id = a.id WHERE c.id = ?");
                $s2->execute([$t['media_id']]);
                $song = $s2->fetch(PDO::FETCH_ASSOC);
                if ($song) { $song['demarrages'] = (int)$t['demarrages']; $top[] = $song; }
            }
        }
        $stats['ecoutes_30j'] = $hasStats ? (int)$pdo->query("SELECT COUNT(*) FROM ecoutes_statistiques WHERE created_at >= (NOW() - INTERVAL 30 DAY)")->fetchColumn() : 0;
        $stats['top_ecoutes'] = $top;
        echo json_encode(["ok" => true, "data" => $stats]); break;

    case 'categories':
        needAuth();
        $rows = $pdo->query("SELECT id, nom, nom_ar, slug FROM categories ORDER BY nom ASC")->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(["ok" => true, "data" => $rows]); break;

    case 'animators':
        needAuth();
        $rows = $pdo->query("SELECT id, nom FROM users ORDER BY nom ASC")->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(["ok" => true, "data" => $rows]); break;

    case 'qacidates':
        handleQacidatesAdmin($_GET['op'] ?? 'list');
        break;

    case 'artistes': case 'chansons': case 'emissions': case 'interviews': case 'emission_invites':
    case 'dedicaces': case 'commentaires': case 'emission_comments': case 'contacts': case 'bouqalla':
        needAuth();
        $table = $action;
        $op = $_GET['op'] ?? 'list';
        if ($op === 'get') { getOne($pdo, $table, intval($_GET['id'] ?? 0)); }
        if ($op === 'save') { saveRow($pdo, $table, $SPEC[$table]); }
        if ($op === 'delete') { deleteRow($pdo, $table, intval($_GET['id'] ?? 0)); }
        if ($op === 'restore') { $pdo->prepare("UPDATE `$table` SET is_deleted = 0 WHERE id = ?")->execute([intval($_GET['id'] ?? 0)]); echo json_encode(["ok" => true]); exit; }
        if ($op === 'purge') { $pdo->prepare("DELETE FROM `$table` WHERE id = ?")->execute([intval($_GET['id'] ?? 0)]); echo json_encode(["ok" => true]); exit; }
        respond($SPEC[$table], $table, max(1, intval($_GET['page'] ?? 1)), min(500, max(1, intval($_GET['limit'] ?? 10))));
        break;

    default:
        if (isset($SPEC[$action])) {
            needAuth();
            $table = $action;
            $op = $_GET['op'] ?? 'list';
            if ($op === 'get') { getOne($pdo, $table, intval($_GET['id'] ?? 0)); }
            if ($op === 'save') { saveRow($pdo, $table, $SPEC[$table]); }
            if ($op === 'delete') { deleteRow($pdo, $table, intval($_GET['id'] ?? 0)); }
            respond($SPEC[$table], $table, max(1, intval($_GET['page'] ?? 1)), min(500, max(1, intval($_GET['limit'] ?? 10))));
            break;
        }
        die(json_encode(["error" => "Action inconnue: $action", "hint" => "Mettez à jour admin/_api.php"]));
}