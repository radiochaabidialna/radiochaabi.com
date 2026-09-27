<?php
/**
 * PAGE — LISTE DES AUTEURS (poètes du melhoun).
 */
declare(strict_types=1);
require_once __DIR__ . '/_core.php';
require_once __DIR__ . '/_layout.php';

$f = get_facets();
page_head([
    'title' => 'Les poètes du melhoun — auteurs des qacidates | Qacidates',
    'desc'  => 'Les poètes du melhoun algérien : de Sidi Lakhdar Ben Khlouf à Mohamed Ben Sahla, les auteurs des qacidates du chaâbi.',
    'canonical' => page_url('auteurs'),
    'nav_auteur' => true,
    'v' => ASSET_V,
]);
?>
<section class="view">
  <div class="hero">
    <p class="hero__kicker">Melhoun · Poètes</p>
    <h1 class="hero__title">Les poètes</h1>
    <p class="hero__lead">En chaâbi, un poème appartient à son poète. Voici les auteurs dont les qacidates sont répertoriées, avec le nombre de textes et leurs interprètes.</p>
  </div>

  <div class="tiles">
    <?php foreach ($f['auteurs'] as $a): ?>
      <a class="tile" href="<?= h(page_url('auteur/' . rawurlencode($a['nom']))) ?>">
        <span class="tile__em">✒️</span>
        <span>
          <b><?= h($a['nom']) ?></b>
          <small><?= (int) $a['count'] ?> qacidate(s)<?= !empty($a['nom_ar']) ? ' · ' . h($a['nom_ar']) : '' ?></small>
        </span>
      </a>
    <?php endforeach; ?>
  </div>
</section>
<?php page_foot(['v' => ASSET_V]); ?>
