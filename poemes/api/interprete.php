<?php
/**
 * API — INTERPRÈTE : biographie + répertoire
 * ---------------------------------------------------------------
 * GET /poemes/api/interprete.php?nom=Amar%20Ezzahi
 *   -> { ok, interpreter:{nom,nom_ar,bio,bio_ar,image,count,source}, qacidates:[...] }
 * GET /poemes/api/interprete.php            (liste des interprètes)
 *   -> { ok, total, items:[{nom,nom_ar,count,image,a_bio}] }
 */
declare(strict_types=1);

require __DIR__ . '/_db.php';

try {
    $nom = qstr('nom', null, 120);
    $f   = get_facets();

    if ($nom === null) {
        $items = [];
        foreach ($f['interpretes'] as $i) {
            $bio = get_biographie($i['nom']);
            $items[] = [
                'nom'    => $i['nom'],
                'nom_ar' => $i['nom_ar'],
                'count'  => (int) $i['count'],
                'image'  => image_url($i['image']),
                'a_bio'  => $bio !== null,
            ];
        }
        json_out(['ok' => true, 'total' => count($items), 'items' => $items]);
    }

    $bio = get_biographie($nom);
    $qs  = get_liste(['interprete' => $nom, 'sort' => 'recent']);

    $items = array_map(static fn(array $r): array => [
        'slug' => $r['slug'], 'titre' => $r['titre'], 'titre_ar' => $r['titre_ar'],
        'theme' => $r['theme'], 'image' => image_url($r['image']),
        'audio' => media_url($r['audio']), 'duree' => $r['duree'],
        'nb_sections' => (int) $r['nb_sections'],
    ], $qs);

    json_out([
        'ok' => true,
        'interpreter' => [
            'nom'    => $nom,
            'nom_ar' => $bio['nom_ar'] ?? null,
            'bio'    => $bio['bio'] ?? null,
            'bio_ar' => $bio['bio_ar'] ?? null,
            'image'  => image_url($bio['image'] ?? null) ?? image_url($f['interpretes'][0]['image'] ?? null),
            'count'  => count($items),
            'source' => $bio !== null ? (isset($bio['bio_ar']) ? 'chaabi_music_v7_bilingue' : 'webchaabi') : null,
        ],
        'qacidates' => $items,
    ]);
} catch (Throwable $e) {
        error_log('[' . basename(__FILE__) . '] ' . $e->getMessage());
    fail("Erreur serveur lors de la lecture de l'interprète.", 500, ['error' => 'Erreur interne — réessayez dans un instant.']);
}
