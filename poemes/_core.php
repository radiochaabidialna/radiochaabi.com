<?php
/**
 * ---------------------------------------------------------------
 *  Chaabi Music — Module « Poèmes » : bibliothèque partagée
 *  Base de lecture : `chaabi_music_qacidats` (LECTURE SEULE)
 *  Bases secondaires LUES (jamais modifiées) :
 *     - chaabi_music_v7_bilingue  (biographies d'artistes, SEO)
 *     - webchaabi                 (glossaire du chaâbi)
 * ---------------------------------------------------------------
 */
declare(strict_types=1);


/* Fichier interne : appelé directement, il répond 404 au lieu de s'exécuter. */
if (isset($_SERVER['SCRIPT_FILENAME'])
    && realpath((string) $_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    exit('Not found');
}

const POEMES_DB_HOST = 'localhost';
const POEMES_DB_USER = 'webchaab_qacidates';
const POEMES_DB_PASS = '8RCWAFH2XBkVhNTvbU3P';
const POEMES_DB_QAC  = 'webchaab_qacidates';   // base principale (lecture seule)
const POEMES_DB_BIO  = 'webchaab_chaabi_music_v7_bilingue'; // biographies + SEO
const POEMES_DB_GLO  = 'webchaab_qacidates';                // glossaire

/**
 * Identifiants réels de la base.
 * ---------------------------------------------------------------
 * Priorité : `config/database.local.php` (à créer sur le serveur à partir
 * de `config/database.local.php.example`), sinon les valeurs locales
 * ci-dessus. Le dossier `config/` est protégé par « Require all denied »
 * et le fichier n'est jamais publié : les mots de passe ne sortent pas.
 */
function db_config(): array
{
    static $cfg = null;
    if ($cfg !== null) return $cfg;

    /* 1) Config locale du module poemes */
    $local = [];
    $file  = __DIR__ . '/config/database.local.php';
    if (is_readable($file)) {
        $tmp = include $file;
        if (is_array($tmp)) $local = $tmp;
    }

    /* 2) Configs du site principal (parent) — même identifiants que l'API radio */
    $siteDb = [];
    $siteQac = [];
    $parent = dirname(__DIR__) . '/config';
    if (is_readable($parent . '/database.local.php')) {
        $tmp = include $parent . '/database.local.php';
        if (is_array($tmp)) $siteDb = $tmp;
    }
    if (is_readable($parent . '/qacidates.local.php')) {
        $tmp = include $parent . '/qacidates.local.php';
        if (is_array($tmp)) $siteQac = $tmp;
    }

    $defaultHost = (string) ($local['host'] ?? $siteDb['host'] ?? $siteQac['host'] ?? POEMES_DB_HOST);
    $defaultUser = (string) ($local['user'] ?? $siteDb['user'] ?? $siteQac['user'] ?? POEMES_DB_USER);
    $defaultPass = (string) ($local['pass'] ?? $siteDb['pass'] ?? $siteQac['pass'] ?? POEMES_DB_PASS);

    /* Noms des bases : poemes local prioritaire, sinon configs site, sinon constantes */
    $nameQac = (string) ($local['name_qac'] ?? $local['name'] ?? $siteQac['name'] ?? POEMES_DB_QAC);
    $nameBio = (string) ($local['name_bio'] ?? $siteDb['name'] ?? POEMES_DB_BIO);
    $nameGlo = (string) ($local['name_glo'] ?? $nameQac);

    $cfg = [
        'host'    => $defaultHost,
        'user'    => $defaultUser,
        'pass'    => $defaultPass,
        'qac'     => $nameQac,
        'bio'     => $nameBio,
        'glo'     => $nameGlo,
        'charset' => (string) ($local['charset'] ?? $siteDb['charset'] ?? 'utf8mb4'),

        /* QAC : poemes > qacidates.local.php > défaut */
        'user_qac' => (string) ($local['user_qac'] ?? $siteQac['user'] ?? $defaultUser),
        'pass_qac' => (string) ($local['pass_qac'] ?? $siteQac['pass'] ?? $defaultPass),
        'host_qac' => (string) ($local['host_qac'] ?? $siteQac['host'] ?? $defaultHost),

        /* BIO : poemes user_bio > database.local.php du SITE > défaut
           → les bios (table artistes) utilisent les mêmes identifiants que le site principal */
        'user_bio' => (string) ($local['user_bio'] ?? $siteDb['user'] ?? $defaultUser),
        'pass_bio' => (string) ($local['pass_bio'] ?? $siteDb['pass'] ?? $defaultPass),
        'host_bio' => (string) ($local['host_bio'] ?? $siteDb['host'] ?? $defaultHost),

        'user_glo' => (string) ($local['user_glo'] ?? $local['user_qac'] ?? $siteQac['user'] ?? $defaultUser),
        'pass_glo' => (string) ($local['pass_glo'] ?? $local['pass_qac'] ?? $siteQac['pass'] ?? $defaultPass),
        'host_glo' => (string) ($local['host_glo'] ?? $local['host_qac'] ?? $siteQac['host'] ?? $defaultHost),
    ];

    return $cfg;
}

/** Version des fichiers app.css / app.js (cache navigateur).
 *  Bumper cette seule valeur suffit : les pages la lisent toutes. */
const ASSET_V = '2.9.14';

/**
 * Graphies d'auteurs équivalentes (déduplication des noms).
 * Clé   = graphie canonique affichée sur le site (base `qacidats`)
 * Valeur = graphie employée par les sources de notices
 *          (`chaabi_music_v7_bilingue.auteurs`, `data/notices_auteurs.php`).
 * Sert uniquement à retrouver la bonne notice : l'affichage reste la clé.
 */
const AUTEURS_ALIAS = [
    'Mustapha Toumi' => 'Moçtefa Tûmi',
];

/**
 * Portrait d'un auteur imposé à la main (la source automatique peut pointer
 * vers un fichier absent, ou vers une photo que l'on préfère remplacer).
 * Clé = nom de l'auteur tel qu'il figure dans `qacidates.auteur`.
 */
const AUTEURS_PHOTO = [
    "El Hadj M'Hamed El Anka" => '/music/img_artistes/el_hadj el anka_5.png',
];

/** Connexion PDO en lecture seule. */
function db(?string $name = null): PDO
{
    static $pool = [];
    static $failLog = [];
    $c = db_config();
    /* on traduit les constantes du module vers les noms réels de la config */
    $map = [POEMES_DB_QAC => $c['qac'], POEMES_DB_BIO => $c['bio'], POEMES_DB_GLO => $c['glo']];
    $role = null; // qac | bio | glo
    if ($name === POEMES_DB_QAC || $name === $c['qac']) $role = 'qac';
    elseif ($name === POEMES_DB_BIO || $name === $c['bio']) $role = 'bio';
    elseif ($name === POEMES_DB_GLO || $name === $c['glo']) $role = 'glo';
    $name = $name ? ($map[$name] ?? $name) : $c['qac'];
    if ($role === null) {
        if ($name === $c['qac']) $role = 'qac';
        elseif ($name === $c['bio']) $role = 'bio';
        elseif ($name === $c['glo']) $role = 'glo';
        else $role = 'qac';
    }
    if (!isset($pool[$name])) {
        $host = $c['host_' . $role] ?? $c['host'];
        $user = $c['user_' . $role] ?? $c['user'];
        $pass = $c['pass_' . $role] ?? $c['pass'];
        $dsn = 'mysql:host=' . $host . ';dbname=' . $name . ';charset=' . $c['charset'];
        try {
            $pdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
            // Ceinture de sécurité : toute écriture échoue.
            try { $pdo->exec('SET SESSION TRANSACTION READ ONLY'); } catch (Throwable $e) {}
            $pool[$name] = $pdo;
        } catch (Throwable $e) {
            // Log une seule fois par base (évite de saturer les logs)
            if (empty($failLog[$name])) {
                $failLog[$name] = true;
                error_log(sprintf(
                    '[poemes] Connexion BDD échouée role=%s db=%s host=%s user=%s : %s',
                    $role,
                    $name,
                    $host,
                    $user,
                    $e->getMessage()
                ));
            }
            throw $e;
        }
    }
    return $pool[$name];
}

/** Échappement HTML. */
function h(?string $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/* ═══════════ Utilitaires HTTP (API) ═══════════ */
function json_headers(): void
{
    if (headers_sent()) return;
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Cache-Control: no-cache, must-revalidate');
}
function json_out(array $payload, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function fail(string $message, int $code = 400, array $extra = []): void
{
    json_out(array_merge(['ok' => false, 'error' => $message], $extra), $code);
}
function qstr(string $key, ?string $default = null, int $maxLen = 120): ?string
{
    $v = $_GET[$key] ?? null;
    if (!is_string($v)) return $default;
    $v = trim($v);
    if ($v === '' || mb_strlen($v) > $maxLen) return $default;
    return $v;
}
function qint(string $key, int $default, int $min, int $max): int
{
    $v = $_GET[$key] ?? null;
    if (!is_string($v) || !preg_match('/^-?\d+$/', $v)) return $default;
    return max($min, min($max, (int) $v));
}

/* ═══════════ URL & médias ═══════════ */
function site_base_url(): string
{
    $script = (string) ($_SERVER['SCRIPT_NAME'] ?? '');
    foreach (['/poemes/api/', '/poemes/'] as $needle) {
        $pos = strpos($script, $needle);
        if ($pos !== false) return substr($script, 0, $pos);
    }
    return rtrim(str_replace('\\', '/', dirname($script)), '/');
}
function image_url(?string $path): ?string
{
    $path = trim((string) $path);
    if ($path === '') return null;
    if (preg_match('#^https?://#i', $path)) return $path;
    return '/' . ltrim($path, '/');
}
function media_url(?string $path): ?string
{
    $path = trim((string) $path);
    if ($path === '') return null;
    if (preg_match('#^https?://#i', $path)) return $path;
    $path = '/' . ltrim($path, '/');
    return implode('/', array_map('rawurlencode', explode('/', $path)));
}
/** URL publique d'une page du module (URL « propre »). */
function page_url(string $path = ''): string
{
    return site_base_url() . '/poemes/' . ltrim($path, '/');
}

/**
 * Vignette d'un manuscrit : générée à la demande (GD), mise en cache sur disque
 * et servie en WebP. Repli sur l'original si GD échoue ou si le fichier manque.
 *
 * @return array{src:string, w:?int, h:?int, full:string}
 */
function manuscrit_vignette(string $url, int $largeur = 760): array
{
    $full = $url;
    $fallback = ['src' => $url, 'w' => null, 'h' => null, 'full' => $full];

    if (!function_exists('imagewebp')) return $fallback;
    if (!media_exists($full)) return $fallback;

    $src = www_root() . '/' . ltrim(str_replace('\\', '/', $full), '/');
    $info = @getimagesize($src);
    if (!$info || empty($info[0]) || empty($info[1])) return $fallback;
    [$ow, $oh] = $info;
    $type = $info[2] ?? 0;

    $dir = __DIR__ . '/cache/mini';
    if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) return $fallback;

    $name = md5($full) . '-' . $largeur . '.webp';
    $dest = $dir . '/' . $name;
    $urlMini = page_url('cache/mini/' . $name);

    if (!is_file($dest)) {
        $im = match ($type) {
            IMAGETYPE_JPEG => @imagecreatefromjpeg($src),
            IMAGETYPE_PNG  => @imagecreatefrompng($src),
            IMAGETYPE_GIF  => @imagecreatefromgif($src),
            IMAGETYPE_WEBP => @imagecreatefromwebp($src),
            default        => false,
        };
        if (!$im) return $fallback;

        $nw = min($largeur, $ow);
        $nh = (int) round($oh * ($nw / $ow));
        $out = imagecreatetruecolor($nw, $nh);
        // fond blanc (les GIF ont des transparences)
        imagefilledrectangle($out, 0, 0, $nw, $nh, imagecolorallocate($out, 255, 255, 255));
        imagecopyresampled($out, $im, 0, 0, 0, 0, $nw, $nh, $ow, $oh);
        @imagewebp($out, $dest, 78);
        imagedestroy($out);
        imagedestroy($im);
        if (!is_file($dest)) return $fallback;
        $nh = $nh ?: null;
    } else {
        $nh = (int) round($oh * (min($largeur, $ow) / $ow));
    }

    return [
        'src'  => $urlMini,
        'w'    => min($largeur, $ow),
        'h'    => $nh,
        'full' => $full,
    ];
}

/* ═══════════ Manuscrits (règle métier) ═══════════ */
function manuscripts_fs(): string
{
    return dirname(__DIR__) . '/img_qacidates';
}

/** Racine du serveur web (…/wamp64/www). */
function www_root(): string
{
    /* Racine web servie par Apache. DOCUMENT_ROOT est fiable quel que soit
       le sous-dossier où le module est installé ; on retombe sur le calcul
       par profondeur si la variable n'est pas disponible (CLI). */
    $doc = (string) ($_SERVER['DOCUMENT_ROOT'] ?? '');
    if ($doc !== '' && is_dir($doc)) return rtrim(str_replace('\\', '/', $doc), '/');
    return dirname(__DIR__, 2);
}

/** Le fichier correspondant à une URL publique existe-t-il sur le disque ? */
function media_exists(?string $url): bool
{
    $u = trim((string) $url);
    if ($u === '' || preg_match('#^https?://#i', $u)) return false;
    $fs = www_root() . '/' . ltrim(str_replace('\\', '/', $u), '/');
    return is_file($fs);
}
const MANUSCRIPT_EXT = ['gif', 'jpg', 'jpeg', 'png', 'webp'];

/**
 * RÈGLE : si la section n'a pas de texte arabe -> on affiche le(s) manuscrit(s).
 * Uniquement des fichiers existants (zéro 404).
 */
function manuscript_images(?string $imagesField, string $folder, int $numero = 0): array
{
    $fsBase  = manuscripts_fs();
    $urlBase = site_base_url();
    $out     = [];

    $push = static function (string $src, string $alt) use (&$out, $fsBase, $urlBase): void {
        $src = trim($src);
        if ($src === '') return;
        $src = ltrim(str_replace('\\', '/', $src), '/');
        $rel = preg_replace('#^news_qacidates/#', '', $src);
        $fs  = $fsBase . '/' . preg_replace('#^img_qacidates/#', '', $rel);
        if (!is_file($fs)) return;
        $out[] = [
            'src' => $rel,
            'url' => $urlBase . '/' . implode('/', array_map('rawurlencode', explode('/', $rel))),
            'alt' => $alt !== '' ? $alt : 'Manuscrit',
        ];
    };

    $raw = trim((string) $imagesField);
    if ($raw !== '') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            foreach ($decoded as $it) {
                if (is_string($it)) $push($it, 'Manuscrit');
                elseif (is_array($it)) $push((string) ($it['src'] ?? ''), (string) ($it['alt'] ?? 'Manuscrit'));
            }
        } else {
            foreach (preg_split('/\s*,\s*/', $raw) ?: [] as $it) $push($it, 'Manuscrit');
        }
    }

    if (!$out && $folder !== '') {
        $dir = $fsBase . '/' . trim(str_replace(['..', '\\'], ['', '/'], $folder), '/');
        if (is_dir($dir)) {
            $files = [];
            foreach (scandir($dir) ?: [] as $f) {
                if ($f === '.' || $f === '..') continue;
                if (in_array(strtolower(pathinfo($f, PATHINFO_EXTENSION)), MANUSCRIPT_EXT, true)) $files[] = $f;
            }
            sort($files, SORT_NATURAL | SORT_FLAG_CASE);
            $byNum = $numero > 0
                ? array_values(array_filter($files, static fn(string $f): bool => (bool) preg_match('/' . $numero . '\.[a-z]+$/i', $f)))
                : [];
            foreach (($byNum ?: $files) as $f) $push('img_qacidates/' . $folder . '/' . $f, 'Manuscrit — ' . $f);
        }
    }
    return $out;
}

