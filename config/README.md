# Configuration Radio Chaabi

## Fichiers
| Fichier | Rôle |
|---------|------|
| `bootstrap.php` | Charge tout (à require depuis l’API / admin) |
| `database.local.php` | Host, base, user, pass MySQL |
| `mail.local.php` | Email notifications + SMTP |
| `app.local.php` | Options (secret import, env) |

## Production
Préférer les variables d’environnement :
- `CHAABI_DB_HOST`, `CHAABI_DB_NAME`, `CHAABI_DB_USER`, `CHAABI_DB_PASS`
- `CHAABI_MAIL_TO`, `CHAABI_MAIL_FROM`, `CHAABI_SMTP_*`

## Sécurité
Le dossier `config/` est protégé par `.htaccess` (pas d’accès HTTP direct).
