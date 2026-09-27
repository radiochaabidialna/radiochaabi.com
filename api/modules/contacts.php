<?php
/**
 * Chaabi API — module « contacts »
 * Inclus uniquement via api/radiochaabi.php
 */
if (!defined('CHAABI_API')) { http_response_code(403); exit('Forbidden'); }

function chaabi_module_contacts(PDO $pdo, string $action, int $page, int $limit, int $offset): bool {
    switch ($action) {
        case 'get_contacts':

            // Afficher uniquement les messages archivés/lu pour éviter de rendre publics les messages privés non traités
            $q = "SELECT id, nom, email, phone, sujet, message, created_at FROM contacts WHERE admin_status = 'archived' ORDER BY created_at DESC";
            $c = "SELECT COUNT(*) FROM contacts WHERE admin_status = 'archived'";
            echo json_encode(getPaginatedData($pdo, $q, $c, [], $offset, $limit));
            break;
        case 'add_contact':


                // Anti-spam : honeypot + rate limit
                $data = json_decode(file_get_contents("php://input"));
                if (!is_object($data)) { echo json_encode(["error" => "Requête invalide"]); break; }
                $hp = trim((string)($data->website ?? $data->url ?? ''));
                if ($hp !== '') {
                    // Bot : réponse succès factice
                    echo json_encode(["success" => true, "message" => "Envoyé"]);
                    break;
                }
                if (!rateLimitHit('form_' . 'add_contact', 5, 600)) {
                    http_response_code(429);
                    echo json_encode(["error" => "Trop de requêtes — réessayez plus tard"]);
                    break;
                }

                $nom = trim((string)($data->nom ?? ''));
                $email = trim((string)($data->email ?? ''));
                $phone = trim((string)($data->phone ?? ''));
                $sujet = trim((string)($data->sujet ?? ''));
                $message = trim((string)($data->message ?? ''));
                if ($nom && $email && $message) {
                    $stmt = $pdo->prepare("INSERT INTO contacts (nom, email, phone, sujet, message, admin_status, created_at) VALUES (?, ?, ?, ?, ?, 'new', NOW())");
                    $stmt->execute([$nom, $email, $phone, $sujet, $message]);
                    adminNotif('contact', ['nom' => $nom, 'email' => $email, 'phone' => $phone, 'sujet' => $sujet, 'message' => $message]);
                    echo json_encode(["success" => true, "message" => "Message envoyé avec succès"]);
                } else {
                    echo json_encode(["error" => "Veuillez remplir les champs obligatoires"]);
                }
                break;

            // --- RECHERCLE GLOBALE ---
            break;
        default:
            return false;
    }
    return true;
}
