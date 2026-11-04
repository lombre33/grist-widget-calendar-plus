# GFS-ETAT : Calendrier+

Mis à jour le 2026-11-04, au commit `531e0cd` (le dernier commit de code que cette page décrit : le module avec les heures).

## Consignes
- 006 · lue · voie A : le module s'écrit dans `calendrier/` de ce dépôt, GFS le déplace dans le kit (`js/calendrier/index.js`, `css/calendrier.css`) ; porte d'entrée accordée avec Tuesday : `creerCalendrier(rappels)` rend `{ element, definir({ lignes, options }), aller, aujourdhui, detruire }` (`docs/plan.md`, section 3) ; tous les imports du kit passent par un seul fichier, `calendrier/lien-kit.js`
- 007 · lue · les événements qui glissent ne seront pas des `<button>` (`<div role="button" tabindex="0" draggable="true">`) ; à essayer par le porteur sous Firefox dès le lot 6 du plan

- 009 · lue · le labo sera `test/grist/lancer-grist.sh` du dépôt Tuesday, avec `gristlabs/grist:1.7.19` (la version du Grist du porteur) ; rien d'autre
- 010 · lue · `kit/` est à `8afa569` (kit 0.6.0) ; la feuille du module (`css/calendrier.css`) lira les jetons de la charte et les jetons de forme avec leur valeur d'origine en repli (`var(--radius-md, 10px)`), fond `--bg`, jamais de couleur en dur (essai d'hygiène en place) ; `Ambiance.start()` sera appelé par l'hôte (l'app autonome, au lot 7), pas par le module ; les couleurs de Grist (choix) restent des données, jamais écrites par le module ; « faite » à l'entrée de l'app autonome, avec l'essai de couleurs

## Changements qui touchent GFS
- Aucun (pas de `gfs.json` ni de table ; Calendrier+ n'en crée aucune ; clés de réglages préfixées `cal_`, clés de stockage `cal_*`)

## Questions pour GFS
- Aucune pour l'instant

## Demandes à GFS
- **Module prêt (version 2, avec les heures)** · commit `531e0cd` · mêmes dossier, entrée et feuille que ci-dessous ; s'ajoutent : `calendrier/noyau/horaire.js`, `calendrier/vue/horaire.js`, `calendrier/vue/heures.js`, les vues Semaine et Jour avec blocs horaires (au quart d'heure, glisser changeant le jour et l'heure, ajout à l'heure cliquée, bande des jours entiers) ; essais : 81 sous Node (`npm test`) et 31 sous Chromium (`npm run test:navigateur`). La version 2 remplace la première : c'est elle que GFS peut déplacer dans le kit. Reste côté module : étirer une barre ou un bloc par ses bords (V1.1).
- **Module prêt (première version)** · commit `5043986` · dossier `calendrier/` (entrée `calendrier/index.js` ; le seul import du kit est `calendrier/lien-kit.js`) · feuille `calendrier/css/calendrier.css` (à ranger en `css/calendrier.css` du kit, après `tokens.css`) · essais : `test/*.test.mjs` (noyau et hygiène, `npm test`, Node) et `test/navigateur/essais.test.mjs` (22 essais Chromium à 700 × 400, `npm run test:navigateur`, Playwright). Porte d'entrée : `creerCalendrier(rappels)` rend `{ element, definir({ lignes, options }), aller, aujourdhui, detruire }` (`docs/plan.md`, section 3). Ce que la version fait : mois et semaine au lundi, aujourd'hui à l'ouverture, numéros de semaine ISO, barres sur plusieurs jours avec « +n » et liste du jour, glisser un événement sur un jour (écart gardé, retour si l'hôte refuse), plateau « Sans date », saisie rapide du titre, lecture seule grisée avec sa raison, français et anglais, clair et sombre. Ce qu'elle ne faisait pas encore (fait dans la version 2) : les heures en blocs horaires et la vue Jour. Elle peut remplacer la grille provisoire de Tuesday sans lui faire perdre le glisser-déposer ni le plateau . La page d'essai du navigateur lit `kit/css/tokens.css` (sous-module `8afa569`), rien d'autre du kit n'est lu hors de `lien-kit.js`.
