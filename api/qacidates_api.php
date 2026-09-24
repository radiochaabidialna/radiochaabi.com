<?php
/**
 * API dédiée Qacidates — base chaabi_music_qacidates
 * ?action=list|get|stats
 */
declare(strict_types=1);

while (ob_get_level()) { ob_end_clean(); }
ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function readJsonBody(): object {
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw);
    return is_object($data) ? $data : (object)[];
}

function out($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function cfg(): array {
    $file = dirname(__DIR__) . '/config/qacidates.local.php';
    $local = is_readable($file) ? (require $file) : [];
    if (!is_array($local)) $local = [];
    return [
        'host' => getenv('CHAABI_QACID_DB_HOST') ?: ($local['host'] ?? 'localhost'),
        'name' => getenv('CHAABI_QACID_DB_NAME') ?: ($local['name'] ?? 'chaabi_music_qacidats_v1'),
        'user' => getenv('CHAABI_QACID_DB_USER') ?: ($local['user'] ?? 'root'),
        'pass' => getenv('CHAABI_QACID_DB_PASS') ?: ($local['pass'] ?? 'root'),
        'charset' => $local['charset'] ?? 'utf8mb4',
    ];
}

function pdo(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $c = cfg();
    try {
        $pdo = new PDO(
            sprintf('mysql:host=%s;dbname=%s;charset=%s', $c['host'], $c['name'], $c['charset']),
            $c['user'],
            $c['pass'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
    } catch (PDOException $e) {
        error_log('[qacidates_api] ' . $e->getMessage());
        out([
            'error' => 'Connexion BDD qacidates échouée',
            'hint' => 'Vérifie config/qacidates.local.php et le nom de la base',
            'db' => $c['name'],
        ], 503);
    }
    return $pdo;
}


/** Corrige chemins images artistes connus (404 localhost) */
function fixMediaPath(?string $path): ?string {
    if ($path === null || $path === '') return $path;
        $map = [
        // → slugs RÉELS chaabi_music_qacidats_v1 (dump new)
        'yaelqadi' => 'qadi',
        'el-qadi' => 'qadi',
        'ya-el-qadi' => 'qadi',
        'ezinefassi' => 'fes',
        'ezine-el-fassi' => 'fes',
        'zine-el-fassi' => 'fes',
        'haramtoubik' => 'haramtou',
        'haramtobik' => 'haramtou',
        'haramtou-bik' => 'haramtou',
        'elfarq' => 'elfraq',
        'el-farq' => 'elfraq',
        'el_frak' => 'elfraq',
        'bahr-toufane' => 'bahrtoufane',
        'bahr_toufane' => 'bahrtoufane',
        'hadjou' => 'hadjoulafkar',
        'hadjou_lafkar' => 'hadjoulafkar',
        'salihoumoumek' => 'saali',
        'sali-houmoumek' => 'saali',
        'koomtara' => 'qomtara',
        'koom-tara' => 'qomtara',
        'wahadghouziel' => 'ghouziel',
        'wahad' => 'ghouziel',
        'wahadghouz' => 'ghouziel',
        'djemaa' => 'eldjemaa',
        'youm-el-djemaa' => 'youmeldjema',
        'mal-watni' => 'malwatni',
        'koulou_lahim' => 'koulou',
    ];
    $base = basename(str_replace('\\', '/', $path));
    if (isset($map[$path])) return $map[$path];
    if (isset($map[$base])) {
        $dir = rtrim(str_replace('\\', '/', dirname($path)), '.');
        if ($dir === '' || $dir === '/') return '/music/img_artistes/' . $map[$base];
        return rtrim($dir, '/') . '/' . $map[$base];
    }
    // insensible à la casse pour hsissen
    if (stripos($base, 'hsissen') !== false && stripos($base, 'cheikh') === false) {
        return '/music/img_artistes/cheikh hsissen.png';
    }
    return $path;
}


/** Alias de slugs (navigation / anciens liens) → slug BDD réel */

/** Unifie les libellés interprète (même personne) */

function resolveSlug(string $slug): string {
    $slug = preg_replace('/[^a-z0-9\-_]/', '', strtolower($slug));
    $map = [
        'yaelqadi' => 'qadi',
        'el-qadi' => 'qadi',
        'ezinefassi' => 'fes',
        'ezine-el-fassi' => 'fes',
        'haramtoubik' => 'haramtou',
        'haramtobik' => 'haramtou',
        'haramtou-bik' => 'haramtou',
        'elfarq' => 'elfraq',
        'el-farq' => 'elfraq',
        'bahr-toufane' => 'bahrtoufane',
        'bahr_toufane' => 'bahrtoufane',
        'hadjou' => 'hadjoulafkar',
        'salihoumoumek' => 'saali',
        'koomtara' => 'qomtara',
        'wahadghouziel' => 'ghouziel',
        'wahad' => 'ghouziel',
        'djemaa' => 'eldjemaa',
        'mal-watni' => 'malwatni',
    ];
    return $map[$slug] ?? $slug;
}

function slugCandidates(string $slug): array {
    $base = resolveSlug($slug);
    $alts = [
        'haramtou' => ['haramtoubik', 'haramtobik'],
        'haramtoubik' => ['haramtou'],
        'fes' => ['ezinefassi'],
        'ezinefassi' => ['fes'],
        'qadi' => ['yaelqadi'],
        'yaelqadi' => ['qadi'],
        'elfraq' => ['elfarq'],
        'elfarq' => ['elfraq'],
        'bahrtoufane' => ['bahr-toufane'],
        'ghouziel' => ['wahadghouziel'],
        'saali' => ['salihoumoumek'],
        'qomtara' => ['koomtara'],
    ];
    $c = [$base, $slug];
    foreach (array_merge($alts[$base] ?? [], $alts[$slug] ?? []) as $a) {
        $c[] = $a;
    }
    $out = [];
    foreach ($c as $s) {
        $s = preg_replace('/[^a-z0-9\-_]/', '', strtolower((string)$s));
        if ($s !== '' && !in_array($s, $out, true)) $out[] = $s;
    }
    return $out;
}

function normalizeInterprete(?string $name): string {
    $n = trim((string)$name);
    if ($n === '') return '';
    $l = mb_strtolower($n, 'UTF-8');
    $l = str_replace(["'", "'", "`", "´", "ʼ", "’"], "'", $l);
    $l = str_replace(['î', 'í', 'ī'], 'i', $l);

    // Duo Ezzahi & Anka → Amar Ezzahi
    if (preg_match('/ezzahi/u', $l) && preg_match('/anka|anqa|العنقى/u', $l)) {
        return 'Amar Ezzahi';
    }
    if (preg_match('/ezzahi|الزاهي/u', $l)) {
        return 'Amar Ezzahi';
    }
    if (preg_match('/anka|anqa|العنقى|el-?anqa/u', $l)) {
        return 'Cheikh El Hadj El Anka';
    }
    if (preg_match('/rizeq|rizek|مريزق|mrize/u', $l)) {
        return "El Hadj M'rizeq";
    }
    if (preg_match('/guerou|قروابي|hachemi guerou/u', $l)) {
        return 'El Hachemi Guerouabi';
    }
    if (preg_match('/doumaz|دوماز/u', $l)) return 'Reda Doumaz';
    if (preg_match('/hsissen|sissen/u', $l)) return 'Cheikh Hsissen';
    if (preg_match('/mahfoud|محفوظ/u', $l)) return 'El Hadj Mahfoud';
    return $n;
}

function tableExists(PDO $pdo, string $name): bool {
    $name = preg_replace('/[^a-zA-Z0-9_]/', '', $name);
    if ($name === '') return false;
    try {
        $st = $pdo->query('SHOW TABLES LIKE ' . $pdo->quote($name));
        return $st && (bool)$st->fetchColumn();
    } catch (Throwable $e) {
        return false;
    }
}

/** Décode contenu_fr (JSON tableau de blocs) même si double-encodé ou indenté */
function parseJsonField($v) {
    if (is_array($v)) return $v;
    if (!is_string($v) || $v === '') return null;
    $t = trim($v);
    $t = preg_replace('/^\xEF\xBB\xBF/', '', $t);
    if ($t === '') return null;

    for ($i = 0; $i < 3; $i++) {
        $first = $t[0] ?? '';
        if ($first !== '[' && $first !== '{' && $first !== '"') {
            return null;
        }
        $d = json_decode($t, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            // tentative : enlever retours / espaces bizarres entre tokens
            $t2 = preg_replace('/\r\n|\r/', "\n", $t);
            $d = json_decode($t2, true);
            if (json_last_error() !== JSON_ERROR_NONE) return null;
        }
        if (is_string($d)) {
            $t = trim($d);
            continue;
        }
        return $d;
    }
    return null;
}


/** Normalise champ images BDD : ["path"] ou [{"src":"...","alt":"..."}] → liste de chemins */
function normalizeImagesField($raw): array {
    if (is_array($raw)) {
        $parsed = $raw;
    } else {
        $s = is_string($raw) ? trim($raw) : '';
        // JSON parfois double-échappé : [{\"src\":\"..."\}]
        if ($s !== '' && strpos($s, '\\"') !== false) {
            $s2 = stripcslashes($s);
            $try = json_decode($s2, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($try)) {
                $parsed = $try;
            } else {
                $parsed = parseJsonField($s);
            }
        } else {
            $parsed = parseJsonField($s);
        }
    }
    if (!is_array($parsed)) {
        if (is_string($raw) && trim((string)$raw) !== '' && trim((string)$raw)[0] !== '[') {
            return [trim((string)$raw)];
        }
        return [];
    }
    $out = [];
    foreach ($parsed as $item) {
        if (is_string($item) && $item !== '') {
            $out[] = $item;
        } elseif (is_array($item)) {
            $src = $item['src'] ?? $item['url'] ?? $item['path'] ?? '';
            if (is_string($src) && $src !== '') {
                $out[] = $src;
            }
        }
    }
    return $out;
}

function flattenFrBlocks($parsed): string {
    if (is_string($parsed)) return $parsed;
    if (!is_array($parsed)) return '';
    $out = [];
    foreach ($parsed as $b) {
        if (is_string($b)) {
            $out[] = $b;
            continue;
        }
        if (!is_array($b)) continue;
        $txt = (string)($b['texte'] ?? $b['text'] ?? '');
        if ($txt !== '') $out[] = $txt;
    }
    return implode("\n\n", $out);
}

/**
 * Découvre les images manuscrites sur disque (img_qacidates/{folder}/)
 * Comme models/Qacidate.php::discoverImages — ne renvoie QUE les fichiers existants.
 */
function discoverManuscriptImages(string $folder, int $numero, string $slug = ''): array {
    $folder = trim($folder, "/ ");
    $slug = trim($slug, "/ ");
    $n = max(1, $numero);

    $alias = [
        'eldjemaa' => 'djemaa',
        'youmeldjema' => 'youmeldjema',
        'elfraq' => 'elfarq',
        'ezinefassi' => 'fes',
        'hadjoulafkar' => 'hadjou',
        'haramtoubik' => 'haramtou',
        'yaelqadi' => 'qadi',
        'salihoumoumek' => 'saali',
        'koomtara' => 'qomtara',
        'wahadelghouziel' => 'ghouziel',
        'malwatni' => 'malwatni',
    ];
    $dirs = [];
    foreach ([$folder, $slug, $alias[$folder] ?? null, $alias[$slug] ?? null] as $d) {
        if ($d && !in_array($d, $dirs, true)) {
            $dirs[] = $d;
        }
    }
    if (!$dirs) {
        return [];
    }

    // Racine projet (api/ → parent)
    $root = realpath(dirname(__DIR__));
    if ($root === false) {
        $root = dirname(__DIR__);
    }
    $diskBase = $root . DIRECTORY_SEPARATOR . 'img_qacidates';

    $extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    // préfixes réels observés dans img_qacidates/ (+ nom du dossier)
    $prefixes = [
        '', // 1.jpg
        // noms de dossiers courants
        'adrouni', 'aoucha', 'chema', 'dif', 'eldjemaa', 'elahii', 'elfraq',
        'ezarka', 'fes', 'ghouziel', 'hadjou', 'harez', 'haremtbik',
        'ikma', 'kahoua', 'kifech', 'lahim', 'lahman', 'lahmam', 'maknas',
        'qadi', 'sobhane', 'watni', 'yanass', 'talaha', 'img', 'manuscrit',
        'manuscript', 'qacida', 'sec', 's',
    ];
    // ajouter chaque nom de dossier comme préfixe
    foreach ($dirs as $d) {
        if ($d !== '' && !in_array($d, $prefixes, true)) {
            $prefixes[] = $d;
        }
    }

    $found = [];
    foreach ($dirs as $dir) {
        $dirPath = $diskBase . DIRECTORY_SEPARATOR . $dir;
        if (!is_dir($dirPath)) {
            continue;
        }
        foreach ($prefixes as $prefix) {
            foreach ($extensions as $ext) {
                // prefix + numero  ET  prefix_numero
                $candidates = [];
                if ($prefix === '') {
                    $candidates[] = $n . '.' . $ext;
                } else {
                    $candidates[] = $prefix . $n . '.' . $ext;
                    $candidates[] = $prefix . '_' . $n . '.' . $ext;
                }
                foreach ($candidates as $filename) {
                    $diskPath = $dirPath . DIRECTORY_SEPARATOR . $filename;
                    if (is_file($diskPath)) {
                        $web = 'img_qacidates/' . $dir . '/' . $filename;
                        if (!in_array($web, $found, true)) {
                            $found[] = $web;
                        }
                    }
                }
            }
        }
        // Fallback : fichiers triés du dossier (1er = partie 1, etc.)
        if (!$found) {
            $files = [];
            foreach (scandir($dirPath) ?: [] as $f) {
                if ($f === '.' || $f === '..') continue;
                if (!preg_match('/\.(jpe?g|png|gif|webp)$/i', $f)) continue;
                $files[] = $f;
            }
            natcasesort($files);
            $files = array_values($files);
            if (isset($files[$n - 1])) {
                $found[] = 'img_qacidates/' . $dir . '/' . $files[$n - 1];
            }
        }
    }
    return $found;
}

/** @deprecated alias */
function defaultManuscriptImages(string $folder, int $numero, string $slug = ''): array {
    return discoverManuscriptImages($folder, $numero, $slug);
}

/** Normalise une section pour le front : jamais de JSON brut visible */
function normalizeSection(array $sec, string $imgFolder = '', string $slug = ''): array {
    $raw = $sec['contenu_fr'] ?? '';
    $parsed = parseJsonField($raw);

    if (is_array($parsed)) {
        // s'assurer que chaque item a "texte"
        $clean = [];
        foreach ($parsed as $b) {
            if (is_string($b)) {
                $clean[] = ['type' => 'normal', 'texte' => $b];
            } elseif (is_array($b)) {
                $clean[] = [
                    'type' => (string)($b['type'] ?? 'normal'),
                    'label' => isset($b['label']) ? (string)$b['label'] : null,
                    'texte' => (string)($b['texte'] ?? $b['text'] ?? ''),
                ];
            }
        }
        $sec['contenu_fr_parsed'] = $clean;
        $sec['contenu_fr_text'] = flattenFrBlocks($clean);
    } else {
        $txt = is_string($raw) ? $raw : '';
        // si ça ressemble encore à du JSON non parsé, on n'affiche pas les crochets
        if (preg_match('/^\s*\[\s*\{/', $txt)) {
            // extraction grossière des "texte":"..."
            if (preg_match_all('/"texte"\s*:\s*"((?:\\\\.|[^"\\\\])*)"/u', $txt, $m)) {
                $parts = [];
                foreach ($m[1] as $chunk) {
                    $parts[] = stripcslashes($chunk);
                }
                $txt = implode("\n\n", $parts);
            }
        }
        $sec['contenu_fr_parsed'] = [['type' => 'normal', 'texte' => $txt]];
        $sec['contenu_fr_text'] = $txt;
    }
    unset($sec['contenu_fr']); // ne jamais renvoyer le JSON brut

    /**
     * RÈGLE SIMPLE Radio Chaabi :
     * - contenu_ar (texte arabe) présent → PAS d'images
     *   (les images = version arabe manuscrite, inutiles si texte AR existe)
     * - contenu_ar vide → images dans img_qacidates/{folder}/ uniquement
     * - web_path HTML n'est PAS utilisé pour le contenu (BDD + img_qacidates)
     */
    $ar = trim((string)($sec['contenu_ar'] ?? ''));
    $num = (int)($sec['numero'] ?? 1);

    if ($ar !== '') {
        // Texte AR présent → on n'envoie aucune image pour cette section
        $sec['images'] = [];
        $sec['ar_is_image'] = false;
        return $sec;
    }

    // Pas de texte AR → manuscrits EXISTANTS seulement (zéro 404)
    $imgs = normalizeImagesField($sec['images'] ?? '');

    $root = realpath(dirname(__DIR__)) ?: dirname(__DIR__);
    $valid = [];
    foreach ($imgs as $src) {
        if (!is_string($src) || $src === '') continue;
        $src = str_replace('\\', '/', trim($src));
        // chemin relatif projet
        $rel = ltrim($src, '/');
        if (strpos($rel, 'new_radiochaabi/') === 0) {
            $rel = substr($rel, strlen('new_radiochaabi/'));
        }
        $disk = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel);
        if (is_file($disk)) {
            $valid[] = $rel;
        }
    }

    if (count($valid) === 0) {
        $valid = discoverManuscriptImages($imgFolder, $num, $slug);
    }

    $sec['images'] = array_values(array_unique($valid));
    $sec['ar_is_image'] = count($sec['images']) > 0;
    return $sec;
}

$action = $_GET['action'] ?? 'list';

try {
    $pdo = pdo();

    if (!tableExists($pdo, 'qacidates')) {
        out(['error' => 'Table qacidates absente', 'db' => cfg()['name']], 501);
    }

    switch ($action) {
        case 'stats':
            $total = (int)$pdo->query("SELECT COUNT(*) FROM qacidates WHERE status='published' AND is_deleted=0")->fetchColumn();
            $sec = 0;
            $withSec = 0;
            if (tableExists($pdo, 'qacidate_sections')) {
                $sec = (int)$pdo->query('SELECT COUNT(*) FROM qacidate_sections')->fetchColumn();
                $withSec = (int)$pdo->query('SELECT COUNT(DISTINCT s.qacidate_id) FROM qacidate_sections s JOIN qacidates q ON q.id = s.qacidate_id WHERE q.is_deleted = 0')->fetchColumn();
            }
            out([
                'ok' => true,
                'db' => cfg()['name'],
                'qacidates' => $total,
                'sections' => $sec,
                'qacidates_with_sections' => $withSec,
            ]);
            break;

        case 'list':
            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = min(100, max(1, (int)($_GET['limit'] ?? 100)));
            $offset = ($page - 1) * $limit;
            $q = trim((string)($_GET['q'] ?? ''));
            $where = "status = 'published' AND is_deleted = 0";
            $params = [];
            if ($q !== '') {
                $where .= ' AND (titre LIKE ? OR titre_ar LIKE ? OR interprete LIKE ? OR auteur LIKE ? OR slug LIKE ? OR theme LIKE ?)';
                $like = '%' . $q . '%';
                $params = [$like, $like, $like, $like, $like, $like];
            }
            $stc = $pdo->prepare("SELECT COUNT(*) FROM qacidates WHERE $where");
            $stc->execute($params);
            $total = (int)$stc->fetchColumn();
            $sql = "SELECT id, slug, titre, titre_ar, sous_titre, sous_titre_ar,
                           auteur, auteur_ar, interprete, interprete_ar,
                           theme, genre, image, thumbnail, audio, duree,
                           views, likes, status, published_at, img_folder
                    FROM qacidates WHERE $where ORDER BY id ASC LIMIT $offset, $limit";
            $st = $pdo->prepare($sql);
            $st->execute($params);
            $rows = $st->fetchAll();
            foreach ($rows as &$r) {
                if (!empty($r['interprete'])) {
                    $r['interprete'] = normalizeInterprete((string)$r['interprete']);
                }
                $r['artiste'] = $r['interprete'] ?? '';
                $r['artiste_ar'] = $r['interprete_ar'] ?? '';
                $r['image'] = fixMediaPath($r['image'] ?? null);
                $r['thumbnail'] = fixMediaPath($r['thumbnail'] ?? null);
            }
            unset($r);
            out([
                'ok' => true,
                'available' => true,
                'source' => 'database',
                'schema' => 'v2',
                'db' => cfg()['name'],
                'data' => $rows,
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
            ]);
            break;

        case 'get':
            $id = (int)($_GET['id'] ?? 0);
            $rawSlug = (string)($_GET['slug'] ?? '');
            $slug = preg_replace('/[^a-z0-9\-_]/', '', strtolower($rawSlug));
            if ($id <= 0 && $slug === '') {
                out(['error' => 'id ou slug requis'], 400);
            }

            $row = null;
            if ($id > 0) {
                $st = $pdo->prepare("SELECT * FROM qacidates WHERE id = ? AND is_deleted=0 LIMIT 1");
                $st->execute([$id]);
                $row = $st->fetch() ?: null;
            } else {
                $candidates = slugCandidates($slug);
                foreach ($candidates as $cand) {
                    $st = $pdo->prepare("SELECT * FROM qacidates WHERE slug = ? AND is_deleted=0 LIMIT 1");
                    $st->execute([$cand]);
                    $row = $st->fetch() ?: null;
                    if ($row) {
                        $slug = $cand;
                        break;
                    }
                }
                // dernier recours : LIKE
                if (!$row) {
                    $st = $pdo->prepare("SELECT * FROM qacidates WHERE slug LIKE ? AND is_deleted=0 LIMIT 5");
                    $st->execute(['%' . $slug . '%']);
                    $hits = $st->fetchAll();
                    if (count($hits) === 1) {
                        $row = $hits[0];
                    }
                }
            }

            if (!$row) {
                out(['error' => 'Qacidate introuvable', 'slug' => $slug, 'tried' => isset($candidates) ? $candidates : [], 'hint' => 'Vérifie le slug dans la table qacidates'], 404);
            }

            $row['artiste'] = $row['interprete'] ?? '';
            $row['artiste_ar'] = $row['interprete_ar'] ?? '';
            $row['image'] = fixMediaPath($row['image'] ?? null);
            $row['thumbnail'] = fixMediaPath($row['thumbnail'] ?? null);
            $qid = (int)$row['id'];

            $sections = [];
            if (tableExists($pdo, 'qacidate_sections')) {
                $st = $pdo->prepare(
                    'SELECT id, numero, label_fr, label_ar, contenu_fr, contenu_ar, images, ordre
                     FROM qacidate_sections WHERE qacidate_id = ?
                     ORDER BY COALESCE(NULLIF(ordre,0), numero), numero, id'
                );
                $st->execute([$qid]);
                $sections = $st->fetchAll();
                if (!empty($row['interprete'])) { $row['interprete'] = normalizeInterprete((string)$row['interprete']); }
            $row['artiste'] = $row['interprete'] ?? '';
            $folder = (string)($row['img_folder'] ?? '');
                if ($folder === '' && !empty($row['slug'])) {
                    // fallback slug → dossier qacid/
                    $folder = (string)$row['slug'];
                }
                $slug = (string)($row['slug'] ?? '');
                foreach ($sections as $i => $sec) {
                    $sections[$i] = normalizeSection($sec, $folder, $slug);
                }
            }
            $row['sections'] = $sections;

            $row['facts'] = [];
            if (tableExists($pdo, 'qacidate_facts')) {
                $st = $pdo->prepare('SELECT * FROM qacidate_facts WHERE qacidate_id = ? ORDER BY ordre ASC, id ASC');
                $st->execute([$qid]);
                $row['facts'] = $st->fetchAll();
            }
            $row['noms'] = [];
            if (tableExists($pdo, 'qacidate_noms')) {
                $st = $pdo->prepare('SELECT * FROM qacidate_noms WHERE qacidate_id = ? ORDER BY ordre ASC, id ASC');
                $st->execute([$qid]);
                $row['noms'] = $st->fetchAll();
            }
            $row['navigation'] = null;
            if (tableExists($pdo, 'qacidate_navigation')) {
                $st = $pdo->prepare('SELECT * FROM qacidate_navigation WHERE qacidate_id = ? LIMIT 1');
                $st->execute([$qid]);
                $row['navigation'] = $st->fetch() ?: null;
            }

            
            if (is_array($row['navigation'])) {
                if (!empty($row['navigation']['prev_slug'])) {
                    $row['navigation']['prev_slug'] = resolveSlug((string)$row['navigation']['prev_slug']);
                }
                if (!empty($row['navigation']['next_slug'])) {
                    $row['navigation']['next_slug'] = resolveSlug((string)$row['navigation']['next_slug']);
                }
            }

            $row['ok'] = true;
            $row['available'] = true;
            $row['source'] = 'database';
            $row['schema'] = 'v2';
            $row['db'] = cfg()['name'];
            out($row);
            break;

        case 'like':
            $data = readJsonBody();
            $id = (int)($data->id ?? $_GET['id'] ?? 0);
            if ($id <= 0) {
                out(['error' => 'id requis'], 400);
            }
            try {
                $pdo->prepare('UPDATE qacidates SET likes = COALESCE(likes, 0) + 1 WHERE id = ? AND is_deleted = 0')
                    ->execute([$id]);
                $st = $pdo->prepare('SELECT likes FROM qacidates WHERE id = ? LIMIT 1');
                $st->execute([$id]);
                $likes = (int)$st->fetchColumn();
                out(['success' => true, 'likes' => $likes, 'count' => $likes]);
            } catch (Throwable $e) {
                error_log('[qacidates_api] like: ' . $e->getMessage());
                out(['error' => 'Like impossible'], 500);
            }
            break;

        case 'track_view':
            $data = readJsonBody();
            $id = (int)($data->id ?? $_GET['id'] ?? 0);
            if ($id <= 0) {
                out(['error' => 'id requis'], 400);
            }
            // anti-spam simple via cookie session
            if (session_status() !== PHP_SESSION_ACTIVE) {
                @session_start();
            }
            $vk = 'qview_' . $id;
            if (!empty($_SESSION[$vk]) && (time() - (int)$_SESSION[$vk]) < 1800) {
                $st = $pdo->prepare('SELECT views FROM qacidates WHERE id = ? LIMIT 1');
                $st->execute([$id]);
                out(['success' => true, 'views' => (int)$st->fetchColumn(), 'deduped' => true]);
            }
            try {
                $pdo->prepare('UPDATE qacidates SET views = COALESCE(views, 0) + 1 WHERE id = ? AND is_deleted = 0')
                    ->execute([$id]);
                $_SESSION[$vk] = time();
                $st = $pdo->prepare('SELECT views FROM qacidates WHERE id = ? LIMIT 1');
                $st->execute([$id]);
                out(['success' => true, 'views' => (int)$st->fetchColumn()]);
            } catch (Throwable $e) {
                error_log('[qacidates_api] track_view: ' . $e->getMessage());
                out(['error' => 'Vue impossible'], 500);
            }
            break;

        default:
            out(['error' => 'Action inconnue: ' . $action, 'actions' => ['list', 'get', 'stats', 'like', 'track_view']], 400);
    }
} catch (Throwable $e) {
    error_log('[qacidates_api] ' . $e->getMessage());
    out(['error' => 'Erreur serveur', 'detail' => $e->getMessage()], 500);
}
