<?php
/**
 * Chaabi API — module « interviews »
 * Inclus uniquement via api/radiochaabi.php
 */
if (!defined('CHAABI_API')) { http_response_code(403); exit('Forbidden'); }

function chaabi_module_interviews(PDO $pdo, string $action, int $page, int $limit, int $offset): bool {
    switch ($action) {
        case 'get_interviews':

            $params = [];
            $where = "is_deleted = 0 AND status = 'published'";
            $qTerm = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
            if ($qTerm !== '') {
                $where .= " AND (artiste_nom LIKE ? OR artiste_nom_ar LIKE ?)";
                $like = '%' . $qTerm . '%';
                $params = [$like, $like];
            }
            $q = "SELECT id, artiste_nom, artiste_nom_ar, image, audio, duree, views, likes, date_interview FROM interviews WHERE $where ORDER BY date_interview DESC";
            $c = "SELECT COUNT(*) FROM interviews WHERE $where";
            echo json_encode(getPaginatedData($pdo, $q, $c, $params, $offset, $limit));
            break;
        default:
            return false;
    }
    return true;
}
