<?php
/**
 * API — LISTE des qacidates (recherche profonde incluse)
 * ---------------------------------------------------------------
 * GET /poemes/api/qacidates.php
 *   ?q=          recherche sur titre, auteur, interprète, refrain ET CORPS DES POÈMES
 *   ?interprete= filtre exact sur l'interprète
 *   ?auteur=     filtre exact sur l'auteur (poète)
 *   ?theme=      filtre exact sur le thème
 *   ?audio=1     uniquement les qacidates avec un fichier audio
 *   ?sort=       recent | titre | vues
 *   ?page= / ?per_page=
 * Réponse : { ok, total, page, per_page, pages, items:[…] }
 * Chaque item peut contenir `match_html` : l'extrait du vers qui a matché.
 */
declare(strict_types=1);

require __DIR__ . '/_db.php';

try {
    $q          = qstr('q', null, 80);
    $interprete  = qstr('interprete', null, 120);
    $auteur     = qstr('auteur', null, 120);
    $theme      = qstr('theme', null, 120);
    $sort       = qstr('sort', 'recent', 12);
    $page       = qint('page', 1, 1, 1000);
    $perPage    = qint('per_page', 24, 1, 48);
    $audioOnly  = ((string) ($_GET['audio'] ?? '0')) === '1';

    $rows  = get_liste([
        'q' => $q, 'interprete' => $interprete, 'auteur' => $auteur,
        'theme' => $theme, 'audio' => $audioOnly, 'sort' => $sort,
    ]);
    $total = count($rows);
    $pages = max(1, (int) ceil($total / $perPage));
    $page  = min($page, $pages);
    $slice = array_slice($rows, ($page - 1) * $perPage, $perPage);

    $items = array_map(static function (array $r) use ($q): array {
        $item = [
            'id'          => (int) $r['id'],
            'slug'        => $r['slug'],
            'titre'       => $r['titre'],
            'titre_ar'    => $r['titre_ar'],
            'sous_titre'  => $r['sous_titre'],
            'auteur'      => $r['auteur'],
            'interprete'  => $r['interprete'],
            'theme'       => $r['theme'],
            'image'       => image_url($r['image']),
            'audio'       => media_url($r['audio']),
            'duree'       => $r['duree'],
            'views'       => (int) $r['views'],
            'nb_sections' => (int) $r['nb_sections'],
        ];
        if (!empty($r['match_snip'])) {
            $item['match_html'] = extrait_html($r['match_snip'], $q);
        }
        return $item;
    }, $slice);

    json_out([
        'ok'       => true,
        'total'    => $total,
        'page'     => $page,
        'per_page' => $perPage,
        'pages'    => $pages,
        'sort'     => $sort,
        'deep'     => true,
        'items'    => $items,
    ]);
} catch (Throwable $e) {
        error_log('[' . basename(__FILE__) . '] ' . $e->getMessage());
    fail('Erreur serveur lors de la lecture des qacidates.', 500, ['error' => 'Erreur interne — réessayez dans un instant.']);
}
