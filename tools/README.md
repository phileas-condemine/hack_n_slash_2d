# tools/

Scripts et pages utilitaires pour le développement local. Rien ici n'est chargé par le jeu
lui-même (`index.html` ne référence aucun fichier de ce dossier) et rien n'est déployé/utile sur
le site statique (GitHub Pages) : tout s'exécute ponctuellement, à la main, en local.

## dev_server.py

**Quoi** : serveur de dev local, à utiliser à la place de `python -m http.server`.

**Pourquoi** : sert les mêmes fichiers statiques, mais avec deux différences utiles en dev :
- `Cache-Control: no-store` sur toutes les réponses — évite de tester par erreur une version mise
  en cache d'un `src/*.js` qu'on vient d'éditer (piège classique : rester sur un ancien onglet après
  une modif, ou même une nouvelle navigation qui réutilise le cache disque du navigateur).
- Expose `POST /api/log` : permet à `src/eventlog.js` d'écrire le journal de combat directement
  dans `logs/` (dossier ignoré par git), sans la boîte de dialogue "Choisir où enregistrer" de la
  File System Access API. Sur le site déployé (ou si ce serveur n'est pas utilisé), le jeu bascule
  automatiquement sur un téléchargement classique.

**Comment** :
```bash
python tools/dev_server.py [port]   # port par défaut : 8123
```
puis ouvrir `http://localhost:8123`.

**Quand** : à chaque session de dev/test en local — y compris pour tester un simple changement
visuel, pas seulement pour le journal de combat, à cause du point cache ci-dessus.

## build_sprite_meta.py

**Quoi** : précalcule les métadonnées de sprites (boîtes de découpe, nettoyage des franges vertes
résiduelles d'un fond vert mal détouré) et génère `src/sprites_meta.js`.

**Pourquoi** : le jeu n'a ainsi pas besoin de `getImageData` au runtime — ça fonctionne même
ouvert directement en `file://` (sans serveur), sans les soucis de canvas "tainted" que provoquerait
une lecture de pixels sur une image chargée depuis le disque.

**Comment** :
```bash
pip install Pillow   # dépendance, une seule fois
python tools/build_sprite_meta.py
```

**Quand** : après tout ajout ou remplacement d'image dans `assets/` (héros, ennemis, sorts). Si un
sprite a l'air mal détouré ou mal cadré en jeu après un ajout d'asset, c'est le premier réflexe :
relancer ce script avant de chercher ailleurs.

## map_export.html

**Quoi** : exporte les 6 cartes (une par ère) en PNG — silhouette de terrain complète (pas de
brouillard de guerre, toute la carte d'un coup), plus coffres, marchand, salles taguées (ère 1
uniquement, les autres sont procédurales) et zone de l'arène de boss.

**Pourquoi** : les niveaux ne sont générés qu'au runtime dans le navigateur (procédural, seedé par
run, pour R2-R6 ; authored via `level_specs.js` pour R1) — sans cet outil, la seule façon de voir
à quoi ressemble une carte est de jouer une run complète jusque-là. Utile pour vérifier l'effet
d'un changement de génération sans avoir à retraverser tout le niveau à chaque fois, et pour
comparer visuellement plusieurs seeds ou plusieurs versions du code de génération.

**Comment** : ouvrir directement le fichier dans un navigateur (double-clic — fonctionne aussi en
`file://`), ou via `dev_server.py`. Ajuster la seed si besoin (input en haut de page), cliquer
« Régénérer », puis « Tout télécharger (PNG) » pour récupérer les 6 fichiers
`minimap_R{n}_{era}_seed{n}.png`.

**Quand** : après toute modification de `src/level_specs.js` (rooms/props de l'ère 1) ou de la
génération procédurale dans `src/level.js` (`_buildProcedural`, hauteurs, coffres, marchand...).
La seed par défaut est fixe : rouvrir la page (ou cliquer « Régénérer » sans changer la seed)
après un changement de code donne un export directement comparable à l'ancien, sans bruit dû au
hasard.
