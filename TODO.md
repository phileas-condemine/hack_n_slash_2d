# TODO — Pistes d'amélioration

Backlog vivant des idées de gameplay/équilibrage à ne pas oublier. À mettre à jour au fil de l'eau
(cocher, préciser, ou ajouter des idées). Peut servir de base de travail pour plusieurs agents en parallèle,
chacun prenant une section indépendante.

## 🪙 Économie (or / points de compétence) — PRIORITAIRE

Constat : à R3/6, déjà 2000 or (cap ?), quasiment tous les objets achetables, la plupart des sorts
puissants (arc + magie) débloqués, et les autres compétences bien montées aussi. Le jeu devient trop
facile trop vite car l'arbre de compétences et l'amélioration d'armes sont "finis" avant la fin de la run.

- [ ] **Auditer les gains théoriques max sur une run complète (R1→fin)** :
  - Or total gagnable (kills, coffres, quêtes/évènements) — voir `src/data.js`, `src/game.js`, `src/enemy.js` (recherche `gold`)
  - Points de compétence gagnables (montées de niveau + coffres) — voir `src/player.js`, `src/hud.js`, `src/ui.js`
  - Nombre d'améliorations d'objets/armes disponibles et leur coût cumulé
  - Comparer gains max vs coût total de "tout acheter" → objectif : qu'il soit *impossible* de tout avoir en une run, pour forcer des choix de build