/* ═══════════ Texte ═══════════ */
function flatten_contenu(?string $text): string
{
    $text = trim((string) $text);
    if ($text === '') return '';

    /* Contenu structuré JSON : [{"type":"normal","texte":"..."},{"type":"refrain","texte":"..."}] */
    if (isset($text[0]) && ($text[0] === '[' || $text[0] === '{')) {
        $decoded = json_decode($text, true);
        if (is_array($decoded)) {
            $parts = [];
            /* objet unique {type, texte} */
            if (isset($decoded['texte']) || isset($decoded['text'])) {
                $decoded = [$decoded];
            }
            foreach ($decoded as $it) {
                if (is_string($it)) {
                    $t = trim($it);
                    if ($t !== '') $parts[] = $t;
                    continue;
                }
                if (!is_array($it)) continue;
                $t = trim((string) ($it['texte'] ?? $it['text'] ?? $it['fr'] ?? $it['ar'] ?? ''));
                if ($t === '') continue;
                $type = strtolower((string) ($it['type'] ?? 'normal'));
                /* refrain : on garde le texte tel quel (le style peut venir du CSS parent) */
                $parts[] = $t;
            }
            if ($parts) {
                return implode("\n", $parts);
            }
        }
    }
    return $text;
}

/**
 * Découpe un contenu en lignes affichables.
 * Accepte le texte brut OU le JSON structuré des sections
 * ([{"type":"normal","texte":"..."},{"type":"refrain","texte":"..."}]).
 */
