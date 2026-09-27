<?php
/**
 * Outil de contrôle (ligne de commande uniquement).
 *   php data/rapport.php
 * Produit :
 *   - les qacidates qui n'ont PAS les deux versions (arabe + français) ;
 *   - les interprètes sans biographie ;
 *   - les auteurs (poètes) sans notice ;
 *   - l'état des audios et des manuscrits.
 */
declare(strict_types=1);


/* Fichier interne : appelé directement, il répond 404 au lieu de s'exécuter. */
if (isset($_SERVER['SCRIPT_FILENAME'])
    && realpath((string) $_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    exit('Not found');
}

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit('Outil en ligne de commande uniquement.');
}

require_once dirname(__DIR__) . '/_core.php';

$line = str_repeat('─', 78);

/* ─────────── 1. sections sans arabe / sans français ─────────── */
$rows = db()->query(
    "SELECT q.id, q.slug, q.titre, q.interprete,
            COUNT(s.id) AS nb,
            SUM(CASE WHEN s.contenu_ar IS NULL OR s.contenu_ar='' THEN 1 ELSE 0 END) AS sans_ar,
            SUM(CASE WHEN s.contenu_fr IS NULL OR s.contenu_fr='' THEN 1 ELSE 0 END) AS sans_fr,
            SUM(CASE WHEN s.contenu_ar IS NULL OR s.contenu_ar='' THEN 0 ELSE 1 END) AS avec_ar,
            SUM(CASE WHEN s.contenu_fr IS NULL OR s.contenu_fr='' THEN 0 ELSE 1 END) AS avec_fr
       FROM `qacidates` q
       LEFT JOIN `qacidate_sections` s ON s.`qacidate_id` = q.`id`
      WHERE q.`is_deleted` = 0
   GROUP BY q.`id`
     HAVING sans_ar > 0 OR sans_fr > 0
   ORDER BY sans_ar DESC, sans_fr DESC, q.`id`"
)->fetchAll();

echo "\n$line\n1) QACIDATES QUI N'ONT PAS LES DEUX VERSIONS (arabe + français)\n$line\n";
if (!$rows) {
    echo "   (aucune — toutes les sections ont l'arabe et le français)\n";
} else {
    printf("   %-3s %-26s %-30s %5s %5s %5s\n", 'id', 'slug', 'titre', 'chant', 'sans AR', 'sans FR');
    foreach ($rows as $r) {
        printf("   %-3s %-26s %-30s %5d %5d %5d\n",
            $r['id'], mb_substr((string) $r['slug'], 0, 25), mb_substr((string) $r['titre'], 0, 29),
            (int) $r['nb'], (int) $r['sans_ar'], (int) $r['sans_fr']);
    }
    echo "\n   Détail par chant :\n";
    $det = db()->query(
        "SELECT q.slug, s.numero, s.label_fr,
                (s.contenu_ar IS NULL OR s.contenu_ar='') AS vide_ar,
                (s.contenu_fr IS NULL OR s.contenu_fr='') AS vide_fr,
                (s.images IS NOT NULL AND s.images <> '') AS a_images
           FROM `qacidate_sections` s JOIN `qacidates` q ON q.id = s.`qacidate_id`
          WHERE (s.contenu_ar IS NULL OR s.contenu_ar='' OR s.contenu_fr IS NULL OR s.contenu_fr='')
          ORDER BY q.id, s.numero"
    )->fetchAll();
    foreach ($det as $d) {
        $manque = [];
        if ($d['vide_ar']) $manque[] = $d['a_images'] ? 'AR = manuscrit' : 'AR manquant';
        if ($d['vide_fr']) $manque[] = 'FR manquant';
        printf("     • %-24s chant %-2s %-34s %s\n",
            mb_substr((string) $d['slug'], 0, 23), $d['numero'],
            mb_substr((string) $d['label_fr'], 0, 33), implode(' · ', $manque));
    }
}

/* ─────────── 2. interprètes sans biographie ─────────── */
$f = get_facets();
$sansBio = [];
foreach ($f['interpretes'] as $i) {
    if (get_biographie($i['nom']) === null) $sansBio[] = $i;
}
echo "\n$line\n2) INTERPRÈTES SANS BIOGRAPHIE\n$line\n";
if (!$sansBio) {
    echo "   (aucun — les " . count($f['interpretes']) . " interprètes ont une biographie)\n";
} else {
    foreach ($sansBio as $i) {
        printf("   • %-46s %2d qacidate(s)\n", $i['nom'], $i['count']);
    }
    echo "\n   → biographie à chercher dans `chaabi_music_v7_bilingue.artistes`\n";
    echo "     (ou `webchaabi.biographies`), puis à déclarer dans `data/notices_auteurs.php`\n";
    echo "     si l'entrée n'existe dans aucune des deux bases.\n";
}
echo "\n   (rappel : " . (count($f['interpretes']) - count($sansBio)) . " interprètes ONT une biographie)\n";

/* ─────────── 3. auteurs sans notice ─────────── */
$sansNotice = [];
foreach ($f['auteurs'] as $a) {
    if (get_notice_auteur($a['nom']) === null) $sansNotice[] = $a;
}
echo "\n$line\n3) AUTEURS (POÈTES) SANS NOTICE BIOGRAPHIQUE\n$line\n";
if (!$sansNotice) {
    echo "   (aucun)\n";
} else {
    foreach ($sansNotice as $a) {
        printf("   • %-52s %2d qacidate(s)\n", $a['nom'], $a['count']);
    }
    echo "\n   " . count($sansNotice) . " sur " . count($f['auteurs']) . " auteurs sans notice.\n";
}

/* ─────────── 4. état général ─────────── */
$tot   = (int) db()->query("SELECT COUNT(*) FROM `qacidates` WHERE `is_deleted`=0")->fetchColumn();
$audio = (int) db()->query("SELECT COUNT(*) FROM `qacidates` WHERE `is_deleted`=0 AND `audio` IS NOT NULL AND `audio` <> ''")->fetchColumn();
$sec   = (int) db()->query("SELECT COUNT(*) FROM `qacidate_sections`")->fetchColumn();
$mans  = (int) db()->query("SELECT COUNT(*) FROM `qacidate_sections` WHERE `images` IS NOT NULL AND `images` <> ''")->fetchColumn();
$du    = (int) db()->query("SELECT COUNT(*) FROM `qacidates` WHERE `duree` IS NOT NULL AND `duree` <> ''")->fetchColumn();

echo "\n$line\n4) ÉTAT GÉNÉRAL\n$line\n";
printf("   qacidates ......... %d\n", $tot);
printf("   sections .......... %d\n", $sec);
printf("   avec audio ........ %d  (%d sans audio)\n", $audio, $tot - $audio);
printf("   avec durée ........ %d\n", $du);
printf("   avec manuscrits ... %d section(s)\n", $mans);
printf("   interprètes ....... %d\n", count($f['interpretes']));
printf("   auteurs ........... %d\n", count($f['auteurs']));
printf("   thèmes ............ %d\n", count($f['themes']));
printf("   glossaire ......... %d termes\n", count(glossaire()));
echo "\n";
