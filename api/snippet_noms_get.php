<?php
// À coller dans api/qacidates_api.php — action=get
// Après avoir chargé la qacidate ($row) et les sections :

$noms = [];
try {
    $stN = $pdo->prepare(
        'SELECT emoji, nom_fr, nom_ar, description_fr, description_ar, ordre
         FROM qacidate_noms
         WHERE qacidate_id = ?
         ORDER BY ordre ASC, id ASC'
    );
    $stN->execute([(int)$row['id']]);
    $noms = $stN->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable $e) {
    $noms = [];
}

// Dans le JSON de réponse :
// 'noms' => $noms,