function to_lines(?string $text): array
{
    $text = flatten_contenu($text);
    if (trim($text) === '') return [];
    $text = str_replace(["\r\n", "\r"], "\n", $text);
    $out = [];
    foreach (explode("\n", $text) as $l) {
        $l = trim($l);
        if ($l !== '') $out[] = $l;
    }
    return $out;
}

/** Métadonnées de lignes (type normal/refrain) si le contenu est du JSON structuré. */
function contenu_line_meta(?string $text): array
{
    $text = trim((string) $text);
    if ($text === '' || ($text[0] !== '[' && $text[0] !== '{')) {
        return array_map(static fn($l) => ['type' => 'normal', 'texte' => $l], to_lines($text));
    }
    $decoded = json_decode($text, true);
    if (!is_array($decoded)) {
        return array_map(static fn($l) => ['type' => 'normal', 'texte' => $l], to_lines($text));
    }
    if (isset($decoded['texte']) || isset($decoded['text'])) {
        $decoded = [$decoded];
    }
    $out = [];
    foreach ($decoded as $it) {
        if (is_string($it)) {
            foreach (to_lines($it) as $l) $out[] = ['type' => 'normal', 'texte' => $l];
            continue;
        }
        if (!is_array($it)) continue;
        $t = trim((string) ($it['texte'] ?? $it['text'] ?? ''));
        if ($t === '') continue;
        $type = strtolower((string) ($it['type'] ?? 'normal'));
        if (!in_array($type, ['normal', 'refrain', 'chorus', 'titre', 'title'], true)) {
            $type = 'normal';
        }
        if ($type === 'chorus') $type = 'refrain';
        if ($type === 'title') $type = 'titre';
        foreach (to_lines($t) as $l) {
            $out[] = ['type' => $type, 'texte' => $l];
        }
    }
    return $out;
}



