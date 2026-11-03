# GFS-ETAT : Calendrier+

Mis à jour le 2026-11-03, au commit `b96b04d` (le dernier commit de code que cette page décrit : aucun code encore, le plan et le socle seulement).

## Consignes
- 006 · lue · voie A : le module s'écrit dans `calendrier/` de ce dépôt, GFS le déplace dans le kit (`js/calendrier/index.js`, `css/calendrier.css`) ; porte d'entrée accordée avec Tuesday : `creerCalendrier(rappels)` rend `{ element, definir({ lignes, options }), aller, aujourdhui, detruire }` (`docs/plan.md`, section 3) ; tous les imports du kit passent par un seul fichier, `calendrier/lien-kit.js`
- 007 · lue · les événements qui glissent ne seront pas des `<button>` (`<div role="button" tabindex="0" draggable="true">`) ; à essayer par le porteur sous Firefox dès le lot 6 du plan

## Changements qui touchent GFS
- Aucun (pas de `gfs.json` ni de table ; Calendrier+ n'en crée aucune ; clés de réglages préfixées `cal_`, clés de stockage `cal_*`)

## Questions pour GFS
- Où est le labo (Grist dans docker, `test/grist/lancer-grist.sh` du dépôt Tuesday) : puis-je le reprendre tel quel pour mesurer l'adaptateur de Calendrier+ ?

## Demandes à GFS
- Module prêt : pas encore (premier commit à annoncer ici avec le dossier, la feuille de style et les essais)
