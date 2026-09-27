<?php
/**
 * SITEMAP XML du module (généré à la volée, lecture seule).
 * URL : /poemes/sitemap.xml
 */
declare(strict_types=1);
require_once __DIR__ . '/_core.php';

header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

$base = 'http://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
$f    = get_facets();
$list = get_liste(['sort' => 'recent']);

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc><?= h($base . page_url()) ?></loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc><?= h($base . page_url('interpretes')) ?></loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc><?= h($base . page_url('glossaire')) ?></loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc><?= h($base . page_url('apropos')) ?></loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
<?php foreach ($list as $r): ?>
  <url>
    <loc><?= h($base . page_url('q/' . rawurlencode($r['slug']))) ?></loc>
    <?php if (!empty($r['created_at'])): ?><lastmod><?= h(substr((string) $r['created_at'], 0, 10)) ?></lastmod><?php endif; ?>
    <changefreq>monthly</changefreq><priority>0.9</priority>
  </url>
<?php endforeach; ?>
<?php foreach ($f['interpretes'] as $i): ?>
  <url><loc><?= h($base . page_url('interprete/' . rawurlencode($i['nom']))) ?></loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
<?php endforeach; ?>
<?php foreach ($f['themes'] as $t): ?>
  <url><loc><?= h($base . page_url('theme/' . rawurlencode($t['nom']))) ?></loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
<?php endforeach; ?>
<?php if (!empty($f['auteurs'])): ?>
  <url><loc><?= h($base . page_url('auteurs')) ?></loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
<?php foreach ($f['auteurs'] as $a): ?>
  <url><loc><?= h($base . page_url('auteur/' . rawurlencode($a['nom']))) ?></loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
<?php endforeach; ?>
<?php endif; ?>
</urlset>
