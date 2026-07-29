// Détecte les doublons de sprites d'ennemis, sous deux angles complémentaires :
//
//   1. Doublons "logiques" (le vrai bug rencontré en jeu) : plusieurs ids d'AR.ENEMIES/
//      AR.BOSSES qui, une fois résolus par la même logique que Enemy#constructor
//      (src/enemy.js) - états dédiés -> sprite de base -> AR.ENEMY_FALLBACK - pointent vers
//      la MÊME identité visuelle, sans qu'aucun fichier ne soit dupliqué sur le disque (le
//      fallback réutilise directement le fichier de l'autre monstre).
//   2. Doublons "physiques" : deux fichiers PNG différents strictement identiques
//      octet-par-octet, ce qui trahirait un copier-coller involontaire lors d'une génération
//      d'art (indépendant du mécanisme de fallback).
//
// Usage : node tools/check_sprite_duplicates.js
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');

global.window = global;
for (const f of ['config.js', 'arenas.js', 'utils.js', 'data.js', 'sprites_meta.js']) {
  const code = fs.readFileSync(path.join(ROOT, 'src', f), 'utf-8');
  // eslint-disable-next-line no-eval
  (0, eval)(code);
}
const AR = global.AR;

// ---------------------------------------------------------- 1. doublons logiques
function resolveArtId(id) {
  let sid = id;
  const hasNeutral = AR.SPRITE_META['enemies/states/' + sid + '_neutral'];
  const hasBase = AR.SPRITE_META['enemies/' + sid];
  if (!hasNeutral && !hasBase && AR.ENEMY_FALLBACK && AR.ENEMY_FALLBACK[sid]) {
    sid = AR.ENEMY_FALLBACK[sid];
  }
  return sid;
}

const allDefs = { ...AR.ENEMIES, ...AR.BOSSES };
const groups = new Map(); // artId -> [ids...]
for (const id of Object.keys(allDefs)) {
  const artId = resolveArtId(id);
  if (!groups.has(artId)) groups.set(artId, []);
  groups.get(artId).push(id);
}

const logicalDupes = Array.from(groups.entries()).filter(([, ids]) => ids.length > 1);

console.log('=== Doublons logiques (même art, ids différents via AR.ENEMY_FALLBACK) ===');
if (logicalDupes.length === 0) {
  console.log('(aucun)');
} else {
  for (const [artId, ids] of logicalDupes) {
    const names = ids.map((id) => `${id} (${(allDefs[id] || {}).name || '?'})`);
    console.log(`- art "${artId}" partagé par : ${names.join(', ')}`);
  }
}

// ---------------------------------------------------------- 2. doublons physiques
function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.png')) out.push(p);
  }
}

const enemyFiles = [];
walk(path.join(ROOT, 'assets', 'enemies'), enemyFiles);

const byHash = new Map(); // hash -> [relPaths...]
for (const file of enemyFiles) {
  const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (!byHash.has(hash)) byHash.set(hash, []);
  byHash.get(hash).push(rel);
}

// id porté par un chemin ('assets/enemies/{id}.png' ou '.../states/{id}_{state}.png')
function idOf(relPath) {
  const base = path.basename(relPath, '.png');
  return relPath.includes('/states/') ? base.replace(/_(neutral|windup|attack)$/, '') : base;
}

const rawDupes = Array.from(byHash.values()).filter((files) => files.length > 1);

// Convention attendue (build_sprite_meta.py + ce projet) : assets/enemies/{id}.png est une copie
// exacte de assets/enemies/states/{id}_neutral.png - à ignorer. On sépare le reste en deux cas :
// même id sur 3+ fichiers (neutral==windup==attack : le monstre n'a en fait aucune animation
// distincte, juste informatif) vs ids différents (vrai doublon physique, probablement un
// copier-coller accidentel entre deux générations d'art).
const noAnimationVariants = [];
const physicalDupes = [];
for (const files of rawDupes) {
  const ids = new Set(files.map(idOf));
  if (ids.size === 1) {
    if (files.length > 2) noAnimationVariants.push(files);
    // sinon : simple copie base<->neutral attendue, rien à signaler
  } else {
    physicalDupes.push(files);
  }
}

console.log('\n=== Doublons physiques entre ids différents (probable copier-coller accidentel) ===');
if (physicalDupes.length === 0) {
  console.log('(aucun)');
} else {
  for (const files of physicalDupes) {
    console.log(`- ${files.join('  ==  ')}`);
  }
}

console.log('\n=== Monstres sans animation distincte (neutral == windup == attack, même id) ===');
if (noAnimationVariants.length === 0) {
  console.log('(aucun)');
} else {
  for (const files of noAnimationVariants) {
    console.log(`- ${idOf(files[0])} : ${files.length} fichiers identiques (${files.join(', ')})`);
  }
}

console.log(`\n${allDefs ? Object.keys(allDefs).length : 0} ids vérifiés, ${enemyFiles.length} fichiers PNG scannés.`);
process.exitCode = (logicalDupes.length > 0 || physicalDupes.length > 0) ? 1 : 0;
