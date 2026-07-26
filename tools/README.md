# tools/

Scripts et pages utilitaires pour le développement local. Rien ici n'est chargé par le jeu
lui-même (`index.html` ne référence aucun fichier de ce dossier) et rien n'est déployé/utile sur
le site statique (GitHub Pages) : tout s'exécute ponctuellement, à la main, en local.

## En un coup d'œil

| Outil | Lancer | Relancer après un changement |
|---|---|---|
| `dev_server.py` | `python tools/dev_server.py` puis ouvrir `http://localhost:8123` | reste ouvert pendant toute la session de dev |
| `build_sprite_meta.py` | `python tools/build_sprite_meta.py` | après tout ajout/remplacement d'image dans `assets/` |
| `map_export.html` | double-clic sur le fichier (ou via `dev_server.py`) | **recharger la page (F5) suffit** — voir ci-dessous pour zéro-clic |

## map_export.html — actualiser le plus simplement possible

Cette page régénère les 6 cartes à l'ouverture, automatiquement, avec le code de génération de
niveau actuel. Après avoir modifié `src/level_specs.js` (ère 1) ou la génération procédurale dans
`src/level.js` (ères 2-6), il n'y a donc **rien à faire de spécial : juste recharger la page**
(F5, ou rouvrir le fichier). Pas besoin de relancer un serveur, pas besoin de rejouer une run.

Trois façons de l'utiliser, de la plus manuelle à la plus rapide :

1. **Juste regarder** : ouvrir `tools/map_export.html` (double-clic, fonctionne en `file://`).
   Les 6 cartes s'affichent directement — pratique pour un simple contrôle visuel après une modif.
2. **Récupérer les PNG** : une fois la page ouverte, cliquer **« Tout télécharger (PNG) »**
   (6 fichiers `minimap_R{n}_{era}_seed{n}.png`).
3. **Rafraîchissement en un geste (zéro clic)** : ouvrir/recharger avec `?autodownload=1` dans
   l'URL, par ex. `tools/map_export.html?autodownload=1` (ou
   `http://localhost:8123/tools/map_export.html?autodownload=1` via `dev_server.py`). La page se
   génère et relance directement les 6 téléchargements. **Le plus simple : mettre cette URL en
   favori** et la rouvrir/recharger à chaque fois qu'on veut des exports à jour.

Si le serveur n'est pas déjà lancé, cette commande PowerShell fait tout d'un coup (démarre
`dev_server.py` en arrière-plan puis ouvre directement la page en mode zéro-clic ci-dessus) —
à copier-coller telle quelle depuis la racine du projet :
```powershell
Start-Process python -ArgumentList "tools/dev_server.py"; Start-Sleep 1; Start-Process "http://localhost:8123/tools/map_export.html?autodownload=1"
```

La seed (champ en haut de page, fixe par défaut) garantit un résultat reproductible tant que le
code de génération ne change pas — un export d'avant/après un changement de code est donc
directement comparable, sans bruit dû au hasard. Pour comparer plusieurs variantes aléatoires
d'une même ère, changer la seed puis cliquer « Régénérer ».

**Pourquoi cet outil existe** : les niveaux ne sont générés qu'au runtime dans le navigateur
(procédural, seedé par run, pour R2-R6 ; authored via `level_specs.js` pour R1) — sans lui, la
seule façon de voir à quoi ressemble une carte est de jouer une run complète jusque-là.

Chaque carte exportée montre : la silhouette de terrain complète (pas de brouillard de guerre,
toute la carte d'un coup), les coffres (carré or), le marchand (losange or), les salles taguées
(ère 1 uniquement) et la zone de l'arène de boss (cadre rouge).

## dev_server.py

**Quoi** : serveur de dev local, à utiliser à la place de `python -m http.server`.

**Comment** :
```bash
python tools/dev_server.py
```
puis ouvrir `http://localhost:8123` (port par défaut ; passer un autre numéro en argument pour en
changer, ex. `python tools/dev_server.py 8080`).

**Pourquoi celui-ci plutôt que `http.server`** :
- `Cache-Control: no-store` sur toutes les réponses — évite de tester par erreur une version mise
  en cache d'un `src/*.js` qu'on vient d'éditer (piège classique : rester sur un ancien onglet, ou
  même une nouvelle navigation qui réutilise le cache disque du navigateur).
- Expose `POST /api/log` : permet à `src/eventlog.js` d'écrire le journal de combat directement
  dans `logs/` (dossier ignoré par git), sans boîte de dialogue "Choisir où enregistrer". Sur le
  site déployé (ou si ce serveur n'est pas utilisé), le jeu bascule automatiquement sur un
  téléchargement classique.

**Quand** : à chaque session de dev/test en local — y compris pour un simple changement visuel,
pas seulement pour le journal de combat, à cause du point cache ci-dessus.

## build_sprite_meta.py

**Quoi** : précalcule les métadonnées de sprites (boîtes de découpe, nettoyage des franges vertes
résiduelles d'un fond mal détouré) et génère `src/sprites_meta.js`.

**Comment** :
```bash
pip install Pillow   # dépendance, une seule fois
python tools/build_sprite_meta.py
```

**Pourquoi** : le jeu n'a ainsi pas besoin de `getImageData` au runtime — ça fonctionne même
ouvert directement en `file://` (sans serveur), sans les soucis de canvas "tainted" que provoquerait
une lecture de pixels sur une image chargée depuis le disque.

**Quand** : après tout ajout ou remplacement d'image dans `assets/` (héros, ennemis, sorts). Si un
sprite a l'air mal détouré ou mal cadré en jeu après un ajout d'asset, c'est le premier réflexe :
relancer ce script avant de chercher ailleurs.
