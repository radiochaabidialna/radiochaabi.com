<?php
/**
 * Chaabi API — module « media »
 * Inclus uniquement via api/radiochaabi.php
 */
if (!defined('CHAABI_API')) { http_response_code(403); exit('Forbidden'); }

function chaabi_module_media(PDO $pdo, string $action, int $page, int $limit, int $offset): bool {
    switch ($action) {
        case 'get_media':

            $type = $_GET['type'] ?? '';
            $id = intval($_GET['id'] ?? 0);
            if (!$id || !in_array($type, ['chanson', 'emission', 'interview'], true)) {
                echo json_encode(["error" => "type/id invalide"]);
                break;
            }
            if ($type === 'chanson') {
                $st = $pdo->prepare("SELECT c.id, c.titre, c.titre_ar, c.audio, c.duree, c.views, c.likes, c.image,
                                            a.nom AS artiste_nom, a.nom_ar AS artiste_nom_ar, a.image AS artiste_image
                                     FROM chansons c LEFT JOIN artistes a ON c.artiste_id = a.id
                                     WHERE c.id = ? AND c.status = 'published' AND c.is_deleted = 0");
                $st->execute([$id]);
                $row = $st->fetch(PDO::FETCH_ASSOC);
                if ($row) { $row['media_type'] = 'chanson'; echo json_encode($row); }
                else echo json_encode(["error" => "introuvable"]);
            } elseif ($type === 'emission') {
                $st = $pdo->prepare("SELECT e.id, e.numero_emission, e.audio, e.duree, e.views, e.likes, e.image,
                                            GROUP_CONCAT(DISTINCT COALESCE(a.nom, ei.invite_externe_nom) SEPARATOR ', ') AS invites_noms
                                     FROM emissions e
                                     LEFT JOIN emission_invites ei ON ei.emission_id = e.id
                                     LEFT JOIN artistes a ON ei.artiste_id = a.id
                                     WHERE e.id = ? AND e.status = 'published'
                                     GROUP BY e.id");
                $st->execute([$id]);
                $row = $st->fetch(PDO::FETCH_ASSOC);
                if ($row) { $row['media_type'] = 'emission'; echo json_encode($row); }
                else echo json_encode(["error" => "introuvable"]);
            } else {
                $st = $pdo->prepare("SELECT id, artiste_nom, artiste_nom_ar, audio, duree, views, likes, image, date_interview
                                     FROM interviews WHERE id = ? AND status = 'published' AND is_deleted = 0");
                $st->execute([$id]);
                $row = $st->fetch(PDO::FETCH_ASSOC);
                if ($row) { $row['media_type'] = 'interview'; echo json_encode($row); }
                else echo json_encode(["error" => "introuvable"]);
            }
            break;
        case 'like_item':

                $data = json_decode(file_get_contents("php://input"));
                $type = $data->type ?? '';
                $id = intval($data->id ?? 0);
                $table = '';
                if ($type == 'artiste') $table = 'artistes';
                elseif ($type == 'chanson') $table = 'chansons';
                elseif ($type == 'emission') $table = 'emissions';
                elseif ($type == 'interview') $table = 'interviews';
                elseif ($type == 'qacidate') $table = 'qacidates';
                elseif ($type == 'dedicace') $table = 'dedicaces';
                if ($table && $id) {
                    $stmt = $pdo->prepare("UPDATE `$table` SET likes = likes + 1 WHERE id = ?");
                    $stmt->execute([$id]);
                    $stmt = $pdo->prepare("SELECT likes FROM `$table` WHERE id = ?");
                    $stmt->execute([$id]);
                    echo json_encode(["success" => true, "likes" => (int)$stmt->fetchColumn()]);
                } else {
                    echo json_encode(["error" => "Type ou id invalide"]);
                }
                break;

            // --- VUES : incrémentation (artiste, chanson, emission, interview) ---

            // --- COMPTEUR VISITEURS SITE (en ligne / jour / total) ---
            break;
        case 'track_visit':

            // Corps JSON optionnel : { "vid": "hash-client" }
            $data = json_decode(readBody() ?: '[]', true);
            if (!is_array($data)) $data = [];
            $vid = preg_replace('/[^a-zA-Z0-9_\-]/', '', (string)($data['vid'] ?? $_GET['vid'] ?? ''));
            if (strlen($vid) < 8) {
                // fallback serveur (moins précis)
                $vid = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . ($_SERVER['HTTP_USER_AGENT'] ?? ''));
                $vid = substr($vid, 0, 32);
            }
            $vid = substr($vid, 0, 64);
            try {
                if (!$pdo->query("SHOW TABLES LIKE 'site_visitors'")->fetchColumn()) {
                    $pdo->exec("CREATE TABLE IF NOT EXISTS site_visitors (
                      visitor_hash VARCHAR(64) NOT NULL,
                      first_seen DATETIME NOT NULL,
                      last_seen DATETIME NOT NULL,
                      hits INT UNSIGNED NOT NULL DEFAULT 1,
                      PRIMARY KEY (visitor_hash),
                      KEY idx_last_seen (last_seen)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
                }
                $st = $pdo->prepare(
                    "INSERT INTO site_visitors (visitor_hash, first_seen, last_seen, hits)
                     VALUES (?, NOW(), NOW(), 1)
                     ON DUPLICATE KEY UPDATE last_seen = NOW(), hits = hits + 1"
                );
                $st->execute([$vid]);
            } catch (Exception $e) {
                error_log('[Chaabi] track_visit: ' . $e->getMessage());
                jsonOut(["error" => "track_visit failed"], 500);
            }
            // renvoie aussi les stats pour éviter un 2e appel
            // fallthrough volontaire impossible en PHP switch — on calcule ici
            // no break
            break;
        case 'get_visit_stats':

            try {
                if (!$pdo->query("SHOW TABLES LIKE 'site_visitors'")->fetchColumn()) {
                    jsonOut([
                        "ok" => true,
                        "online" => 0,
                        "today" => 0,
                        "total" => 0,
                        "table" => false
                    ]);
                }
                $online = (int)$pdo->query(
                    "SELECT COUNT(*) FROM site_visitors WHERE last_seen >= (NOW() - INTERVAL 5 MINUTE)"
                )->fetchColumn();
                $today = (int)$pdo->query(
                    "SELECT COUNT(*) FROM site_visitors WHERE last_seen >= CURDATE()"
                )->fetchColumn();
                $total = (int)$pdo->query("SELECT COUNT(*) FROM site_visitors")->fetchColumn();
                jsonOut([
                    "ok" => true,
                    "online" => $online,
                    "today" => $today,
                    "total" => $total,
                    "table" => true,
                    "window_online_minutes" => 5
                ]);
            } catch (Exception $e) {
                error_log('[Chaabi] get_visit_stats: ' . $e->getMessage());
                jsonOut(["error" => "stats failed"], 500);
            }
            break;
        case 'track_view':

            $data = json_decode(readBody() ?: file_get_contents("php://input"));
            if (!$data) $data = (object)['type' => $_GET['type'] ?? '', 'id' => $_GET['id'] ?? 0];
            $type = $data->type ?? '';
            $id = intval($data->id ?? 0);
            $map = [
                'artiste' => 'artistes',
                'chanson' => 'chansons',
                'emission' => 'emissions',
                'interview' => 'interviews',
                'qacidate' => 'qacidates',
            ];
            $table = $map[$type] ?? '';
            if (!$table || !$id) {
                echo json_encode(["error" => "Type ou id invalide"]);
                break;
            }
            // Anti-spam léger : 1 vue / type+id / session / 30 min
            $vk = 'view_' . $type . '_' . $id;
            if (!empty($_SESSION[$vk]) && (time() - (int)$_SESSION[$vk]) < 1800) {
                $stmt = $pdo->prepare("SELECT views FROM `$table` WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(["success" => true, "views" => (int)$stmt->fetchColumn(), "deduped" => true]);
                break;
            }
            try {
                $stmt = $pdo->prepare("UPDATE `$table` SET views = COALESCE(views, 0) + 1 WHERE id = ?");
                $stmt->execute([$id]);
                $_SESSION[$vk] = time();
                $stmt = $pdo->prepare("SELECT views FROM `$table` WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(["success" => true, "views" => (int)$stmt->fetchColumn()]);
            } catch (Exception $e) {
                error_log('[Chaabi] track_view: ' . $e->getMessage());
                echo json_encode(["error" => "Impossible d'incrémenter la vue"]);
            }
            break;
        case 'search':

            $q_raw = isset($_GET['q']) ? trim($_GET['q']) : '';
            if (empty($q_raw)) { echo json_encode([]); break; }

            $results = [];

            // DETECTION DU PREFIXE #
            // On utilise preg_match pour s'assurer que c'est bien un nombre après le #
            if (preg_match('/^#(\d+)$/', $q_raw, $matches)) {
                $numero = (int)$matches[1]; // On récupère le numéro extrait

                $stmt = $pdo->prepare("SELECT id, numero_emission, titre, titre_ar, image, audio, views, likes, date_emission 
                                       FROM emissions 
                                       WHERE numero_emission = ? 
                                       LIMIT 1");
                $stmt->execute([$numero]);
                $results['emissions'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // On retourne des tableaux vides pour les autres catégories pour garder la structure
                $results['artistes'] = [];
                $results['chansons'] = [];
                $results['interviews'] = [];
                $results['invites'] = [];
                $results['isSpecialSearch'] = true; 
            } else {
                // RECHERCHE CLASSIQUE (Texte)
                $q = '%' . $q_raw . '%';

                // Artistes
                $stmt = $pdo->prepare("SELECT id, nom, nom_ar, bio, image, views, likes FROM artistes WHERE nom LIKE ? OR nom_ar LIKE ? LIMIT 5");
                $stmt->execute([$q, $q]);
                $results['artistes'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Chansons
                $stmt = $pdo->prepare("SELECT c.*, a.nom as artiste_nom FROM chansons c LEFT JOIN artistes a ON c.artiste_id = a.id WHERE c.titre LIKE ? OR c.titre_ar LIKE ? LIMIT 5");
                $stmt->execute([$q, $q]);
                $results['chansons'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Emissions (par titre ou par numéro si l'utilisateur tape juste le chiffre sans #)
                $stmt = $pdo->prepare("SELECT id, numero_emission, titre, titre_ar, image, audio, views, likes, date_emission FROM emissions WHERE titre LIKE ? OR titre_ar LIKE ? OR CAST(numero_emission AS CHAR) LIKE ? LIMIT 5");
                $stmt->execute([$q, $q, $q]);
                $results['emissions'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Interviews
                try {
                    $stmt = $pdo->prepare("SELECT i.id, i.date_interview, i.audio, i.image, i.views, a.nom as artiste_nom, a.nom_ar as artiste_nom_ar
                                           FROM interviews i LEFT JOIN artistes a ON i.artiste_id = a.id
                                           WHERE a.nom LIKE ? OR a.nom_ar LIKE ? LIMIT 5");
                    $stmt->execute([$q, $q]);
                    $results['interviews'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
                } catch (Throwable $e) {
                    $results['interviews'] = [];
                }

                // Invités externes (noms distincts)
                try {
                    $stmt = $pdo->prepare("SELECT invite_externe_nom AS nom, invite_externe_nom_ar AS nom_ar,
                                                  MAX(invite_externe_image) AS image, MAX(invite_externe_type) AS invite_type,
                                                  COUNT(*) AS nb_emissions
                                           FROM emission_invites
                                           WHERE invite_externe_nom LIKE ? OR invite_externe_nom_ar LIKE ?
                                           GROUP BY invite_externe_nom, invite_externe_nom_ar
                                           ORDER BY nb_emissions DESC
                                           LIMIT 5");
                    $stmt->execute([$q, $q]);
                    $results['invites'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
                } catch (Throwable $e) {
                    $results['invites'] = [];
                }

                $results['isSpecialSearch'] = false;
            }

            echo json_encode($results);
            break;

            // --- LIVE BAR "EN CE MOMENT..." (uniquement les médias en cours) ---
            break;
        case 'get_live_bar':

                // Sécurité : si la table active_tracks n'existe pas, on renvoie une liste vide propre (pas d'erreur PHP)
                if (!$pdo->query("SHOW TABLES LIKE 'active_tracks'")->fetchColumn()) {
                    echo json_encode(["data" => [], "generated_at" => date('Y-m-d H:i:s')]);
                    break;
                }
                $minutes = isset($_GET['minutes']) ? max(1, min(60, intval($_GET['minutes']))) : 5;

                // Médias en cours (dédupliqués) — tri par nb d'auditeurs puis récence
                $stmt = $pdo->prepare("SELECT media_type, media_id,
                                              MAX(title) AS title, MAX(artist) AS artist, MAX(image) AS image,
                                              MAX(numero) AS numero, MAX(invite) AS invite,
                                              MAX(updated_at) AS last_update,
                                              COUNT(*) AS listeners_count
                                       FROM active_tracks
                                       WHERE updated_at >= (NOW() - INTERVAL :minutes MINUTE)
                                         AND media_type IS NOT NULL
                                         AND media_type != ''
                                       GROUP BY media_type, media_id
                                       ORDER BY listeners_count DESC, last_update DESC
                                       LIMIT 30");
                $stmt->bindValue(':minutes', $minutes, PDO::PARAM_INT);
                $stmt->execute();
                $live = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Enrichissement : URL audio + champs bilingues (FR + AR) depuis la BDD,
                // vrai invité de l'émission, suppression des médias disparus
                $tableMap = ['chanson' => 'chansons', 'interview' => 'interviews', 'emission' => 'emissions'];
                $kept = [];
                foreach ($live as $item) {
                    $tbl = $tableMap[$item['media_type']] ?? null;
                    $item['audio'] = null;
                    $item['title_ar'] = null;
                    $item['artist_ar'] = null;
                    $item['invite_ar'] = null;
                    if ($tbl && !empty($item['media_id'])) {
                        $mid = (int)$item['media_id'];
                        if ($item['media_type'] === 'chanson') {
                            $st = $pdo->prepare("SELECT c.audio, c.titre, c.titre_ar, a.nom AS artist, a.nom_ar AS artist_ar
                                                 FROM chansons c LEFT JOIN artistes a ON c.artiste_id = a.id WHERE c.id = ?");
                            $st->execute([$mid]);
                            $r = $st->fetch(PDO::FETCH_ASSOC);
                            if (!$r) continue; // média supprimé -> on ne l'affiche pas
                            $item['audio'] = $r['audio'] ?: null;
                            $item['title_ar'] = $r['titre_ar'] ?: null;
                            $item['artist'] = $r['artist'] ?: $item['artist'];
                            $item['artist_ar'] = $r['artist_ar'] ?: null;
                        } elseif ($item['media_type'] === 'interview') {
                            $st = $pdo->prepare("SELECT audio, artiste_nom, artiste_nom_ar FROM interviews WHERE id = ?");
                            $st->execute([$mid]);
                            $r = $st->fetch(PDO::FETCH_ASSOC);
                            if (!$r) continue;
                            $item['audio'] = $r['audio'] ?: null;
                            $item['artist'] = $r['artiste_nom'] ?: $item['artist'];
                            $item['artist_ar'] = $r['artiste_nom_ar'] ?: null;
                        } elseif ($item['media_type'] === 'emission') {
                            $st = $pdo->prepare("SELECT audio, numero_emission FROM emissions WHERE id = ?");
                            $st->execute([$mid]);
                            $r = $st->fetch(PDO::FETCH_ASSOC);
                            if (!$r) continue;
                            $item['audio'] = $r['audio'] ?: null;
                            if ($r['numero_emission'] !== null) $item['numero'] = $r['numero_emission'];
                            // Vrai invité (FR + AR), corrige les anciens "Invité(s)"
                            $st = $pdo->prepare("SELECT COALESCE(a.nom, ei.invite_externe_nom) AS invite,
                                                        COALESCE(a.nom_ar, ei.invite_externe_nom_ar, a.nom, ei.invite_externe_nom) AS invite_ar
                                                 FROM emission_invites ei LEFT JOIN artistes a ON ei.artiste_id = a.id
                                                 WHERE ei.emission_id = ? ORDER BY ei.ordre ASC LIMIT 1");
                            $st->execute([$mid]);
                            $inv = $st->fetch(PDO::FETCH_ASSOC);
                            if ($inv && $inv['invite']) { $item['invite'] = $inv['invite']; $item['invite_ar'] = $inv['invite_ar'] ?: null; }
                        } else {
                            $st = $pdo->prepare("SELECT audio FROM `$tbl` WHERE id = ?");
                            $st->execute([$mid]);
                            if ($st->rowCount() == 0) continue;
                            $item['audio'] = $st->fetchColumn() ?: null;
                        }
                    }
                    if (($item['media_type'] ?? '') === 'qacida') {
                        $item['label'] = 'Qacidate';
                        $item['label_ar'] = 'قصيدة';
                        /* Pas de table locale : conserver title/artist déjà stockés par track_play */
                        if (empty($item['title'])) $item['title'] = 'Qacidate';
                    }
                    $kept[] = $item;
                }

                // Nombre d'auditeurs réellement en train d'écouter (même fenêtre de 5 min)
                // NB: SUBSTRING_INDEX retire le suffixe ":type:id" ajouté par track_play (clé composite)
                $stmt = $pdo->prepare("SELECT COUNT(DISTINCT SUBSTRING_INDEX(session_id, ':', 1)) FROM active_tracks WHERE updated_at >= (NOW() - INTERVAL :minutes MINUTE)");
                $stmt->bindValue(':minutes', $minutes, PDO::PARAM_INT);
                $stmt->execute();
                $listeners = (int)$stmt->fetchColumn();

                // Infos radio en continu (live_settings : "à l'antenne" + URL du flux)
                $radio = null;
                try {
                    $radio = $pdo->query("SELECT last_title, last_artist, stream_url, last_update FROM live_settings ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
                } catch (Exception $e) { $radio = null; }

                echo json_encode(["data" => $kept, "listeners" => $listeners, "radio" => $radio, "generated_at" => date('Y-m-d H:i:s')]);
                break;

            // --- TRACKING LIVE : alimente la table active_tracks ---
            break;
        case 'track_play':

                $data = json_decode(file_get_contents("php://input"), true);
                $session_id = substr($data['session_id'] ?? '', 0, 255);
                $media_type = in_array($data['media_type'] ?? '', ['chanson', 'emission', 'interview', 'live', 'qacida'], true) ? $data['media_type'] : '';
                $media_id = intval($data['media_id'] ?? 0);
                /* Qacidates (autre BDD) : id parfois absent → dériver un id stable du titre */
                if ($media_id <= 0 && $media_type === 'qacida') {
                    $seed = (string)(($data['title'] ?? '') . '|' . ($data['artist'] ?? '') . '|' . ($data['image'] ?? ''));
                    $media_id = (int) (abs(crc32($seed)) % 1000000);
                    if ($media_id <= 0) $media_id = 1;
                }
                if ($session_id && $media_type && $media_id > 0) {
                    // Clé composite (session + média) : chaque média joué garde sa propre ligne,
                    // la live-bar affiche donc TOUS les médias en cours côte à côte,
                    // même quand un seul visiteur enchaîne plusieurs médias ou ouvre plusieurs onglets
                    $session_key = $session_id . ':' . $media_type . ':' . $media_id;
                    // Sécurité : si la table active_tracks n'existe pas, on ignore sans casser la page
                    if (!$pdo->query("SHOW TABLES LIKE 'active_tracks'")->fetchColumn()) {
                        echo json_encode(["error" => "Table active_tracks absente"]);
                        break;
                    }
                    $title  = substr($data['title'] ?? '', 0, 500);
                    $artist = substr($data['artist'] ?? '', 0, 255);
                    $image  = substr($data['image'] ?? '', 0, 500);
                    $numero = substr($data['numero'] ?? '', 0, 50);
                    $invite = substr($data['invite'] ?? '', 0, 255);
                    $stmt = $pdo->prepare("INSERT INTO active_tracks (session_id, media_type, media_id, title, artist, image, numero, invite, updated_at)
                                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
                                           ON DUPLICATE KEY UPDATE media_type = VALUES(media_type), media_id = VALUES(media_id),
                                           title = VALUES(title), artist = VALUES(artist), image = VALUES(image),
                                           numero = VALUES(numero), invite = VALUES(invite), updated_at = NOW()");
                    $stmt->execute([$session_key, $media_type, $media_id, $title, $artist, $image, $numero, $invite]);
                    // Nettoyage des sessions inactives (> 30 min)
                    $pdo->exec("DELETE FROM active_tracks WHERE updated_at < (NOW() - INTERVAL 30 MINUTE)");
                    echo json_encode(["success" => true]);
                } else {
                    echo json_encode(["error" => "Données manquantes"]);
                }
                break;

            // --- STATISTIQUES D'ÉCOUTE (table ecoutes_statistiques) ---
            break;
        case 'track_listen':

                $data = json_decode(file_get_contents("php://input"), true);
                $media_type = in_array($data['media_type'] ?? '', ['chanson', 'emission', 'interview', 'live', 'qacida'], true) ? $data['media_type'] : '';
                $media_id = intval($data['media_id'] ?? 0);
                $event_type = in_array($data['event_type'] ?? '', ['play', 'progress', 'pause', 'complete']) ? $data['event_type'] : '';
                if (!$media_type || !$media_id || !$event_type) { echo json_encode(["error" => "Données manquantes"]); break; }
                if (!$pdo->query("SHOW TABLES LIKE 'ecoutes_statistiques'")->fetchColumn()) {
                    echo json_encode(["error" => "Table ecoutes_statistiques absente"]);
                    break;
                }
                $session_id = substr($data['session_id'] ?? '', 0, 36);
                $visitor_hash = substr($data['visitor_hash'] ?? '', 0, 64);
                $position = max(0, intval($data['position'] ?? 0));
                $duration = max(0, intval($data['duration'] ?? 0));
                $listened = max(0, intval($data['listened_seconds'] ?? 0));
                $stmt = $pdo->prepare("INSERT INTO ecoutes_statistiques
                                       (media_type, media_id, event_type, listened_seconds, position_seconds, duration_seconds, session_id, visitor_hash, page_path, language_code)
                                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$media_type, $media_id, $event_type, $listened, $position, $duration ?: null, $session_id ?: null, $visitor_hash ?: null, substr($data['page_path'] ?? '', 0, 255), ($data['language_code'] ?? 'fr') === 'ar' ? 'ar' : 'fr']);
                echo json_encode(["success" => true]);
                break;

            // --- TOP DES ÉCOUTES (30 jours, repli sur les vues tant que les stats sont vides) ---
            break;
        case 'get_top_ecoutes':

                $limit = isset($_GET['limit']) ? max(1, min(20, intval($_GET['limit']))) : 6;
                $data = [];
                $hasStats = (bool)$pdo->query("SHOW TABLES LIKE 'ecoutes_statistiques'")->fetchColumn();
                if ($hasStats) {
                    $stmt = $pdo->query("SELECT s.media_id,
                                                COUNT(DISTINCT CASE WHEN s.event_type='play' THEN s.session_id END) AS demarrages,
                                                SUM(CASE WHEN s.event_type='progress' THEN s.listened_seconds ELSE 0 END) AS secondes
                                         FROM ecoutes_statistiques s
                                         WHERE s.media_type='chanson' AND s.created_at >= (NOW() - INTERVAL 30 DAY)
                                         GROUP BY s.media_id ORDER BY demarrages DESC, secondes DESC LIMIT $limit");
                    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $st) {
                        $st2 = $pdo->prepare("SELECT c.id, c.titre, c.titre_ar, c.audio, c.duree, c.views, c.likes, c.image,
                                                     a.nom AS artiste_nom, a.nom_ar AS artiste_nom_ar
                                              FROM chansons c LEFT JOIN artistes a ON c.artiste_id = a.id
                                              WHERE c.id = ? AND c.status='published' AND c.is_deleted = 0");
                        $st2->execute([$st['media_id']]);
                        $song = $st2->fetch(PDO::FETCH_ASSOC);
                        if ($song) { $song['demarrages'] = (int)$st['demarrages']; $song['secondes'] = (int)$st['secondes']; $data[] = $song; }
                    }
                }
                if (empty($data)) {
                    $stmt = $pdo->query("SELECT c.id, c.titre, c.titre_ar, c.audio, c.duree, c.views, c.likes, c.image,
                                                a.nom AS artiste_nom, a.nom_ar AS artiste_nom_ar
                                         FROM chansons c LEFT JOIN artistes a ON c.artiste_id = a.id
                                         WHERE c.status='published' AND c.is_deleted = 0
                                         ORDER BY c.views DESC, c.created_at DESC LIMIT $limit");
                    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
                }
                echo json_encode(["data" => $data, "source" => ($hasStats && !empty($data) ? 'stats' : 'views')]);
                break;

            // --- BOUQALLA DU JOUR (rotation quotidienne) ---
            break;
        case 'get_stats':

                $out = [];
                $out['chansons'] = (int)$pdo->query("SELECT COUNT(*) FROM chansons")->fetchColumn();
                $out['artistes'] = (int)$pdo->query("SELECT COUNT(*) FROM artistes")->fetchColumn();
                $out['emissions'] = (int)$pdo->query("SELECT COUNT(*) FROM emissions")->fetchColumn();
                $out['interviews'] = (int)$pdo->query("SELECT COUNT(*) FROM interviews")->fetchColumn();
                echo json_encode($out);
                break;

            // --- CONNEXION ADMIN PAR COMPTE (table users, rôle admin) ---
            break;
        case 'api_list':

            // Documentation des actions disponibles
            jsonOut([
                "public" => [
                    "get_artistes", "get_artiste_complet", "get_guest_complet",
                    "get_chansons", "get_chanson_featured",
                    "get_emissions", "get_emission_complet",
                    "get_interviews", "get_media",
                    "get_dedicaces", "get_last_dedicaces", "add_dedicace",
                    "get_commentaires", "add_commentaire",
                    "get_contacts", "add_contact",
                    "get_bouqalla", "get_bouqalla_jour",
                    "get_qacidates", "get_qacidate", "get_qacidate_complet",
                    "search", "get_live_bar", "get_stats", "get_top_ecoutes",
                    "like_item", "track_view", "track_play", "track_listen",
                    "rate_emission", "add_emission_comment"
                ],
                "admin" => [
                    "admin_login", "admin_logout", "admin_list", "admin_action",
                    "admin_tables", "admin_get", "admin_save", "admin_delete", "admin_logs", "admin_me"
                ]
            ]);
            break;
        default:
            return false;
    }
    return true;
}