- [ ] Réduire l'or gagné (kills/coffres) et/ou augmenter les prix, avec un vrai delta entre "or gagnable" et "or nécessaire pour tout débloquer"
- [ ] Réduire les points de compétence gagnés par niveau et/ou par coffre — étaler le déblocage des sorts forts sur toute la durée du jeu (jusqu'à R5/R6), pas juste R2/R3
- [ ] Vérifier s'il existe un cap d'or (semble plafonné à 2000) — si oui, le cap est probablement atteint bien trop tôt ; revoir la courbe
- [ ] Envisager un vrai système de choix (arbre à embranchements exclusifs, respec payant, etc.) plutôt que "tout débloquer avec assez de temps"

## 👹 Boss

- [ ] **Boss R1** : nettoyer les plateformes de l'arène — encore des plateformes à fusionner ou supprimer (suite du travail déjà entamé, voir `src/arenas.js` / `src/level_specs.js`)
- [ ] **Boss R1** : vérifier s'il a des minions ; sinon lui en ajouter (cohérence avec les autres boss)
- [ ] **Boss R2** :
  - [ ] Bug de la pluie de flèches (~4-5 flèches) : trajectoire en parabole qui semble non voulue / mal maîtrisée. Décider : soit flèches tirées tout droit, soit garder la parabole comme attaque secondaire "fun" mais ajouter une **attaque plus puissante pour déloger les campeurs**
  - [ ] Minions corps-à-corps trop faibles en PV → leur donner plus de vie (le comportement saut + attaque sur la plateforme centrale est bon, à garder tel quel)
  - [ ] Boss globalement le moins prioritaire à retoucher (déjà satisfaisant grâce aux minions)
- [ ] **Boss R3 (Yokai)** : bon gameplay (téléportation, missiles), à garder comme référence de qualité
  - [ ] Augmenter sensiblement ses PV (actuellement trop faible, meurt trop vite)
  - [ ] Ajouter des minions pour rendre l'arène plus intéressante
- [ ] **Boss R4, R5, R6** : concevoir et ajouter des minions spécifiques à chacun (actuellement absents)
- [ ] **Boss R4, R5, R6** : concevoir une attaque spéciale distinctive pour chacun (sur le modèle boss R1 qui fonctionne bien, et boss R3/Yokai)

## 🧟 Variété des ennemis (pas seulement les boss)

Objectif : chaque type d'ennemi (pas que les boss) doit avoir une attaque/comportement caractéristique
pour enrichir l'expérience de jeu, sur le modèle de ce qui marche déjà bien.

- [ ] Référence de qualité déjà en place : Yokai (boules d'énergie flottantes, cf. attaque du boss R3)
- [ ] Idées d'ennemis à créer/affiner (voir `src/enemy.js`, `src/demoai.js`) :
  - [ ] Mammouth : charge fonceur sur le joueur
  - [ ] Ninja : téléportation sur/derrière le joueur
  - [ ] (compléter au fur et à mesure des idées)
- [ ] Faire une passe générale : lister tous les types d'ennemis actuels et vérifier lesquels n'ont encore aucune attaque/mécanique distinctive

## 🗺️ Minimap / brouillard de guerre

- [x] Ajouter une minimap donnant une vue d'ensemble de la carte explorée — implémenté dans `src/minimap.js` (`AR.Minimap`), silhouette de terrain dérivée de `level.heights` (fonctionne sur cartes authored ET procédurales)
- [x] Implémenter un brouillard de guerre : cellules grossières (4 tuiles) révélées par rayon autour du héros + salle entière révélée d'un coup sur les cartes authored ; zones jamais visitées = noir opaque
- [x] Bouton d'ouverture/fermeture pour mobile : `.tbtn-map` dans `src/touch.js`/`style.css`, dans le creux libre du HUD (à côté de pause/démo)
- [x] Bascule clavier `[N]` (`toggleMap` dans `src/config.js`) en plus du badge cliquable/bouton tactile ; badge toujours visible en bas-droite (jamais recouvert par le reste du HUD, testé à l'écran)
- [x] Corrigé : pendant un combat de boss, la carte affichait l'ancien terrain (avant l'arène) au lieu des vraies plateformes de l'arène (`src/arenas.js`), avec sol/joueur/boss décalés. La carte bascule maintenant sur les plateformes réelles de l'arène + un cadrage zoomé sur celle-ci pendant le combat (sinon l'arène, ~30 tuiles, était écrasée à quelques pixels dans un niveau qui en fait ~350). Bug du marqueur boss (position coin haut-gauche au lieu du centre) corrigé au passage.
- [x] Refonte complète du rendu terrain (v1 par blocs grossiers jugée pas assez fidèle/reconnaissable) : `src/minimap.js` pré-rend maintenant une miniature pixel-exacte de `level.grid` dans un canvas hors-écran (1px = 1 tuile, murs/grottes/plateaux compris) affichée en un seul `drawImage` à l'échelle — le brouillard de guerre est un masque plus fin (2 tuiles/cellule) appliqué par-dessus. La carte ressemble maintenant vraiment au niveau, pas à un diagramme en barres.
- [ ] Polish : icônes marchand/coffres/portail sur la carte (actuellement seuls le joueur et le boss sont marqués)
- [ ] Étendre les salles authored (`level.rooms`) aux ères R2-R6 dès qu'elles auront leurs propres `level_specs` (aujourd'hui seule `stone`/R1 en a — sur les autres ères la carte affiche quand même la silhouette de terrain + brouillard, mais sans contours de salles colorés)
- [x] Vérifié en jeu (Playwright local) : rendu correct, aucune erreur console imputable à la minimap, bascule clavier/état fonctionnelle

## 🕳️ Zones secrètes et grottes

Constat : le système existe déjà partiellement (ex. `SEC_STONE_01` mur friable + poche de grotte dans
`level_specs.js`, salle `S05_DEEP_CAVES` avec ses propres ennemis type `stone_cave_stalker` /
`stone_cave_bats`), mais c'est visiblement incomplet ou incohérent d'un niveau à l'autre.

- [ ] Faire l'inventaire par niveau (R1→R6) : lister les zones secrètes/grottes existantes dans `level_specs.js` et vérifier lesquelles sont réellement en place
- [ ] S'assurer que **chaque niveau a au moins une zone secrète/grotte**
- [ ] Vérifier pour chacune qu'on peut effectivement y entrer ET en sortir (pas de piège de level design, pas de mur friable non détruisible, pas de cul-de-sac sans retour)
- [ ] S'assurer que chaque grotte contient bien des monstres/variantes dédiés à cette zone (comme `stone_cave_stalker`/`stone_cave_bats` pour la grotte de pierre) plutôt que de réutiliser des ennemis génériques du niveau
- [ ] Cohérence avec la section "Variété des ennemis" ci-dessus : les monstres de grottes sont un bon terrain pour des comportements uniques (embuscade, vol, obscurité)

## 📋 Process

- [ ] Avant de designer l'équilibrage économie, produire un vrai tableau chiffré (or/PC/améliorations par R) — cf. section Économie ci-dessus, première étape à faire avant de toucher au code
- [ ] Tenir ce fichier à jour à chaque session : cocher les items traités, ajouter les nouvelles idées identifiées en jouant (ex. logs de combat dans `combat-log-*.jsonl`)

## Amélioration de l'IA du héro

- [ ] A la fin de l'arène de l'ère 2, le héro reste bloqué sur la plateforme juste au dessus du portail plutôt que de descendre de la plateforme.![AI Hero stuck on the platform on top of the portal](bug_ia_hero_ere_2_after_boss.png)


## Lisibilité des arènes

- [ ] Afficher les plateformes par dessus les images des arènes afin de permettre au joueur de bien comprendre où il peut sauter.

- [ ] Dans l'arène du boss 4/6 il manque 2 plateformes latérales au exterminés pour permettre d'atteindre ensuite les autres plateformes situées plus haut. L'image brute de l'arène prévoit 2 zones pour placer ces plateformes.

## Difficulté 

- [ ] Les flèches chargées du héro partent tout droit à l'infini, c'est très fort, les ennemis ne le voient même pas arriver. Il faut que les flèches même avec un arc chargé fassent une légère parabole pour finir par retomber avant le bout. Avec une bonne équation de parabole on pourrait même faire des effets pour lober les adverses en chargeant juste comme il faut. Pour cela il faut que la parabole dépende du niveau de chargement et qu'il n'y ait pas que 2 états : chargé ou par chargé, mais une proportionnalité au niveau de chargement de l'arc.

