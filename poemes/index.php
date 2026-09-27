<?php
/**
 * ---------------------------------------------------------------
 *  PAGE LISTE — rendue côté serveur (SEO + navigation réelle)
 *  Les filtres sont ensuite rechargés en JavaScript (confort).
 * ---------------------------------------------------------------
 */
declare(strict_types=1);
require_once __DIR__ . '/_core.php';
require_once __DIR__ . '/_layout.php';

$q         = qstr('q', null, 80);
$interprete = qstr('interprete', null, 120);
$auteur    = qstr('auteur', null, 120);
$theme     = qstr('theme', null, 120);
$audioOnly = ((string) ($_GET['audio'] ?? '0')) === '1';
$page      = qint('page', 1, 1, 1000);
$perPage   = 24;

$facets = get_facets();
$items  = get_liste([
    'q' => $q, 'interprete' => $interprete, 'auteur' => $auteur, 'theme' => $theme,
    'audio' => $audioOnly, 'sort' => qstr('sort', 'recent', 12),
]);
$total = count($items);
$pages = max(1, (int) ceil($total / $perPage));
$page  = min($page, $pages);
$slice = array_slice($items, ($page - 1) * $perPage, $perPage);

/** URL de la liste en conservant les filtres. */
function list_url(array $over = []): string
{
    $p = array_merge([
        'q' => $_GET['q'] ?? null, 'interprete' => $_GET['interprete'] ?? null,
        'auteur' => $_GET['auteur'] ?? null,
        'theme' => $_GET['theme'] ?? null, 'audio' => $_GET['audio'] ?? null,
        'sort' => $_GET['sort'] ?? null, 'page' => $_GET['page'] ?? null,
    ], $over);
    $p = array_filter($p, static fn($v) => $v !== null && $v !== '' && $v !== '0');
    return page_url() . ($p ? '?' . http_build_query($p) : '');
}

$titleFr = $interprete ? "Qacidates interprétées par $interprete" : ($auteur ? "Qacidates du poète $auteur" : ($theme ? "Qacidates — thème « $theme »" : null));
$descFr  = $interprete
    ? "Toutes les qacidates du chaâbi interprétées par $interprete : texte arabe et traduction française."
    : ($auteur ? "Les qacidates écrites par $auteur : texte arabe, traduction française et interprètes."
    : ($theme ? "Les qacidates du chaâbi sur le thème « $theme » : texte arabe et traduction française." :
       "Parcourez le répertoire des qacidates du chaâbi algérien : texte arabe et traduction française, auteur, interprète."));

page_head([
    'title' => ($titleFr ? $titleFr . ' | ' : '') . 'Qacidates — Les grands poèmes du Chaâbi | Chaabi Music',
    'desc'  => $descFr,
    'canonical' => list_url(['page' => $page > 1 ? $page : null]),
    'nav_accueil' => true,
    'filters' => true,
    'v' => ASSET_V,
]);

/** Rendu d'une carte (identique au gabarit JS, pour un CSS unique). */
function card_html(array $r, ?string $q = null): void
{
    $url = page_url('q/' . rawurlencode($r['slug']));
    ?>
    <a class="card" href="<?= h($url) ?>" aria-label="<?= h($r['titre']) ?><?= $r['interprete'] ? ' — ' . h($r['interprete']) : '' ?>">
      <div class="card__head">
        <span class="card__medal<?= $r['image'] ? ' has-photo' : '' ?>">
          <?php if ($r['image']): ?><img src="<?= h(image_url($r['image'])) ?>" alt="Portrait : <?= h((string) $r['interprete']) ?>" loading="lazy">
          <?php else: ?><span class="card__medal-fallback" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12h-2z" fill="currentColor"/></svg></span><?php endif; ?>
        </span>
        <div class="card__id">
          <h2 class="card__title"><?= h($r['titre']) ?></h2>
          <?php if ($r['sous_titre']): ?><p class="card__sub"><?= h($r['sous_titre']) ?></p><?php endif; ?>
        </div>
        <?php if (!empty($r['audio'])): ?><span class="card__audio" title="Audio disponible" aria-label="Audio disponible" role="img"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span><?php endif; ?>
      </div>
      <?php if ($r['titre_ar']): ?><p class="card__ar" dir="rtl" lang="ar"><?= h($r['titre_ar']) ?></p><?php endif; ?>
      <?php if (!empty($r['match_snip'])): ?>
        <p class="snippet"><?= extrait_html($r['match_snip'], $q) ?></p>
      <?php endif; ?>
      <p class="card__author">
        <?php if ($r['auteur']): ?>
          <span class="card__who card__who--poete"><span class="card__who-lbl">Poète</span><?= h($r['auteur']) ?></span>
        <?php else: ?>
          <span class="card__who card__who--inconnu"><span class="card__who-lbl">Poète</span>inconnu</span>
        <?php endif; ?>
        <?php if ($r['interprete']): ?>
          <span class="card__who card__who--voix"><span class="card__who-lbl">Voix</span><?= h($r['interprete']) ?></span>
        <?php endif; ?>
      </p>
      <ul class="card__meta">
        <li>📄 <?= (int) $r['nb_sections'] ?> chant<?= $r['nb_sections'] > 1 ? 's' : '' ?></li>
        <?php if ($r['theme']): ?><li>🏷️ <?= h($r['theme']) ?></li><?php endif; ?>
        <?php if (!empty($r['duree'])): ?><li>⏱️ <?= h($r['duree']) ?></li><?php endif; ?>
        <?php if ($r['views']): ?><li>👁️ <?= (int) $r['views'] ?></li><?php endif; ?>
      </ul>
    </a>
    <?php
}
?>

