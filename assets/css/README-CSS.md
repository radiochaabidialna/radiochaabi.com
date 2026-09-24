# CSS Radio Chaabi — prêt à uploader (pas de rebuild)

Fichiers **déjà compilés** à déployer tels quels :

| Fichier | Rôle |
|---------|------|
| `tailwind.built.css` | Utilitaires Tailwind + composants thème (généré) |
| `chaabi-core.css` | Layout, cartes, mobile |
| `chaabi-theme-layers.css` | **Priorité max** live-bar / player / contrastes par `data-theme` |
| `chaabi-icons.css` | Icônes Chaabi |

**Tu n’as PAS besoin** de lancer la commande Tailwind sur ton PC.

Ordre dans `index.html` (déjà configuré) :
1. tailwind.built.css
2. chaabi-core.css
3. chaabi-theme-layers.css
4. chaabi-icons.css

Thèmes : `html data-theme="dark|light|ios"` (script + applyTheme).
