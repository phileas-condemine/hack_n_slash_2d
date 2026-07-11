# Prérequis communs — architecture des niveaux enrichis

**Projet :** Arcane Rift / `hack_n_slash_2d`  
**Version de la spécification :** 1.0  
**Périmètre :** socle nécessaire avant l’implémentation minutieuse des six nouvelles cartes  
**Document de référence pour :** `01` à `06`

---

## 1. Objectif

Faire évoluer les niveaux actuels, principalement constitués d’une heightmap linéaire procédurale, vers des cartes semi-authored comportant :

- un chemin principal lisible ;
- une ou deux branches secondaires ;
- une boucle réelle ;
- des sous-zones verticales ;
- des secrets ;
- des encounters verrouillés ;
- une zone de respiration ;
- une antichambre ;
- une arène de boss dédiée utilisant une image générée ;
- suffisamment de métadonnées pour que le mode démo IA puisse parcourir le niveau sans triche.

Le moteur doit rester :

- 100 % JavaScript vanilla + Canvas ;
- sans bundler ;
- déterministe à seed identique ;
- compatible GitHub Pages ;
- compatible avec les systèmes existants : ennemis, boss, coffres, marchand, NG+, capture vidéo et mode démo.

---

## 2. État actuel à préserver

Le dépôt possède déjà les contrats utiles suivants :

- `AR.ERAS` décrit les palettes, props, pools d’ennemis, élites et boss ;
- `AR.ENEMIES` et `AR.BOSSES` décrivent les statistiques et comportements ;
- `AR.Level` expose notamment `heights`, `platforms`, `spawns`, `chestSpots`, `merchantX`, `bossX`, `arenaStartTx`, `arenaGy`, `gateTx`, `spawnX` ;
- `Game.loadLevel()` transforme les spawns du niveau en instances d’ennemis et crée marchand/coffres ;
- le joueur dispose déjà du saut, double saut, dash aérien, sprint et passage à travers les plateformes one-way ;
- le mode démo sait déjà piloter les entrées du joueur et franchir des plateformes simples ;
- l’arène de boss actuelle est une zone plate ajoutée à la fin du niveau.

Ces contrats doivent rester disponibles pendant la migration, même si leur implémentation interne change.

---

## 3. Choix d’architecture

### 3.1 Macro-layout authored, micro-variantes procédurales

Chaque ère reçoit un graphe de zones authored. La seed ne doit plus modifier la topologie critique. Elle peut modifier :

- la variante visuelle d’une salle ;
- la position exacte de props non bloquants ;
- la composition d’un pack dans un budget donné ;
- le coffre choisi parmi plusieurs emplacements valides ;
- un secret parmi deux options ;
- l’ordre de deux micro-encounters équivalents.

La seed ne doit jamais :

- supprimer le chemin principal ;
- rendre un secret obligatoire ;
- déplacer le marchand dans une zone dangereuse ;
- créer un saut hors des métriques certifiées ;
- placer un ennemi sur un support non accessible ;
- faire apparaître un boss avant la fermeture de l’arène.

### 3.2 Nouveau fichier de données

Créer `src/level_specs.js`, chargé après `data.js` et avant `level.js`.

```js
AR.LEVEL_SPECS = {
  stone: { /* ... */ },
  antiquity: { /* ... */ },
  medieval: { /* ... */ },
  renaissance: { /* ... */ },
  diesel: { /* ... */ },
  cyber: { /* ... */ },
};
```

`level.js` devient l’interpréteur des spécifications. Éviter de coder six grands `if (era.id === ...)` dans le constructeur.

### 3.3 API de compatibilité

Après construction, `AR.Level` doit toujours fournir :

```js
level.spawnX
level.merchantX
level.bossX
level.portalX
level.arenaStartTx
level.arenaGy
level.gateTx
level.spawns
level.chestSpots
level.platforms
level.props
level.groundYpx(x) // compatibilité, uniquement pour les zones mono-surface
```

Ajouter :

