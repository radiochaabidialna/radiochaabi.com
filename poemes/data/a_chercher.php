<?php
/**
 * Outil (CLI) : liste les qacidates SANS audio et SANS biographie,
 * pour préparer une recherche manuelle des correspondances.
 *   php data/a_chercher.php
 */
declare(strict_types=1);

/* Fichier interne : appelé directement, il répond 404 au lieu de s'exécuter. */
if (isset($_SERVER['SCRIPT_FILENAME'])
    && realpath((string) $_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    exit('Not found');
}

if (PHP_SAPI !== 'cli') { http_response_code(404); exit('CLI only'); }
require_once dirname(__DIR__) . '/_core.php';

$line = str_repeat('─', 96);

/* ── 1. bios des interprètes ── */
$f = get_facets();
echo "\n$line\nBIOGRAPHIES DES INTERPRÈTES\n$line\n";
$sans = [];
foreach ($f['interpretes'] as $i) {
    $b = get_biographie($i['nom']);
    printf("   %-46s %s\n", $i['nom'], $b ? '✓ ' . mb_strlen((string) $b['bio']) . ' car.' : '✗ MANQUANTE');
    if (!$b) $sans[] = $i['nom'];
}
echo "\n   → sans biographie : " . ($sans ? implode(' | ', $sans) : 'aucun') . "\n";

/* ── 2. qacidates sans audio ── */
$rows = db()->query(
    "SELECT q.`id`, q.`titre`, q.`titre_ar`, q.`auteur`, q.`interprete`, q.`slug`
       FROM `qacidates` q
      WHERE q.`is_deleted` = 0 AND (q.`audio` IS NULL OR q.`audio` = '')
   ORDER BY q.`interprete`, q.`titre`"
)->fetchAll();

echo "\n$line\nQACIDATES SANS AUDIO : " . count($rows) . " (fichiers à trouver dans /music/audio_chaabi)\n$line\n";
printf("   %-3s %-34s %-30s %s\n", 'id', 'titre', 'auteur', 'interprète');
foreach ($rows as $r) {
    printf("   %-3s %-34s %-30s %s\n",
        $r['id'], mb_substr((string) $r['titre'], 0, 33),
        mb_substr((string) $r['auteur'], 0, 29), (string) $r['interprete']);
}

echo "\n   (pour mémoire — DÉJÀ pourvues :)\n";
$ok = db()->query(
    "SELECT q.`id`, q.`titre`, q.`audio`, q.`duree` FROM `qacidates` q
      WHERE q.`is_deleted` = 0 AND q.`audio` IS NOT NULL AND q.`audio` <> '' ORDER BY q.`id`"
)->fetchAll();
foreach ($ok as $r) {
    printf("   %-3s %-34s %-8s %s\n", $r['id'], mb_substr((string) $r['titre'], 0, 33), (string) $r['duree'],
        str_replace('/music/audio_chaabi/', '', (string) $r['audio']));
}
echo "\n";
