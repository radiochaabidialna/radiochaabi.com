<?php
/**
 * PAGE — « Mes qacidates » (marque-pages locaux, stockés dans le navigateur).
 */
declare(strict_types=1);
require_once __DIR__ . '/_core.php';
require_once __DIR__ . '/_layout.php';

page_head([
    'title' => 'Mes qacidates — mes poèmes enregistrés | Qacidates',
    'desc'  => 'Vos qacidates enregistrées, conservées dans votre navigateur.',
    'canonical' => page_url('mes-qacidates'),
    'v' => ASSET_V,
]);
?>
<section class="view">
  <div class="hero">
    <p class="hero__kicker">Ma bibliothèque</p>
    <h1 class="hero__title">Mes qacidates</h1>
    <p class="hero__lead">Les poèmes que vous avez enregistrés, conservés <strong>dans votre navigateur</strong> (aucun compte, aucun envoi).</p>
    <p class="hero__count" id="bm-count" aria-live="polite"></p>
  </div>

  <div class="bm-list" id="bm-list" aria-live="polite"></div>

  <p style="text-align:center;margin-top:1.6rem">
    <button type="button" class="btn-ghost" id="bm-clear" hidden>Vider mes qacidates</button>
  </p>
</section>
<?php page_foot(['v' => ASSET_V]); ?>