```js
level.rooms
level.roomById
level.collisionGrid
level.oneWayPlatforms
level.movingPlatforms
level.climbables
level.hazards
level.interactables
level.encounters
level.triggers
level.navGraph
level.bossArena
level.currentRoomAt(x, y)
level.surfaceYAt(x, y, options)
level.findSafeRespawn(x, y)
```

---

## 4. Coordonnées et métriques

### 4.1 Repère

- unité de conception : tuile ;
- `TILE = 48 px` ;
- monde vertical actuel : `32 tuiles` ;
- `tx` croît vers la droite ;
- `ty` croît vers le bas ;
- la position `y` d’un support correspond à son bord supérieur.

### 4.2 Bandes verticales recommandées

| Bande | `ty` | Usage |
|---|---:|---|
| très haute | 5–9 | secrets, corniches, plateformes d’élite |
| haute | 10–16 | route haute |
| médiane | 17–23 | chemin principal |
| basse | 24–29 | grottes, tunnels, catacombes |
| limite | 30–31 | sol technique, jamais un chemin normal |

### 4.3 Enveloppes de traversal certifiées

Avec les constantes actuelles, utiliser des marges conservatrices :

| Mouvement | Delta horizontal recommandé | Delta vertical recommandé |
|---|---:|---:|
| saut simple | ≤ 3 tuiles | montée ≤ 2 tuiles |
| double saut | ≤ 5 tuiles | montée cumulée ≤ 4 tuiles |
| saut + dash | ≤ 8 tuiles | montée ≤ 3 tuiles |
| chute contrôlée | ≤ 8 tuiles | prévoir zone d’atterrissage ≥ 3 tuiles |
| marche d’escalier | 1 tuile par marche | hauteur 1 tuile |
| plateforme mobile | gap résiduel ≤ 3 tuiles | attente maximale 2,5 s |

Les routes principales ne doivent jamais exiger une compétence achetée. Le double saut et le dash de base peuvent être requis puisqu’ils font partie du kit initial.

---

## 5. Collision multi-niveaux

### 5.1 Problème à résoudre

La heightmap actuelle ne représente qu’une surface solide par colonne. Elle ne peut pas représenter correctement :

- une grotte sous un plateau ;
- une catacombe sous un forum ;
- un bunker sous une passerelle ;
- une salle avec plafond ;
- plusieurs étages superposés ;
- une porte qui change d’état.

### 5.2 Grille de collision

Créer une grille `tilesW × WORLD_H`, idéalement un `Uint8Array`.

Flags proposés :

```js
const TILE_FLAGS = {
  EMPTY: 0,
  SOLID: 1 << 0,
  ONE_WAY: 1 << 1,
  HAZARD: 1 << 2,
  CLIMBABLE: 1 << 3,
  DOOR: 1 << 4,
  BREAKABLE: 1 << 5,
  NO_ENEMY: 1 << 6,
  NO_RESPAWN: 1 << 7,
};
```

`solidAt(tx, ty)` consulte cette grille et l’état dynamique des portes/destructibles.

### 5.3 Méthodes de sol

Remplacer les usages ambigus de `groundYpx(x)` dans les zones multi-étages par :

```js
surfaceYAt(x, fromY, {
  direction: 'down',
  maxDistance: 800,
  includeOneWay: true,
  roomId: null
})
```

Cas à migrer impérativement :

- ciblage des mortiers ;
- placement des ennemis ;
- placement des pickups ;
- télégraphes au sol ;
- respawn ;
- calcul du sol des boss ;
- recherche de points de saut du mode démo.

### 5.4 Rectangles authored

Le fichier de spécification peut déclarer des rectangles plutôt que des milliers de tuiles :

```js
solids: [
  { x: 0, y: 22, w: 24, h: 10 },
  { x: 24, y: 20, w: 16, h: 12 },
]
```

L’interpréteur rasterise ensuite les rectangles dans `collisionGrid`.

---

## 6. Rooms et graphe de navigation

### 6.1 Room

