# À compléter — état du répertoire (22/09/2026)

Généré par `php data/rapport.php` (outil livré avec le module, relançable à tout moment).

---

## 1. Qacidates qui n'ont pas les deux versions (arabe + français)

**6 qacidates · 16 chants concernés.** Dans tous les cas, **l'arabe existe sous forme de manuscrit scanné** — il n'a simplement pas été saisi en texte. Pour trois chants, **le français manque aussi**.

| id | slug | Titre | Chants | AR | FR |
|---|---|---|---|---|---|
| 21 | `hikma` | Ma Tdoum El Hikma | 6 | manuscrit (6) | ✅ présent |
| 10 | `hadjoulafkar` | Hadjou Lafkar | 3 | manuscrit (3) | ✅ présent |
| 41 | `koulou` | KOULOU LILAIMEN | 2 | manuscrit (2) | ❌ **manquant (2)** |
| 13 | `adrouni` | Yahali Aadrouni | 2 | manuscrit (2) | ✅ présent |
| 40 | `malwatni` | MAL WATNI | 2 | manuscrit (2) | ✅ présent |
| 38 | `qomtara` | KOOM TARA | 1 | manuscrit (1) | ❌ **manquant (1)** |

### Détail chant par chant

| Qacidate | Chant | Libellé | Ce qui manque |
|---|---|---|---|
| `hadjoulafkar` | 1 | Première Partie | AR = manuscrit |
| `hadjoulafkar` | 2 | Deuxième Partie | AR = manuscrit |
| `hadjoulafkar` | 3 | Troisième Partie (Finale) | AR = manuscrit |
| `adrouni` | 1 | Première Partie | AR = manuscrit |
| `adrouni` | 2 | Deuxième Partie | AR = manuscrit |
| `hikma` | 1 | Le Passé & la Trahison | AR = manuscrit |
| `hikma` | 2 | La Trahison de l'Ami | AR = manuscrit |
| `hikma` | 3 | La Prière & la Justice | AR = manuscrit |
| `hikma` | 4 | Le Bonheur Perdu | AR = manuscrit |
| `hikma` | 5 | L'Abandon & la Souffrance | AR = manuscrit |
| `hikma` | 6 | La Sagesse Finale | AR = manuscrit |
| `qomtara` | 1 | Version Arabe | AR = manuscrit · **FR manquant** |
| `malwatni` | 1 | Partie 1 | AR = manuscrit |
| `malwatni` | 2 | Partie 2 | AR = manuscrit |
| `koulou` | 1 | Partie 1 | AR = manuscrit · **FR manquant** |
| `koulou` | 2 | Partie 2 | AR = manuscrit · **FR manquant** |

> **Rappel de la règle** : quand `contenu_ar` est vide, c'est le **manuscrit scanné** qui est affiché dans la colonne arabe (et la traduction française, si présente, reste affichée à gauche). Les 6 qacidates ci-dessus suivent donc la règle — elles ne sont « incomplètes » que si l'on veut **le texte arabe saisi**.

**Priorité** : `koulou` et `qomtara` (les seuls où **le français manque aussi**).
**Piste** : je peux lancer un **OCR** sur les 9 manuscrits concernés pour proposer un brouillon de saisie arabe.

---

## 2. Interprètes sans biographie

✅ **Aucun.** Les **8 interprètes** du répertoire ont tous une biographie (6 issues de `chaabi_music_v7_bilingue.artistes`, 1 de `webchaabi.biographies`, 1 notice documentaire) :

`Cheikh El Hadj M'Hamed El Anka` · `El Hachemi Guerouâbi` · `Amar Ezzahi` · `El Hadj M'rizeq` · `Reda Doumaz` · `Cheikh Hsissen` · `El Hadj Mahfoud` · `Amar Ezzahi, El Hachemi Guerouâbi & Cheikh El Hadj M'Hamed El Anka`

> `El Hadj Mahfoud` : sa fiche dans `chaabi_music_v7_bilingue` ne contient que « À compléter », et il est absent de `webchaabi.biographies`. **C'est le seul interprète pour lequel une biographie reste à trouver.**

