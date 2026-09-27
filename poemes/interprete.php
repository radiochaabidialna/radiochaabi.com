<?php
/**
 * PAGE — INTERPRÈTE : biographie + répertoire.
 * URL : /poemes/interprete/<nom>
 */
declare(strict_types=1);
require_once __DIR__ . '/_core.php';
require_once __DIR__ . '/_layout.php';

$nom  = qstr('nom', null, 120);
$bio  = $nom ? get_biographie($nom) : null;
$list = $nom ? get_liste(['interprete' => $nom]) : [];

/* Interprète inconnu -> vrai 404 (bon pour le référencement) */
if ($nom !== null && !$list && $bio === null) {
    http_response_code(404);
}

$img = artiste_image($bio['image'] ?? null);
if (!$img || !media_exists($img)) $img = null;
if (!$img && $list) {
    $alt = image_url($list[0]['image'] ?? null);
    if ($alt && media_exists($alt)) $img = $alt;
}

page_head([
    'title' => ($nom ? "$nom — interprète du chaâbi | " : '') . 'Interprètes | Qacidates',
    'desc'  => $nom
        ? "Biographie de $nom et toutes ses qacidates enregistrées : texte arabe et traduction française."
        : "Les interprètes du chaâbi algérien : biographie et répertoire.",
    'canonical' => $nom ? page_url('interprete/' . rawurlencode($nom)) : page_url('interpretes'),
    'og_image' => $img ? 'http://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . $img : null,
    'nav_interp' => true,
    'v' => ASSET_V,
]);

/** Carte de qacidate (identique à la liste). */
function card_html_min(array $r): void
{
    ?>
    <a class="card" href="<?= h(page_url('q/' . rawurlencode($r['slug']))) ?>">
      <div class="card__head">
        <span class="card__medal<?= $r['image'] ? ' has-photo' : '' ?>">
          <?php if ($r['image']): ?><img src="<?= h(image_url($r['image'])) ?>" alt="" loading="lazy"><?php endif; ?>
        </span>
        <div class="card__id"><h2 class="card__title"><?= h($r['titre']) ?></h2></div>
        <?php if (!empty($r['audio'])): ?><span class="card__audio" role="img" aria-label="Audio disponible"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span><?php endif; ?>
      </div>
      <?php if ($r['titre_ar']): ?><p class="card__ar" dir="rtl" lang="ar"><?= h($r['titre_ar']) ?></p><?php endif; ?>
      <ul class="card__meta">
        <li>📄 <?= (int) $r['nb_sections'] ?> chant<?= $r['nb_sections'] > 1 ? 's' : '' ?></li>
        <?php if ($r['theme']): ?><li>🏷️ <?= h($r['theme']) ?></li><?php endif; ?>
        <?php if (!empty($r['duree'])): ?><li>⏱️ <?= h($r['duree']) ?></li><?php endif; ?>
      </ul>
    </a>
    <?php
}
?>
<section class="view">
  <a class="poem__back" href="<?= h(page_url('interpretes')) ?>">← Tous les interprètes</a>

  <header class="poem__hero">
    <p class="poem__theme">Interprète</p>
    <h1 class="poem__title-fr"><?= h($nom ?: 'Interprètes') ?></h1>
    <?php if (!empty($bio['nom_ar'])): ?><p class="poem__title-ar" dir="rtl" lang="ar" style="font-size:1.6rem"><?= h($bio['nom_ar']) ?></p><?php endif; ?>
    <?php if ($img): ?>
      <div class="poem__by"><div class="poem__person"><img src="<?= h($img) ?>" alt="Portrait : <?= h((string) $nom) ?>" loading="lazy"><div><span>Portrait</span><strong><?= h((string) $nom) ?></strong></div></div></div>
    <?php endif; ?>
    <p class="hero__count"><?= count($list) ?> qacidate(s) enregistrée(s)</p>
  </header>

  <?php if ($bio && (bio_utile($bio['bio'] ?? null) || bio_utile($bio['bio_ar'] ?? null))): ?>
    <div class="ornament" aria-hidden="true">❖</div>
    <section class="chant">
      <div class="chant__head"><h3 class="chant__label-fr">Biographie</h3></div>
      <div class="leaves">
        <?php if (bio_utile($bio['bio'] ?? null)): ?>
        <div class="leaf leaf--fr" style="grid-column:1/-1">
          <span class="leaf__tag">Français</span>
          <div class="leaf__body">
            <?php foreach (preg_split('/\n+/', trim((string) $bio['bio'])) ?: [] as $par): ?>
              <?php if (trim($par) !== ''): ?><p><?= glossaire_liens(str_replace("\n", ' ', trim($par)), 2) ?></p><?php endif; ?>
            <?php endforeach; ?>
          </div>
        </div>
        <?php endif; ?>
        <?php if (bio_utile($bio['bio_ar'] ?? null)): ?>
        <div class="leaf leaf--ar" style="grid-column:1/-1">
          <span class="leaf__tag">العربية</span>
          <div class="leaf__body" dir="rtl" lang="ar">
            <?php foreach (preg_split('/\n+/', trim((string) $bio['bio_ar'])) ?: [] as $par): ?>
              <?php if (trim($par) !== ''): ?><p><?= h(str_replace("\n", ' ', trim($par))) ?></p><?php endif; ?>
            <?php endforeach; ?>
          </div>
        </div>
        <?php endif; ?>
      </div>
      <?php if (!empty($bio['source'])): ?>
        <p class="manuscript-note manuscript-note--fr">Source biographique : <code><?= h($bio['source']) ?></code></p>
      <?php endif; ?>
    </section>
  <?php else: ?>
    <p class="state" style="margin-top:1.6rem">Aucune biographie n'est encore renseignée pour cet interprète.</p>
  <?php endif; ?>

  <?php if ($list): ?>
    <div class="ornament" aria-hidden="true">❖ ❖ ❖</div>
    <section class="related" style="margin-top:0">
      <h3>Son répertoire</h3>
      <div class="grid"><?php foreach ($list as $r) card_html_min($r); ?></div>
    </section>
  <?php endif; ?>
</section>
<?php page_foot(['v' => ASSET_V]); ?>