/** Icône Font Awesome de la base -> symbole universel (aucune police distante). */
function icon_for(?string $name): string
{
    static $map = [
        'fa-feather' => '🪶', 'fa-dove' => '🕊️', 'fa-music' => '🎵', 'fa-guitar' => '🎸',
        'fa-users' => '👥', 'fa-user' => '👤', 'fa-balance-scale' => '⚖️', 'fa-clock' => '🕰️',
        'fa-heart' => '❤️', 'fa-fire' => '🔥', 'fa-book' => '📖', 'fa-scroll' => '📜',
        'fa-star' => '⭐', 'fa-moon' => '🌙', 'fa-sun' => '☀️', 'fa-crown' => '👑',
        'fa-plane' => '✈️', 'fa-anchor' => '⚓', 'fa-water' => '🌊', 'fa-leaf' => '🌿',
        'fa-language' => '🔤', 'fa-map' => '🗺️', 'fa-lightbulb' => '💡', 'fa-quote-right' => '❞',
    ];
    $k = trim((string) $name);
    return $map[$k] ?? '❖';
}

/* ═══════════ Accès données du module ═══════════ */

/** Une qacidate + ses sections/facts/noms/navigation (règle manuscrits appliquée). */
function get_qacida(string $slug): ?array
{
    $st = db()->prepare('SELECT * FROM `qacidates` WHERE `slug` = :s AND `is_deleted` = 0 LIMIT 1');
    $st->execute([':s' => $slug]);
    $row = $st->fetch();
    if (!$row) return null;
    $qid = (int) $row['id'];

    $folder = trim((string) ($row['img_folder'] ?? ''));
    if ($folder === '') $folder = (string) $row['slug'];

    $st = db()->prepare('SELECT * FROM `qacidate_sections` WHERE `qacidate_id` = :q ORDER BY `ordre` ASC, `numero` ASC');
    $st->execute([':q' => $qid]);
    $sections = [];
    foreach ($st->fetchAll() as $s) {
        $hasAr  = trim((string) $s['contenu_ar']) !== '';
        $images = $hasAr ? [] : manuscript_images($s['images'] ?? '', $folder, (int) $s['numero']);
        /* vignettes WebP pour l'affichage (l'original reste utilisé par la loupe) */
        foreach ($images as $k => $im) {
            $v = manuscrit_vignette($im['url']);
            $images[$k]['thumb']   = $v['src'];
            $images[$k]['thumb_w'] = $v['w'];
            $images[$k]['thumb_h'] = $v['h'];
        }
        $sections[] = [
            'numero'      => (int) $s['numero'],
            'label_fr'    => $s['label_fr'],
            'label_ar'    => $s['label_ar'],
            'lines_fr'    => to_lines($s['contenu_fr']),
            'lines_ar'    => to_lines($s['contenu_ar']),
            'lines_fr_meta' => contenu_line_meta($s['contenu_fr']),
            'lines_ar_meta' => contenu_line_meta($s['contenu_ar']),
            'images'      => array_values($images),
            'ar_is_image' => count($images) > 0,
        ];
    }

    $st = db()->prepare('SELECT `icone`,`titre`,`valeur` FROM `qacidate_facts` WHERE `qacidate_id` = :q ORDER BY `ordre` ASC, `id` ASC');
    $st->execute([':q' => $qid]);
    $facts = $st->fetchAll();

    $st = db()->prepare('SELECT `emoji`,`nom_fr`,`nom_ar`,`description_fr` FROM `qacidate_noms` WHERE `qacidate_id` = :q ORDER BY `ordre` ASC, `id` ASC');
    $st->execute([':q' => $qid]);
    $noms = $st->fetchAll();

    $st = db()->prepare('SELECT * FROM `qacidate_navigation` WHERE `qacidate_id` = :q LIMIT 1');
    $st->execute([':q' => $qid]);
    $nav = $st->fetch() ?: [];

    $interp = (string) ($row['interprete'] ?? '');
    $auteur = (string) ($row['auteur'] ?? '');
    $related = [];
    if ($interp !== '' || $auteur !== '') {
        $st = db()->prepare(
            "SELECT `slug`,`titre`,`titre_ar`,`interprete`,`image` FROM `qacidates`
              WHERE `is_deleted`=0 AND `status`='published' AND `id`<>:id
                AND (`interprete`=:i OR `auteur`=:a)
              ORDER BY (`interprete`=:i2) DESC, `views` DESC LIMIT 6"
        );
        $st->execute([':id' => $qid, ':i' => $interp, ':a' => $auteur, ':i2' => $interp]);
        $related = $st->fetchAll();
    }

    return [
        'item' => [
            'id' => $qid, 'slug' => $row['slug'], 'titre' => $row['titre'], 'titre_ar' => $row['titre_ar'],
            'sous_titre' => $row['sous_titre'], 'auteur' => $row['auteur'], 'auteur_ar' => $row['auteur_ar'],
            'interprete' => $row['interprete'], 'interprete_ar' => $row['interprete_ar'],
            'theme' => $row['theme'], 'image' => image_url($row['image']),
            'audio' => media_url($row['audio']), 'duree' => $row['duree'],
            'views' => (int) $row['views'], 'likes' => (int) $row['likes'],
            'refrain_fr' => $row['refrain_fr'], 'refrain_ar' => $row['refrain_ar'],
            'meta_title' => $row['meta_title'], 'meta_description' => $row['meta_description'],
            'published_at' => $row['published_at'],
        ],
        'sections'   => $sections,
        'facts'      => $facts,
        'noms'       => $noms,
        'navigation' => [
            'prev' => trim((string) ($nav['prev_slug'] ?? '')) !== '' ? ['slug' => $nav['prev_slug'], 'titre' => $nav['prev_titre']] : null,
            'next' => trim((string) ($nav['next_slug'] ?? '')) !== '' ? ['slug' => $nav['next_slug'], 'titre' => $nav['next_titre']] : null,
        ],
        'related'    => $related,
    ];
}

