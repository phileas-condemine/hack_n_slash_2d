# ⛩ Arcane Rift — Roguelite Hack-and-Slash 2D

Un shinobi voyage à travers **six ères** — de l'âge de pierre à l'ère cyber — armé de son sabre et de son arc.
Jeu de plateforme / hack-and-slash roguelite, 100% JavaScript vanilla + Canvas, jouable dans le navigateur, sans dépendance ni build.

## Stack technique

- **100% JavaScript vanilla (ES6+)**, aucune dépendance, aucun bundler ni transpileur — les fichiers `src/*.js` sont chargés directement par `index.html` via des balises `<script>` classiques, dans un ordre précis (chaque fichier accroche son module sur l'espace de noms global `window.AR`).
- **Rendu** : Canvas 2D (`CanvasRenderingContext2D`) — sprites, particules, HUD et menus sont tous dessinés à la main sur un canvas en résolution fixe (1280×720), mis à l'échelle en letterbox pour s'adapter à la fenêtre.
- **Audio synthétisé** : Web Audio API (`AudioContext`) — tous les sons/musiques sont générés à la volée en code (oscillateurs, enveloppes), sans le moindre fichier audio à charger.
- **Contrôles** : clavier + souris (WASD/ZQSD, clics) pour PC, et Pointer Events API pour les contrôles tactiles sur mobile (sticks virtuels, boutons) — voir `src/input.js` / `src/touch.js`.
- **Capture** : `HTMLCanvasElement.captureStream()` + `MediaRecorder` pour l'enregistrement vidéo WebM, `canvas.toBlob()` pour les captures PNG.
- **Sauvegarde** : `localStorage` (parties sauvegardées, réglages, difficulté).
- **Outillage offline** : un script Python (`tools/build_sprite_meta.py`, dépendance Pillow) précalcule les métadonnées de sprites (détourage, boîtes de découpe) et génère `src/sprites_meta.js` — exécuté ponctuellement lors de l'ajout d'assets, jamais au runtime.
- **Déploiement** : site statique servi tel quel par GitHub Pages, sans étape de build.

## Lancer le jeu

```bash
# depuis la racine du projet (au choix)
python tools/dev_server.py       # recommandé : active aussi le journal de combat local (voir plus bas)
# ou
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
| Exporter le journal de combat (.jsonl) | L |

La jauge au-dessus du héros montre la **charge** de l'arme ; à pleine charge, l'encadré clignote et un halo apparaît.

## Systèmes de jeu

- **6 ères procédurales** (palette, météo, parallaxe, bestiaire et boss dédiés), marchand, coffres, élites, arène illustrée propre à chaque boss de fin d'ère, choix de faille entre les mondes, NG+.
- **36 ennemis, 9 comportements** : mêlée, brute, tireur, artillerie, invocateur, assassin téléporteur, porte-bouclier, charge, volant.
- **Combat réactif** :
  - les porte-boucliers **bloquent les flèches** (« BLOQUÉ ») et protègent les alliés derrière eux ;
  - les duellistes rapides **parent les projectiles** d'un coup bien synchronisé — et le héros peut en faire autant d'un coup de sabre ;
  - **tir ami** : tout projectile blesse ce qu'il touche, allié comme ennemi — les tireurs se repositionnent pour éviter leurs propres rangs ;
  - un monstre attaqué **traque son agresseur** ; les tireurs esquivent d'un bond et ripostent.
- **3 difficultés** : Normal, Difficile (esquives, dashs, parades fréquentes, or/XP -20%), Cauchemar (téléportation télégraphiée, double saut, or/XP -35%).
- **Progression** : XP, bonus cumulatif de 1 % aux attributs principaux par niveau, arbre de 16 compétences en 4 voies (coûts progressifs de 1 à 4 points par rang), 4 sorts illustrés, 6 crans d'armes, reliques, potions.
- **Tours à coffres** : plateformes exigeantes (double saut, dash, Frappe éclair), souvent à grimper de droite à gauche — butin garanti au sommet.
- **Mode démo** : l'IA joue seule (déplacements, combats, achats, choix de faille), adapte son arsenal aux boucliers et contourne les combats trop coûteux ; accélérable ×2/×4/×8 — idéal pour tester l'équilibrage.
- **Capture** : enregistrement WebM du canvas et captures PNG intégrés.
- **Journal de combat** : chaque run journalise déplacements (pouls toutes les secondes), sauts/dash, attaques, dégâts infligés/subis, morts et patterns de boss dans `AR.EventLog` (`.jsonl`, une entrée par ligne). En local, si le jeu est lancé via `python tools/dev_server.py`, les entrées sont envoyées par lots à ce serveur qui les écrit directement dans `logs/combat-log-<horodatage>.jsonl` (dossier ignoré par git) — aucune boîte de dialogue. Sur le site déployé (GitHub Pages) ou si ce serveur n'est pas utilisé, repli automatique sur un téléchargement classique à la mort/victoire/abandon (touche L pour un export manuel), avec filet de sécurité `localStorage`.

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
  eventlog.js       journal de combat (déplacements, attaques, dégâts, morts) exporté en .jsonl
  game.js           orchestrateur (états, boucle fixe, économie)
  ...               moteur (assets, input, audio synthétisé, particules, HUD, UI)
tools/
  build_sprite_meta.py   détourage/redimensionnement des assets + boîtes de découpe
  dev_server.py          serveur de dev local (fichiers statiques + écriture du journal de combat dans logs/)
  map_export.html        export PNG des 6 cartes (terrain + coffres/marchand/salles/zone de boss), à ouvrir dans un navigateur
assets/             sprites (héros, 36 ennemis + états, icônes de sorts, planches)
```

Après tout ajout d'image dans `assets/`, relancer :

```bash
python tools/build_sprite_meta.py
```
