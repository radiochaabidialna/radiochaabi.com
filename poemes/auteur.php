<?php
/**
 * PAGE — AUTEUR (poète) : notice + répertoire de ses qacidates.
 * URL : /poemes/auteur/<nom>
 * Les poètes du melhoun sont regroupés ici (nom vernaculaire + variantes).
 */
declare(strict_types=1);
require_once __DIR__ . '/_core.php';
require_once __DIR__ . '/_layout.php';

$nom  = qstr('nom', null, 120);
$list = $nom ? get_liste(['auteur' => $nom]) : [];
$notice = $nom ? get_notice_auteur($nom) : null;
$photo = ($notice['photo'] ?? null);
if ($photo && !media_exists($photo)) $photo = null;
/* Auteur inconnu -> vrai 404 */
if ($nom !== null && !$list) {
    http_response_code(404);
}
$auteurAr = $list ? ($list[0]['auteur_ar'] ?? null) : null;
$themes = [];
foreach ($list as $r) if (!empty($r['theme'])) $themes[$r['theme']] = true;

page_head([
    'title' => ($nom ? "$nom — poète du melhoun | " : 'Auteurs | ') . 'Qacidates',
    'desc'  => $nom
        ? "Toutes les qacidates du poète $nom : texte arabe et traduction française, interprètes et structure."
        : 'Les poètes du melhoun dont les qacidates sont répertoriées.',
    'canonical' => $nom ? page_url('auteur/' . rawurlencode($nom)) : page_url('auteurs'),
    'nav_auteur' => true,
    'v' => ASSET_V,
]);
?>
<section class="view">
  <a class="poem__back" href="<?= h(page_url('auteurs')) ?>">← Tous les auteurs</a>

  <header class="poem__hero">
    <p class="poem__theme">Poète · ملحون</p>
    <h1 class="poem__title-fr"><?= h($nom ?: 'Auteurs') ?></h1>
    <?php if (!empty($notice['nom_ar']) || $auteurAr): ?><p class="poem__title-ar" dir="rtl" lang="ar" style="font-size:1.6rem"><?= h($notice['nom_ar'] ?? $auteurAr) ?></p><?php endif; ?>
    <p class="hero__count"><?= count($list) ?> qacidate(s) · <?= count($themes) ?> thème(s)<?= !empty($notice['siecle']) ? ' · ' . h($notice['siecle']) : '' ?><?= !empty($notice['region']) ? ' · ' . h($notice['region']) : '' ?></p>
    <?php if ($photo): ?>
      <div class="poem__by"><div class="poem__person"><img src="<?= h($photo) ?>" alt="Portrait : <?= h((string) $nom) ?>" loading="lazy"><div><span>Portrait</span><strong><?= h((string) $nom) ?></strong></div></div></div>
    <?php endif; ?>
    <?php if ($list): ?>
      <p class="poem__sub">Interprètes : <?= h(implode(', ', array_slice(array_unique(array_filter(array_column($list, 'interprete'))), 0, 4))) ?></p>
    <?php endif; ?>
  </header>

  <?php if ($notice): ?>
    <div class="ornament" aria-hidden="true">❖</div>
    <section class="chant">
      <div class="chant__head"><h3 class="chant__label-fr">Notice biographique</h3></div>
      <div class="leaves">
        <?php if (!empty($notice['bio_fr'])): ?>
          <div class="leaf leaf--fr" style="grid-column:1/-1">
            <span class="leaf__tag">Français</span>
            <div class="leaf__body">
              <?php foreach (preg_split('/\n\s*\n/', (string) $notice['bio_fr']) ?: [] as $par): ?>
                <?php if (trim($par) !== ''): ?><p><?= glossaire_liens(str_replace("\n", ' ', trim($par)), 3) ?></p><?php endif; ?>
              <?php endforeach; ?>
            </div>
          </div>
        <?php elseif (!empty($notice['bio_web'])): ?>
          <div class="leaf leaf--fr" style="grid-column:1/-1">
            <span class="leaf__tag">Français</span>
            <div class="leaf__body">
              <?php foreach (preg_split('/\n+/', (string) $notice['bio_web']) ?: [] as $par): ?>
                <?php if (trim($par) !== ''): ?><p><?= glossaire_liens(str_replace("\n", ' ', trim($par)), 3) ?></p><?php endif; ?>
              <?php endforeach; ?>
            </div>
          </div>
        <?php endif; ?>
        <?php if (!empty($notice['bio_ar'])): ?>
          <div class="leaf leaf--ar" style="grid-column:1/-1">
            <span class="leaf__tag">العربية</span>
            <div class="leaf__body" dir="rtl" lang="ar">
              <?php foreach (preg_split('/\n\s*\n/', (string) $notice['bio_ar']) ?: [] as $par): ?>
                <?php if (trim($par) !== ''): ?><p><?= h(str_replace("\n", ' ', trim($par))) ?></p><?php endif; ?>
              <?php endforeach; ?>
            </div>
          </div>
        <?php endif; ?>
        <?php if (!empty($notice['bio_fr']) && !empty($notice['bio_web'])): ?>
          <div class="leaf leaf--fr" style="grid-column:1/-1">
            <span class="leaf__tag">Source complémentaire</span>
            <div class="leaf__body">
              <?php foreach (preg_split('/\n+/', (string) $notice['bio_web']) ?: [] as $par): ?>
                <?php if (trim($par) !== ''): ?><p><?= glossaire_liens(str_replace("\n", ' ', trim($par)), 2) ?></p><?php endif; ?>
              <?php endforeach; ?>
            </div>
          </div>
        <?php endif; ?>
      </div>
      <?php if (!empty($notice['source']) || !empty($notice['source_web'])): ?>
        <p class="manuscript-note manuscript-note--fr">
          Sources : <?= $notice['source'] ? '<strong>' . h($notice['source']) . '</strong>' : '' ?>
          <?= ($notice['source'] && $notice['source_web']) ? ' + ' : '' ?>
          <?= $notice['source_web'] ? '<code>' . h($notice['source_web']) . '</code>' : '' ?>.
        </p>
      <?php endif; ?>
    </section>
  <?php endif; ?>

  <?php if ($notice && !empty($notice['vers'])): ?>
    <div class="ornament" aria-hidden="true">﴿ ❖ ﴾</div>
    <section class="refrain" aria-label="Vers cité">
      <p class="refrain__label">Vers cité par le document</p>
      <div class="refrain__grid">
        <div class="refrain__col">
          <h3>العربية</h3>
          <div class="refrain__ar" dir="rtl" lang="ar"><p><?= h($notice['vers']) ?></p></div>
        </div>
      </div>
    </section>
  <?php endif; ?>

  <?php if ($list): ?>
    <div class="ornament" aria-hidden="true">❖ ❖ ❖</div>
    <section class="related" style="margin-top:0">
      <h3>Ses qacidates</h3>
      <div class="grid">
        <?php foreach ($list as $r): ?>
          <a class="card" href="<?= h(page_url('q/' . rawurlencode($r['slug']))) ?>">
            <div class="card__head">
              <span class="card__medal<?= $r['image'] ? ' has-photo' : '' ?>">
                <?php if ($r['image']): ?><img src="<?= h(image_url($r['image'])) ?>" alt="" loading="lazy"><?php endif; ?>
              </span>
              <div class="card__id"><h2 class="card__title"><?= h($r['titre']) ?></h2></div>
              <?php if (!empty($r['audio'])): ?><span class="card__audio" role="img" aria-label="Audio disponible"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span><?php endif; ?>
            </div>
            <?php if ($r['titre_ar']): ?><p class="card__ar" dir="rtl" lang="ar"><?= h($r['titre_ar']) ?></p><?php endif; ?>
            <p class="card__author"><?= $r['interprete'] ? '<span>' . h($r['interprete']) . '</span>' : '' ?></p>
            <ul class="card__meta">
              <li>📄 <?= (int) $r['nb_sections'] ?> chant<?= $r['nb_sections'] > 1 ? 's' : '' ?></li>
              <?php if ($r['theme']): ?><li>🏷️ <?= h($r['theme']) ?></li><?php endif; ?>
            </ul>
          </a>
        <?php endforeach; ?>
      </div>
    </section>
  <?php else: ?>
    <p class="state" style="margin-top:1.6rem">Aucune qacidate trouvée pour cet auteur.</p>
  <?php endif; ?>
</section>
<?php page_foot(['v' => ASSET_V]); ?>