/**
 * Image d'un artiste : dans `chaabi_music_v7_bilingue` les chemins sont
 * RELATIFS au dossier /music (ex. « img_artistes/anka.jpg ») — contrairement
 * à `qacidates.image` qui est déjà absolu (« /music/img_artistes/… »).
 */
function artiste_image(?string $path): ?string
{
    $p = trim((string) $path);
    if ($p === '') return null;
    if (preg_match('#^https?://#i', $p)) return $p;
    if ($p[0] === '/') return $p;                 // déjà absolu
    if (strpos($p, '/') === false) $p = 'img_artistes/' . $p;  // simple nom de fichier
    return '/music/' . $p;
}

/** Correspondance explicite interprète (qacidates) -> artiste (v7_bilingue). */
const INTERPRETES_MAP = [
    "Cheikh El Hadj M'Hamed El Anka" => 'Elhadj el anka',
    'El Hachemi Guerouâbi'           => 'El Hachemi Guerouabi',
    'Amar Ezzahi'                    => 'Amar ezzahi',
    "El Hadj M'rizeq"                => 'Elhadj mrizek',
    'Reda Doumaz'                    => 'Reda doumaz',
    'El Hadj Mahfoud'                => 'El Hadj Mahfoud',
    'Cheikh Hsissen'                 => 'Cheikh hsissen',
    "Amar Ezzahi, El Hachemi Guerouâbi & Cheikh El Hadj M'Hamed El Anka" => 'Amar ezzahi',
];

/** Normalise un nom pour comparaison (minuscules, sans accent, sans civilité). */
function norm_nom(string $s): string
{
    $s = mb_strtolower($s, 'UTF-8');
    $s = strtr($s, [
        'à'=>'a','á'=>'a','â'=>'a','ä'=>'a','é'=>'e','è'=>'e','ê'=>'e','ë'=>'e',
        'î'=>'i','ï'=>'i','í'=>'i','ô'=>'o','ö'=>'o','ó'=>'o','û'=>'u','ù'=>'u',
        'ü'=>'u','ú'=>'u','ç'=>'c','ñ'=>'n','’'=>"'",'‘'=>"'",'–'=>'-','—'=>'-',
    ]);
    $s = preg_replace('/[^a-z0-9]+/u', ' ', (string) $s);
    $noise = ['cheikh','chikh','cheik','elhadj','hadj','mhamed','mohamed','mohammed','mohand','sid','sidi'];
    $t = [];
    foreach (explode(' ', trim((string) $s)) as $tok) {
        if ($tok !== '' && !in_array($tok, $noise, true)) $t[] = $tok;
    }
    return implode(' ', $t);
}

/** Score de ressemblance entre deux noms (0-100). */
function match_score(string $a, string $b): float
{
    $na = norm_nom($a);
    $nb = norm_nom($b);
    if ($na === '' || $nb === '') return 0;
    if ($na === $nb) return 100.0;
    similar_text($na, $nb, $pct);
    return (float) $pct;
}

/** Une biographie est-elle exploitable ? (écarte les « À compléter ») */
function bio_utile(?string $bio): bool
{
    $b = trim((string) $bio);
    if (mb_strlen($b) < 40) return false;
    if (mb_stripos($b, 'compléter') !== false) return false;
    if (mb_stripos($b, 'a completer') !== false) return false;
    return true;
}

/** Biographie d'un interprète (bases secondaires, lecture seule). */
function get_biographie(string $nom): ?array
{
    $nom = trim($nom);
    if ($nom === '') return null;
    $target = INTERPRETES_MAP[$nom] ?? null;

    try {
        $rows = db(POEMES_DB_BIO)->query(
            'SELECT `nom`,`nom_ar`,`bio`,`bio_ar`,`image`,`slug` FROM `artistes`'
        )->fetchAll();

        $best = null; $bestScore = 0.0; $bestBio = 0;
        foreach ($rows as $r) {
            if ($target !== null && $r['nom'] === $target) {
                $r['source'] = 'chaabi_music_v7_bilingue';
                return $r;
            }
            $sc  = match_score($nom, (string) $r['nom']);
            $bio = bio_utile($r['bio'] ?? null) ? mb_strlen(trim((string) $r['bio'])) : 0;
            $prenom = (mb_strpos(norm_nom($nom), norm_nom((string) $r['nom'])) === 0);
            if (($sc >= 72.0 || $prenom) && $bio > 0) {
                if ($sc > $bestScore || ($sc === $bestScore && $bio > $bestBio)) {
                    $best = $r; $bestScore = $sc; $bestBio = $bio;
                }
            }
        }
        if ($best !== null && (bio_utile($best['bio'] ?? null) || bio_utile($best['bio_ar'] ?? null))) {
            $best['source'] = 'chaabi_music_v7_bilingue';
            return $best;
        }
    } catch (Throwable $e) {
        error_log('[poemes] get_biographie (base BIO) échoué pour « ' . $nom . ' » : ' . $e->getMessage());
        /* base absente / droits insuffisants : on continue vers le repli */
    }

    try {
        $st = db(POEMES_DB_GLO)->prepare(
            'SELECT `artiste` AS nom, `biographie` AS bio, `photo` AS image FROM `biographies`
              WHERE `artiste` = :n OR `artiste` LIKE :l ORDER BY (`artiste` = :n2) DESC LIMIT 1'
        );
        $st->execute([':n' => $nom, ':l' => '%' . $nom . '%', ':n2' => $nom]);
        $r = $st->fetch();
        if ($r && bio_utile($r['bio'] ?? null)) {
            $r['source'] = 'webchaabi';
            return $r;
        }
    } catch (Throwable $e) {
        error_log('[poemes] get_biographie (repli GLO/biographies) échoué pour « ' . $nom . ' » : ' . $e->getMessage());
    }

    return null;
}

