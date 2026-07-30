# TODO — Pistes d'amélioration

Backlog vivant des idées de gameplay/équilibrage à ne pas oublier. À mettre à jour au fil de l'eau
(cocher, préciser, ou ajouter des idées). Peut servir de base de travail pour plusieurs agents en parallèle,
chacun prenant une section indépendante.

Nettoyé et réorganisé par thème le 2026-07-28 : tous les items déjà implémentés (cochés, avec leur
historique détaillé de diagnostic/correctif) ont été retirés pour ne garder que le travail restant.
L'historique complet reste consultable via `git log` / les messages de commit si besoin.

## 🪙 Économie (or / points de compétence)

Constat déjà audité (voir commits) : l'arbre de compétences et les crans d'arme se bouclent bien avant
la fin d'une run (dès R3/R5), l'or n'a plus de débouché une fois ça fait.

- [ ] **Pistes de rééquilibrage** :
  - Élargir le pool boutique (`AR.SHOP_POOL`, `src/data.js:237-245`) avec plus d'objets à forte valeur et/ou faire scaler le prix de chaque item avec le nombre de fois déjà acheté (vrai puits d'or, pas juste un restock aléatoire)
  - Supprimer ou réduire drastiquement le "Parchemin ancien" en boutique (achat direct de points de compétence avec de l'or) — c'est le principal pont qui transforme un surplus d'or en surplus de puissance
  - Envisager un vrai système de choix (arbre à embranchements exclusifs, respec payant, etc.) plutôt que "tout débloquer avec assez de temps"

## 👹 Boss

- [ ] **Boss R1 (Chef Mammouth)** : l'IA de démo perd systématiquement en combat simulé (0% de victoires sur tous les essais), alors que le joueur y arrive en vrai ("j'y arrive donc on y reviendra plus tard"). Mis en pause volontairement à la demande du joueur — pas de changement de code depuis. Piste non explorée si on veut y revenir : ajuster `_bossEvadeUpdate` (`src/demoai.js`, l'esquive dédiée charge/sweep) plutôt que la distance générale d'engagement — cette dernière a déjà été tentée et a donné des résultats pires.
- [ ] **Boss R4 (Ingénieur de guerre)** : n'attaque quasiment pas si le joueur reste sur la plateforme la plus haute de l'arène (mines + salves de grenades restent au sol) — on peut le tuer à l'arc en quelques secondes depuis là-haut sans riposte. Il faudrait qu'il tire aussi obus/mitraillette vers le haut.

## 🧟 Variété des ennemis

Objectif : chaque type d'ennemi (pas que les boss) doit avoir une attaque/comportement caractéristique.
Référence de qualité déjà en place : Yōkai (boules d'énergie flottantes, attaque du boss R3).

- [ ] Idées de mécaniques distinctives à ajouter (voir `src/enemy.js`, `src/demoai.js`) :
  - Mammouth : charge fonceur sur le joueur
  - Ninja : téléportation sur/derrière le joueur
  - (compléter au fur et à mesure des idées)
- [ ] Faire une passe générale : lister tous les types d'ennemis actuels et vérifier lesquels n'ont encore aucune attaque/mécanique distinctive
- [ ] `node tools/check_sprite_duplicates.js` détecte encore 1 doublon de sprite via `AR.ENEMY_FALLBACK` (non corrigé) : `tomb_scarabs` partage l'image de `war_shaman`. Même défaut que les 6 déjà corrigés (Traqueur des galeries/Spectre des catacombes/Vermine des fosses/Contremaître enchaîné/Sapeur/Forçat brisant ses chaînes) — probablement à traiter pareil (nouvel art dédié via ChatGPT).

## ✨ Sorts & compétences

- [ ] Le sort Téléport (`AR.SPELLS`, id `teleport`, `src/data.js`) réutilise l'icône de la barre de sorts de Frappe éclair (`spells/icons/blink`) faute d'icône dédiée — la pose de cast du héros, elle, est un art dédié (`assets/hero/spells/teleport_cast.png`, généré le 2026-07-29). À traiter comme les doublons de sprite d'ennemis si on veut une icône propre : petit visuel rond façon les 4 icônes existantes, teinte violette pour matcher la pose.

## ⚖️ Équilibrage & cohérence

- [ ] **Vie des ennemis (retour ère 3)** : un tir chargé explosif à l'arc plein (113 dégâts) tue trop vite ; souhait d'une vie ×5 pour les ennemis de terrain (sauf boss/boucliers, déjà très costauds). ⚠️ Une passe générale a déjà porté les PV des monstres de terrain ×2.5 (cf. commits) — à revérifier en jeu si ×2.5 suffit ou s'il faut aller plus loin vers ×5.

## 🗺️ Minimap

- [ ] Étendre les contours de salles colorées (`level.rooms`) à toutes les ères sur la minimap — **la condition bloquante d'origine n'existe plus** : les 6 ères ont maintenant toutes des cartes authored avec `rooms` définies. À vérifier si la minimap les affiche déjà automatiquement sans changement de code, ou si un ajustement reste nécessaire.

## 🔊 Audio

- [ ] Bande-son et bruitages actuels sont synthétiques et peu agréables — envisager des outils comme ElevenLabs (voix/SFX) et Suno (musique) pour une bande-son et des bruitages sur mesure.

## Sauvegarde

Sauvegarde locale (`AR.Save`, `src/utils.js`) : localStorage, cloisonné par navigateur+origine
(donc pas de partage entre PC/téléphone ni entre local/GitHub Pages). Suffisant pour un rappel
dans 2 semaines sur le même navigateur/appareil, mais aucun filet si le storage est effacé.

- [x] Sauvegarde cloud facultative par pseudo + code à 4 chiffres (2026-07-30) : `src/cloudsave.js`
  (`AR.CloudSave`) + écran titre "☁ COMPTE" (`src/ui.js#drawCloud`). Repose sur Firestore (choisi
  plutôt que Supabase : les projets Supabase gratuits se mettent en pause après ~7 jours
  d'inactivité, ce qui aurait cassé exactement le scénario "je reviens dans 2 semaines" ;
  Firestore Spark ne se met jamais en pause). Aucune authentification réelle — le pseudo+code EST
  l'id du document Firestore (`AR.CloudSave._docId`), donc pas de vraie protection, juste un
  garde-fou contre les collisions accidentelles (cf. commentaires dans `src/firebase-config.js`).
  **Reste à faire pour activer** (ne peut pas être fait par l'agent, nécessite un compte Google) :
  créer un projet Firebase gratuit, activer Firestore, coller les règles de sécurité fournies,
  enregistrer une appli web, et remplir `AR.FIREBASE_CONFIG` dans `src/firebase-config.js`
  (`enabled: true` + les 6 clés). Instructions détaillées pas-à-pas en commentaire en tête de ce
  fichier. Tant que non configuré, `enabled: false` -> aucune régression, comportement localStorage
  pur inchangé (testé en isolation : boot sans erreur, écran cloud fonctionnel, statut "cloud
  indisponible" affiché proprement).


## IA apprenante

- [ ] On dispose de logs et d'une IA existante, comment la rendre vraiment intelligente ? peut-on appliquer du reinforcement learning sur le jeu et la regarder jouer ?


## 📋 Process

- [ ] Tenir ce fichier à jour à chaque session : cocher les items traités, ajouter les nouvelles idées identifiées en jouant (ex. logs de combat dans `combat-log-*.jsonl`), et retirer régulièrement ce qui est déjà implémenté pour garder le fichier lisible.
- [ ] `node tools/check_sprite_duplicates.js` (ajouté le 2026-07-29) audite tout le roster de monstres et signale deux types de problèmes : les doublons "logiques" (plusieurs ids qui, via `AR.ENEMY_FALLBACK`, pointent vers le même sprite — le bug qui affectait Traqueur des galeries/Spectre des catacombes/Vermine des fosses/Contremaître enchaîné/Sapeur avant correction) et les doublons "physiques" (deux fichiers PNG différents strictement identiques, signe d'un copier-coller accidentel). À relancer après toute nouvelle génération d'art de monstre.

