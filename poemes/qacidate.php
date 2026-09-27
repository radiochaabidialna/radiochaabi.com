<?php
/**
 * ---------------------------------------------------------------
 *  PAGE « grand poème » — rendue CÔTÉ SERVEUR (SEO)
 *  URL : /poemes/q/<slug>   (réécrite vers qacidate.php?slug=…)
 *  Le contenu arabe/français est dans le HTML : indexable par Google.
 *  Le JavaScript n'ajoute ensuite que les comportements (loupe, audio…).
 * ---------------------------------------------------------------
 */
declare(strict_types=1);
require_once __DIR__ . '/_core.php';
require_once __DIR__ . '/_layout.php';

$slug = qstr('slug', null, 255);
$data = $slug ? get_qacida($slug) : null;

if (!$data) {
    http_response_code(404);
    page_head(['title' => 'Qacidate introuvable — Qacidates', 'nav_accueil' => true, 'v' => ASSET_V]);
    echo '<section class="view"><div class="state"><strong>Cette qacidate est introuvable</strong>'
       . '<p>Le lien est peut-être obsolète.</p>'
       . '<a class="btn" href="' . h(page_url()) . '">Retour à la liste</a></div></section>';
    page_foot(['v' => ASSET_V]);
    exit;
}

$it   = $data['item'];
$base = site_base_url();
$url  = page_url('q/' . rawurlencode($it['slug']));

/* ─────────── SEO ─────────── */
$title = ($it['meta_title'] ?: ($it['titre'] . ' — Qacidate Chaabi'))
       . ($it['interprete'] ? ' · ' . $it['interprete'] : '');
$desc  = $it['meta_description'] ?: trim(($it['titre'] . ' — ' . ($it['sous_titre'] ?: '')) . ' '
       . ($it['auteur'] ? 'Auteur : ' . $it['auteur'] . '. ' : '')
       . ($it['interprete'] ? 'Interprète : ' . $it['interprete'] . '. ' : '')
       . 'Texte arabe et traduction française.');

page_head([
    'title'     => $title . ' | Qacidates',
    'desc'      => $desc,
    'canonical' => $url,
    'og_image'  => $it['image'] ? 'http://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . $it['image'] : null,
    'nav_accueil' => true,
    'ssr'       => true,
    'v'         => ASSET_V,
]);