/** Notices d'auteurs rédigées à partir des documents fournis par l'utilisateur. */
function notices_auteurs(): array
{
    static $n = null;
    if ($n === null) {
        $f = __DIR__ . '/data/notices_auteurs.php';
        $n = is_file($f) ? (array) include $f : [];
    }
    return $n;
}

/**
 * Rapprochement de deux NOMS DE POÈTES (plus strict que match_score).
 * Exige que le dernier mot (le nom de famille) corresponde, ET au moins
 * un autre mot en commun. Évite les faux positifs type
 * « Hadj El Anka dit Mohammed Lahlou » ≠ « Cheikh Mohamed Lahlo ».
 */
function auteur_match_score(string $a, string $b): float
{
    $na = norm_nom($a);
    $nb = norm_nom($b);
    if ($na === '' || $nb === '') return 0.0;
    if ($na === $nb) return 1.0;

    $ta = array_values(array_filter(explode(' ', $na), static fn(string $t): bool => mb_strlen($t) >= 3));
    $tb = array_values(array_filter(explode(' ', $nb), static fn(string $t): bool => mb_strlen($t) >= 3));
    if (!$ta || !$tb) return 0.0;

    $la = (string) end($ta);
    $lb = (string) end($tb);
    $lastOk = ($la === $lb)
        || (mb_strlen($la) >= 4 && mb_strlen($lb) >= 4 && mb_substr($la, 0, 4) === mb_substr($lb, 0, 4))
        || (mb_strlen($la) >= 4 && mb_strlen($lb) >= 4 && levenshtein($la, $lb) <= 1);
    if (!$lastOk) return 0.0;

    $common = 0;
    foreach ($ta as $t) {
        foreach ($tb as $u) {
            if ($t === $u) { $common++; break; }
        }
    }
    if ($common < 1) return 0.0;

    return 0.6 + 0.4 * ($common / max(1, min(count($ta), count($tb))));
}

/**
 * Notice d'un AUTEUR (poète). Trois sources, par ordre de priorité :
 *   1) `chaabi_music_v7_bilingue.auteurs`  (table créée par l'utilisateur)
 *   2) `data/notices_auteurs.php`           (notices rédigées depuis les documents fournis)
 *   3) `webchaabi.biographies`              (repli)
 */
function get_notice_auteur(string $nom): ?array
{
    $nom = trim($nom);
    if ($nom === '') return null;

    /* déduplication : une même personne peut avoir plusieurs graphies */
    $nomNotice = AUTEURS_ALIAS[$nom] ?? $nom;

    /* ── 1) table `auteurs` (v7) ── */
    try {
        $rows = db(POEMES_DB_BIO)->query(
            'SELECT `nom`,`nom_ar`,`bio`,`bio_ar`,`slug` FROM `auteurs` WHERE `is_deleted` = 0'
        )->fetchAll();
        $best = null; $bestScore = 0.0;
        foreach ($rows as $r) {
            if (!bio_utile($r['bio'] ?? null) && !bio_utile($r['bio_ar'] ?? null)) continue;
            $sc = auteur_match_score($nomNotice, (string) $r['nom']);
            if ($sc > $bestScore) { $best = $r; $bestScore = $sc; }
        }
        if ($best !== null && $bestScore >= 0.6) {
            return [
                'nom_ar'     => $best['nom_ar'] ?? null,
                'siecle'     => null,
                'region'     => null,
                'bio_fr'     => bio_utile($best['bio'] ?? null) ? trim((string) $best['bio']) : null,
                'bio_ar'     => bio_utile($best['bio_ar'] ?? null) ? trim((string) $best['bio_ar']) : null,
                'vers'       => null,
                'photo'      => AUTEURS_PHOTO[$nom] ?? null,
                'source'     => 'chaabi_music_v7_bilingue.auteurs',
                'source_web' => null,
            ];
        }
    } catch (Throwable $e) { /* table absente : on passe à la suite */ }

    /* ── 2) notices locales (documents fournis) ── */
    $locale = notices_auteurs()[$nom] ?? notices_auteurs()[$nomNotice] ?? null;

    /* ── 3) webchaabi (repli) ── */
    $web = null;
    try {
        $rows = db(POEMES_DB_GLO)->query('SELECT `artiste`,`biographie`,`photo` FROM `biographies`')->fetchAll();
        $best = null; $bestScore = 0.0;
        foreach ($rows as $r) {
            $sc = match_score($nomNotice, (string) $r['artiste']);
            if (bio_utile($r['biographie'] ?? null) && $sc >= 70.0 && $sc >= $bestScore) {
                $best = $r; $bestScore = $sc;
            }
        }
        if ($best) {
            $web = [
                'bio'    => trim((string) $best['biographie']),
                'photo'  => trim((string) ($best['photo'] ?? '')),
                'source' => 'webchaabi.biographies',
            ];
        }
    } catch (Throwable $e) {}

    if (!$locale && !$web) return null;

    return [
        'nom_ar'     => $locale['nom_ar'] ?? null,
        'siecle'     => $locale['siecle'] ?? null,
        'region'     => $locale['region'] ?? null,
        'bio_fr'     => $locale['bio_fr'] ?? null,
        'bio_ar'     => $locale['bio_ar'] ?? null,
        'vers'       => $locale['vers'] ?? null,
        'bio_web'    => $web['bio'] ?? null,
        'photo'      => AUTEURS_PHOTO[$nom] ?? artiste_image($web['photo'] ?? null),
        'source'     => $locale ? ($locale['source_doc'] ?? 'document fourni') : null,
        'source_web' => $web['source'] ?? null,
    ];
}

/** Qacidate « à la une » : avec audio, un refrain, la plus consultée. */
function get_alaune(): ?array
{
    $r = db()->query(
        "SELECT `slug`,`titre`,`titre_ar`,`sous_titre`,`auteur`,`auteur_ar`,`interprete`,`theme`,
                `image`,`audio`,`duree`,`refrain_fr`,`refrain_ar`,`views`
           FROM `qacidates`
          WHERE `is_deleted`=0 AND `status`='published'
            AND `audio` IS NOT NULL AND `audio` <> ''
            AND `refrain_fr` IS NOT NULL AND `refrain_fr` <> ''
       ORDER BY `views` DESC, `id` DESC LIMIT 1"
    )->fetch();
    if (!$r) return null;
    $r['image'] = image_url($r['image']);
    $r['audio_url'] = media_url($r['audio']);
    $r['refrain_lines_fr'] = array_slice(to_lines($r['refrain_fr']), 0, 3);
    $r['refrain_lines_ar'] = array_slice(to_lines($r['refrain_ar']), 0, 3);
    return $r;
}