```js
{
  id: 'S03_UPPER_RIDGE',
  rect: { x: 72, y: 8, w: 56, h: 15 },
  tags: ['branch', 'high_route'],
  camera: { minX: 70, maxX: 132, minY: 4, maxY: 23 },
  musicLayer: 'tension_1',
  safeRespawn: [{ x: 76, y: 17 }],
}
```

Une room n’est pas nécessairement une pièce fermée ; c’est une unité de pacing, de caméra, de spawn et de navigation.

### 6.2 Connecteur

```js
{
  id: 'C_S02_S03',
  from: 'S02_CANYON_HUB',
  to: 'S03_UPPER_RIDGE',
  type: 'climb',
  entry: { x: 69, y: 21 },
  exit: { x: 74, y: 15 },
  bidirectional: true,
  requiredMoves: ['jump', 'climb'],
  aiHint: { action: 'climb', tolerance: 24 },
}
```

Types minimum :

- `walk`
- `jump`
- `drop`
- `climb`
- `lift`
- `teleporter`
- `breakable`
- `door`
- `one_way_loop`

### 6.3 Validation automatique

Ajouter un validateur exécuté en mode debug :

- toutes les rooms obligatoires sont joignables depuis `START` ;
- `BOSS_ANTE` et `BOSS_ARENA` sont joignables sans secret ;
- le marchand est joignable sans combat après ouverture de sa room ;
- au moins une boucle revient vers une room déjà visitée ;
- aucun connecteur principal n’exige un mouvement hors métriques ;
- tous les spawns ont un support valide ;
- chaque room possède au moins un `safeRespawn`.

---

## 7. Traversal commun

### 7.1 Échelles, lianes et chaînes

Ajouter au joueur un état `climbing`.

Entrée :

- joueur chevauche un volume `CLIMBABLE` ;
- appui haut ou bas ;
- vitesse verticale fixe : `150 px/s` ;
- gravité désactivée ;
- vitesse horizontale limitée à `45 px/s` ;
- saut depuis la prise : impulsion normale et sortie de l’état.

Règles :

- aucun combat lourd pendant l’escalade ;
- sabre léger facultatif, mais pas requis en V1 ;
- invulnérabilité non accordée ;
- les ennemis terrestres ne grimpent pas sauf métadonnée dédiée ;
- l’IA de démo doit disposer d’un waypoint d’entrée et de sortie.

### 7.2 Plateformes mobiles et ascenseurs

Objet :

```js
{
  id: 'LIFT_01',
  type: 'lift',
  rect: { x: 120, y: 25, w: 4, h: 0.4 },
  path: [{ x: 120, y: 25 }, { x: 120, y: 14 }],
  speed: 110,
  waitAtEnds: 1.0,
  activation: 'auto',
}
```

Exigences :

- transporter le joueur et les ennemis posés dessus ;
- ne jamais écraser mortellement le joueur en V1 ;
- résoudre la pénétration contre plafond par arrêt temporaire ;
- conserver un mouvement déterministe ;
- fournir `nextArrivalTime()` au mode démo ;
- avoir une position de repos sûre après rechargement.

### 7.3 Téléporteurs courts

- interaction explicite `E` pour les portails de route ;
- délai de 0,20 s, fondu court, invulnérabilité 0,35 s ;
- destination garantie libre ;
- cooldown 0,75 s ;
- pas de téléportation d’ennemis en V1 sauf ennemi explicitement conçu pour cela.

### 7.4 Destructibles

Types initiaux :

- mur friable ;
- dalle fragile ;
- pont fragile ;
- caisse/baril.

État :

```js
{ hp, broken, resetPolicy: 'never' | 'on_room_reset' }
```

Le chemin principal ne dépend pas d’un destructible non signalé. Un mur secret doit avoir au moins deux indices : fissures, poussière, son creux, lumière ou prop orienté.

### 7.5 Leviers, portes et ponts-levis

Tout interactable possède :

