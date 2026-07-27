# Sbires dédiés des boss — brief de génération d'art

Contexte : chaque boss (R1-R6) doit avoir au moins un sbire (`summon:`) visuellement **dédié**,
plutôt que de recycler un ennemi de terrain générique de la même ère (ce qui est le cas
aujourd'hui pour R2/R3/R4/R6 — `hoplite`, `spirit_caster`, `musketeer`/`pikeman`,
`drone_swarm`/`shield_drone` sont tous des ennemis de terrain ordinaires réutilisés comme
summons). R1 (`mammoth_chief`) et R5 (`diesel_behemoth`) n'ont aujourd'hui aucun summon du tout.

Ce document donne, pour chacun des 6 boss : le concept du sbire dédié, pourquoi il colle à ce
boss précis, et le prompt prêt à copier-coller dans ChatGPT (ou un autre générateur d'images).

## Comment ça marche (pipeline existant, vérifié dans le repo)

1. Tous les sprites d'ennemis existants suivent le même moule : illustration peinte façon concept
   art de jeu vidéo, semi-réaliste avec un peu de stylisation, éclairage dramatique (rim light),
   textures de matière riches (fourrure/cuir/os pour l'âge de pierre, laiton/bois/vapeur pour la
   Renaissance, métal sombre + néon violet/cyan pour l'ère cyber...), ombre portée au sol, fond
   **vert chroma-key uni** (`build_sprite_meta.py` détecte un vert pur aux 4 coins, RGB proche de
   `(2,212,2)`, tolérant tant que c'est un vert net et saturé).
2. Chaque monstre existe en 3 poses distinctes : **Neutral/Patrol**, **Wind-up/Telegraph**,
   **Attack** — cf. planches de référence dans `assets/raw/enemy_state_sheets/*_states.png` (une
   planche par ère, toutes les créatures de l'ère en grille 3 lignes × N colonnes). C'est **la
   meilleure référence à joindre au prompt** pour verrouiller le style (attache le fichier
   correspondant à l'ère du boss que tu traites).
3. Après génération : découper la planche obtenue en 3 fichiers séparés
   `assets/enemies/states/<nouvel_id>_neutral.png`, `_windup.png`, `_attack.png`, puis lancer
   `python tools/build_sprite_meta.py` — ça fait le chroma-key + nettoie les franges vertes +
   recalcule `src/sprites_meta.js` automatiquement. **Il n'existe pas de script de découpe
   automatique dans le repo** (jusqu'ici fait à la main) ni de suppression de traits/contours —
   si le rendu généré a des artefacts de contour indésirables, dis-le moi, je peux étendre
   `build_sprite_meta.py` ou proposer une retouche manuelle. Envoie-moi ensuite les 3 fichiers
   (ou dis-moi où tu les as posés) et je fais le branchement dans `src/data.js` (nouvelle entrée
   `AR.ENEMIES`, ajout au(x) `patterns`/`p2patterns` du boss via `summon:<nouvel_id>`).

## Gabarit commun à tous les prompts

À adapter par ère (couleurs/matières ci-dessous), mais la structure reste la même :

> Game character concept art, hand-painted digital illustration style, semi-realistic
> proportions with light stylization, dramatic rim lighting, rich material textures, bold clean
> linework, dynamic three-quarter action pose facing/acting toward the right, soft drop shadow
> under the feet. Flat solid pure green chroma-key background (RGB ~0,210,0), no scenery, no
> ground plane, no text, no watermark, no border/frame. Show the SAME character in three clearly
> separated poses stacked vertically in one image, in this order: (1) NEUTRAL/PATROL — relaxed
> idle stance; (2) WIND-UP/TELEGRAPH — winding up the attack, weapon drawn back, tense pose; (3)
> ATTACK — mid-strike, weapon/effect in motion. Character should read as a smaller, lesser
> minion/fodder unit — noticeably smaller and less imposing than a boss or elite, roughly the
> scale of a regular foot-soldier enemy.
>
> [DESCRIPTION SPÉCIFIQUE DU PERSONNAGE CI-DESSOUS]

---

## R1 — Âge de Pierre — Chef Mammouth (`mammoth_chief`)

**Concept : le Porteur de Totem** (`totem_bearer`). Un jeune guerrier tribal marqué des mêmes
peintures d'ocre rouge que le chef, brandissant un petit fétiche/idole reprenant les motifs
peints sur le mammouth de cérémonie et le bâton-crâne du chef — visuellement, on doit reconnaître
tout de suite qu'il appartient à l'entourage direct du chef, pas juste un guerrier de tribu
lambda (déjà couvert par `stone_spear`/`stone_brute`/`beast_hunter`).

```
[Coller le gabarit commun ci-dessus, puis :]
A young tribal warrior, bare-chested, wearing bone jewelry and the same red-ochre ritual paint
markings as a mammoth war-chief, carrying a small carved bone totem/fetish staff (not a spear —
distinct silhouette from a spear-thrower) topped with feathers and a tiny skull, echoing the
chief's own skull-staff and the ceremonial red tribal patterns painted on his war-mammoth's hide.
Primitive stone-age tribal aesthetic: fur, hide, bone, wood, torchlight — no metal.
```

## R2 — Antiquité — Commandant de Char (`chariot_commander`)

**Concept : le Porte-Étendard** (`standard_bearer`). Coureur qui accompagne le char du
commandant, portant son étendard personnel (aigle/lion) et un petit bouclier rond frappé du même
insigne que le char — le lien visuel direct est l'insigne partagé, pas juste "un légionnaire de
plus" (déjà couvert par `hoplite`/`archer_auxilia`/`desert_raider`).

```
[Coller le gabarit commun ci-dessus, puis :]
A Greco-Roman auxiliary runner in bronze-trimmed leather armor, running alongside a war chariot,
carrying a tall personal standard/vexillum topped with an eagle or lion emblem, and a small round
bronze shield bearing the exact same emblem/insignia as the standard — visually tying him to a
chariot commander's household guard. Classical antiquity aesthetic: bronze, dust, sun-bleached
leather, marble-ruin backdrop implied only through color palette (not drawn).
```

## R3 — Japon Médiéval — Seigneur Yōkai (`yokai_lord`)

**Concept : le Feu-Follet du Yōkai** (`lantern_wisp`). Reprend l'intention d'origine du spec
("wisps aux extrémités") jamais vraiment construite en art (seul `spirit_caster`, un humanoïde,
existe) : un petit esprit-lanterne flottant, fait de papier et de lumière spectrale, faisant
directement partie du cortège du seigneur — pas un onmyoji humain de plus (déjà couvert par
`spirit_caster`/`tengu_archer`).

```
[Coller le gabarit commun ci-dessus, puis :]
A small floating spirit creature shaped like a paper lantern with a ghostly, semi-transparent
silk trail instead of legs, glowing from within with the same violet-blue spectral fire as a
yokai lord's magic, trailing wisps of mist and faint cherry-blossom petals. Ethereal, nocturnal,
moonlit mythic-Japan aesthetic: paper, silk, lantern glow, mist — no solid armor, no weapon
(attacks with bursts of spectral flame instead).
```

## R4 — Renaissance — Ingénieur de Guerre (`war_engineer`)

**Concept : le Serviteur à Engrenages** (`gear_servitor`). Reprend un concept déjà nommé dans le
spec de niveau (`renaissance_gear_servitor`, "bras déployés", balayage circulaire) mais jamais
construit en art : un petit automate de laiton et bois construit par l'ingénieur lui-même —
littéralement une de ses machines, pas un piquier/mousquetaire de plus.

```
[Coller le gabarit commun ci-dessus, puis :]
A small brass-and-wood clockwork automaton on stubby mechanical legs, built from the same
brass-gear-and-rivet language as a siege engineer's crane-mounted weapon cart, with one arm
ending in a spinning gear-blade and small steam vents on its back releasing thin puffs of steam.
Renaissance mechanical-fortress aesthetic: brass, wood, steel rivets, steam — period technology,
not sci-fi.
```

## R5 — Guerre Diesel — Béhémoth Diesel (`diesel_behemoth`)

**Concept : le Chien de Guerre Blindé** (`armored_hound`). Le seul boss sans summon aujourd'hui.
Plutôt qu'un énième soldat bipède (déjà `trench_soldier`/`flamethrower`/`armored_trooper`), un
quadrupède mécanisé libéré par le Béhémoth lui-même — silhouette différente, et le blindage
riveté/fumant reprend directement celui du boss.

```
[Coller le gabarit commun ci-dessus, puis :]
A small quadrupedal mechanized war-hound made of riveted steel plating, with a stubby exhaust
pipe on its back trailing thin black smoke, glowing narrow slit "eyes", built from the exact same
heavy industrial rivets-and-armor-plate language as a WWI/WWII-style armored behemoth war
machine. Gritty industrial trench-warfare aesthetic: steel, rivets, mud, smoke, high contrast —
no fantastical elements.
```

## R6 — Ère Cyber — IA Suprême (`ai_overlord`)

**Concept : l'Éclat du Noyau** (`core_shard`). L'IA Suprême invoque déjà `drone_swarm`/
`shield_drone` (ennemis de terrain recyclés) — pour un vrai sbire dédié, un fragment détaché et
animé du noyau du boss lui-même, reprenant directement son orbe central et son bouclier
hexagonal violet/cyan, plutôt qu'un drone générique de plus.

```
[Coller le gabarit commun ci-dessus, puis :]
A small floating angular shard fragment, echoing a massive AI core's central glowing orb and
hexagonal energy-shield motif at miniature scale — dark faceted metal body with a small glowing
purple-cyan core visible at its center, thin hexagonal energy-shield panels unfolding around it
when it attacks. Sci-fi neon-holographic aesthetic: dark metal, purple/cyan energy glow, hex
patterns — matching a floating sky-megastructure AI final boss.
```

---

## Après génération

1. Découper la planche en 3 fichiers (`_neutral`, `_windup`, `_attack`) — dis-moi si tu veux que
   je t'aide (je peux écrire un petit script de découpe une fois que je connais la géométrie
   exacte de l'image que tu as obtenue).
2. Les poser dans `assets/enemies/states/`.
3. `python tools/build_sprite_meta.py` (chroma-key + `src/sprites_meta.js`).
4. Je fais le reste : entrée `AR.ENEMIES` (stats de sbire, cohérentes avec les autres summons de
   la même ère), ajout de `summon:<id>` aux `patterns`/`p2patterns` du boss concerné, test en jeu.