/* ─────────── JSON-LD ─────────── */
$ld = [
    '@context' => 'https://schema.org',
    '@type'    => 'CreativeWork',
    'name'     => $it['titre'],
    'alternativeName' => $it['titre_ar'],
    'inLanguage' => ['ar', 'fr'],
    'genre'    => $it['theme'],
    'url'      => $url,
    'author'   => $it['auteur'] ? ['@type' => 'Person', 'name' => $it['auteur']] : null,
    'creator'  => $it['auteur'] ? ['@type' => 'Person', 'name' => $it['auteur']] : null,
    'performer'=> $it['interprete'] ? ['@type' => 'Person', 'name' => $it['interprete']] : null,
    'description' => $desc,
];
echo '<script type="application/ld+json">' . json_encode(array_filter($ld), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "</script>\n";
?>

<section class="view">
  <div class="poem" id="poem">

    <a class="poem__back" href="<?= h(page_url()) ?>">← Toutes les qacidates</a>

    <header class="poem__hero">
      <?php if ($it['theme']): ?><p class="poem__theme"><?= h($it['theme']) ?></p><?php endif; ?>
      <h1 class="poem__title-ar" dir="rtl" lang="ar" id="poem-titre"><?= h($it['titre_ar'] ?: $it['titre']) ?></h1>
      <p class="poem__title-fr"><?= h($it['titre']) ?></p>
      <?php if ($it['sous_titre']): ?><p class="poem__sub"><?= h($it['sous_titre']) ?></p><?php endif; ?>

      <div class="poem__by">
        <?php if ($it['auteur'] || $it['auteur_ar']): ?>
        <div class="poem__person">
          <div>
            <span>Auteur</span>
            <strong><?php if ($it['auteur']): ?><a class="poem__person-link" href="<?= h(page_url('auteur/' . rawurlencode((string) $it['auteur']))) ?>"><?= h($it['auteur']) ?></a><?php else: ?><?= h($it['auteur_ar']) ?><?php endif; ?></strong>
            <?php if ($it['auteur_ar'] && $it['auteur_ar'] !== $it['auteur']): ?><em><?= h($it['auteur_ar']) ?></em><?php endif; ?>
          </div>
        </div>
        <?php endif; ?>
        <?php if ($it['interprete'] || $it['interprete_ar']): ?>
        <div class="poem__person">
          <?php if ($it['image']): ?><img src="<?= h($it['image']) ?>" alt="Portrait : <?= h($it['interprete'] ?: $it['interprete_ar']) ?>" loading="lazy"><?php endif; ?>
          <div>
            <span>Interprète</span>
            <strong><a class="poem__person-link" href="<?= h(page_url('interprete/' . rawurlencode((string) $it['interprete']))) ?>"><?= h($it['interprete'] ?: $it['interprete_ar']) ?></a></strong>
            <?php if ($it['interprete_ar'] && $it['interprete_ar'] !== $it['interprete']): ?><em><?= h($it['interprete_ar']) ?></em><?php endif; ?>
          </div>
        </div>
        <?php endif; ?>
      </div>

      <?php if ($it['audio']): ?>
      <div class="poem__actions">
        <button type="button" class="btn-listen" id="btn-listen"
                data-audio="<?= h($it['audio']) ?>"
                data-slug="<?= h($it['slug']) ?>"
                data-titre="<?= h($it['titre']) ?>"
                data-interprete="<?= h((string) $it['interprete']) ?>"
                data-auteur="<?= h((string) $it['auteur']) ?>">
          ▶︎ Écouter<?= $it['duree'] ? ' <span class="btn-listen__d">(' . h($it['duree']) . ')</span>' : '' ?>
        </button>
        <button type="button" class="btn-ghost" id="btn-share">🔗 Partager</button>
      </div>
      <?php else: ?>
      <div class="poem__actions"><button type="button" class="btn-ghost" id="btn-share">🔗 Partager</button></div>
      <?php endif; ?>
    </header>

    <?php /* ── Sommaire cliquable : on saute directement au chapitre voulu ── */
    $chapitres = $data['sections'] ?? [];
    if (count($chapitres) > 1):
        $romains = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];
    ?>
      <nav class="chapitres<?= count($chapitres) > 24 ? ' is-compact' : '' ?>" id="chapitres" aria-label="Chapitres de la qacidate">
        <div class="chapitres__inner">
          <span class="chapitres__lead" aria-hidden="true">Chapitres</span>
          <?php foreach ($chapitres as $k => $s):
              $lbl = trim((string) $s['label_fr']);
              if ($lbl === '') $lbl = trim((string) $s['label_ar']);
              if ($lbl === '') $lbl = 'Chant ' . (int) $s['numero'];
              $court = mb_strlen($lbl) > 34 ? mb_substr($lbl, 0, 33) . '…' : $lbl;
          ?>
            <a class="chap-btn" href="#chapitre<?= (int) $s['numero'] ?>" title="<?= h($lbl) ?>">
              <span class="chap-btn__num" aria-hidden="true"><?= h($romains[$k] ?? (string) ($k + 1)) ?></span>
              <span class="chap-btn__t"><?= h($court) ?></span>
            </a>
          <?php endforeach; ?>
        </div>
      </nav>
    <?php endif; ?>

    <?php
    $refFr = to_lines($it['refrain_fr']);
    $refAr = to_lines($it['refrain_ar']);
    if ($refFr || $refAr): ?>
      <div class="ornament" aria-hidden="true">﴿ ❖ ﴾</div>
      <section class="refrain" aria-label="Refrain">
        <p class="refrain__label">Refrain</p>
        <div class="refrain__grid">
          <?php if ($refFr): ?>
          <div class="refrain__col">
            <h3>Français</h3>
            <div class="refrain__fr"><?= glossaire_liens(implode("\n", $refFr), 2) ?></div>
          </div>
          <?php endif; ?>
          <?php if ($refAr): ?>
          <div class="refrain__col">
            <h3>العربية</h3>
            <div class="refrain__ar" dir="rtl" lang="ar"><?php foreach ($refAr as $l): ?><p><?= h($l) ?></p><?php endforeach; ?></div>
          </div>
          <?php endif; ?>
        </div>
      </section>
    <?php endif; ?>

    <?php if ($data['facts']): ?>
      <ul class="facts">
        <?php foreach ($data['facts'] as $f): ?>
          <li><i aria-hidden="true"><?= icon_for($f['icone']) ?></i>
            <div><b><?= h($f['titre']) ?></b><span><?= h($f['valeur']) ?></span></div></li>
        <?php endforeach; ?>
      </ul>
    <?php endif; ?>

    <?php foreach ($data['sections'] as $s):
        $frHas = count($s['lines_fr']) > 0;
        $arHas = count($s['lines_ar']) > 0 || $s['ar_is_image'];
        ?>
      <div class="ornament" aria-hidden="true">❖ ❖ ❖</div>
      <section class="chant" id="chapitre<?= (int) $s['numero'] ?>">
        <div class="chant__head">
          <span class="chant__num">Chant <?= (int) $s['numero'] ?></span>
          <?php if ($s['label_ar']): ?><p class="chant__label-ar" dir="rtl" lang="ar"><?= h($s['label_ar']) ?></p><?php endif; ?>
          <?php if ($s['label_fr']): ?><h3 class="chant__label-fr"><?= h($s['label_fr']) ?></h3><?php endif; ?>
        </div>

        <div class="leaves">
          <?php /* ── feuillet FRANÇAIS (toujours présent) ── */ ?>
          <?php if ($frHas): ?>
            <div class="leaf leaf--fr">
              <span class="leaf__tag">Français</span>
              <div class="leaf__body"><?= glossaire_liens(implode("\n", $s['lines_fr']), 3) ?></div>
            </div>
          <?php elseif ($arHas): ?>
            <div class="leaf leaf--fr is-empty">
              <span class="leaf__tag">Français</span>
              <p class="leaf__empty">Traduction française à venir.</p>
            </div>
          <?php endif; ?>

          <?php /* ── feuillet ARABE : texte, ou manuscrit si absent ── */ ?>
          <?php if ($s['ar_is_image']): ?>
            <div class="leaf leaf--ar is-manuscript">
              <span class="leaf__tag">المخطوط · Manuscrit</span>
              <p class="manuscript-note">لا يوجد نصّ مطبوع لهذا المقطع — النسخة المخطوطة :</p>
              <div class="leaf__manuscript">
                <?php foreach ($s['images'] as $k => $im):
                    $thumb = $im['thumb'] ?? $im['url'];
                    $dims  = (!empty($im['thumb_w']) && !empty($im['thumb_h']))
                              ? ' width="' . (int) $im['thumb_w'] . '" height="' . (int) $im['thumb_h'] . '"'
                              : '';
                ?>
                  <figure>
                    <button type="button" class="zoom" data-zoom="<?= h($im['url']) ?>" data-caption="<?= h($im['alt']) ?>" aria-label="Agrandir le manuscrit">
                      <img src="<?= h($thumb) ?>" alt="<?= h($im['alt']) ?>" loading="lazy" decoding="async"<?= $dims ?>>
                      <span class="zoom__hint">🔍 Agrandir</span>
                    </button>
                    <figcaption><?= h($im['alt']) ?><?= count($s['images']) > 1 ? ' — ' . ($k + 1) . '/' . count($s['images']) : '' ?></figcaption>
                  </figure>
                <?php endforeach; ?>
              </div>
              <p class="manuscript-note manuscript-note--fr">Texte arabe non saisi : le manuscrit original est affiché.</p>
            </div>
          <?php elseif ($s['lines_ar']): ?>
            <div class="leaf leaf--ar">
              <span class="leaf__tag">العربية</span>
              <div class="leaf__body" dir="rtl" lang="ar">
                <?php foreach ($s['lines_ar'] as $l): ?><p><?= h($l) ?></p><?php endforeach; ?>
              </div>
            </div>
          <?php elseif ($frHas): ?>
            <div class="leaf leaf--ar is-empty">
              <span class="leaf__tag">العربية</span>
              <p class="leaf__empty">النص العربي غير متوفر.</p>
            </div>
          <?php endif; ?>
        </div>
      </section>
    <?php endforeach; ?>

    <?php if ($data['noms']): ?>
      <div class="ornament" aria-hidden="true">❖</div>
      <section class="chant">
        <div class="chant__head">
          <p class="chant__label-ar" dir="rtl" lang="ar">الأسماء</p>
          <h3 class="chant__label-fr">Les noms cités</h3>
        </div>
        <ul class="facts">
          <?php foreach ($data['noms'] as $n): ?>
            <li><i aria-hidden="true"><?= h($n['emoji'] ?: '❖') ?></i>
              <div><b><?= h($n['nom_fr']) ?> <?= $n['nom_ar'] ? '· ' . h($n['nom_ar']) : '' ?></b>
              <span><?= h($n['description_fr']) ?></span></div></li>
          <?php endforeach; ?>
        </ul>
      </section>
    <?php endif; ?>

    <nav class="poem__nav" aria-label="Navigation entre qacidates">
      <?php if ($data['navigation']['prev']): ?>
        <a class="prev" href="<?= h(page_url('q/' . rawurlencode($data['navigation']['prev']['slug']))) ?>">
          <small>← Qacidate précédente</small><strong><?= h($data['navigation']['prev']['titre']) ?></strong></a>
      <?php else: ?><span aria-hidden="true"></span><?php endif; ?>
      <?php if ($data['navigation']['next']): ?>
        <a class="next" href="<?= h(page_url('q/' . rawurlencode($data['navigation']['next']['slug']))) ?>">
          <small>Qacidate suivante →</small><strong><?= h($data['navigation']['next']['titre']) ?></strong></a>
      <?php endif; ?>
    </nav>

    <div class="reader-bar" role="toolbar" aria-label="Confort de lecture">
      <div class="reader-bar__inner">
        <div class="readmode" role="group" aria-label="Langues affichées">
          <button type="button" class="readmode__btn" data-mode="both" aria-pressed="true">Bilingue</button>
          <button type="button" class="readmode__btn" data-mode="ar" aria-pressed="false">العربية</button>
          <button type="button" class="readmode__btn" data-mode="fr" aria-pressed="false">Français</button>
        </div>
        <span class="reader-bar__sep" aria-hidden="true"></span>
        <button type="button" id="fs-minus" aria-label="Réduire la taille du texte">A−</button>
        <button type="button" id="fs-reset" aria-label="Taille normale">A</button>
        <button type="button" id="fs-plus" aria-label="Augmenter la taille du texte">A+</button>
        <span class="reader-bar__sep" aria-hidden="true"></span>
        <button type="button" id="btn-find" aria-label="Chercher dans ce poème" aria-expanded="false">🔍 Chercher</button>
        <button type="button" id="btn-bookmark" aria-label="Enregistrer ce poème" aria-pressed="false">☆ Enregistrer</button>
        <span class="reader-bar__sep" aria-hidden="true"></span>
        <button type="button" id="btn-copy" aria-label="Copier le refrain">📋 Copier</button>
        <button type="button" id="btn-print" aria-label="Imprimer ce poème">🖨️ Imprimer</button>
      </div>
      <div class="findbar" id="findbar" hidden>
        <input type="search" id="find-input" placeholder="Chercher un mot dans le poème…" aria-label="Mot à chercher dans le poème">
        <span class="findbar__count" id="find-count">0</span>
        <button type="button" id="find-prev" aria-label="Occurrence précédente">↑</button>
        <button type="button" id="find-next" aria-label="Occurrence suivante">↓</button>
        <button type="button" id="find-close" aria-label="Fermer la recherche">✕</button>
      </div>
    </div>

    <?php if ($data['related']): ?>
      <section class="related">
        <h3>À découvrir</h3>
        <div class="related__grid">
          <?php foreach ($data['related'] as $r): ?>
            <a class="related__item" href="<?= h(page_url('q/' . rawurlencode($r['slug']))) ?>">
              <?php if ($r['image']): ?><img src="<?= h(image_url($r['image'])) ?>" alt="" loading="lazy"><?php endif; ?>
              <span><b><?= h($r['titre']) ?></b><?php if ($r['titre_ar']): ?><small><?= h($r['titre_ar']) ?></small><?php endif; ?></span>
            </a>
          <?php endforeach; ?>
        </div>
      </section>
    <?php endif; ?>
  </div>
</section>

<?php page_foot(['v' => ASSET_V]); ?>
