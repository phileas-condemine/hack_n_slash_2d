# ⛩ Arcane Rift — Roguelite Hack-and-Slash 2D

Un shinobi voyage à travers **six ères** — de l'âge de pierre à l'ère cyber — armé de son sabre et de son arc.
Jeu de plateforme / hack-and-slash roguelite, 100% JavaScript vanilla + Canvas, jouable dans le navigateur, sans dépendance ni build.

## Lancer le jeu

```bash
# depuis la racine du projet (au choix)
python -m http.server 8123
# ou
npx serve .
```

Puis ouvrir <http://localhost:8123>. L'ouverture directe de `index.html` (file://) fonctionne aussi,
mais l'enregistrement vidéo et les captures nécessitent un serveur http.

### Déploiement GitHub Pages

Settings → Pages → *Deploy from a branch* → branche `master`, dossier `/ (root)`. C'est tout : le jeu est statique.

## Contrôles

| Action | Touche |
|---|---|
| Déplacements | ZQSD / WASD / Flèches |
| Saut / double saut | Espace (ou ↑) |
| Dash (appui bref) / Sprint (maintien) | Maj |
| Sabre : coup rapide / **frappe chargée** | Clic gauche (tap / maintenir puis relâcher) |
| Arc : tir rapide / **tir perçant chargé** | Clic droit (tap / maintenir puis relâcher) |
| Sorts (à débloquer) | 1 · 2 · 3 · 4 |
| Interagir (coffre, marchand, portail) | E |
| Potion | F |
| Arbre de compétences | T |
| Pause | Échap |
| Mode démo (IA) / vitesse ×1-×8 | G / + et − |
| Enregistrer une vidéo WebM / capture PNG | R / C |
| Couper le son | M |

La jauge au-dessus du héros montre la **charge** de l'arme ; à pleine charge, l'encadré clignote et un halo apparaît.

## Systèmes de jeu

- **6 ères procédurales** (palette, météo, parallaxe, bestiaire et boss dédiés), marchand, coffres, élites, boss de fin d'ère, choix de faille entre les mondes, NG+.
- **36 ennemis, 9 comportements** : mêlée, brute, tireur, artillerie, invocateur, assassin téléporteur, porte-bouclier, charge, volant.
- **Combat réactif** :
  - les porte-boucliers **bloquent les flèches** (« BLOQUÉ ») et protègent les alliés derrière eux ;
  - les duellistes rapides **parent les projectiles** d'un coup bien synchronisé — et le héros peut en faire autant d'un coup de sabre ;
  - **tir ami** : tout projectile blesse ce qu'il touche, allié comme ennemi — les tireurs se repositionnent pour éviter leurs propres rangs ;
  - un monstre attaqué **traque son agresseur** ; les tireurs esquivent d'un bond et ripostent.
- **3 difficultés** : Normal, Difficile (esquives, dashs, parades fréquentes, or/XP -20%), Cauchemar (téléportation télégraphiée, double saut, or/XP -35%).
- **Progression** : XP, arbre de 16 compétences en 4 voies, 4 sorts illustrés, 6 crans d'armes, reliques, potions.
- **Tours à coffres** : plateformes exigeantes (double saut, dash, Frappe éclair), souvent à grimper de droite à gauche — butin garanti au sommet.
- **Mode démo** : l'IA joue seule (déplacements, combats, achats, choix de faille), accélérable ×2/×4/×8 — idéal pour tester l'équilibrage.
- **Capture** : enregistrement WebM du canvas et captures PNG intégrés.

## Structure

```
index.html          charge les scripts dans l'ordre (pas de bundler)
src/
  config.js         constantes & équilibrage joueur
  data.js           ères, ennemis, boss, compétences, sorts, difficultés
  level.js          génération procédurale, collisions, parallaxe
  enemy.js          IA des monstres + boss à phases
  player.js         héros : déplacements, armes chargées, sorts
  demoai.js         IA du mode démo
  game.js           orchestrateur (états, boucle fixe, économie)
  ...               moteur (assets, input, audio synthétisé, particules, HUD, UI)
tools/
  build_sprite_meta.py   détourage/redimensionnement des assets + boîtes de découpe
assets/             sprites (héros, 36 ennemis + états, icônes de sorts, planches)
```

Après tout ajout d'image dans `assets/`, relancer :

```bash
python tools/build_sprite_meta.py
```
