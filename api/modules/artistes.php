<?php
/**
 * Chaabi API — module « artistes »
 * Inclus uniquement via api/radiochaabi.php
 */
if (!defined('CHAABI_API')) { http_response_code(403); exit('Forbidden'); }

function chaabi_module_artistes(PDO $pdo, string $action, int $page, int $limit, int $offset): bool {
    switch ($action) {
        case 'get_artistes':

            $params = [];
            $where = "is_deleted = 0";
            $qTerm = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
            if ($qTerm !== '') {
                $where .= " AND (nom LIKE ? OR nom_ar LIKE ? OR bio LIKE ?)";
                $like = '%' . $qTerm . '%';
                $params = [$like, $like, $like];
            }
            $q = "SELECT id, nom, nom_ar, bio, image, views, likes, created_at FROM artistes WHERE $where ORDER BY nom ASC";
            $c = "SELECT COUNT(*) FROM artistes WHERE $where";
            echo json_encode(getPaginatedData($pdo, $q, $c, $params, $offset, $limit));
            break;
        case 'get_artiste_complet':

                $id = intval($_GET['id'] ?? 0);
                $stmt = $pdo->prepare("SELECT * FROM artistes WHERE id = ? AND is_deleted = 0");
                $stmt->execute([$id]);
                $artiste = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$artiste) { echo json_encode(["error" => "Non trouvé"]); break; }

                $stmt = $pdo->prepare("SELECT id, titre, titre_ar, audio, duree, views, likes FROM chansons WHERE artiste_id = ? AND status = 'published' AND is_deleted = 0");
                $stmt->execute([$id]);
                $artiste['chansons'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $nom = $artiste['nom'] ?? '';
                $nomAr = $artiste['nom_ar'] ?? '';
                $artiste['interviews'] = chaabiInterviewsForPerson($pdo, $id, $nom, $nomAr);
                $artiste['emissions'] = chaabiEmissionsForPerson($pdo, $id, $nom, $nomAr);

                echo json_encode($artiste, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                break;

            // --- INVITÉ EXTERNE COMPLET ---
            break;
        case 'get_guest_complet':

            $invite_nom = trim((string)($_GET['invite_externe_nom'] ?? ''));
            if ($invite_nom === '') { echo json_encode(["error" => "Nom d'invité manquant"]); break; }

            // 1) Une seule lecture invité (égalité indexable, pas de LOWER sur colonne)
            $stmt = $pdo->prepare("SELECT invite_externe_nom, invite_externe_nom_ar, invite_externe_type, invite_externe_type_ar,
                                          invite_externe_bio, invite_externe_bio_ar, invite_externe_image, artiste_id
                                   FROM emission_invites
                                   WHERE invite_externe_nom = ? OR invite_externe_nom_ar = ?
                                   ORDER BY id DESC LIMIT 1");
            $stmt->execute([$invite_nom, $invite_nom]);
            $invData = $stmt->fetch(PDO::FETCH_ASSOC);

            $artisteId = null;
            if (!$invData) {
                $stA = $pdo->prepare("SELECT id, nom, nom_ar, bio, bio_ar, image FROM artistes
                                      WHERE is_deleted = 0 AND (nom = ? OR nom_ar = ?) LIMIT 1");
                $stA->execute([$invite_nom, $invite_nom]);
                $art = $stA->fetch(PDO::FETCH_ASSOC);
                if (!$art) { echo json_encode(["error" => "Invité non trouvé"]); break; }
                $artisteId = (int)$art['id'];
                $guest = [
                    'nom' => $art['nom'],
                    'nom_ar' => $art['nom_ar'] ?? $art['nom'],
                    'bio' => $art['bio'] ?? '',
                    'bio_ar' => $art['bio_ar'] ?? '',
                    'image' => $art['image'] ?? null,
                    'invite_type' => 'Artiste',
                    'invite_type_ar' => 'فنان',
                    'artiste_id' => $artisteId
                ];
            } else {
                $artisteId = !empty($invData['artiste_id']) ? (int)$invData['artiste_id'] : null;
                $guest = [
                    'nom' => $invData['invite_externe_nom'] ?: $invite_nom,
                    'nom_ar' => $invData['invite_externe_nom_ar'] ?? $invData['invite_externe_nom'],
                    'bio' => $invData['invite_externe_bio'],
                    'bio_ar' => $invData['invite_externe_bio_ar'],
                    'image' => $invData['invite_externe_image'],
                    'invite_type' => $invData['invite_externe_type'] ?? 'Invité Externe',
                    'invite_type_ar' => $invData['invite_externe_type_ar'] ?? '',
                    'artiste_id' => $artisteId
                ];
                // Si pas d'artiste_id, tenter un match table artistes (1 requête)
                if (!$artisteId) {
                    $stA = $pdo->prepare("SELECT id FROM artistes WHERE is_deleted = 0 AND (nom = ? OR nom_ar = ?) LIMIT 1");
                    $stA->execute([$guest['nom'], $guest['nom_ar'] ?? '']);
                    $aid = $stA->fetchColumn();
                    if ($aid) { $artisteId = (int)$aid; $guest['artiste_id'] = $artisteId; }
                }
            }

            $nomCanon = $guest['nom'] ?? $invite_nom;
            $nomAr = $guest['nom_ar'] ?? '';

            $guest['interviews'] = chaabiInterviewsForPerson($pdo, $artisteId, $nomCanon, $nomAr);
            $guest['emissions']  = chaabiEmissionsForPerson($pdo, $artisteId, $nomCanon, $nomAr);
            $guest['chansons']   = [];
            if ($artisteId) {
                $stC = $pdo->prepare("SELECT id, titre, titre_ar, audio, duree, views, likes FROM chansons WHERE artiste_id = ? AND status = 'published' AND is_deleted = 0");
                $stC->execute([$artisteId]);
                $guest['chansons'] = $stC->fetchAll(PDO::FETCH_ASSOC);
            }

            echo json_encode($guest, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;
        default:
            return false;
    }
    return true;
}