/** Chiffres clés du répertoire (pour la page d'accueil). */
function get_stats(): array
{
    $w = "`is_deleted`=0 AND `status`='published'";
    return [
        'qacidates'   => (int) db()->query("SELECT COUNT(*) FROM `qacidates` WHERE $w")->fetchColumn(),
        'audios'      => (int) db()->query("SELECT COUNT(*) FROM `qacidates` WHERE $w AND `audio` IS NOT NULL AND `audio` <> ''")->fetchColumn(),
        'interpretes' => (int) db()->query("SELECT COUNT(DISTINCT `interprete`) FROM `qacidates` WHERE $w AND `interprete` <> ''")->fetchColumn(),
        'auteurs'     => (int) db()->query("SELECT COUNT(DISTINCT `auteur`) FROM `qacidates` WHERE $w AND `auteur` <> ''")->fetchColumn(),
        'themes'      => (int) db()->query("SELECT COUNT(DISTINCT `theme`) FROM `qacidates` WHERE $w AND `theme` <> ''")->fetchColumn(),
        'glossaire'   => count(glossaire()),
    ];
}

/** Glossaire chaâbi (clé normalisée => explication). */
function glossaire(): array
{
    static $g = null;
    if ($g !== null) return $g;
    $g = [];
    try {
        foreach (db(POEMES_DB_GLO)->query('SELECT `mot`,`explication` FROM `glossaire`') as $r) {
            $k = mb_strtolower(trim((string) $r['mot']), 'UTF-8');
            if ($k !== '') $g[$k] = trim((string) $r['explication']);
        }
    } catch (Throwable $e) {}
    return $g;
}

/**
 * Prépare un texte pour l'affichage : échappe le HTML PUIS ré-autorise une
 * petite liste de balises simples (utilisées dans les notices rédigées) et
 * convertit les marqueurs **gras** en <strong>.
 * Le texte est échappé AVANT, donc aucune injection n'est possible.
 */
function texte_enrichi(string $texte): string
{
    // séquences « \n » littérales venant de certaines bases
    $texte = str_replace(['\\n', '\\r'], ["\n", ''], $texte);

    $t = h($texte);
    $t = strtr($t, [
        '&lt;em&gt;'     => '<em>',      '&lt;/em&gt;'     => '</em>',
        '&lt;strong&gt;' => '<strong>',  '&lt;/strong&gt;' => '</strong>',
        '&lt;b&gt;'      => '<strong>',  '&lt;/b&gt;'      => '</strong>',
        '&lt;i&gt;'      => '<em>',      '&lt;/i&gt;'      => '</em>',
        '&lt;br&gt;'     => '<br>',      '&lt;br/&gt;'     => '<br>',
        '&lt;br /&gt;'   => '<br>',
    ]);
    $t = preg_replace('/\*\*(.+?)\*\*/su', '<strong>$1</strong>', $t) ?? $t;
    return $t;
}

/** Surligne les termes du glossaire présents dans un texte (HTML sûr). */
function glossaire_liens(string $texte, int $max = 4): string
{
    $g = glossaire();
    if (!$g || trim($texte) === '') return texte_enrichi($texte);
    $esc   = texte_enrichi($texte);
    $done  = 0;
    // termes les plus longs d'abord (évite les recouvrements)
    $terms = array_keys($g);
    usort($terms, static fn($a, $b) => mb_strlen($b) <=> mb_strlen($a));
    foreach ($terms as $t) {
        if ($done >= $max) break;
        if (mb_strlen($t) < 3) continue;
        $pattern = '/(?<![\p{L}])(' . preg_quote($t, '/') . ')(?![\p{L}])/iu';
        $count = 0;
        $esc = preg_replace_callback($pattern, function ($m) use ($g, $t, &$count) {
            if ($count++ > 0) return $m[1];
            return '<dfn class="gloss" tabindex="0" data-def="' . h($g[$t]) . '">' . $m[1] . '</dfn>';
        }, $esc, 1);
        if ($count > 0) $done++;
    }
    return (string) $esc;
}

