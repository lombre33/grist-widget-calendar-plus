# GFS-ETAT : Calendrier+

Mis à jour le 2026-11-04, au commit `9d8fe29` (le dernier commit de code que cette page décrit : l'app monte le module du kit).

## Consignes
- 006 · lue · voie A : le module s'écrit dans `calendrier/` de ce dépôt, GFS le déplace dans le kit (`js/calendrier/index.js`, `css/calendrier.css`) ; porte d'entrée accordée avec Tuesday : `creerCalendrier(rappels)` rend `{ element, definir({ lignes, options }), aller, aujourdhui, detruire }` (`docs/plan.md`, section 3) ; tous les imports du kit passent par un seul fichier, `calendrier/lien-kit.js`
- 007 · lue · les événements qui glissent ne seront pas des `<button>` (`<div role="button" tabindex="0" draggable="true">`) ; à essayer par le porteur sous Firefox dès le lot 6 du plan

- 009 · lue · le labo sera `test/grist/lancer-grist.sh` du dépôt Tuesday, avec `gristlabs/grist:1.7.19` (la version du Grist du porteur) ; rien d'autre
- 010 · lue · `kit/` est à `8afa569` (kit 0.6.0) ; la feuille du module (`css/calendrier.css`) lira les jetons de la charte et les jetons de forme avec leur valeur d'origine en repli (`var(--radius-md, 10px)`), fond `--bg`, jamais de couleur en dur (essai d'hygiène en place) ; `Ambiance.start()` sera appelé par l'hôte (l'app autonome, au lot 7), pas par le module ; les couleurs de Grist (choix) restent des données, jamais écrites par le module ; « faite » à l'entrée de l'app autonome, avec l'essai de couleurs

- 012 · faite · `9d8fe29` · `kit/` à `336baf4` (0.8.0), `calendrier/` retiré, la page importe `kit/js/calendrier/index.js` et lie `kit/css/calendrier.css?v=`, essais de l'hôte gardés (`test/app.test.mjs`, `test/navigateur/app.test.mjs`) ; la réserve du logo et de la roue à droite de la barre du calendrier est dans `css/app.css`, pas dans le module
- 013 · lue · la consigne est pour Tuesday ; chez Calendrier+, rien n'est en attente d'enregistrement (la démonstration n'écrit nulle part) : à rejouer quand l'adaptateur Grist existera (une saisie rapide ou un déplacement en cours d'écriture devra finir avant `{ ferme: true }`)

## Changements qui touchent GFS
- Aucun (pas de `gfs.json` ni de table ; Calendrier+ n'en crée aucune ; clés de réglages préfixées `cal_`, clés de stockage `cal_*`)

## Questions pour GFS
- Aucune pour l'instant

## Demandes à GFS
- Aucune. Constats de GFS (012, point 4), sans changement demandé pour l'instant : à 658 px la barre d'outils passe sur deux lignes en vue Jour ; la sixième semaine du mois est coupée par le bas du panneau à 700 × 400 (elle se rejoint à la molette). Si le porteur veut les changer : demande ici, avec le commit.
