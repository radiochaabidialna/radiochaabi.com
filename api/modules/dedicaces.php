<?php
/**
 * Chaabi API — module « dedicaces »
 * Inclus uniquement via api/radiochaabi.php
 */
if (!defined('CHAABI_API')) { http_response_code(403); exit('Forbidden'); }

function chaabi_module_dedicaces(PDO $pdo, string $action, int $page, int $limit, int $offset): bool {
    switch ($action) {
        case 'get_dedicaces':

            $tri = $_GET['tri'] ?? 'recent';
            $order = ($tri === 'likes') ? 'likes DESC, created_at DESC' : 'created_at DESC';
            $params = [];
            $where = "status = 'published'";
            $qTerm = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
            if ($qTerm !== '') {
                $where .= " AND (nom LIKE ? OR nom_ar LIKE ? OR pour LIKE ? OR pour_ar LIKE ? OR description LIKE ? OR description_ar LIKE ?)";
                $like = '%' . $qTerm . '%';
                $params = [$like, $like, $like, $like, $like, $like];
            }
            $q = "SELECT id, nom, nom_ar, pour, pour_ar, description, description_ar, likes, created_at FROM dedicaces WHERE $where ORDER BY $order";
            $c = "SELECT COUNT(*) FROM dedicaces WHERE $where";
            echo json_encode(getPaginatedData($pdo, $q, $c, $params, $offset, $limit));
            break;
        case 'add_dedicace':


            // Anti-spam : honeypot + rate limit
            $data = json_decode(file_get_contents("php://input"));
            if (!is_object($data)) { echo json_encode(["error" => "Requête invalide"]); break; }
            $hp = trim((string)($data->website ?? $data->url ?? ''));
            if ($hp !== '') {
                // Bot : réponse succès factice
                echo json_encode(["success" => true, "message" => "Envoyé"]);
                break;
            }
            if (!rateLimitHit('form_' . 'add_dedicace', 5, 600)) {
                http_response_code(429);
                echo json_encode(["error" => "Trop de requêtes — réessayez plus tard"]);
                break;
            }

            $nomIn = trim((string)($data->nom ?? ''));
            $pourIn = trim((string)($data->pour ?? ''));
            $descIn = trim((string)($data->description ?? ''));
            if ($nomIn && $pourIn && $descIn) {
                // Traduction auto : un seul formulaire → FR + AR en base
                list($nom, $nom_ar) = bilingualPair($nomIn);
                list($pour, $pour_ar) = bilingualPair($pourIn);
                list($description, $description_ar) = bilingualPair($descIn);
                try {
                    $stmt = $pdo->prepare("INSERT INTO dedicaces (nom, nom_ar, pour, pour_ar, description, description_ar, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())");
                    $stmt->execute([$nom, $nom_ar ?: null, $pour, $pour_ar ?: null, $description, $description_ar ?: null]);
                } catch (Throwable $e) {
                    // Repli si colonnes _ar absentes
                    $stmt = $pdo->prepare("INSERT INTO dedicaces (nom, pour, description, status, created_at) VALUES (?, ?, ?, 'pending', NOW())");
                    $stmt->execute([$nomIn, $pourIn, $descIn]);
                }
                adminNotif('dedicace', ['nom' => $nomIn, 'pour' => $pourIn, 'description' => $descIn]);
                $msg = isMostlyArabic($descIn)
                    ? "تم إرسال الإهداء للمراجعة"
                    : "Dédicace soumise pour modération";
                echo json_encode(["success" => true, "message" => $msg]);
            } else {
                echo json_encode(["error" => "Veuillez remplir tous les champs"]);
            }
            break;
        case 'get_last_dedicaces':

                $stmt = $pdo->query("SELECT id, nom, nom_ar, pour, pour_ar, description, description_ar, created_at FROM dedicaces WHERE status = 'published' ORDER BY created_at DESC LIMIT 5");
                echo json_encode(["data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
                break;

            // --- COMPTEURS POUR LE HERO ---
            break;
        default:
            return false;
    }
    return true;
}