/* ═══════════ Listes pour l'interface ═══════════ */
function get_facets(): array
{
    $w = "`is_deleted`=0 AND `status`='published'";
    $total = (int) db()->query("SELECT COUNT(*) FROM `qacidates` WHERE $w")->fetchColumn();

    $interp = db()->query(
        "SELECT `interprete` AS nom, MAX(`interprete_ar`) AS nom_ar, COUNT(*) AS count,
                (SELECT i2.`image` FROM `qacidates` i2
                  WHERE i2.`interprete` = q.`interprete` AND i2.`image` IS NOT NULL AND i2.`image` <> ''
                  ORDER BY i2.`id` DESC LIMIT 1) AS image
           FROM `qacidates` q
          WHERE $w AND `interprete` IS NOT NULL AND `interprete` <> ''
       GROUP BY `interprete` ORDER BY count DESC, `interprete` ASC"
    )->fetchAll();

    /* Qacidates sans interprète renseigné : un filtre « Autres » pour ne pas les perdre */
    $sansI = (int) db()->query("SELECT COUNT(*) FROM `qacidates`
                                 WHERE $w AND (`interprete` IS NULL OR `interprete` = '')")->fetchColumn();
    if ($sansI > 0) {
        $interp[] = ['nom' => 'Autres', 'nom_ar' => 'أخرى', 'count' => $sansI, 'image' => null];
    }

    $themes = db()->query(
        "SELECT `theme` AS nom, COUNT(*) AS count FROM `qacidates`
          WHERE $w AND `theme` IS NOT NULL AND `theme` <> ''
       GROUP BY `theme` ORDER BY count DESC, `theme` ASC"
    )->fetchAll();

    $auteurs = db()->query(
        "SELECT `auteur` AS nom, MAX(`auteur_ar`) AS nom_ar, COUNT(*) AS count
           FROM `qacidates`
          WHERE $w AND `auteur` IS NOT NULL AND `auteur` <> ''
       GROUP BY `auteur` ORDER BY count DESC, `auteur` ASC"
    )->fetchAll();

    return ['total' => $total, 'interpretes' => $interp, 'themes' => $themes, 'auteurs' => $auteurs];
}

function get_liste(array $f = []): array
{
    $where  = ["q.`is_deleted`=0", "q.`status`='published'"];
    $params = [];
    if (!empty($f['interprete'])) {
        if ($f['interprete'] === 'Autres') {
            $where[] = "(q.`interprete` IS NULL OR q.`interprete` = '')";   /* filtre « sans interprète » */
        } else {
            $where[] = 'q.`interprete` = :i'; $params[':i'] = $f['interprete'];
        }
    }
    if (!empty($f['auteur']))     { $where[] = 'q.`auteur` = :au';    $params[':au'] = $f['auteur']; }
    if (!empty($f['theme']))      { $where[] = 'q.`theme` = :t';      $params[':t'] = $f['theme']; }
    if (!empty($f['audio']))      { $where[] = "q.`audio` IS NOT NULL AND q.`audio` <> ''"; }
    if (!empty($f['q'])) {
        /* Recherche « profonde » : titre, sous-titre, auteur, interprète, slug,
           refrain ET corps des sections (arabe + français). */
        $where[] = '(q.`titre` LIKE :q1 OR q.`titre_ar` LIKE :q2 OR q.`auteur` LIKE :q3
                     OR q.`auteur_ar` LIKE :q4 OR q.`interprete` LIKE :q5 OR q.`slug` LIKE :q6
                     OR q.`sous_titre` LIKE :q7 OR q.`refrain_fr` LIKE :q8 OR q.`refrain_ar` LIKE :q9
                     OR EXISTS (SELECT 1 FROM `qacidate_sections` s
                                 WHERE s.`qacidate_id` = q.`id`
                                   AND (s.`contenu_fr` LIKE :q10 OR s.`contenu_ar` LIKE :q11)))';
        $like = '%' . $f['q'] . '%';
        for ($i = 1; $i <= 11; $i++) $params[':q' . $i] = $like;
    }

    /* Extrait du passage ayant fait correspondre le poème (si recherche). */
    $snippetSql = !empty($f['q'])
        ? ", (SELECT CONCAT(s2.`numero`, '||', LEFT(COALESCE(NULLIF(s2.`contenu_fr`,''),
                        NULLIF(s2.`contenu_ar`,''), ''), 600))
              FROM `qacidate_sections` s2
             WHERE s2.`qacidate_id` = q.`id`
               AND (s2.`contenu_fr` LIKE :q12 OR s2.`contenu_ar` LIKE :q13)
             ORDER BY s2.`ordre` LIMIT 1) AS match_snip"
        : ', NULL AS match_snip';
    if (!empty($f['q'])) {
        $params[':q12'] = $like;
        $params[':q13'] = $like;
    }
    $order = match ($f['sort'] ?? 'recent') {
        'titre' => 'q.`titre` ASC',
        'vues'  => 'q.`views` DESC, q.`titre` ASC',
        default => 'COALESCE(q.`published_at`, q.`created_at`) DESC, q.`id` DESC',
    };
    $sql = 'SELECT q.`id`,q.`slug`,q.`titre`,q.`titre_ar`,q.`sous_titre`,q.`auteur`,q.`interprete`,q.`theme`,
                   q.`image`,q.`audio`,q.`duree`,q.`views`' . $snippetSql . ',
                   (SELECT COUNT(*) FROM `qacidate_sections` s WHERE s.`qacidate_id`=q.`id`) AS nb_sections
              FROM `qacidates` q WHERE ' . implode(' AND ', $where) . ' ORDER BY ' . $order;
    if (!empty($f['limit'])) $sql .= ' LIMIT ' . (int) $f['limit'];
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st->fetchAll();
}

/** Extrait le passage correspondant à la recherche (numéro de chant + fragment). */
function extrait_correspondance(?string $snip, ?string $q): array
{
    $snip = (string) $snip;
    $q    = (string) $q;
    if ($snip === '' || $q === '') return [null, null];

    $parts = explode('||', $snip, 2);
    $num   = (int) ($parts[0] ?? 0);
    $txt   = flatten_contenu(trim((string) ($parts[1] ?? '')));
    if ($txt === '') return [$num ?: null, null];

    $pos = mb_stripos($txt, $q);
    if ($pos === false) return [$num ?: null, mb_substr($txt, 0, 140)];

    /* On travaille sur un texte à espaces normalisés, puis on encadre le terme
       par une phrase complète, sans couper au milieu d'un mot. */
    $txt = preg_replace('/\s+/u', ' ', $txt);
    $pos = mb_stripos($txt, $q);
    if ($pos === false) return [$num ?: null, mb_substr($txt, 0, 160)];

    $start = max(0, $pos - 70);
    if ($start > 0) {
        $sp = mb_strpos($txt, ' ', $start);
        if ($sp !== false && ($sp - $start) < 25) $start = $sp + 1;
    }
    $frag = mb_substr($txt, $start, 200);

    /* arrêter à la fin d'une phrase si c'est raisonnable */
    $cut = mb_strrpos($frag, '. ');
    if ($cut !== false && $cut > 50) $frag = mb_substr($frag, 0, $cut + 1);

    $frag = trim($frag, " \t\n\r.,;:!?·—…\"'()[]");
    return [
        $num ?: null,
        ($start > 0 ? '… ' : '') . $frag . (mb_strlen($txt) > $start + mb_strlen($frag) + 2 ? ' …' : ''),
    ];
    return [
        $num ?: null,
        ($start > 0 ? '…' : '') . trim($frag) . (mb_strlen($txt) > $start + 175 ? '…' : ''),
    ];
}

/** Même extrait, en HTML avec le terme surligné. */
function extrait_html(?string $snip, ?string $q): ?string
{
    [$num, $frag] = extrait_correspondance($snip, $q);
    if ($frag === null) return null;
    $esc = h($frag);
    $qq  = h((string) $q);
    if ($qq !== '') {
        $esc = preg_replace('/(' . preg_quote($qq, '/') . ')/iu', '<mark>$1</mark>', $esc);
        if ($esc === null) $esc = h($frag);
    }
    return '<span class="snippet__chant">Chant ' . (int) $num . '</span> '
         . '<span class="snippet__txt">' . $esc . '</span>';
}
