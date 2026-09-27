<?php
/**
 * Chaabi API — module « commentaires »
 * Inclus uniquement via api/radiochaabi.php
 */
if (!defined('CHAABI_API')) { http_response_code(403); exit('Forbidden'); }

function chaabi_module_commentaires(PDO $pdo, string $action, int $page, int $limit, int $offset): bool {
    switch ($action) {
        case 'get_commentaires':

            $q = "SELECT id, nom, message, rating, created_at FROM commentaires WHERE status = 'published' ORDER BY created_at DESC";
            $c = "SELECT COUNT(*) FROM commentaires WHERE status = 'published'";
            echo json_encode(getPaginatedData($pdo, $q, $c, [], $offset, $limit));
            break;
        case 'add_commentaire':


            // Anti-spam : honeypot + rate limit
            $data = json_decode(file_get_contents("php://input"));
            if (!is_object($data)) { echo json_encode(["error" => "Requête invalide"]); break; }
            $hp = trim((string)($data->website ?? $data->url ?? ''));
            if ($hp !== '') {
                // Bot : réponse succès factice
                echo json_encode(["success" => true, "message" => "Envoyé"]);
                break;
            }
            if (!rateLimitHit('form_' . 'add_commentaire', 5, 600)) {
                http_response_code(429);
                echo json_encode(["error" => "Trop de requêtes — réessayez plus tard"]);
                break;
            }

            $nom = trim((string)($data->nom ?? ''));
            $email = trim((string)($data->email ?? ''));
            $message = trim((string)($data->message ?? ''));
            $rating = intval($data->rating ?? 5);
            if ($nom && $message) {
                $stmt = $pdo->prepare("INSERT INTO commentaires (nom, email, message, rating, status, created_at) VALUES (?, ?, ?, ?, 'pending', NOW())");
                $stmt->execute([$nom, $email, $message, $rating]);
                adminNotif('commentaire', ['nom' => $nom, 'email' => $data->email ?? '', 'rating' => $rating, 'message' => $message]);
                echo json_encode(["success" => true, "message" => "Commentaire soumis pour modération"]);
            } else {
                echo json_encode(["error" => "Veuillez remplir tous les champs"]);
            }
            break;
        default:
            return false;
    }
    return true;
}
