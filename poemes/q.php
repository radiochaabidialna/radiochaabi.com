<?php
/**
 * PAGE DÉTAIL — /poemes/q/<slug>
 * Rendu serveur (SEO) + coquille pour app.js (player, navigation).
 */
declare(strict_types=1);
require_once __DIR__ . '/_core.php';
require_once __DIR__ . '/_layout.php';

$slug = qstr('slug', null, 255);
if ($slug === null || $slug === '') {
    $uri = (string) ($_SERVER['REQUEST_URI'] ?? '');
    if (preg_match('~/q/([^/?]+)~', $uri, $m)) {
        $slug = rawurldecode($m[1]);
    }
}

$data = $slug ? get_qacida($slug) : null;
if (!$data || empty($data['item'])) {
    http_response_code(404);
    page_head([
        'title' => 'Qacidate introuvable | Qacidates',
        'desc'  => 'Cette qacidate n’existe pas ou n’est plus publiée.',
        'canonical' => page_url('q/' . rawurlencode((string) $slug)),
        'v' => ASSET_V,
    ]);
    echo '<section class="view"><div class="state"><strong>Qacidate introuvable</strong>';
    echo '<p><a class="btn" href="' . h(page_url()) . '">← Retour à la liste</a></p></div></section>';
    page_foot(['v' => ASSET_V]);
    exit;
}

$item = $data['item'];
$sections = $data['sections'] ?? [];
$facts = $data['facts'] ?? [];
$noms = $data['noms'] ?? [];
$nav = $data['navigation'] ?? [];
$related = $data['related'] ?? [];

$titre = (string) ($item['titre'] ?? $slug);
$titreAr = (string) ($item['titre_ar'] ?? '');
$auteur = (string) ($item['auteur'] ?? '');
$interprete = (string) ($item['interprete'] ?? '');
$nChants = count($sections);
$themeName = trim((string) ($item['theme'] ?? ''));

$host = (string) ($_SERVER['HTTP_HOST'] ?? 'www.radiochaabi.com');
$origin = 'https://' . $host;

$pageTitle = trim((string) ($item['meta_title'] ?? ''));
if ($pageTitle === '') {
    $pageTitle = implode(' — ', array_filter([
        $titre,
        $auteur !== '' ? $auteur : null,
        $interprete !== '' ? ('chanté par ' . $interprete) : null,
    ])) . ' | Qacidates Chaâbi';
}
$pageTitle = mb_substr($pageTitle, 0, 70);

$desc = trim((string) ($item['meta_description'] ?? ''));
if ($desc === '') {
    $desc = implode(' — ', array_filter([
        'Qacidate « ' . $titre . ' »',
        $titreAr !== '' ? $titreAr : null,
        $auteur !== '' ? ('poème de ' . $auteur) : null,
        $interprete !== '' ? ('interprétation ' . $interprete) : null,
        $themeName !== '' ? ('thème : ' . $themeName) : null,
        $nChants > 1 ? ($nChants . ' chants') : null,
        'texte arabe et traduction française',
    ])) . '.';
}
$desc = mb_substr(trim(preg_replace('/\s+/u', ' ', $desc) ?: $desc), 0, 160);

$canonPath = page_url('q/' . rawurlencode((string) ($item['slug'] ?? $slug)));
$canonAbs = $origin . (isset($canonPath[0]) && $canonPath[0] === '/' ? $canonPath : '/' . ltrim($canonPath, '/'));

$ogImage = !empty($item['image']) ? (string) $item['image'] : '';
if ($ogImage !== '' && $ogImage[0] === '/') {
    $ogImage = $origin . $ogImage;
}
if ($ogImage === '') {
    $ogImage = $origin . '/music/images/chaabidialna.png';
}

$excerptParts = [];
foreach ($sections as $s) {
    if (!empty($s['lines_fr_meta']) && is_array($s['lines_fr_meta'])) {
        foreach ($s['lines_fr_meta'] as $ln) {
            $line = trim((string) ($ln['texte'] ?? ''));
            if ($line !== '') {
                $excerptParts[] = $line;
            }
            if (count($excerptParts) >= 4) {
                break 2;
            }
        }
    }
    foreach (($s['lines_fr'] ?? []) as $line) {
        $line = trim((string) $line);
        if ($line !== '') {
            $excerptParts[] = $line;
        }
        if (count($excerptParts) >= 4) {
            break 2;
        }
    }
}
$articleBody = implode(' ', $excerptParts);
if (mb_strlen($articleBody) > 300) {
    $articleBody = mb_substr($articleBody, 0, 297) . '…';
}

