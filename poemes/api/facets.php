<?php
/**
 * API — FACETTES (filtres disponibles)
 * ---------------------------------------------------------------
 * GET /poemes/api/facets.php
 * Réponse : { ok, total, interpretes:[{nom, nom_ar, count, image}],
 *             themes:[{nom, count}] }
 */
declare(strict_types=1);

require __DIR__ . '/_db.php';

try {
    $where = "`is_deleted` = 0 AND `status` = 'published'";

    $total = (int) db()->query("SELECT COUNT(*) FROM `qacidates` WHERE $where")->fetchColumn();

    /* Interprètes + effectif + photo (la plus fréquente) */
    $sqlInt = "SELECT `interprete` AS nom,
                      MAX(`interprete_ar`) AS nom_ar,
                      COUNT(*) AS count,
                      (SELECT i2.`image` FROM `qacidates` i2
                        WHERE i2.`interprete` = q.`interprete`
                          AND i2.`image` IS NOT NULL AND i2.`image` <> ''
                        ORDER BY i2.`id` DESC LIMIT 1) AS image
                 FROM `qacidates` q
                WHERE $where AND `interprete` IS NOT NULL AND `interprete` <> ''
             GROUP BY `interprete`
             ORDER BY count DESC, `interprete` ASC";
    $interpretes = array_map(static function (array $r): array {
        return [
            'nom'    => $r['nom'],
            'nom_ar' => $r['nom_ar'],
            'count'  => (int) $r['count'],
            'image'  => image_url($r['image']),
        ];
    }, db()->query($sqlInt)->fetchAll());

    /* Qacidates sans interprète : filtre « Autres » */
    $sansI = (int) db()->query("SELECT COUNT(*) FROM `qacidates`
                                 WHERE $where AND (`interprete` IS NULL OR `interprete` = '')")->fetchColumn();
    if ($sansI > 0) {
        $interpretes[] = ['nom' => 'Autres', 'nom_ar' => 'أخرى', 'count' => $sansI, 'image' => null];
    }

    /* Thèmes */
    $sqlTheme = "SELECT `theme` AS nom, COUNT(*) AS count
                   FROM `qacidates`
                  WHERE $where AND `theme` IS NOT NULL AND `theme` <> ''
               GROUP BY `theme`
               ORDER BY count DESC, `theme` ASC";
    $themes = array_map(static function (array $r): array {
        return ['nom' => $r['nom'], 'count' => (int) $r['count']];
    }, db()->query($sqlTheme)->fetchAll());

    json_out([
        'ok'         => true,
        'total'      => $total,
        'interpretes' => $interpretes,
        'themes'     => $themes,
    ]);
} catch (Throwable $e) {
        error_log('[' . basename(__FILE__) . '] ' . $e->getMessage());
    fail('Erreur serveur lors de la lecture des filtres.', 500, ['error' => 'Erreur interne — réessayez dans un instant.']);
}