```js
{
  id,
  type,
  roomId,
  state,
  prompt,
  oneShot,
  links: ['DOOR_03', 'LIFT_02']
}
```

L’activation doit :

1. verrouiller brièvement l’entrée si nécessaire ;
2. jouer feedback visuel et audio ;
3. modifier l’état ;
4. invalider la navgraph ;
5. recalculer seulement les arêtes concernées.

---

## 8. Encounters

### 8.1 Encounter authored

```js
{
  id: 'E_STONE_HUB',
  roomId: 'S02_CANYON_HUB',
  trigger: { type: 'enter_rect', rect: { x: 38, y: 14, w: 22, h: 12 } },
  gates: ['GATE_LEFT', 'GATE_RIGHT'],
  waves: [
    { budget: 4, pool: ['stone_spear', 'stone_slinger'] },
    { budget: 6, pool: ['beast_hunter', 'stone_brute'] },
  ],
  clearReward: { type: 'coins', amount: 12 },
}
```

### 8.2 Coûts de menace

| Archétype | Coût |
|---|---:|
| mêlée légère | 1,0 |
| tireur/caster léger | 1,25 |
| brute/bouclier/artillerie | 2,0 |
| charger/assassin/flyer spécialisé | 2,5 |
| élite | 5,0 |
| mini-boss | 8,0 |

Les budgets sont multipliés par difficulté et NG+, mais le nombre simultané doit être plafonné :

- Normal : 5 ennemis actifs dans une room ;
- Difficile : 6 ;
- Cauchemar : 7 ;
- ennemis volants : maximum 3 simultanés ;
- artillerie lourde : maximum 2 simultanées.

### 8.3 Safe room

Une room `safe` :

- bloque le déclenchement de nouveaux ennemis ;
- interdit les projectiles entrants via suppression à la frontière ou fermeture de porte ;
- peut contenir marchand, coffre ou autel ;
- ne soigne pas gratuitement sauf règle explicite ;
- devient un point de respawn stable.

---

## 9. Secrets et récompenses

Chaque niveau doit contenir :

- un secret de lecture environnementale ;
- un secret de maîtrise du mouvement ;
- un secret optionnel de combat ou d’élite.

Récompenses possibles :

- coffre normal ;
- coffre haut ;
- relique garantie ;
- autel temporaire ;
- gros montant d’or ;
- potion ;
- raccourci durable dans le niveau.

Ne pas placer un objet indispensable au build derrière un secret.

---

## 10. Arènes de boss basées sur images générées

### 10.1 Séparation art / gameplay

L’image ne fournit jamais la collision. Elle sert de décor. Toutes les surfaces jouables sont définies par métadonnées.

Format recommandé par arène :

```text
assets/arenas/{era}_boss_bg.webp
assets/arenas/{era}_boss_mid.webp
assets/arenas/{era}_boss_fg.webp        # optionnel, transparence
assets/arenas/{era}_boss_meta.js
```

V1 acceptable :

```text
assets/arenas/{era}_boss_arena.png
```

### 10.2 Dimensions

L’arène actuelle mesure environ 34 tuiles, soit `1632 px` de large. Recommandation :

- espace logique : 34 à 40 tuiles × 15 tuiles visibles ;
- image source : 2048×1024 ou supérieure ;
- rendu : `cover` dans le rectangle d’arène ;
- zone de sécurité latérale : 2 tuiles derrière chaque limite de combat ;
- aucun élément visuel important dans les 8 % extrêmes si l’image est recadrée.

### 10.3 Métadonnées

```js
bossArena: {
  assetId: 'stone_boss_arena',
  rect: { x: 320, y: 8, w: 34, h: 22 },
  floorTy: 23,
  gateTx: 321,
  bossSpawn: { x: 341, y: 23 },
  playerEntry: { x: 324, y: 23 },
  portalSpawn: { x: 337, y: 23 },
  collisionProfile: 'stone_flat_with_ledge',
  foregroundOccluders: [],
  phaseEvents: [],
}
```

### 10.4 Contraintes de lisibilité

