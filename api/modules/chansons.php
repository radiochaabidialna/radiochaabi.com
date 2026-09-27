<?php
/**
 * Chaabi API — module « chansons »
 * Inclus uniquement via api/radiochaabi.php
 */
if (!defined('CHAABI_API')) { http_response_code(403); exit('Forbidden'); }

function chaabi_module_chansons(PDO $pdo, string $action, int $page, int $limit, int $offset): bool {
    switch ($action) {
        case 'get_chansons':

                // Liste légère + JOIN artiste (noms seulement)
                $params = [];
                $where = "c.is_deleted = 0 AND c.status = 'published'";
                $qTerm = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
                if ($qTerm !== '') {
                    $where .= " AND (c.titre LIKE ? OR c.titre_ar LIKE ? OR a.nom LIKE ? OR a.nom_ar LIKE ?)";
                    $like = '%' . $qTerm . '%';
                    $params = [$like, $like, $like, $like];
                }
                $q = "SELECT c.id, c.titre, c.titre_ar, c.audio, c.image, c.duree, c.views, c.likes,
                             a.nom AS artiste_nom, a.nom_ar AS artiste_nom_ar
                      FROM chansons c
                      LEFT JOIN artistes a ON a.id = c.artiste_id
                      WHERE $where
                      ORDER BY c.id DESC";
                $c = "SELECT COUNT(*) FROM chansons c LEFT JOIN artistes a ON a.id = c.artiste_id WHERE $where";
                echo json_encode(getPaginatedData($pdo, $q, $c, $params, $offset, $limit));
                break;

            // --- EMISSIONS ---
            break;
        case 'get_chanson_featured':

            // 1. Étoile manuelle (admin) — priorité si une chanson est étoilée
            $song = null;
            $st = $pdo->query("SELECT c.id, c.titre, c.titre_ar, c.audio, c.duree, c.views, c.likes, c.image,
                                      a.nom AS artiste_nom, a.nom_ar AS artiste_nom_ar
                               FROM chansons c LEFT JOIN artistes a ON c.artiste_id = a.id
                               WHERE c.featured = 1 AND c.status='published' AND c.is_deleted = 0
                               ORDER BY c.id DESC LIMIT 1");
            $song = $st->fetch(PDO::FETCH_ASSOC);
            // 2. AUTO : la chanson la plus ÉCOUTÉE des 7 derniers jours (vote des internautes)
            if (!$song) {
                $hasStats = (bool)$pdo->query("SHOW TABLES LIKE 'ecoutes_statistiques'")->fetchColumn();
                if ($hasStats) {
                    $st = $pdo->query("SELECT s.media_id, COUNT(DISTINCT s.session_id) AS cpt
                                       FROM ecoutes_statistiques s
                                       WHERE s.media_type = 'chanson' AND s.event_type = 'play'
                                         AND s.created_at >= (NOW() - INTERVAL 7 DAY)
                                       GROUP BY s.media_id ORDER BY cpt DESC LIMIT 1");
                    $top = $st->fetch(PDO::FETCH_ASSOC);
                    if ($top && $top['media_id']) {
                        $st2 = $pdo->prepare("SELECT c.id, c.titre, c.titre_ar, c.audio, c.duree, c.views, c.likes, c.image,
                                                     a.nom AS artiste_nom, a.nom_ar AS artiste_nom_ar
                                              FROM chansons c LEFT JOIN artistes a ON c.artiste_id = a.id
                                              WHERE c.id = ? AND c.status='published' AND c.is_deleted = 0
                                                AND c.audio IS NOT NULL AND c.audio <> ''");
                        $st2->execute([$top['media_id']]);
                        $song = $st2->fetch(PDO::FETCH_ASSOC);
                        if ($song) $song['automatic'] = true;
                    }
                }
            }
            // 3. Repli : la plus AIMÉE (❤️ des internautes, cumul)
            if (!$song) {
                $st = $pdo->query("SELECT c.id, c.titre, c.titre_ar, c.audio, c.duree, c.views, c.likes, c.image,
                                          a.nom AS artiste_nom, a.nom_ar AS artiste_nom_ar
                                   FROM chansons c LEFT JOIN artistes a ON c.artiste_id = a.id
                                   WHERE c.status='published' AND c.is_deleted = 0
                                     AND c.audio IS NOT NULL AND c.audio <> ''
                                   ORDER BY c.likes DESC, c.views DESC LIMIT 1");
                $song = $st->fetch(PDO::FETCH_ASSOC);
                if ($song) $song['automatic'] = true;
            }
            // 4. Dernier recours : la plus récente
            if (!$song) {
                $st = $pdo->query("SELECT c.id, c.titre, c.titre_ar, c.audio, c.duree, c.views, c.likes, c.image,
                                          a.nom AS artiste_nom, a.nom_ar AS artiste_nom_ar
                                   FROM chansons c LEFT JOIN artistes a ON c.artiste_id = a.id
                                   WHERE c.status='published' AND c.is_deleted = 0
                                     AND c.audio IS NOT NULL AND c.audio <> ''
                                   ORDER BY c.id DESC LIMIT 1");
                $song = $st->fetch(PDO::FETCH_ASSOC);
                if ($song) $song['automatic'] = true;
            }
            echo json_encode($song ?: null);
            break;
        default:
            return false;
    }
    return true;
}
