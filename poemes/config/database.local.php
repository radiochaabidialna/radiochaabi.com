<?php
/**
 * poemes/config/database.local.php
 *
 * Les identifiants BIO sont pris automatiquement depuis
 *   ../config/database.local.php  (site principal — base chaabi_music_v7_bilingue)
 * Les identifiants QAC depuis
 *   ../config/qacidates.local.php  si présent
 *
 * Ici tu peux FORCER les noms de bases chez l'hébergeur (préfixes cPanel).
 * Laisse user/pass vides ou omis pour hériter du site principal.
 */
return [
    'host' => 'localhost',

    /* Noms exacts chez BONOHOST (vérifie dans phpMyAdmin) */
    'name_qac' => 'chaabi_music_qacidats',              // ou chaabi_music_qacidats
    'name_bio' => 'chaabi_music_v7_bilingue',        // SANS préfixe si c'est le vrai nom
    // Si chez toi c'est préfixé : 'webchaab_chaabi_music_v7_bilingue',
    'name_glo' => 'chaabi_music_qacidats',

    /*
     * Ne mets user/pass ICI que si tu ne veux PAS utiliser
     * config/database.local.php du site pour les bios.
     *
     * Sinon commente-les : le module lira le site principal.
     */
    // 'user' => 'webchaab_qacidates',
    // 'pass' => '***',

    /* Forcer un compte bio différent (rare) :
    'user_bio' => 'user_qui_lit_v7',
    'pass_bio' => '***',
    */

    'charset' => 'utf8mb4',
];
