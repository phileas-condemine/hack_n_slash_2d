# Légende des graphes de rooms

Chaque image représente le **graphe de progression macro** du niveau :

- **boîtes** : rooms / sous-zones principales ;
- **flèches** : progression principale ;
- **liaisons de côté** : branches secondaires ;
- **liaisons de retour** : convergence ou boucle ;
- **position verticale** : sert uniquement à rendre lisible la structure (route haute / basse / hub / arène), pas à représenter une altitude exacte ;
- **room de boss** : toujours le dernier nœud à droite.

Ces graphes servent surtout à :
1. visualiser la structure globale ;
2. vérifier les branches et boucles ;
3. préparer la traduction en `level_specs.js` et en navgraph IA.