- sol jouable contrasté par rapport au fond ;
- télégraphes de boss visibles sur toute la palette ;
- premier plan ne masque jamais plus de 20 % du personnage ;
- aucune fausse plateforme ressemblant au langage des supports ;
- points d’impact des mortiers lisibles ;
- ligne de charge du boss dégagée ;
- limites de l’arène visibles avant fermeture.

---

## 11. Caméra

Ajouter des bornes par room :

- suivi souple du joueur dans les zones ouvertes ;
- verrouillage horizontal pendant un encounter ;
- cadrage vertical spécifique pour les routes hautes/basses ;
- transition de 0,25 à 0,45 s entre bornes ;
- pas de téléportation sèche de caméra ;
- arène : cadrage contraint à l’arène dès fermeture de la porte.

Le mode démo accéléré ne doit pas modifier les constantes de lissage ; il multiplie le temps simulé comme aujourd’hui.

---

## 12. Mode démo IA et navgraph

### 12.1 Exigence non négociable

Une carte est considérée implémentée uniquement si le mode démo peut :

- atteindre le boss ;
- franchir la route principale ;
- utiliser les ascenseurs/portails obligatoires ;
- éviter les hazards simples ;
- revenir d’une branche ;
- récupérer le marchand si la politique IA le demande ;
- ne pas rester bloqué plus de 4 s sur un connecteur.

### 12.2 Navgraph

Chaque nœud :

```js
{
  id: 'N_S03_TOP',
  x: 112,
  y: 14,
  roomId: 'S03_UPPER_RIDGE',
  stance: 'ground',
  safe: true,
}
```

Chaque arête :

```js
{
  from: 'N_A',
  to: 'N_B',
  action: 'jump_dash',
  cost: 2.4,
  requiredState: null,
  maxAttempts: 3,
  fallback: 'N_RECOVERY',
}
```

Actions minimum :

- `walk`
- `jump`
- `double_jump`
- `jump_dash`
- `drop`
- `climb`
- `wait_lift`
- `ride_lift`
- `interact`
- `teleport`
- `break_wall`
- `fight_until_clear`

### 12.3 Recovery

Après trois échecs :

1. revenir au nœud de récupération ;
2. remettre le joueur sur le `safeRespawn` de la room uniquement en mode démo debug ;
3. journaliser l’échec avec `era`, `room`, `edge`, `seed` ;
4. continuer le run pour permettre l’audit complet.

En mode joueur normal, aucun repositionnement artificiel hors logique de chute existante.

---

## 13. Respawn et chute

Remplacer la mise à jour opportuniste de `lastSafe` par des ancres authored :

```js
safeRespawn: [
  { x: 42, y: 22, priority: 10 },
  { x: 57, y: 18, priority: 5 },
]
```

Règles :

- mémoriser la dernière ancre traversée ;
- ne jamais enregistrer une plateforme mobile ;
- ne jamais enregistrer une tuile hazard ;
- chute dans le vide : dégâts actuels ou valeur définie par l’ère ;
- dans la carte cyber : coût de chute configurable, sans mort instantanée en Normal.

---

## 14. Assets et chargement

Étendre `assets.js` avec un registre explicite :

```js
AR.ASSET_MANIFEST.arenas = {
  stone_boss_arena: 'assets/arenas/stone_boss_arena.png',
  // ...
};
```

Exigences :

- preload avant `newRun()` ;
- fallback procédural si image absente ou en erreur ;
- log unique, pas un log par frame ;
- dimensions et mémoire affichables dans overlay debug ;
- WebP possible, PNG pour alpha ;
- taille cible cumulée des six arènes : idéalement < 12 Mo compressés.

---

## 15. Fichiers affectés

