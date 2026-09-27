<?php
/**
 * PAGE — GLOSSAIRE du chaâbi (source : webchaabi.glossaire, lecture seule).
 * Présentation par lettre alphabétique, avec index cliquable.
 */
declare(strict_types=1);
require_once __DIR__ . '/_core.php';
require_once __DIR__ . '/_layout.php';

$g   = glossaire();
ksort($g);
$q   = qstr('q', null, 60);

$items = [];
foreach ($g as $mot => $expl) {
    if ($q !== null && mb_stripos($mot, $q) === false && mb_stripos($expl, $q) === false) continue;
    $items[] = ['mot' => $mot, 'expl' => $expl];
}

/* Regroupement par initiale */
$groupes = [];
foreach ($items as $it) {
    $l = mb_strtoupper(mb_substr($it['mot'], 0, 1), 'UTF-8');
    if (!preg_match('/^[A-ZÀ-Ý]/u', $l)) $l = '#';
    $groupes[$l][] = $it;
}
ksort($groupes, SORT_NATURAL | SORT_FLAG_CASE);

$totalMots = count($g);
$avecDef  = 0;
foreach ($g as $e) { if (mb_strlen(trim((string) $e)) > 10) $avecDef++; }

page_head([
    'title' => 'Glossaire du chaâbi — ' . $totalMots . ' termes du melhoun expliqués | Qacidates',
    'desc'  => 'Khamassa, mâtla\', khalâs, istikhbar, insirâf… : le vocabulaire du chaâbi et du melhoun expliqué simplement (' . $totalMots . ' mots).',
    'canonical' => page_url('glossaire'),
    'nav_gloss' => true,
    'v' => ASSET_V,
]);
?>
<section class="view">
  <div class="hero">
    <p class="hero__kicker">Vocabulaire</p>
    <h1 class="hero__title">Glossaire du chaâbi</h1>
    <p class="hero__lead">Les mots du melhoun et de la musique chaâbie : structure du poème, modes, instruments, formules d'usage.</p>
    <div class="hero__stats">
      <span class="stat"><b><?= $totalMots ?></b> termes</span>
      <span class="stat"><b><?= count($groupes) ?></b> initiales</span>
      <span class="stat"><b><?= $avecDef ?></b> avec définition détaillée</span>
    </div>
    <form class="gloss-search" method="get" action="<?= h(page_url('glossaire')) ?>" role="search">
      <input type="search" name="q" value="<?= h((string) $q) ?>" placeholder="Chercher un terme…" aria-label="Chercher un terme du glossaire">
      <button type="submit">Chercher</button>
      <?php if ($q !== null): ?><a class="btn-ghost" href="<?= h(page_url('glossaire')) ?>">Tout voir</a><?php endif; ?>
    </form>
    <p class="hero__count"><b><?= count($items) ?></b> terme<?= count($items) > 1 ? 's' : '' ?><?= $q !== null ? ' pour « ' . h($q) . ' »' : '' ?></p>
  </div>

  <?php if (!$items): ?>
    <div class="state"><strong>Aucun terme trouvé</strong><p>Essayez un autre mot.</p>
      <a class="btn" href="<?= h(page_url('glossaire')) ?>">Voir tout le glossaire</a></div>
  <?php else: ?>

    <nav class="gloss-index" aria-label="Index alphabétique">
      <?php foreach (array_keys($groupes) as $l): ?>
        <a href="#lettre-<?= h(rawurlencode($l)) ?>"><?= h($l) ?><span><?= count($groupes[$l]) ?></span></a>
      <?php endforeach; ?>
    </nav>

    <?php foreach ($groupes as $l => $mots): ?>
      <section class="gloss-group" id="lettre-<?= h(rawurlencode($l)) ?>">
        <h2 class="gloss-group__title"><span><?= h($l) ?></span> <?= count($mots) ?> terme<?= count($mots) > 1 ? 's' : '' ?></h2>
        <dl class="gloss-list">
          <?php foreach ($mots as $it): ?>
            <div class="gloss-item" id="terme-<?= h(rawurlencode($it['mot'])) ?>">
              <dt><?= h($it['mot']) ?></dt>
              <dd><?= glossaire_liens($it['expl'], 0) ?></dd>
            </div>
          <?php endforeach; ?>
        </dl>
      </section>
    <?php endforeach; ?>
  <?php endif; ?>
</section>
<?php page_foot(['v' => ASSET_V]); ?>
