<?php
/**
 * Gabarit commun du module (en-tête + pied + lecteur).
 * Aucune dépendance externe.
 */
declare(strict_types=1);

function page_head(array $o = []): void
{
    $title = $o['title'] ?? 'Qacidates — Les grands poèmes du Chaâbi | Radio Chaabi';
    $desc  = $o['desc']  ?? "Parcourez le répertoire des qacidates du chaâbi algérien : texte arabe et traduction française, auteur, interprète.";
    $desc  = mb_substr(trim(preg_replace('/\s+/u', ' ', (string) $desc) ?? $desc), 0, 160);
    $v     = $o['v'] ?? ASSET_V;
    $withFilters = !empty($o['filters']);
    $noindex = !empty($o['noindex']);

    $host = (string) ($_SERVER['HTTP_HOST'] ?? 'radiochaabi.com');
    $origin = 'https://' . $host;

    $canonPath = $o['canonical'] ?? page_url();
    if (is_string($canonPath) && preg_match('#^https?://#i', $canonPath)) {
        $canon = $canonPath;
    } else {
        $path = (string) $canonPath;
        $canon = $origin . (isset($path[0]) && $path[0] === '/' ? $path : '/' . ltrim($path, '/'));
    }

    $ogRaw = $o['og_image'] ?? null;
    if ($ogRaw && preg_match('#^https?://#i', (string) $ogRaw)) {
        $og = (string) $ogRaw;
    } elseif ($ogRaw) {
        $p = (string) $ogRaw;
        $og = $origin . (isset($p[0]) && $p[0] === '/' ? $p : '/' . ltrim($p, '/'));
    } else {
        $og = $origin . '/music/images/chaabidialna.png';
    }

    $ogType = $o['og_type'] ?? 'website';
    $robots = $noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1';
    $jsonLd = $o['json_ld'] ?? null;
    ?>
<!DOCTYPE html>
<html lang="fr" dir="ltr" data-theme="parchemin">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= h($title) ?></title>
<meta name="description" content="<?= h($desc) ?>">
<meta name="robots" content="<?= h($robots) ?>">
<meta name="googlebot" content="<?= h($noindex ? 'noindex, follow' : 'index, follow') ?>">
<meta name="author" content="Radio Chaabi">
<meta name="theme-color" content="#0a0c10">
<link rel="canonical" href="<?= h($canon) ?>">
<meta property="og:type" content="<?= h($ogType) ?>">
<meta property="og:site_name" content="Radio Chaabi — Qacidates">
<meta property="og:locale" content="fr_FR">
<meta property="og:locale:alternate" content="ar_DZ">
<meta property="og:title" content="<?= h($title) ?>">
<meta property="og:description" content="<?= h($desc) ?>">
<meta property="og:url" content="<?= h($canon) ?>">
<meta property="og:image" content="<?= h($og) ?>">
<meta property="og:image:alt" content="<?= h($title) ?>">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="<?= h($title) ?>">
<meta name="twitter:description" content="<?= h($desc) ?>">
<meta name="twitter:image" content="<?= h($og) ?>">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#128220;</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="<?= h(page_url('assets/app.css')) ?>?v=20260926share">
<?php if (is_array($jsonLd) && $jsonLd): ?>
<script type="application/ld+json"><?= json_encode($jsonLd, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?></script>
<?php endif; ?>
</head>
<body data-api="<?= h(page_url('api')) ?>" data-base="<?= h(page_url()) ?>"<?= !empty($o['ssr']) ? ' data-ssr="1"' : '' ?>>

<a class="skip-link" href="#main">Aller au contenu</a>

<header class="topbar" role="banner">
  <div class="topbar__inner">
    <a class="brand" href="<?= h(page_url()) ?>" aria-label="Accueil — liste des qacidates">
      <img class="brand__logo" src="/music/images/chaabidialna.jpg" alt="Radio Chaabi Dialna" width="34" height="34" loading="eager" decoding="async">
      <span class="brand__text"><strong>Qacidates</strong><small>Radio Chaabi Dialna</small></span>
    </a>

    <nav class="menu" id="menu" aria-label="Navigation principale">
      <a href="<?= h(site_base_url() ?: '/') ?>" class="menu__link">← Radio</a>
      <a href="<?= h(page_url()) ?>" class="menu__link<?= !empty($o['nav_accueil']) ? ' is-active' : '' ?>">Accueil</a>
      <a href="<?= h(page_url('interpretes')) ?>" class="menu__link<?= !empty($o['nav_interp']) ? ' is-active' : '' ?>">Interprètes</a>
      <a href="<?= h(page_url('auteurs')) ?>" class="menu__link<?= !empty($o['nav_auteur']) ? ' is-active' : '' ?>">Auteurs</a>
      <a href="<?= h(page_url('themes')) ?>" class="menu__link<?= !empty($o['nav_themes']) ? ' is-active' : '' ?>">Thèmes</a>
      <a href="<?= h(page_url('glossaire')) ?>" class="menu__link<?= !empty($o['nav_gloss']) ? ' is-active' : '' ?>">Glossaire</a>
      <a href="<?= h(page_url('hasard')) ?>" class="menu__link">Au hasard</a>
      <a href="<?= h(page_url('apropos')) ?>" class="menu__link<?= !empty($o['nav_apropos']) ? ' is-active' : '' ?>">À propos</a>
    </nav>

    <div class="topbar__tools">
      <form class="search" role="search" autocomplete="off">
        <label class="sr-only" for="q">Rechercher un poème, un auteur, un interprète</label>
        <svg class="search__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 21l-4.3-4.3M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <input id="q" name="q" type="search" placeholder="Rechercher…" spellcheck="false" value="<?= h($_GET['q'] ?? '') ?>">
        <button type="button" class="search__clear" hidden aria-label="Effacer la recherche">&times;</button>
      </form>

      <div class="themepick" role="group" aria-label="Ambiance visuelle">
        <button type="button" class="themepick__btn" data-theme-set="chaabi" title="Chaabi (sombre, comme le site)" aria-label="Thème Chaabi"><span class="themepick__dot" data-dot="chaabi" aria-hidden="true"></span><span class="themepick__lbl">Chaabi</span></button>
        <button type="button" class="themepick__btn" data-theme-set="parchemin" title="Parchemin (clair)" aria-label="Thème Parchemin"><span class="themepick__dot" data-dot="parchemin" aria-hidden="true"></span><span class="themepick__lbl">Parchemin</span></button>
        <button type="button" class="themepick__btn" data-theme-set="zellige" title="Zellige (clair froid)" aria-label="Thème Zellige"><span class="themepick__dot" data-dot="zellige" aria-hidden="true"></span><span class="themepick__lbl">Zellige</span></button>
        <button type="button" class="themepick__btn" data-theme-set="nuit" title="Nuit (sombre)" aria-label="Thème Nuit"><span class="themepick__dot" data-dot="nuit" aria-hidden="true"></span><span class="themepick__lbl">Nuit</span></button>
      <button type="button" class="themepick__btn" data-theme-set="sahara" title="Sahara">
        <span class="themepick__dot" data-dot="sahara" aria-hidden="true"></span>
        <span class="themepick__lbl">Sahara</span>
      </button>
      </div>

      <button type="button" class="iconbtn burger" id="burger" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="menu">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>
      </button>
    </div>
  </div>
<?php if ($withFilters): ?>
  <div class="filters" id="filters" hidden>
    <div class="filters__row" id="chips-interpretes" role="group" aria-label="Filtrer par interprète"></div>
    <div class="filters__row filters__row--secondary">
      <label class="select"><span>Thème</span><select id="sel-theme"><option value="">Tous</option></select></label>
      <label class="select"><span>Trier par</span>
        <select id="sel-sort">
          <option value="recent">Ajout récent</option>
          <option value="titre">Titre (A→Z)</option>
          <option value="vues">Les plus vus</option>
        </select>
      </label>
      <label class="check"><input type="checkbox" id="chk-audio"><span>Uniquement avec audio</span></label>
      <button type="button" class="btn-reset" id="btn-reset" hidden>Réinitialiser</button>
    </div>
  </div>
<?php endif; ?>
</header>

<main id="main" role="main">
<?php
}

function page_foot(array $o = []): void
{
    $v = $o['v'] ?? ASSET_V;
    ?>
</main>

<!-- Pied de page (même esprit que le site principal) -->
<div id="footer-root">
  <footer class="site-footer" role="contentinfo">
    <div class="site-footer__inner">
      <div class="site-footer__grid">
        <div class="site-footer__brand">
          <a href="<?= h(site_base_url() ?: '/') ?>" class="site-footer__logo">
            <span class="site-footer__mark" aria-hidden="true">♪</span>
            <span>
              <strong>Radio Chaabi Dialna</strong>
              <small>التراث الشعبي الجزائري</small>
            </span>
          </a>
          <p class="site-footer__tag">La musique populaire algérienne — qacidates, chansons &amp; émissions.</p>
        </div>
        <div>
          <h3 class="site-footer__title">Explorer</h3>
          <ul class="site-footer__links">
            <li><a href="<?= h(site_base_url() ?: '/') ?>">Accueil radio</a></li>
            <li><a href="<?= h(page_url()) ?>">Qacidates</a></li>
            <li><a href="<?= h(page_url('interpretes')) ?>">Interprètes</a></li>
            <li><a href="<?= h(page_url('auteurs')) ?>">Auteurs</a></li>
            <li><a href="<?= h(page_url('themes')) ?>">Thèmes</a></li>
          </ul>
        </div>
        <div>
          <h3 class="site-footer__title">Radio</h3>
          <ul class="site-footer__links">
            <li><a href="<?= h((site_base_url() ?: '') . '/index.html#chansons') ?>">Chansons</a></li>
            <li><a href="<?= h((site_base_url() ?: '') . '/index.html#emissions') ?>">Émissions</a></li>
            <li><a href="<?= h((site_base_url() ?: '') . '/index.html#artistes') ?>">Artistes</a></li>
            <li><a href="<?= h(page_url('glossaire')) ?>">Glossaire</a></li>
          </ul>
        </div>
        <div>
          <h3 class="site-footer__title">Suivez-nous</h3>
          <div class="site-footer__social">
            <a href="https://www.facebook.com/radiochaabidialna/" target="_blank" rel="noopener" aria-label="Facebook">f</a>
            <a href="https://x.com/chaabiradio" target="_blank" rel="noopener" aria-label="X">𝕏</a>
            <a href="https://www.instagram.com/chaabiradio/" target="_blank" rel="noopener" aria-label="Instagram">ig</a>
            <a href="https://www.youtube.com/@mahfoud8027" target="_blank" rel="noopener" aria-label="YouTube">▶</a>
          </div>
          <p class="site-footer__copy">© <?= date('Y') ?> Chaabi Music · Préservons notre patrimoine</p>
        </div>
      </div>
    </div>
  </footer>
</div>


<div class="player" id="player" hidden aria-label="Lecteur audio">
  <div class="player__inner">
    <button type="button" class="player__btn player__main" id="pl-toggle" aria-label="Lecture / pause">
      <svg class="player__ico-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
      <svg class="player__ico-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>
    </button>
    <button type="button" class="player__btn player__step" id="pl-prev" aria-label="Piste précédente"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6v12M18 6l-8 6 8 6z" fill="currentColor"/></svg></button>
    <button type="button" class="player__btn player__step" id="pl-next" aria-label="Piste suivante"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 6v12M6 6l8 6-8 6z" fill="currentColor"/></svg></button>
    <div class="player__meta"><strong id="pl-title">—</strong><small id="pl-sub"></small></div>
    <div class="player__progress">
      <span class="player__time" id="pl-cur">0:00</span>
      <input type="range" id="pl-seek" min="0" max="1000" value="0" step="1" aria-label="Position de lecture">
      <span class="player__time" id="pl-dur">0:00</span>
    </div>
    <div class="player__vol">
      <button type="button" class="player__btn" id="pl-mute" aria-label="Couper le son">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h3l5 4V5L7 9H4z" fill="currentColor"/><path class="player__wave" d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </button>
      <input type="range" id="pl-vol" min="0" max="100" value="85" aria-label="Volume">
    </div>
    <button type="button" class="player__btn player__close" id="pl-close" aria-label="Fermer le lecteur"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg></button>
  </div>
  <audio id="pl-audio" preload="none"></audio>
</div>

<template id="tpl-card">
  <a class="card" href="#" role="link">
    <div class="card__head">
      <span class="card__medal">
        <img alt="" loading="lazy" decoding="async">
        <span class="card__medal-fallback" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12h-2z" fill="currentColor"/></svg></span>
      </span>
      <div class="card__id">
        <h2 class="card__title"></h2>
        <p class="card__sub"></p>
      </div>
      <span class="card__audio" hidden title="Audio disponible" aria-label="Audio disponible"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>
    </div>
    <p class="card__ar" dir="rtl" lang="ar"></p>
    <p class="card__author"></p>
    <ul class="card__meta"></ul>
  </a>
</template>

<script>
  (function () {
    var host = (location.hostname || '').toLowerCase();
    /* Toujours pointer l’API sur la même origine (www ou non-www) */
    if (host.indexOf('radiochaabi.com') !== -1 || host === 'localhost' || host === '127.0.0.1') {
      var path = location.pathname || '/';
      var m = path.match(/^(.*?)\/poemes(\/|$)/i);
      var base = m ? m[1] : '';
      window.CHAABI_API_ABS = location.origin + base + '/api/radiochaabi.php';
      window.CHAABI_API = window.CHAABI_API_ABS;
    }
  })();
</script>

<script src="<?= h(page_url('assets/app.js')) ?>?v=20260926share" defer></script>
<script src="<?= h(page_url('assets/player-bridge.js')) ?>?v=20260926c" defer></script>
<script src="<?= h((site_base_url() ?: '') . '/assets/js/footer.js') ?>?v=<?= h($v) ?>" defer onerror="console.info('[poemes] footer.js site non chargé — fallback local OK')"></script>
</body>
</html>
<?php
}