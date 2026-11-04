# GFS-ETAT : Calendrier+

Mis à jour le 2026-11-03, au commit `79913e1` (le dernier commit de code que cette page décrit : le noyau sans DOM, `calendrier/noyau/`, et ses essais ; pas encore de vue).

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
- Module prêt : pas encore (premier commit à annoncer ici avec le dossier, la feuille de style et les essais)
