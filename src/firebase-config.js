// Arcane Rift - config du projet Firebase (Firestore) utilisé pour la sauvegarde cloud par
// pseudo + code à 4 chiffres (cf. src/cloudsave.js). Ces valeurs sont PUBLIQUES par conception
// côté Firebase : la protection ne vient pas du secret de cet objet mais des règles de sécurité
// Firestore configurées dans la console. https://firebase.google.com/docs/projects/api-keys
//
// ---------------------------------------------------------------------------------------------
// Pour activer la sauvegarde cloud (gratuit, aucune carte bancaire requise) :
//
//   1. https://console.firebase.google.com -> "Ajouter un projet" -> nom libre (ex. "arcane-rift")
//      -> désactiver Google Analytics (inutile ici) -> créer.
//
//   2. Dans le projet : menu "Firestore Database" -> "Créer une base de données" -> mode
//      "production" -> région au choix (ex. eur3, Europe) -> activer.
//
//   3. Onglet "Règles" de Firestore -> remplacer tout le contenu par EXACTEMENT :
//
//        rules_version = '2';
//        service cloud.firestore {
//          match /databases/{database}/documents {
//            match /saves/{docId} {
//              allow get, write: if true;
//              allow list: if false;
//            }
//          }
//        }
//
//      -> "Publier". (Le doc id encode déjà pseudo+code -> pas besoin d'authentification
//      Firebase pour ce niveau de protection volontairement léger : quelqu'un devrait deviner
//      le pseudo ET le code à 4 chiffres pour lire/écraser une sauvegarde. Ce n'est PAS une
//      vraie sécurité, juste un garde-fou contre les collisions accidentelles. `list: if false`
//      empêche en revanche toute requête de LISTE sur la collection entière - sans ça,
//      n'importe qui pourrait dumper tous les pseudos/codes/sauvegardes en une seule requête
//      depuis la console du navigateur. Le code n'utilise jamais ce genre de requête (toujours
//      `doc(id).get()`, jamais de liste), donc rien à changer côté app.)
//
//   4. Icône ⚙️ à côté de "Vue d'ensemble du projet" -> "Paramètres du projet" -> onglet
//      "Général" -> tout en bas, section "Vos applications" -> icône "</>" (ajouter une
//      application web) -> nom libre (ex. "arcane-rift-web") -> décocher Firebase Hosting
//      (inutile, le jeu reste sur GitHub Pages) -> "Enregistrer l'application".
//
//   5. Firebase affiche un objet `firebaseConfig` -> copier ses valeurs ci-dessous, une par une,
//      et passer `enabled` à `true`.
//
//   6. (Recommandé, coupe l'alerte "clé API exposée" de GitHub) Sur
//      https://console.cloud.google.com/apis/credentials, ouvrir la clé "Browser key (auto
//      created by Firebase)" -> Restrictions d'application -> "Sites Web" -> n'autoriser que
//      l'URL GitHub Pages du jeu (ex. "https://<compte>.github.io/*") -> Restrictions d'API ->
//      "Restreindre la clé" -> cocher uniquement "Cloud Firestore API". Un domaine `localhost`
//      ne peut généralement pas être ajouté à cette liste (Google refuse les hôtes non
//      vérifiables) : les appels cloud échoueront donc en test local une fois cette restriction
//      posée, sans impact sur le reste du jeu (module conçu pour échouer silencieusement) ni sur
//      la version déployée sur GitHub Pages.
//
// Tant que `enabled` reste à `false` (ou `apiKey` vide), la sauvegarde cloud est silencieusement
// désactivée : le jeu continue de fonctionner exactement comme avant, en localStorage pur
// (AR.Save, src/utils.js) — aucune régression, aucune erreur visible.
// ---------------------------------------------------------------------------------------------

window.AR = window.AR || {};

AR.FIREBASE_CONFIG = {
  enabled: true,
  apiKey: 'AIzaSyA4S6KrTYMpaFwCKQ6Sq3QUhO92i3MxSak',
  authDomain: 'hack-n-slash-2d.firebaseapp.com',
  projectId: 'hack-n-slash-2d',
  storageBucket: 'hack-n-slash-2d.firebasestorage.app',
  messagingSenderId: '1049789218180',
  appId: '1:1049789218180:web:210a5f66e4419a46aaf1d1',
};
