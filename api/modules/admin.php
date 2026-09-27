<?php
/**
 * Chaabi API — module « admin »
 * Inclus uniquement via api/radiochaabi.php
 */
if (!defined('CHAABI_API')) { http_response_code(403); exit('Forbidden'); }

function chaabi_module_admin(PDO $pdo, string $action, int $page, int $limit, int $offset): bool {
    switch ($action) {
        case 'admin_list':

                requirePermission('moderate');
                $c = $pdo->query("SELECT id, nom, nom_ar, email, message, rating, created_at, status, moderated_at FROM commentaires ORDER BY created_at DESC LIMIT 50")->fetchAll(PDO::FETCH_ASSOC);
                $d = $pdo->query("SELECT id, nom, nom_ar, pour, pour_ar, description, description_ar, likes, created_at, status, moderated_at FROM dedicaces ORDER BY created_at DESC LIMIT 50")->fetchAll(PDO::FETCH_ASSOC);
                $t = $pdo->query("SELECT id, nom, email, phone, sujet, message, admin_status, created_at FROM contacts ORDER BY created_at DESC LIMIT 50")->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode(["commentaires" => $c, "dedicaces" => $d, "contacts" => $t]);
                break;

            // --- MINI-ADMIN : action de modération (clé requise) ---
            break;
        case 'admin_action':

                requireAdmin(true);
                requirePermission('moderate');
                $data = json_decode(readBody(), true);
                $table = in_array($data['table'] ?? '', ['commentaire', 'dedicace', 'contact'], true) ? $data['table'] : '';
                $id = intval($data['id'] ?? 0);
                $action = $data['action'] ?? '';
                if (!$table || !$id || !$action) {
                    jsonOut(["error" => "Données manquantes"], 400);
                }
                $ok = false; $old = null; $new = null;
                $tblName = null;
                if ($table === 'contact') {
                    $tblName = 'contacts';
                    $st = $pdo->prepare("SELECT admin_status FROM contacts WHERE id = ?"); $st->execute([$id]); $old = $st->fetchColumn();
                    $new = ['mark_read' => 'read', 'archive' => 'archived', 'delete' => 'deleted'][$action] ?? null;
                    if ($new === 'deleted') { $ok = (bool)$pdo->prepare("DELETE FROM contacts WHERE id = ?")->execute([$id]); }
                    elseif ($new) { $ok = (bool)$pdo->prepare("UPDATE contacts SET admin_status = ? WHERE id = ?")->execute([$new, $id]); }
                } else {
                    $tblName = $table . 's'; // commentaires / dedicaces
                    $st = $pdo->prepare("SELECT status FROM `$tblName` WHERE id = ?"); $st->execute([$id]); $old = $st->fetchColumn();
                    $new = ['approve' => 'published', 'reject' => 'rejected', 'delete' => 'deleted'][$action] ?? null;
                    if ($new === 'deleted') { $ok = (bool)$pdo->prepare("DELETE FROM `$tblName` WHERE id = ?")->execute([$id]); }
                    elseif ($new) {
                        $ok = (bool)$pdo->prepare("UPDATE `$tblName` SET status = ?, moderated_at = NOW(), moderation_note = ? WHERE id = ?")
                            ->execute([$new, isset($data['note']) ? substr((string)$data['note'], 0, 1000) : null, $id]);
                    }
                }
                if ($ok) {
                    logAdminAction($pdo, $action, $tblName, $id, ['old' => $old, 'new' => $new]);
                }
                echo json_encode(["success" => (bool)$ok]);
                break;

            // --- 5 DERNIÈRES DÉDICACES PUBLIÉES (bandeau défilant) ---
            break;
        case 'admin_login':

            // Max 8 tentatives / 15 min / IP
            if (!rateLimitHit('admin_login', 8, 900)) {
                jsonOut(["error" => "Trop de tentatives — réessayez plus tard"], 429);
            }
            $data = json_decode(readBody(), true);
            $email = trim($data['email'] ?? '');
            $pass = (string)($data['password'] ?? '');
            if (!$email || !$pass) { jsonOut(["error" => "Email et mot de passe requis"], 400); }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { jsonOut(["error" => "Email invalide"], 400); }
            $st = $pdo->prepare("SELECT id, nom, password, role FROM users WHERE email = ? LIMIT 1");
            $st->execute([$email]);
            $u = $st->fetch(PDO::FETCH_ASSOC);
            // Délai constant anti-timing (même si user absent)
            $hash = $u['password'] ?? '$2y$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWX012345';
            $okPass = password_verify($pass, $hash);
            $okRole = $u && in_array($u['role'] ?? '', ['superadmin', 'admin', 'editor', 'moderator'], true);
            if ($u && $okPass && $okRole) {
                session_regenerate_id(true);
                $_SESSION['admin_id'] = (int)$u['id'];
                $_SESSION['admin_nom'] = $u['nom'];
                $_SESSION['admin_role'] = $u['role'];
                $_SESSION['admin_last'] = time();
                $csrf = adminIssueCsrf();
                logAdminAction($pdo, 'login', 'users', (int)$u['id'], ['email' => $email, 'role' => $u['role']]);
                $role = $u['role'];
                $map = adminPermissionsMap();
                $perms = $map[$role] ?? [];
                jsonOut([
                    "success" => true,
                    "nom" => $u['nom'],
                    "role" => $role,
                    "permissions" => $perms,
                    "csrf" => $csrf
                ]);
            }
            logAdminAction($pdo, 'login_failed', 'users', null, ['email' => $email]);
            jsonOut(["error" => "Identifiants invalides"], 401);
            break;
        case 'admin_me':

            if (empty($_SESSION['admin_id'])) { jsonOut(["authenticated" => false], 401); }
            $role = adminRole();
            $map = adminPermissionsMap();
            jsonOut([
                "authenticated" => true,
                "nom" => $_SESSION['admin_nom'] ?? '',
                "role" => $role,
                "permissions" => $map[$role] ?? [],
                "csrf" => adminIssueCsrf()
            ]);
            break;
        case 'admin_logout':

                logAdminAction($pdo, 'logout', 'users', isset($_SESSION['admin_id']) ? (int)$_SESSION['admin_id'] : null, null);
                $_SESSION = [];
                if (ini_get("session.use_cookies")) { $p = session_get_cookie_params(); setcookie(session_name(), '', time() - 42000, $p["path"], $p["domain"], $p["secure"], $p["httponly"]); }
                session_destroy();
                echo json_encode(["success" => true]);
                break;


            // ═══════════════════════════════════════════════════════════
            // QACIDATES (table qacidates)
            // ═══════════════════════════════════════════════════════════
            break;
        case 'admin_tables':

            requireAdmin(false);
            $all = [
                "artistes", "chansons", "emissions", "emission_invites", "interviews",
                "dedicaces", "commentaires", "contacts", "bouqalla", "qacidates", "users"
            ];
            $visible = [];
            foreach ($all as $tb) {
                $need = permissionForTableAction($tb, 'read');
                if ($tb === 'users') $need = 'users.manage';
                if (adminHasPermission($need) || adminHasPermission('*')) $visible[] = $tb;
                elseif ($tb === 'contacts' && adminHasPermission('contacts')) $visible[] = $tb;
                elseif (in_array($tb, ['dedicaces','commentaires'], true) && adminHasPermission('moderate')) $visible[] = $tb;
            }
            jsonOut([
                "tables" => $visible,
                "role" => adminRole(),
                "permissions" => adminPermissionsMap()[adminRole()] ?? []
            ]);
            break;
        case 'admin_get':

            // Liste paginée admin d'une table
            $table = preg_replace('/[^a-z0-9_]/', '', strtolower((string)($_GET['table'] ?? '')));
            if ($table === 'users') requirePermission('users.manage');
            else requireTablePermission($table ?: 'artistes', 'read');

            $allowed = [
                'artistes','chansons','emissions','emission_invites','interviews',
                'dedicaces','commentaires','contacts','bouqalla','qacidates','users'
            ];
            if (!in_array($table, $allowed, true)) {
                jsonOut(["error" => "Table non autorisée"], 400);
            }
            $id = intval($_GET['id'] ?? 0);
            if ($id > 0) {
                $st = $pdo->prepare("SELECT * FROM `$table` WHERE id = ? LIMIT 1");
                $st->execute([$id]);
                $row = $st->fetch(PDO::FETCH_ASSOC);
                if (!$row) jsonOut(["error" => "Introuvable"], 404);
                // ne jamais renvoyer le hash password
                if ($table === 'users' && isset($row['password'])) unset($row['password']);
                jsonOut($row);
            }
            $page = max(1, intval($_GET['page'] ?? 1));
            $lim = min(100, max(1, intval($_GET['limit'] ?? 20)));
            $off = ($page - 1) * $lim;
            $status = preg_replace('/[^a-z_]/', '', strtolower((string)($_GET['status'] ?? '')));
            $qsearch = trim((string)($_GET['q'] ?? ''));

            $where = [];
            $params = [];
            if ($status !== '' && in_array($table, ['chansons','emissions','interviews','dedicaces','commentaires','qacidates','artistes'], true)) {
                if ($table === 'contacts') {
                    $where[] = 'admin_status = ?';
                } else {
                    $where[] = 'status = ?';
                }
                $params[] = $status;
            }
            if ($qsearch !== '') {
                if ($table === 'artistes') { $where[] = '(nom LIKE ? OR nom_ar LIKE ?)'; $params[] = "%$qsearch%"; $params[] = "%$qsearch%"; }
                elseif ($table === 'chansons') { $where[] = '(titre LIKE ? OR titre_ar LIKE ?)'; $params[] = "%$qsearch%"; $params[] = "%$qsearch%"; }
                elseif ($table === 'emissions') { $where[] = '(titre LIKE ? OR titre_ar LIKE ? OR CAST(numero_emission AS CHAR) LIKE ?)'; $params[] = "%$qsearch%"; $params[] = "%$qsearch%"; $params[] = "%$qsearch%"; }
                elseif ($table === 'qacidates') { $where[] = '(titre LIKE ? OR titre_ar LIKE ? OR slug LIKE ? OR artiste LIKE ?)'; $params[] = "%$qsearch%"; $params[] = "%$qsearch%"; $params[] = "%$qsearch%"; $params[] = "%$qsearch%"; }
                elseif ($table === 'bouqalla') { $where[] = '(arabe LIKE ? OR francais LIKE ? OR phonetic LIKE ?)'; $params[] = "%$qsearch%"; $params[] = "%$qsearch%"; $params[] = "%$qsearch%"; }
                elseif (in_array($table, ['dedicaces','commentaires','contacts'], true)) { $where[] = '(nom LIKE ? OR message LIKE ? OR description LIKE ?)'; $params[] = "%$qsearch%"; $params[] = "%$qsearch%"; $params[] = "%$qsearch%"; }
            }
            $sqlWhere = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
            $cst = $pdo->prepare("SELECT COUNT(*) FROM `$table` $sqlWhere");
            $cst->execute($params);
            $total = (int)$cst->fetchColumn();
            $st = $pdo->prepare("SELECT * FROM `$table` $sqlWhere ORDER BY id DESC LIMIT $lim OFFSET $off");
            $st->execute($params);
            $rows = $st->fetchAll(PDO::FETCH_ASSOC);
            if ($table === 'users') {
                foreach ($rows as &$r) { unset($r['password']); }
                unset($r);
            }
            jsonOut([
                "data" => $rows,
                "total" => $total,
                "page" => $page,
                "limit" => $lim,
                "pages" => $lim ? (int)ceil($total / $lim) : 1
            ]);
            break;
        case 'admin_save':

            // Création / mise à jour (POST JSON)
            requireAdmin(true);
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') { jsonOut(["error" => "POST requis"], 405); }
            $data = json_decode(readBody(), true);
            if (!is_array($data)) { jsonOut(["error" => "JSON invalide"], 400); }
            $table = preg_replace('/[^a-z0-9_]/', '', strtolower((string)($data['table'] ?? '')));
            $allowed = [
                'artistes','chansons','emissions','emission_invites','interviews',
                'dedicaces','commentaires','contacts','bouqalla','qacidates'
            ];
            if (!in_array($table, $allowed, true)) {
                jsonOut(["error" => "Table non autorisée"], 400);
            }
            requireTablePermission($table, 'write');
            $id = intval($data['id'] ?? 0);
            unset($data['table'], $data['id']);
            // champs interdits
            unset($data['password']);
            if (!$data) { jsonOut(["error" => "Aucun champ"], 400); }

            // whitelist colonnes existantes
            $colsStmt = $pdo->query("SHOW COLUMNS FROM `$table`");
            $cols = [];
            foreach ($colsStmt->fetchAll(PDO::FETCH_ASSOC) as $c) {
                if ($c['Field'] === 'id') continue;
                $cols[] = $c['Field'];
            }
            $fields = [];
            $values = [];
            foreach ($data as $k => $v) {
                $k = preg_replace('/[^a-z0-9_]/', '', strtolower((string)$k));
                if (!in_array($k, $cols, true)) continue;
                if (is_array($v) || is_object($v)) $v = json_encode($v, JSON_UNESCAPED_UNICODE);
                $fields[] = $k;
                $values[] = $v;
            }
            if (!$fields) { jsonOut(["error" => "Aucun champ valide"], 400); }

            if ($id > 0) {
                $sets = implode(', ', array_map(function ($f) { return "`$f` = ?"; }, $fields));
                if (in_array('updated_at', $cols, true) && !in_array('updated_at', $fields, true)) {
                    $sets .= ', updated_at = NOW()';
                }
                $sql = "UPDATE `$table` SET $sets WHERE id = ?";
                $values[] = $id;
                $st = $pdo->prepare($sql);
                $ok = $st->execute($values);
                if ($ok) logAdminAction($pdo, 'update', $table, $id, ['fields' => $fields]);
                jsonOut(["success" => (bool)$ok, "id" => $id, "action" => "update"]);
            } else {
                $ph = implode(', ', array_fill(0, count($fields), '?'));
                $flist = implode(', ', array_map(function ($f) { return "`$f`"; }, $fields));
                $sql = "INSERT INTO `$table` ($flist) VALUES ($ph)";
                $st = $pdo->prepare($sql);
                $ok = $st->execute($values);
                $newId = (int)$pdo->lastInsertId();
                if ($ok) logAdminAction($pdo, 'insert', $table, $newId, ['fields' => $fields]);
                jsonOut(["success" => (bool)$ok, "id" => $newId, "action" => "insert"]);
            }
            break;
        case 'admin_delete':

            requireAdmin(true);
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') { jsonOut(["error" => "POST requis"], 405); }
            $data = json_decode(readBody(), true);
            $table = preg_replace('/[^a-z0-9_]/', '', strtolower((string)($data['table'] ?? '')));
            $id = intval($data['id'] ?? 0);
            $soft = !empty($data['soft']);
            $allowed = [
                'artistes','chansons','emissions','emission_invites','interviews',
                'dedicaces','commentaires','contacts','bouqalla','qacidates'
            ];
            if (!in_array($table, $allowed, true) || $id <= 0) {
                jsonOut(["error" => "Paramètres invalides"], 400);
            }
            requireTablePermission($table, 'delete');
            if ($soft) {
                // soft delete si colonnes disponibles
                $cols = array_column($pdo->query("SHOW COLUMNS FROM `$table`")->fetchAll(PDO::FETCH_ASSOC), 'Field');
                if (in_array('is_deleted', $cols, true)) {
                    $ok = $pdo->prepare("UPDATE `$table` SET is_deleted = 1 WHERE id = ?")->execute([$id]);
                } elseif (in_array('status', $cols, true)) {
                    $ok = $pdo->prepare("UPDATE `$table` SET status = 'deleted' WHERE id = ?")->execute([$id]);
                } else {
                    $ok = $pdo->prepare("DELETE FROM `$table` WHERE id = ?")->execute([$id]);
                }
            } else {
                $ok = $pdo->prepare("DELETE FROM `$table` WHERE id = ?")->execute([$id]);
            }
            if ($ok) logAdminAction($pdo, $soft ? 'soft_delete' : 'delete', $table, $id, null);
            jsonOut(["success" => (bool)$ok, "id" => $id]);
            break;
        case 'admin_logs':

            requirePermission('logs.read');
            $page = max(1, intval($_GET['page'] ?? 1));
            $lim = min(100, max(1, intval($_GET['limit'] ?? 50)));
            $off = ($page - 1) * $lim;
            $actionFilter = preg_replace('/[^a-z0-9_]/', '', strtolower((string)($_GET['action_filter'] ?? '')));
            $tableFilter = preg_replace('/[^a-z0-9_]/', '', strtolower((string)($_GET['table'] ?? '')));
            $where = [];
            $params = [];
            if ($actionFilter !== '') { $where[] = 'action = ?'; $params[] = $actionFilter; }
            if ($tableFilter !== '') { $where[] = 'table_name = ?'; $params[] = $tableFilter; }
            $sqlWhere = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
            try {
                $cst = $pdo->prepare("SELECT COUNT(*) FROM admin_logs $sqlWhere");
                $cst->execute($params);
                $total = (int)$cst->fetchColumn();
                $st = $pdo->prepare("SELECT id, admin_id, admin_nom, action, table_name, record_id, details, ip, created_at
                                     FROM admin_logs $sqlWhere ORDER BY id DESC LIMIT $lim OFFSET $off");
                $st->execute($params);
                $rows = $st->fetchAll(PDO::FETCH_ASSOC);
                foreach ($rows as &$row) {
                    if (!empty($row['details']) && is_string($row['details'])) {
                        $d = json_decode($row['details'], true);
                        if (json_last_error() === JSON_ERROR_NONE) $row['details'] = $d;
                    }
                }
                unset($row);
                jsonOut(["data" => $rows, "total" => $total, "page" => $page, "limit" => $lim]);
            } catch (Exception $e) {
                jsonOut(["data" => [], "total" => 0, "page" => $page, "limit" => $lim, "hint" => "Importer sql/admin_logs.sql"]);
            }
            break;
        default:
            return false;
    }
    return true;
}
