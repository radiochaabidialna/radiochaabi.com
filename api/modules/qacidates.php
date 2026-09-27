<?php
/**
 * Chaabi API — module « qacidates »
 * Inclus uniquement via api/radiochaabi.php
 */
if (!defined('CHAABI_API')) { http_response_code(403); exit('Forbidden'); }

function chaabi_module_qacidates(PDO $pdo, string $action, int $page, int $limit, int $offset): bool {
    switch ($action) {
        case 'get_qacidates':

            if (!tableExists($pdo, 'qacidates')) {
                $seed = chaabiLoadQacidatesSeed();
                if ($seed) {
                    $rows = $seed['data'];
                    $total = count($rows);
                    $slice = array_slice($rows, $offset, $limit);
                    foreach ($slice as &$r) { unset($r['parts_json']); $r = chaabiScrubQacidateRow($r); }
                    unset($r);
                    echo json_encode([
                        'available' => true,
                        'source' => $seed['source'] ?? 'demo-json',
                        'schema' => 'legacy-seed',
                        'data' => $slice,
                        'total' => $total,
                        'page' => isset($page) ? $page : 1,
                        'limit' => $limit
                    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                    break;
                }
                jsonOut(['error' => 'Table qacidates absente', 'available' => false], 501);
            }
            // Détecter schéma v2 (colonne interprete) vs legacy (artiste / parts_json)
            $cols = [];
            try {
                $cols = $pdo->query("SHOW COLUMNS FROM qacidates")->fetchAll(PDO::FETCH_COLUMN);
            } catch (Exception $e) { $cols = []; }
            $isV2 = in_array('interprete', $cols, true);
            $where = "status = 'published'";
            if (in_array('is_deleted', $cols, true)) $where .= " AND is_deleted = 0";
            if ($isV2) {
                $q = "SELECT id, slug, titre, titre_ar, sous_titre, sous_titre_ar,
                             auteur, auteur_ar, interprete, interprete_ar,
                             theme, genre, image, thumbnail, audio, duree,
                             views, likes, status, published_at
                      FROM qacidates WHERE $where ORDER BY id ASC";
            } else {
                $order = in_array('ordre', $cols, true) ? 'ordre ASC, id ASC' : 'id ASC';
                $q = "SELECT * FROM qacidates WHERE $where ORDER BY $order";
            }
            $c = "SELECT COUNT(*) FROM qacidates WHERE $where";
            $out = getPaginatedData($pdo, $q, $c, [], $offset, $limit);
            if (is_array($out)) {
                $out['available'] = true;
                $out['source'] = 'database';
                $out['schema'] = $isV2 ? 'v2' : 'legacy';
                if (!empty($out['data']) && is_array($out['data'])) {
                    foreach ($out['data'] as &$row) {
                        // alias pour le front
                        if ($isV2 && empty($row['artiste']) && !empty($row['interprete'])) {
                            $row['artiste'] = $row['interprete'];
                            $row['artiste_ar'] = $row['interprete_ar'] ?? '';
                        }
                        $row = chaabiScrubQacidateRow($row);
                    }
                    unset($row);
                }
            }
            echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;
        case 'get_qacidate':
        case 'get_qacidate_complet':

            $id = intval($_GET['id'] ?? 0);
            $slug = preg_replace('/[^a-z0-9\-_]/', '', strtolower((string)($_GET['slug'] ?? '')));
            if ($id <= 0 && $slug === '') {
                jsonOut(["error" => "id ou slug requis"], 400);
            }
            if (!tableExists($pdo, 'qacidates')) {
                $seed = chaabiLoadQacidatesSeed();
                $row = null;
                if ($seed && !empty($seed['data'])) {
                    foreach ($seed['data'] as $r) {
                        if (($id > 0 && (int)$r['id'] === $id) || ($slug !== '' && ($r['slug'] ?? '') === $slug)) {
                            $row = $r;
                            break;
                        }
                    }
                }
                if (!$row) jsonOut(["error" => "Qacidate introuvable"], 404);
                $row['source'] = $seed['source'] ?? 'demo-json';
                $row['available'] = true;
                jsonOut($row);
            }
            $cols = [];
            try { $cols = $pdo->query("SHOW COLUMNS FROM qacidates")->fetchAll(PDO::FETCH_COLUMN); }
            catch (Exception $e) { $cols = []; }
            $isV2 = in_array('interprete', $cols, true);
            $whereExtra = in_array('is_deleted', $cols, true) ? ' AND is_deleted = 0' : '';
            if ($id > 0) {
                $st = $pdo->prepare("SELECT * FROM qacidates WHERE id = ? AND status = 'published'$whereExtra LIMIT 1");
                $st->execute([$id]);
            } else {
                $st = $pdo->prepare("SELECT * FROM qacidates WHERE slug = ? AND status = 'published'$whereExtra LIMIT 1");
                $st->execute([$slug]);
            }
            $row = $st->fetch(PDO::FETCH_ASSOC);
            if (!$row) jsonOut(["error" => "Qacidate introuvable"], 404);

            if ($isV2) {
                $row['artiste'] = $row['interprete'] ?? '';
                $row['artiste_ar'] = $row['interprete_ar'] ?? '';
                // sections
                $sections = [];
                if (tableExists($pdo, 'qacidate_sections')) {
                    $st2 = $pdo->prepare("SELECT id, numero, label_fr, label_ar, contenu_fr, contenu_ar, images, ordre
                                          FROM qacidate_sections WHERE qacidate_id = ?
                                          ORDER BY COALESCE(NULLIF(ordre,0), numero), numero, id");
                    $st2->execute([(int)$row['id']]);
                    $sections = $st2->fetchAll(PDO::FETCH_ASSOC);
                    foreach ($sections as &$sec) {
                        $cf = $sec['contenu_fr'] ?? '';
                        if (is_string($cf) && $cf !== '' && ($cf[0] === '[' || $cf[0] === '{')) {
                            $decoded = json_decode($cf, true);
                            if (json_last_error() === JSON_ERROR_NONE) $sec['contenu_fr_parsed'] = $decoded;
                        }
                        $imgs = $sec['images'] ?? null;
                        if (is_string($imgs) && $imgs !== '' && ($imgs[0] === '[')) {
                            $decoded = json_decode($imgs, true);
                            if (json_last_error() === JSON_ERROR_NONE) $sec['images'] = $decoded;
                        }
                    }
                    unset($sec);
                }
                $row['sections'] = $sections;
                // facts, noms, navigation
                if (tableExists($pdo, 'qacidate_facts')) {
                    $st3 = $pdo->prepare("SELECT * FROM qacidate_facts WHERE qacidate_id = ? ORDER BY ordre ASC, id ASC");
                    $st3->execute([(int)$row['id']]);
                    $row['facts'] = $st3->fetchAll(PDO::FETCH_ASSOC);
                } else { $row['facts'] = []; }
                if (tableExists($pdo, 'qacidate_noms')) {
                    $st4 = $pdo->prepare("SELECT * FROM qacidate_noms WHERE qacidate_id = ? ORDER BY ordre ASC, id ASC");
                    $st4->execute([(int)$row['id']]);
                    $row['noms'] = $st4->fetchAll(PDO::FETCH_ASSOC);
                } else { $row['noms'] = []; }
                if (tableExists($pdo, 'qacidate_navigation')) {
                    $st5 = $pdo->prepare("SELECT * FROM qacidate_navigation WHERE qacidate_id = ? LIMIT 1");
                    $st5->execute([(int)$row['id']]);
                    $row['navigation'] = $st5->fetch(PDO::FETCH_ASSOC) ?: null;
                } else { $row['navigation'] = null; }
                $row['schema'] = 'v2';
            } else {
                foreach (['parts_json', 'images_json'] as $jk) {
                    if (!empty($row[$jk]) && is_string($row[$jk])) {
                        $decoded = json_decode($row[$jk], true);
                        if (json_last_error() === JSON_ERROR_NONE) $row[$jk] = $decoded;
                    }
                }
                $row['schema'] = 'legacy';
            }
            $row['source'] = 'database';
            $row['available'] = true;
            $row = chaabiScrubQacidateRow($row);
            jsonOut($row);
            break;
        default:
            return false;
    }
    return true;
}
