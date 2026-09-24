<?php
/**
 * Emails admin : dédicaces, commentaires, contacts
 * Laisse CHANGEZ-MOI pour désactiver les envois.
 * Ou configure SMTP (Gmail, OVH, etc.)
 */
return [
    'email' => 'CHANGEZ-MOI@exemple.com',
    'from'  => 'Chaabi Music <no-reply@chaabi.dz>',
    'smtp'  => [
        'host'   => '',      // ex: ssl0.ovh.net ou smtp.gmail.com
        'port'   => 587,
        'user'   => '',
        'pass'   => '',
        'secure' => 'tls',   // tls | ssl
    ],
];