| Fichier | Changement |
|---|---|
| `index.html` | charger `level_specs.js` |
| `src/data.js` | références vers profils de carte et nouveaux ennemis |
| `src/level_specs.js` | données authored des six cartes |
| `src/level.js` | interpréteur, collision grid, rooms, connecteurs, draw |
| `src/player.js` | escalade, plateforme mobile, respawn authored |
| `src/game.js` | encounters, triggers, gates, état de room, boss arena |
| `src/demoai.js` | navgraph et actions de traversal |
| `src/enemy.js` | sol multi-étage, limites de room, hazards éventuels |
| `src/projectiles.js` | télégraphes via `surfaceYAt` |
| `src/pickups.js` | nouveaux interactables et placement multi-étage |
| `src/assets.js` | arènes et éventuels overlays |
| `src/hud.js` | prompt contextualisé, debug facultatif |
| `tools/validate_levels.py` | validation statique facultative mais recommandée |

---

## 16. Ordre d’implémentation du socle

### Lot C0 — Données et compatibilité

- créer `level_specs.js` ;
- charger une spec vide par ère ;
- conserver le générateur historique comme fallback ;
- écrire le validateur de schéma.

### Lot C1 — Collision multi-niveaux

- grille de collision ;
- rectangles solides ;
- plateformes one-way ;
- `surfaceYAt` ;
- migration des mortiers, spawns et pickups.

### Lot C2 — Rooms, triggers et encounters

- détection de room ;
- portes d’encounter ;
- vagues ;
- safe rooms ;
- états persistants pendant le niveau.

### Lot C3 — Traversal dynamique

- climbables ;
- ascenseurs ;
- téléporteurs ;
- destructibles ;
- leviers/portes.

### Lot C4 — Navgraph IA

- interprétation des nœuds/arêtes ;
- actions ;
- récupération ;
- logs et replay de seed.

### Lot C5 — Arènes illustrées

- asset manifest ;
- rendu bg/mid/fg ;
- métadonnées ;
- fallback ;
- validation de lisibilité.

### Lot C6 — Outils QA

- overlay rooms/collisions/navgraph ;
- sélection directe d’une ère et d’une room ;
- seed fixe ;
- mode invulnérable ;
- compteur de blocages IA ;
- rapport de run.

---

## 17. Overlay debug requis

Raccourci recommandé : `F3`.

Affichage :

- identifiant de la room ;
- coordonnées joueur en tuiles ;
- collision grid ;
- plateformes dynamiques ;
- volumes hazard ;
- safe respawns ;
- triggers ;
- portes et état ;
- navnodes et arêtes ;
- encounter actif, vague et ennemis restants ;
- asset d’arène chargé ou fallback ;
- seed ;
- FPS et nombre d’entités.

---

## 18. Critères d’acceptation du socle

- [ ] Une carte test contient deux étages superposés accessibles.
- [ ] `groundYpx` historique continue de fonctionner dans les zones simples.
- [ ] Les mortiers ciblent le bon étage.
- [ ] Un ennemi ne tombe pas à travers une plateforme authored au spawn.
- [ ] Le joueur peut grimper et quitter une liane/échelle.
- [ ] Un ascenseur transporte le joueur sans jitter visible.
- [ ] Une porte d’encounter s’ouvre après la dernière vague.
- [ ] Un secret destructible ne bloque pas le chemin principal.
- [ ] Une image d’arène est rendue avec collision séparée.
- [ ] Le fallback procédural apparaît si l’image manque.
- [ ] Le mode démo traverse la carte test à ×8.
- [ ] Deux runs avec la même seed donnent les mêmes variantes.
- [ ] Le niveau est jouable clavier AZERTY/QWERTY.
- [ ] Aucune dépendance externe ni étape de build n’est introduite.

---

## 19. Définition de « terminé »

Le socle commun est terminé lorsque le niveau 1 peut être implémenté uniquement par ajout/modification de données dans `level_specs.js`, à l’exception :

- des comportements réellement nouveaux ;
- des nouveaux assets ;
- d’un prop renderer spécifique ;
- d’un hazard unique nécessitant son propre code.

Aucune des six cartes ne doit nécessiter de dupliquer le moteur de rooms, d’encounters, de portes, de plateforme mobile ou de navgraph.