$hasPart = [];
foreach ($sections as $s) {
    $num = (int) ($s['numero'] ?? 0);
    $label = trim((string) (($s['label_fr'] ?? '') ?: ($s['label_ar'] ?? '') ?: ('Chant ' . $num)));
    $hasPart[] = [
        '@type' => 'CreativeWork',
        'name' => $label,
        'position' => $num,
        'url' => $canonAbs . '#chant-' . $num,
    ];
}

$articleLd = [
    '@type' => ['CreativeWork', 'Article'],
    'headline' => $titre,
    'name' => $titre,
    'inLanguage' => ['fr', 'ar'],
    'url' => $canonAbs,
    'mainEntityOfPage' => $canonAbs,
    'description' => $desc,
    'genre' => array_values(array_filter(['Chaâbi algérien', 'Qacidate', $themeName !== '' ? $themeName : null])),
    'keywords' => implode(', ', array_filter([$titre, $titreAr, $auteur, $interprete, $themeName, 'chaâbi', 'qacidate', 'poème algérien'])),
    'image' => $ogImage,
    'isPartOf' => [
        '@type' => 'WebSite',
        'name' => 'Radio Chaabi — Qacidates',
        'url' => $origin . page_url(),
    ],
];
if ($titreAr !== '') {
    $articleLd['alternateName'] = $titreAr;
}
if ($articleBody !== '') {
    $articleLd['articleBody'] = $articleBody;
}
if ($auteur !== '') {
    $articleLd['author'] = ['@type' => 'Person', 'name' => $auteur];
}
if ($interprete !== '') {
    $articleLd['contributor'] = ['@type' => 'Person', 'name' => $interprete];
}
if ($hasPart) {
    $articleLd['hasPart'] = $hasPart;
}
if (!empty($item['updated_at'])) {
    $articleLd['dateModified'] = substr((string) $item['updated_at'], 0, 10);
}

$jsonLd = [
    '@context' => 'https://schema.org',
    '@graph' => [
        [
            '@type' => 'BreadcrumbList',
            'itemListElement' => [
                ['@type' => 'ListItem', 'position' => 1, 'name' => 'Radio Chaabi', 'item' => $origin . '/'],
                ['@type' => 'ListItem', 'position' => 2, 'name' => 'Qacidates', 'item' => $origin . page_url()],
                ['@type' => 'ListItem', 'position' => 3, 'name' => $titre, 'item' => $canonAbs],
            ],
        ],
        $articleLd,
    ],
];

