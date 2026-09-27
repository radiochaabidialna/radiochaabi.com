<?php
/**
 * PAGE — LISTE DES THÈMES (sujets des qacidates).
 */
declare(strict_types=1);
require_once __DIR__ . '/_core.php';
require_once __DIR__ . '/_layout.php';

$f = get_facets();
$themes = $f['themes'] ?? [];
$totalT = count($themes);
$totalQ = array_sum(array_map(static fn($t) => (int) ($t['count'] ?? 0), $themes));

page_head([
    'title' => 'Thèmes des qacidates — amour, sagesse, spiritualité | Qacidates',
    'desc'  => 'Parcourez les qacidates du chaâbi par thème : ' . $totalT . ' sujets, ' . $totalQ . ' poèmes répertoriés.',
    'canonical' => page_url('themes'),
    'nav_themes' => true,
    'v' => ASSET_V,
]);
?>
<section class="view">
  <div class="hero">
    <p class="hero__kicker">Melhoun · Sujets</p>
    <h1 class="hero__title">Les thèmes</h1>
    <p class="hero__lead">
      Chaque qacida porte un univers : amour, nostalgie, sagesse, foi…
      Filtrez le répertoire par thème pour explorer le melhoun autrement.
    </p>
    <div class="hero__stats">
      <span class="stat"><b><?= (int) $totalT ?></b> thèmes</span>
      <span class="stat"><b><?= (int) $totalQ ?></b> qacidates classées</span>
      <span class="stat"><b><?= (int) ($f['total'] ?? 0) ?></b> au total</span>
    </div>
  </div>

  <nav class="gloss-index" aria-label="Accès rapide">
    <a href="<?= h(page_url()) ?>">📚 Tout le répertoire <span><?= (int) ($f['total'] ?? 0) ?></span></a>
    <a href="<?= h(page_url('auteurs')) ?>">✒️ Poètes <span><?= count($f['auteurs'] ?? []) ?></span></a>
    <a href="<?= h(page_url('interpretes')) ?>">🎙️ Interprètes <span><?= count($f['interpretes'] ?? []) ?></span></a>
  </nav>

  <?php if (!$themes): ?>
    <p class="hero__lead" style="opacity:.8">Aucun thème renseigné pour l’instant dans la base.</p>
  <?php else: ?>
  <div class="tiles">
    <?php foreach ($themes as $t):
        $nom = (string) ($t['nom'] ?? '');
        $cnt = (int) ($t['count'] ?? 0);
        if ($nom === '') continue;
    ?>
      <a class="tile" href="<?= h(page_url('?theme=' . rawurlencode($nom))) ?>">
        <span class="tile__em">🏷️</span>
        <span>
          <b><?= h($nom) ?></b>
          <small><?= $cnt ?> qacidate<?= $cnt > 1 ? 's' : '' ?></small>
        </span>
        <span class="tile__badge" aria-hidden="true"><?= $cnt ?></span>
      </a>
    <?php endforeach; ?>
  </div>
  <?php endif; ?>
</section>
<?php page_foot(['v' => ASSET_V]); ?>
