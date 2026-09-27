<?php
/**
 * Modèle de configuration — MODULE POÈMES
 * ---------------------------------------------------------------
 * À COPIER vers « database.local.php » (même dossier) sur le serveur,
 * puis remplir avec les identifiants RÉELS de production.
 *
 * Ce fichier « .local.php » n'est JAMAIS à publier dans un dépôt,
 * ni à partager : il contient des mots de passe.
 * Le dossier est de toute façon protégé par un .htaccess
 * (« Require all denied »).
 *
 * Si « database.local.php » est absent, le module retombe sur ses
 * valeurs de développement locales.
 */
return [
    /* Serveur MySQL (souvent « localhost » chez l'hébergeur) */
    'host' => 'localhost',

    /* Identifiants de la base */
    'user' => 'root',
    'pass' => 'root',

    /* Nom des trois bases utilisées par le module */
    'name_qac' => 'chaabi_music_qacidats',      // base principale (poèmes) — lecture
    'name_bio' => 'chaabi_music_v7_bilingue',   // biographies + SEO      — lecture
    'name_glo' => 'chaabi_music_qacidats',                  // glossaire              — lecture

    /* Encodage : ne pas changer */
    'charset' => 'utf8mb4',
];
