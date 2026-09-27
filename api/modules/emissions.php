<?php
/**
 * Chaabi API — module « emissions »
 * Inclus uniquement via api/radiochaabi.php
 */
if (!defined('CHAABI_API')) { http_response_code(403); exit('Forbidden'); }

function chaabi_module_emissions(PDO $pdo, string $action, int $page, int $limit, int $offset): bool {
    switch ($action) {
        case 'get_emissions':

            // Liste : invités optionnels (?with_invites=1) pour alléger le JOIN
            $withInv = !isset($_GET['with_invites']) || ($_GET['with_invites'] !== '0' && $_GET['with_invites'] !== 'false');
            $params = [];
            $where = "e.status = 'published'";
            $qTerm = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
            if ($qTerm !== '') {
                $where .= " AND (e.titre LIKE ? OR e.titre_ar LIKE ? OR CAST(e.numero_emission AS CHAR) LIKE ?)";
                $like = '%' . $qTerm . '%';
                $params = [$like, $like, $like];
            }
            if ($withInv) {
                $q = "SELECT e.id, e.numero_emission, e.titre, e.titre_ar, e.image, e.audio, e.views, e.likes, e.date_emission, e.duree,
                             inv.invites_noms, inv.invites_noms_ar
                      FROM emissions e
                      LEFT JOIN " . chaabiInvitesSubquery() . " inv ON inv.emission_id = e.id
                      WHERE $where
                      ORDER BY e.date_emission DESC, e.numero_emission DESC";
            } else {
                $q = "SELECT e.id, e.numero_emission, e.titre, e.titre_ar, e.image, e.audio, e.views, e.likes, e.date_emission, e.duree
                      FROM emissions e
                      WHERE $where
                      ORDER BY e.date_emission DESC, e.numero_emission DESC";
            }
            $c = "SELECT COUNT(*) FROM emissions e WHERE $where";
            echo json_encode(getPaginatedData($pdo, $q, $c, $params, $offset, $limit));
            break;
        case 'get_emission_complet':

                $id = intval($_GET['id'] ?? 0);
                $stmt = $pdo->prepare("SELECT id, numero_emission, titre, titre_ar, description, description_ar,
                                              image, audio, duree, views, likes, date_emission, status
                                       FROM emissions WHERE id = ? AND status = 'published' LIMIT 1");
                $stmt->execute([$id]);
                $emission = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$emission) { echo json_encode(["error" => "Émission non trouvée"]); break; }

                // Tous les invités (pas de LIMIT) — ordre puis id
                $stmtInv = $pdo->prepare("SELECT ei.*, a.nom as artiste_nom, a.nom_ar as artiste_nom_ar, a.image as artiste_image 
                                       FROM emission_invites ei LEFT JOIN artistes a ON ei.artiste_id = a.id 
                                       WHERE ei.emission_id = ? 
                                       ORDER BY COALESCE(ei.ordre, 999) ASC, ei.id ASC");
                $stmtInv->execute([$id]);
                $invites = $stmtInv->fetchAll(PDO::FETCH_ASSOC);
                $stmtInt = $pdo->prepare("SELECT id, audio, date_interview FROM interviews WHERE artiste_id = ? AND status = 'published' AND is_deleted = 0");
                foreach ($invites as &$inv) {
                    $inv['interviews'] = [];
                    if (!empty($inv['artiste_id'])) {
                        $stmtInt->execute([(int)$inv['artiste_id']]);
                        $inv['interviews'] = $stmtInt->fetchAll(PDO::FETCH_ASSOC);
                    }
                    // Garantir un nom affichable
                    if (empty($inv['artiste_nom']) && empty($inv['invite_externe_nom'])) {
                        $inv['invite_externe_nom'] = $inv['invite_externe_nom'] ?? ('Invité #' . ($inv['id'] ?? '?'));
                    }
                }
                unset($inv);
                $emission['invites'] = $invites;
                $emission['invites_count'] = count($invites);

                $stmt = $pdo->prepare("SELECT nom, message, created_at FROM emission_comments WHERE emission_id = ? AND status = 'published' ORDER BY created_at DESC LIMIT 10");
                $stmt->execute([$id]);
                $emission['comments'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $stmt = $pdo->prepare("SELECT ROUND(AVG(rating), 1) as avg, COUNT(id) as total_votes FROM emission_ratings WHERE emission_id = ?");
                $stmt->execute([$id]);
                $emission['rating_stats'] = $stmt->fetch(PDO::FETCH_ASSOC);

                // Noms des invités (FR + AR) pour la live-bar et l'affichage du détail
                $stmt = $pdo->prepare("SELECT GROUP_CONCAT(DISTINCT COALESCE(a.nom, ei.invite_externe_nom) SEPARATOR ', ') AS invites_noms,
                                              GROUP_CONCAT(DISTINCT COALESCE(a.nom_ar, ei.invite_externe_nom_ar, a.nom, ei.invite_externe_nom) SEPARATOR ', ') AS invites_noms_ar
                                       FROM emission_invites ei LEFT JOIN artistes a ON ei.artiste_id = a.id
                                       WHERE ei.emission_id = ?");
                $stmt->execute([$id]);
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                $emission['invites_noms'] = $row['invites_noms'] ?: '';
                $emission['invites_noms_ar'] = $row['invites_noms_ar'] ?: '';

                echo json_encode($emission);
                break;

            // --- AUTRES TABLES ---
            break;
        case 'rate_emission':

            $data = json_decode(file_get_contents("php://input"));
            $emission_id = intval($data->emission_id ?? 0);
            $rating = intval($data->rating ?? 0);
            $ip = $_SERVER['REMOTE_ADDR'];
            if ($emission_id && $rating > 0 && $rating <= 5) {
                $stmt = $pdo->prepare("SELECT id FROM emission_ratings WHERE emission_id = ? AND user_ip = ?");
                $stmt->execute([$emission_id, $ip]);
                if ($stmt->rowCount() == 0) {
                    $stmt = $pdo->prepare("INSERT INTO emission_ratings (emission_id, rating, user_ip, created_at) VALUES (?, ?, ?, NOW())");
                    $stmt->execute([$emission_id, $rating, $ip]);
                    echo json_encode(["success" => true, "message" => "Merci pour votre vote !"]);
                } else {
                    echo json_encode(["error" => "Vous avez déjà voté"]);
                }
            }
            break;
        case 'add_emission_comment':

                $data = json_decode(file_get_contents("php://input"));
                $emission_id = intval($data->emission_id ?? 0);
                $nom = trim((string)($data->nom ?? ''));
                $email = trim((string)($data->email ?? ''));
                $message = trim((string)($data->message ?? ''));
                if ($emission_id && $nom && $message) {
                    $stmt = $pdo->prepare("INSERT INTO emission_comments (emission_id, nom, email, message, status, created_at) VALUES (?, ?, ?, ?, 'pending', NOW())");
                    $stmt->execute([$emission_id, $nom, $email, $message]);
                    $emTitre = $pdo->prepare("SELECT titre FROM emissions WHERE id = ?");
                    $emTitre->execute([$emission_id]);
                    adminNotif('emission_comment', ['nom' => $nom, 'email' => $email, 'message' => $message, 'emission' => $emTitre->fetchColumn() ?: '#' . $emission_id]);
                    echo json_encode(["success" => true, "message" => "Commentaire soumis"]);
                }
                break;

            // --- NOUVEAUX FORMULAIRES (Dedicaces, Commentaires, Contacts) ---
            break;
        default:
            return false;
    }
    return true;
}