<section id="view-list" class="view" aria-labelledby="titre-liste">
  <div class="hero">
    <p class="hero__kicker">Melhoun · Chaâbi</p>
    <h1 id="titre-liste" class="hero__title"><?= h($interprete === 'Autres' ? 'Qacidates sans interprète' : ($interprete ? 'Qacidates de ' . $interprete : ($auteur ? 'Poète : ' . $auteur : ($theme ? 'Thème : ' . $theme : 'Les grands poèmes du Chaâbi')))) ?></h1>
    <p class="hero__lead">Des qacidates transmises de cheikh en cheikh : le texte arabe et sa traduction française, l'auteur, l'interprète et le détail de chaque poème.</p>

    <?php $st = get_stats(); ?>
    <div class="hero__stats">
      <span class="stat"><b><?= (int) $st['qacidates'] ?></b> qacidates</span>
      <span class="stat"><b><?= (int) $st['interpretes'] ?></b> interprètes</span>
      <span class="stat"><b><?= (int) $st['auteurs'] ?></b> poètes</span>
      <span class="stat"><b><?= (int) $st['audios'] ?></b> à écouter</span>
      <span class="stat"><b><?= (int) $st['glossaire'] ?></b> termes</span>
    </div>

    <p class="hero__cta">
      <a class="btn-listen" href="<?= h(page_url('hasard')) ?>">🎲 Un poème au hasard</a>
      <a class="btn-ghost" href="<?= h(page_url('interpretes')) ?>">Découvrir les interprètes</a>
    </p>

    <p class="hero__count" id="compteur" aria-live="polite"><b><?= $total ?></b> poème<?= $total > 1 ? 's' : '' ?><?= $total > $perPage ? ' — page ' . $page . '/' . $pages : '' ?></p>
  </div>

  <?php
  /* ── Encart « à la une » (uniquement sur la liste non filtrée) ── */
  $alaune = (!$q && !$interprete && !$auteur && !$theme && !$audioOnly && $page === 1) ? get_alaune() : null;
  if ($alaune):
  ?>
    <section class="feature" aria-labelledby="alaune">
      <div class="feature__media">
        <?php if ($alaune['image']): ?>
          <img src="<?= h($alaune['image']) ?>" alt="Portrait : <?= h((string) $alaune['interprete']) ?>" loading="lazy">
        <?php else: ?><span class="feature__em" aria-hidden="true">ﻗ</span><?php endif; ?>
        <?php if ($alaune['duree']): ?><span class="feature__duree">⏱️ <?= h($alaune['duree']) ?></span><?php endif; ?>
      </div>
      <div class="feature__body">
        <p class="feature__kicker">À la une</p>
        <?php if ($alaune['titre_ar']): ?><h2 class="feature__ar" dir="rtl" lang="ar"><?= h($alaune['titre_ar']) ?></h2><?php endif; ?>
        <p class="feature__title" id="alaune"><?= h($alaune['titre']) ?></p>
        <?php if ($alaune['sous_titre']): ?><p class="feature__sub"><?= h($alaune['sous_titre']) ?></p><?php endif; ?>

        <dl class="feature__meta">
          <?php if ($alaune['auteur']): ?><div><dt>Auteur</dt><dd><?= h($alaune['auteur']) ?></dd></div><?php endif; ?>
          <?php if ($alaune['interprete']): ?><div><dt>Interprète</dt><dd><?= h($alaune['interprete']) ?></dd></div><?php endif; ?>
          <?php if ($alaune['theme']): ?><div><dt>Thème</dt><dd><?= h($alaune['theme']) ?></dd></div><?php endif; ?>
        </dl>

        <?php if ($alaune['refrain_lines_fr']): ?>
          <blockquote class="feature__refrain">
            <?php foreach ($alaune['refrain_lines_fr'] as $l): ?><p><?= h($l) ?></p><?php endforeach; ?>
            <?php if (!empty($alaune['refrain_lines_ar'])): ?>
              <p class="feature__refrain-ar" dir="rtl" lang="ar"><?= h($alaune['refrain_lines_ar'][0]) ?></p>
            <?php endif; ?>
          </blockquote>
        <?php endif; ?>

        <p class="feature__actions">
          <a class="btn-listen" href="<?= h(page_url('q/' . rawurlencode((string) $alaune['slug']))) ?>">▶︎ Lire et écouter</a>
          <?php if ($alaune['interprete']): ?>
            <a class="btn-ghost" href="<?= h(page_url('interprete/' . rawurlencode((string) $alaune['interprete']))) ?>">L'interprète</a>
          <?php endif; ?>
        </p>
      </div>
    </section>
  <?php endif; ?>

  <?php if (!$slice): ?>
    <div class="grid">
      <div class="state"><strong>Aucun poème trouvé</strong><p>Essayez un autre mot-clé, ou réinitialisez les filtres.</p>
        <a class="btn" href="<?= h(page_url()) ?>">Réinitialiser la recherche</a></div>
    </div>
  <?php else: ?>
    <h2 class="grid__title"><?= $q || $interprete || $auteur || $theme || $audioOnly ? 'Résultats' : 'Tout le répertoire' ?></h2>
    <div id="resultats" class="grid" aria-live="polite" aria-busy="false">
      <?php foreach ($slice as $r) card_html($r, $q); ?>
    </div>
  <?php endif; ?>

  <?php if ($pages > 1): ?>
    <nav class="pager" id="pager" aria-label="Pagination">
      <?php if ($page > 1): ?><a class="pager__link" href="<?= h(list_url(['page' => $page - 1])) ?>" aria-label="Page précédente">‹</a><?php endif; ?>
      <?php
      $set = array_values(array_unique(array_filter([1, $page - 1, $page, $page + 1, $pages], static fn($p) => $p >= 1 && $p <= $pages)));
      sort($set); $prev = 0;
      foreach ($set as $p):
          if ($prev && $p - $prev > 1): ?><span class="pager__gap">…</span><?php endif; ?>
          <a class="pager__link<?= $p === $page ? ' is-current' : '' ?>" href="<?= h(list_url(['page' => $p > 1 ? $p : null])) ?>"
             <?= $p === $page ? 'aria-current="page"' : '' ?>><?= $p ?></a>
      <?php $prev = $p; endforeach; ?>
      <?php if ($page < $pages): ?><a class="pager__link" href="<?= h(list_url(['page' => $page + 1])) ?>" aria-label="Page suivante">›</a><?php endif; ?>
    </nav>
  <?php endif; ?>
</section>

<?php
$fInterp = '';
foreach (array_slice($facets['interpretes'], 0, 5) as $i) {
    $fInterp .= '<li><a href="' . h(list_url(['interprete' => $i['nom'], 'page' => null])) . '">' . h($i['nom'])
              . ' <span class="n">(' . (int) $i['count'] . ')</span></a></li>';
}
$fThemes = '';
foreach (array_slice($facets['themes'], 0, 5) as $t) {
    $fThemes .= '<li><a href="' . h(list_url(['theme' => $t['nom'], 'page' => null])) . '">' . h($t['nom'])
              . ' <span class="n">(' . (int) $t['count'] . ')</span></a></li>';
}

page_foot([
    'footer_interp' => $fInterp,
    'footer_themes' => $fThemes,
    'footer_meta'   => $facets['total'] . ' qacidate(s) · ' . count($facets['interpretes']) . ' interprète(s) · ' . count($facets['themes']) . ' thème(s)',
    'v' => ASSET_V,
]);
