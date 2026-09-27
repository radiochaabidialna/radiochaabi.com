<?php
/**
 * API — DÉTAIL d'une qacidate
 * ---------------------------------------------------------------
 * GET /poemes/api/qacida.php?slug=<slug>   (ou ?id=<n>)
 * Réponse : { ok, item:{…}, sections:[…], facts:[…], noms:[…],
 *             navigation:{prev,next}, related:[…] }
 * Les sections portent `images[]` (manuscrits : `url` original + `thumb` WebP)
 * et `ar_is_image` quand la colonne arabe est un manuscrit.
 */
declare(strict_types=1);

require __DIR__ . '/_db.php';

try {
    $slug = qstr('slug', null, 255);
    $id   = qint('id', 0, 0, PHP_INT_MAX);

    if ($slug === null && $id <= 0) {
        fail('Paramètre « slug » ou « id » requis.', 422);
    }

    /* Si l'on a un id, on retrouve le slug correspondant */
    if ($slug === null) {
        $st = db()->prepare('SELECT `slug` FROM `qacidates` WHERE `id` = :i AND `is_deleted` = 0 LIMIT 1');
        $st->bindValue(':i', $id, PDO::PARAM_INT);
        $st->execute();
        $slug = $st->fetchColumn() ?: null;
        if ($slug === null) fail('Qacidate introuvable.', 404);
    }

    $data = get_qacida((string) $slug);
    if (!$data) fail('Qacidate introuvable.', 404);

    json_out([
        'ok'         => true,
        'item'       => $data['item'],
        'sections'   => $data['sections'],
        'facts'      => $data['facts'],
        'noms'       => $data['noms'],
        'navigation' => $data['navigation'],
        'related'    => $data['related'],
    ]);
} catch (Throwable $e) {
        error_log('[' . basename(__FILE__) . '] ' . $e->getMessage());
    fail('Erreur serveur lors de la lecture de la qacidate.', 500, ['error' => 'Erreur interne — réessayez dans un instant.']);
}