page_head([
    'title' => $pageTitle,
    'desc'  => $desc,
    'canonical' => $canonAbs,
    'og_image' => $ogImage,
    'og_type' => 'article',
    'json_ld' => $jsonLd,
    'article_author' => $auteur,
    'article_tags' => array_values(array_filter([$themeName, 'chaâbi', 'qacidate', $interprete])),
    'v' => ASSET_V,
]);
?>
<article class="view poem" id="poem" data-slug="<?= h($item['slug']) ?>" itemscope itemtype="https://schema.org/CreativeWork">
  
  <nav class="breadcrumbs" aria-label="Fil d'Ariane">
    <ol class="breadcrumbs__list">
      <li><a href="<?= h(($origin ?? ('https://' . ($_SERVER['HTTP_HOST'] ?? 'www.radiochaabi.com'))) . '/') ?>">Accueil</a></li>
      <li><a href="<?= h(page_url()) ?>">Qacidates</a></li>
      <li aria-current="page"><?= h($titre) ?></li>
    </ol>
  </nav>

  <a class="poem__back" href="<?= h(page_url()) ?>">← Toutes les qacidates</a>

  <header class="poem__hero">
    <?php if (!empty($item['theme'])): ?>
      <p class="poem__theme"><?= h($item['theme']) ?></p>
    <?php endif; ?>
    <h1 class="poem__title-fr" itemprop="name"><?= h($titre) ?></h1>
    <?php if ($titreAr !== ''): ?>
      <p class="poem__title-ar" dir="rtl" lang="ar"><?= h($titreAr) ?></p>
    <?php endif; ?>
    <?php if (!empty($item['sous_titre'])): ?>
      <p class="poem__sub"><?= h(flatten_contenu($item['sous_titre'])) ?></p>
    <?php endif; ?>
    <ul class="poem__meta">
      <?php if ($auteur !== ''): ?>
        <li>✒️ <a href="<?= h(page_url('auteur/' . rawurlencode($auteur))) ?>"><?= h($auteur) ?></a></li>
      <?php endif; ?>
      <?php if ($interprete !== ''): ?>
        <li>🎙️ <a href="<?= h(page_url('interprete/' . rawurlencode($interprete))) ?>"><?= h($interprete) ?></a></li>
      <?php endif; ?>
      <?php if (!empty($item['duree'])): ?><li>⏱️ <?= h($item['duree']) ?></li><?php endif; ?>
      <?php if (!empty($item['views'])): ?><li>👁️ <?= (int) $item['views'] ?></li><?php endif; ?>
    </ul>

    <?php
      /* Temps de lecture estimé (~200 mots/min) */
      $wordCount = 0;
      foreach ($sections as $_s) {
        foreach (($_s['lines_fr'] ?? []) as $_l) {
          $wordCount += count(preg_split('/\s+/u', trim((string)$_l), -1, PREG_SPLIT_NO_EMPTY) ?: []);
        }
        if (!empty($_s['lines_fr_meta']) && is_array($_s['lines_fr_meta'])) {
          foreach ($_s['lines_fr_meta'] as $_ln) {
            $wordCount += count(preg_split('/\s+/u', trim((string)($_ln['texte'] ?? '')), -1, PREG_SPLIT_NO_EMPTY) ?: []);
          }
        }
      }
      $readMin = max(1, (int) ceil($wordCount / 200));
      $shareUrl = $canonAbs;
      $shareText = $titre . ($auteur !== '' ? ' — ' . $auteur : '') . ' | Qacidates Chaâbi';
      $shareEnc = rawurlencode($shareText);
      $urlEnc = rawurlencode($shareUrl);
    ?>
    <p class="poem__readtime" title="Estimation basée sur le texte français">
      📖 ≈ <?= (int) $readMin ?> min de lecture<?= $nChants > 1 ? ' · ' . (int)$nChants . ' chants' : '' ?>
    </p>
    <div class="share-bar" role="group" aria-label="Partager cette qacidate">
      <span class="share-bar__lbl">Partager</span>
      <a class="share-btn share-btn--wa" href="https://wa.me/?text=<?= $shareEnc ?>%20<?= $urlEnc ?>" target="_blank" rel="noopener noreferrer" title="WhatsApp">WhatsApp</a>
      <a class="share-btn share-btn--fb" href="https://www.facebook.com/sharer/sharer.php?u=<?= $urlEnc ?>" target="_blank" rel="noopener noreferrer" title="Facebook">Facebook</a>
      <a class="share-btn share-btn--x" href="https://twitter.com/intent/tweet?text=<?= $shareEnc ?>&url=<?= $urlEnc ?>" target="_blank" rel="noopener noreferrer" title="X">X</a>
      <button type="button" class="share-btn share-btn--copy" id="btn-share-copy" data-url="<?= h($shareUrl) ?>" data-title="<?= h($shareText) ?>">Copier le lien</button>
    </div>

    <?php if (!empty($item['audio'])): ?>
      <p class="poem__listen">
        <button type="button" class="btn btn-listen" data-play-url="<?= h($item['audio']) ?>" data-play-title="<?= h($titre) ?>">
          ▶︎ Écouter
        </button>
      </p>
    <?php endif; ?>
  </header>

  <?php if ($facts): ?>
    <ul class="facts" aria-label="Informations">
      <?php foreach ($facts as $f): ?>
        <li>
          <span class="facts__ico" aria-hidden="true"><?= h(icon_for($f['icone'] ?? '')) ?></span>
          <div>
            <strong><?= h($f['titre'] ?? '') ?></strong>
            <span><?= h($f['valeur'] ?? '') ?></span>
          </div>
        </li>
      <?php endforeach; ?>
    </ul>
  <?php endif; ?>

  <?php if (count($sections) > 1): ?>
    <nav class="chapitres" id="chapitres" aria-label="Chapitres de la qacidate">
      <div class="chapitres__inner">
        <span class="chapitres__lead">Chants</span>
        <?php foreach ($sections as $s):
          $t = trim((string)(($s['label_fr'] ?? '') ?: ($s['label_ar'] ?? '') ?: ('Chant ' . (int)$s['numero'])));
          if (mb_strlen($t) > 28) $t = mb_substr($t, 0, 26) . '…';
        ?>
          <a class="chap-btn" href="#chant-<?= (int) $s['numero'] ?>">
            <span class="chap-btn__num"><?= (int) $s['numero'] ?></span>
            <span class="chap-btn__t"><?= h($t) ?></span>
          </a>
        <?php endforeach; ?>
      </div>
    </nav>
  <?php endif; ?>

  <?php foreach ($sections as $s): ?>
    <div class="ornament" aria-hidden="true">❖ ❖ ❖</div>
    <section class="chant section-card" id="chant-<?= (int) $s['numero'] ?>">
      <div class="chant__head">
        <span class="chant__num">Chant <?= (int) $s['numero'] ?></span>
        <?php if (!empty($s['label_ar'])): ?>
          <p class="chant__label-ar" dir="rtl" lang="ar"><?= h($s['label_ar']) ?></p>
        <?php endif; ?>
        <?php if (!empty($s['label_fr'])): ?>
          <h2 class="chant__label-fr"><?= h($s['label_fr']) ?></h2>
        <?php endif; ?>
      </div>
      <div class="leaves">
        <div class="leaf leaf--fr">
          <span class="leaf__tag">Français</span>
          <div class="leaf__body">
            <?php
              $meta = $s['lines_fr_meta'] ?? null;
              if (is_array($meta) && $meta):
                foreach ($meta as $ln):
                  $ty = (string) ($ln['type'] ?? 'normal');
                  $cls = $ty === 'refrain' ? 'line line--refrain' : ($ty === 'titre' ? 'line line--titre' : 'line');
                  echo '<p class="' . h($cls) . '">' . h((string) ($ln['texte'] ?? '')) . '</p>';
                endforeach;
              else:
                foreach (($s['lines_fr'] ?? []) as $l):
                  echo '<p class="line">' . h($l) . '</p>';
                endforeach;
              endif;
            ?>
          </div>
        </div>
        <div class="leaf leaf--ar" dir="rtl" lang="ar">
          <span class="leaf__tag">العربية</span>
          <div class="leaf__body">
            <?php
              $metaAr = $s['lines_ar_meta'] ?? null;
              if (is_array($metaAr) && $metaAr):
                foreach ($metaAr as $ln):
                  $ty = (string) ($ln['type'] ?? 'normal');
                  $cls = $ty === 'refrain' ? 'line line--refrain' : ($ty === 'titre' ? 'line line--titre' : 'line');
                  echo '<p class="' . h($cls) . '">' . h((string) ($ln['texte'] ?? '')) . '</p>';
                endforeach;
              elseif (!empty($s['ar_is_image']) && !empty($s['images'])):
                foreach ($s['images'] as $im):
                  $src = h($im['thumb'] ?? $im['url'] ?? '');
                  echo '<figure><img src="' . $src . '" alt="Manuscrit" loading="lazy"></figure>';
                endforeach;
              else:
                foreach (($s['lines_ar'] ?? []) as $l):
                  echo '<p class="line">' . h($l) . '</p>';
                endforeach;
              endif;
            ?>
          </div>
        </div>
      </div>
    </section>
  <?php endforeach; ?>

  <?php if ($related): ?>
    <section class="related">
      <h3>À découvrir</h3>
      <div class="related__grid">
        <?php foreach ($related as $r): ?>
          <a class="related__item" href="<?= h(page_url('q/' . rawurlencode($r['slug']))) ?>">
            <?php if (!empty($r['image'])): ?>
              <img src="<?= h($r['image']) ?>" alt="" loading="lazy">
            <?php endif; ?>
            <span>
              <b><?= h($r['titre'] ?? $r['slug']) ?></b>
              <?php if (!empty($r['titre_ar'])): ?>
                <small dir="rtl" lang="ar"><?= h($r['titre_ar']) ?></small>
              <?php endif; ?>
            </span>
          </a>
        <?php endforeach; ?>
      </div>
    </section>
  <?php endif; ?>

  <?php if (!empty($noms)): ?>
    <div class="ornament" aria-hidden="true">❖ ❖ ❖</div>
    <section class="noms-cites" id="noms-cites" aria-label="Noms cités">
      <div class="chant__head">
        <p class="chant__label-ar" dir="rtl" lang="ar">الأسماء المذكورة</p>
        <h3 class="chant__label-fr">Les noms cités</h3>
      </div>
      <div class="noms-grid">
        <?php foreach ($noms as $n):
          $emoji = $n['emoji'] ?? $n['icone'] ?? '❖';
          $fr = $n['nom_fr'] ?? $n['nom'] ?? '';
          $ar = $n['nom_ar'] ?? '';
          $desc = $n['description_fr'] ?? $n['description'] ?? '';
          $descAr = $n['description_ar'] ?? '';
        ?>
          <article class="nom-card">
            <span class="nom-card__emoji" aria-hidden="true"><?= h($emoji) ?></span>
            <div class="nom-card__body">
              <h4 class="nom-card__name"><?= h($fr) ?><?php if ($ar !== ''): ?> <span class="nom-card__ar" dir="rtl" lang="ar"><?= h($ar) ?></span><?php endif; ?></h4>
              <?php if ($desc !== ''): ?><p class="nom-card__desc"><?= h($desc) ?></p><?php endif; ?>
              <?php if ($descAr !== ''): ?><p class="nom-card__desc nom-card__desc--ar" dir="rtl" lang="ar"><?= h($descAr) ?></p><?php endif; ?>
            </div>
          </article>
        <?php endforeach; ?>
      </div>
    </section>
  <?php endif; ?>

  
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
    <div id="findbar" class="findbar" hidden>
      <input type="search" id="find-input" placeholder="Chercher un mot…" autocomplete="off" aria-label="Recherche dans le poème">
      <span id="find-count" class="findbar__count">0</span>
      <button type="button" id="find-prev" aria-label="Occurrence précédente">↑</button>
      <button type="button" id="find-next" aria-label="Occurrence suivante">↓</button>
      <button type="button" id="find-close" aria-label="Fermer">✕</button>
    </div>
  </div>

  <nav class="poem__nav" aria-label="Navigation entre qacidates">
    <?php if (!empty($nav['prev']['slug'])): ?>
      <a class="prev" href="<?= h(page_url('q/' . rawurlencode($nav['prev']['slug']))) ?>">
        <small>← Précédente</small>
        <strong><?= h($nav['prev']['titre'] ?? $nav['prev']['slug']) ?></strong>
      </a>
    <?php else: ?><span></span><?php endif; ?>
    <?php if (!empty($nav['next']['slug'])): ?>
      <a class="next" href="<?= h(page_url('q/' . rawurlencode($nav['next']['slug']))) ?>">
        <small>Suivante →</small>
        <strong><?= h($nav['next']['titre'] ?? $nav['next']['slug']) ?></strong>
      </a>
    <?php endif; ?>
  </nav>
</article>

<script>
(function () {
  var btn = document.getElementById('btn-share-copy');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var url = btn.getAttribute('data-url') || location.href;
    var title = btn.getAttribute('data-title') || document.title;
    function ok() {
      var t = btn.textContent;
      btn.textContent = '✓ Copié';
      btn.classList.add('is-copied');
      setTimeout(function () { btn.textContent = t; btn.classList.remove('is-copied'); }, 1800);
    }
    if (navigator.share) {
      navigator.share({ title: title, url: url }).then(ok).catch(function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(ok);
        }
      });
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(ok).catch(function () {
        prompt('Copier ce lien :', url);
      });
    } else {
      prompt('Copier ce lien :', url);
    }
  });
})();
</script>

<?php page_foot(['v' => ASSET_V]); ?>
