<?php
/**
 * Chaabi API — module « bouqalla »
 * Inclus uniquement via api/radiochaabi.php
 */
if (!defined('CHAABI_API')) { http_response_code(403); exit('Forbidden'); }

function chaabi_module_bouqalla(PDO $pdo, string $action, int $page, int $limit, int $offset): bool {
    switch ($action) {
        case 'get_bouqalla':

                $params = [];
                $where = "1=1";
                $qTerm = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
                if ($qTerm !== '') {
                    $where .= " AND (arabe LIKE ? OR phonetic LIKE ? OR francais LIKE ? OR CAST(num AS CHAR) LIKE ?)";
                    $like = '%' . $qTerm . '%';
                    $params = [$like, $like, $like, $like];
                }
                $q = "SELECT id, num, arabe, phonetic, francais FROM bouqalla WHERE $where ORDER BY num ASC";
                $c = "SELECT COUNT(*) FROM bouqalla WHERE $where";
                echo json_encode(getPaginatedData($pdo, $q, $c, $params, $offset, $limit));
                break;

            // --- INTERACTIVITÉ : LIKES & RATINGS ---
            break;
        case 'get_bouqalla_jour':

                $count = (int)$pdo->query("SELECT COUNT(*) FROM bouqalla")->fetchColumn();
                if ($count === 0) { echo json_encode(["error" => "Aucune bouqalla"]); break; }
                $offset = ((int)date('z')) % $count;
                $stmt = $pdo->query("SELECT id, num, arabe, phonetic, francais FROM bouqalla ORDER BY num ASC LIMIT 1 OFFSET $offset");
                echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
                break;

            // --- MINI-ADMIN : liste des contenus à modérer (clé requise) ---
            break;
        default:
            return false;
    }
    return true;
}