---

## 3. Auteurs (poètes) sans notice — **27 sur 42**

Ce sont ces notices qu'il faut chercher. Si elles existent dans `chaabi_music_v7_bilingue.artistes` ou `webchaabi.biographies`, elles seront reprises **automatiquement**. Sinon, une entrée dans `data/notices_auteurs.php` suffit.

| Auteur | Qacidates |
|---|---|
| `Cheikh Driss Ben Ahmed Ben Ali El Alami El Makhzoumi` | 1 |
| `Cheikh Mohamed Ben Slimane` | 1 |
| `Cheikh Mohamed En-Nedjar` | 1 |
| `Cheikh Mohamed Lahlo` | 1 |
| `Cheikh Ahmed El Ghorabli` | 1 |
| `Cheikh Abdelhadi Laâmiri` | 1 |
| `Cheikh Abdellah Rissouli` | 1 |
| `Cheikh Allal El Kahlili (Bouaqlin)` | 1 |
| `Cheikh el Djilâli` | 1 |
| `Cheikh el-Hâdj Ben Qoraïchi` | 1 |
| `Ibn Anissa` | 1 |
| `Ben çoghir el-sûri` | 1 |
| `Sidi Qaddour el Alami` | 1 |
| `Sidi el-Madani el-Torkmani` | 1 |
| `Abdelkader Qasr Edjdidi` | 1 |
| `el-Hâdj FaDDûl el-Mernissi` | 1 |
| `Mohammed Cherchâli` | 1 |
| `Moçtefa Tûmi` | 1 |
| `Hadj El Anka dit Mohammed Lahlou` | 1 |
| `Traditionnel` | 3 |
| `Traditionnel / Cheikh Anka` | 1 |
| `Répertoire populaire` | 1 |

*(Les entrées génériques — `Traditionnel`, `Répertoire populaire` — n'ont pas de notice à chercher : ce sont des mentions d'anonymat.)*

### Déjà documentés ✅ (8)
`Lakhdar Ben Khlouf` · `Mohamed Benmsaib` · `Cheikh Mohamed Ben Debbah` · `Mohamed Ben Sahla` · `Cheikh Moustafa Ben Lekbabti` · `Cheikh Mohamed Ben Ismail` · `Cheikh Kouider Ben Ben Ismaïl` · `Belkacem Ould Said`

---

## 4. Doublons dans le champ `auteur` (à fusionner) ⚠️

Le même poète apparaît sous deux orthographes, ce qui **scinde sa page** en deux :

| Graphie A | Graphie B | Qacidates |
|---|---|---|
| `Hâchemi Guerouâbi` (6) | `El Hachemi Guerouâbi` (1) | 7 |
| `Cheikh Mohamed Ben Slimane` | `Mohamed Ben Slimane` | 2 |
| `Embârek Essoussi` | `M'barek Es-Soussi` | 2 |
| `Cheikh Mohammed Ben Ali Ould Erzine` | `Mohammed Ben Ali Ould Errzine` | 2 |

Les fusionner ferait passer de **42 à 38 auteurs**. Je ne l'ai pas fait automatiquement (l'attribution est sensible) — dis-moi si tu veux que je l'applique.

---

## 5. État général

| | |
|---|---|
| Qacidates | **54** |
| Sections | **194** |
| Avec audio | **22** (32 sans audio) |
| Avec durée | 22 |
| Sections à manuscrit | **24** |
| Interprètes | 8 (tous documentés) |
| Auteurs | 42 (15 documentés) |
| Thèmes | **12** |
| Glossaire | **157 termes** |

### Reste à faire côté audio (32 qacidates)
Les fichiers sont dans `F:\wamp64\www\music\audio_chaabi` (367 mp3). J'ai ajouté les 6 correspondances que j'ai pu **vérifier une par une** + celle que tu m'as indiquée. Les 32 restantes n'ont pas trouvé de correspondance fiable : il faudrait me dire, pour chacune, le fichier exact (comme tu l'as fait pour *Ma Ychali Fi Youm El Harb*).
