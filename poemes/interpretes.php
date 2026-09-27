<?php
/**
 * PAGE — LISTE DES INTERPRÈTES.
 */
declare(strict_types=1);
require_once __DIR__ . '/_core.php';
require_once __DIR__ . '/_layout.php';

$f = get_facets();
$totalQ = 0;
$avecBio = 0;
$avecPhoto = 0;
foreach ($f['interpretes'] as $i) {
    $totalQ += (int) $i['count'];
    if (get_biographie($i['nom']) !== null) $avecBio++;
    if (!empty($i['image'])) $avecPhoto++;
}

page_head([
    'title' => 'Les interprètes du chaâbi — biographies et répertoire | Qacidates',
    'desc'  => 'Les cheikhs du chaâbi algérien : biographie, portrait et liste de leurs qacidates (' . count($f['interpretes']) . ' interprètes).',
    'canonical' => page_url('interpretes'),
    'nav_interp' => true,
    'v' => ASSET_V,
]);
?>
<section class="view">
  <div class="hero">
    <p class="hero__kicker">Melhoun · Chaâbi</p>
    <h1 class="hero__title">Les interprètes</h1>
    <p class="hero__lead">
      Chaque cheikh a sa voix, son <dfn class="gloss" tabindex="0" data-def="Prélude instrumental et vocal qui installe le mode avant le chant.">istikhbar</dfn> et son rythme.
      Un poème melhoun appartient à son poète : plusieurs interprètes l'ont enregistré, chacun à sa manière.
    </p>
    <div class="hero__stats">
      <span class="stat"><b><?= (int) count($f['interpretes']) - (array_filter($f['interpretes'], static fn($x) => ($x['nom'] ?? '') === 'Autres') ? 1 : 0) ?></b> interprètes</span>
      <span class="stat"><b><?= $totalQ ?></b> qacidates</span>
      <span class="stat"><b><?= $avecBio ?></b> biographies</span>
      <span class="stat"><b><?= $avecPhoto ?></b> portraits</span>
    </div>
  </div>

  <nav class="gloss-index" aria-label="Accès rapide">
    <a href="<?= h(page_url('auteurs')) ?>">✒️ Voir les poètes <span><?= count($f['auteurs']) ?></span></a>
    <a href="<?= h(page_url('hasard')) ?>">🎲 Au hasard</a>
    <a href="<?= h(page_url()) ?>">📚 Tout le répertoire <span><?= (int) $f['total'] ?></span></a>
  </nav>

  <div class="tiles">
    <?php foreach ($f['interpretes'] as $i):
        $bio = get_biographie($i['nom']);
        $img = image_url($i['image']);
    ?>
      <a class="tile<?= $bio ? ' tile--bio' : '' ?>" href="<?= $i['nom'] === 'Autres' ? h(page_url('?interprete=Autres')) : h(page_url('interprete/' . rawurlencode($i['nom']))) ?>">
        <?php if ($img): ?><img src="<?= h($img) ?>" alt="Portrait : <?= h($i['nom']) ?>" loading="lazy">
        <?php else: ?><span class="tile__em">🎙️</span><?php endif; ?>
        <span>
          <b><?= h($i['nom']) ?></b>
          <?php if (!empty($i['nom_ar'])): ?><small dir="rtl" lang="ar" style="font-family:var(--font-ar);font-size:.95rem"><?= h($i['nom_ar']) ?></small><?php endif; ?>
          <small><?= (int) $i['count'] ?> qacidate<?= (int) $i['count'] > 1 ? 's' : '' ?></small>
          <?php if ($bio): ?>
            <span class="tile__bio">📖 <?= count(array_filter([$bio['bio'] ?? null, $bio['bio_ar'] ?? null], static fn($b) => mb_strlen(trim((string) $b)) > 40)) ?> biographie(s)</span>
          <?php endif; ?>
        </span>
        <span class="tile__badge" aria-hidden="true"><?= (int) $i['count'] ?></span>
      </a>
    <?php endforeach; ?>
  </div>
</section>
<?php page_foot(['v' => ASSET_V]); ?>
