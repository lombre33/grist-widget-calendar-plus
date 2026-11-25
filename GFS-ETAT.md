# GFS-ETAT : Calendrier+

Mis à jour le 2026-11-25 (règles de sécurité 017 à 019, à la demande du porteur ; consigne 020 lue), au commit `77591f8` (le dernier commit de code que cette page décrit : l'app monte le module du kit).

## Consignes
- 006 · lue · voie A : le module s'écrit dans `calendrier/` de ce dépôt, GFS le déplace dans le kit (`js/calendrier/index.js`, `css/calendrier.css`) ; porte d'entrée accordée avec Tuesday : `creerCalendrier(rappels)` rend `{ element, definir({ lignes, options }), aller, aujourdhui, detruire }` (`docs/plan.md`, section 3) ; tous les imports du kit passent par un seul fichier, `calendrier/lien-kit.js`
- 007 · lue · les événements qui glissent ne seront pas des `<button>` (`<div role="button" tabindex="0" draggable="true">`) ; à essayer par le porteur sous Firefox dès le lot 6 du plan

- 009 · lue · le labo sera `test/grist/lancer-grist.sh` du dépôt Tuesday, avec `gristlabs/grist:1.7.19` (la version du Grist du porteur) ; rien d'autre
- 010 · lue · `kit/` est à `8afa569` (kit 0.6.0) ; la feuille du module (`css/calendrier.css`) lira les jetons de la charte et les jetons de forme avec leur valeur d'origine en repli (`var(--radius-md, 10px)`), fond `--bg`, jamais de couleur en dur (essai d'hygiène en place) ; `Ambiance.start()` sera appelé par l'hôte (l'app autonome, au lot 7), pas par le module ; les couleurs de Grist (choix) restent des données, jamais écrites par le module ; « faite » à l'entrée de l'app autonome, avec l'essai de couleurs

- 012 · faite · `9d8fe29` · `kit/` à `336baf4` (0.8.0), `calendrier/` retiré, la page importe `kit/js/calendrier/index.js` et lie `kit/css/calendrier.css?v=`, essais de l'hôte gardés (`test/app.test.mjs`, `test/navigateur/app.test.mjs`) ; la réserve du logo et de la roue à droite de la barre du calendrier est dans `css/app.css`, pas dans le module
- 013 · lue · la consigne est pour Tuesday ; chez Calendrier+, rien n'est en attente d'enregistrement (la démonstration n'écrit nulle part) : à rejouer quand l'adaptateur Grist existera (une saisie rapide ou un déplacement en cours d'écriture devra finir avant `{ ferme: true }`)
- 014 · lue · chez Calendrier+ (qui parle à GFS par le kit), elle se fait avec la 013 à l'arrivée de l'adaptateur Grist : `kit/` à `eaa2ae2` (0.9.0) ou plus récent, puis `GfsLink.onClose` qui attend les écritures en cours avant de rendre `true` ; aujourd'hui rien n'est écrit dans Grist, donc rien à brancher ; `kit/` reste à `336baf4`
- 015 · remplacée par la 016 (non lue)
- 016 · lue · aucun code : Calendrier+ n'écrit aucun fichier, aucune colonne `Auteur`, `Visibilite`, `Personnes` ni `Espace` ; quand l'adaptateur existera, elle tolérera `GFS_Auteur` (ni lue ni écrite) et dira le refus d'écriture d'une ligne qu'on ne fait que lire
- 017 à 019 · faites par choix du porteur (25/11) · elles sont posées à Tuesday ; Calendrier+ en tient les règles : `kit/` à `ed0a575` (kit 0.27.0, commit à part `d4bce4c`), relais S8 en tête de `app/main.js`, `.github/dependabot.yml`, `SECURITY.md`, phrase `localStorage` dans un `README.md` nouveau, sections ci-dessous ; essais : `test/securite.test.mjs` (11) ; Calendrier+ 0.1.2
- 020 · lue · posée à Tuesday ; pour Calendrier+ (guide 1.1, point 15) : **aucune table ni colonne à renommer**, l'app n'en crée, n'en nomme ni n'en écrit aucune (elle lit et écrit les colonnes que la personne choisit, sous leur nom à elle). Liste complète des noms que le code crée, lit ou écrit : clés de stockage du navigateur `cal_theme` et `cal_lang` (déjà anglaises) ; les réglages de la vue à venir garderont le préfixe `cal_` avec des noms anglais. Réponse à la question (point 4) : aucun document de personne ne porte de nom de Calendrier+ (l'app n'est pas au catalogue et n'écrit encore rien dans Grist). Le code de `app/` est en français (le module du kit aussi) : son passage à l'anglais attend une décision du porteur

## Changements qui touchent GFS
- 2026-11-25 · `77591f8` · `kit/` à `ed0a575` ; relais S8 démarré ; `.github/dependabot.yml`, `SECURITY.md` et `README.md` ajoutés ; version 0.1.2 ; rien d'autre (pas de `gfs.json`, pas de table)
- Aucun autre (pas de `gfs.json` ni de table ; Calendrier+ n'en crée aucune ; clés de réglages préfixées `cal_`, clés de stockage `cal_*`)

## Questions pour GFS
- Aucune pour l'instant

## Demandes à GFS
- Aucune. Constats de GFS (012, point 4), sans changement demandé pour l'instant : à 658 px la barre d'outils passe sur deux lignes en vue Jour ; la sixième semaine du mois est coupée par le bas du panneau à 700 × 400 (elle se rejoint à la molette). Si le porteur veut les changer : demande ici, avec le commit.

## Adresses que l'app appelle
- https://docs.getgrist.com/grist-plugin-api.js · script · le script d'API des widgets de Grist, permis par la politique pour l'adaptateur Grist à venir ; **la page ne le charge pas encore** · envoie des données de la personne : non
- aucune autre : `connect-src` et `img-src` (avec `data:`) n'ouvrent que `'self'` ; le reste est fermé par `default-src 'none'`

## Bibliothèques que l'app charge elle-même
- aucune : le module du calendrier est dans le kit, sous-module de ce dépôt servi par notre site ; le script d'API de Grist n'est pas encore chargé

## Sécurité
- S1 · tenue · balise `<meta http-equiv="Content-Security-Policy">` dans `index.html`, empreinte refaite par `outils/versionner.mjs` ; essais dans `test/securite.test.mjs`
- S2 · tenue · `default-src 'none'`, `object-src`, `base-uri`, `form-action` et `frame-src` à `'none'`
- S3 · tenue · aucune adresse ouverte hors `'self'` et `data:` ; Calendrier+ n'appelle pas le serveur de Grist avec un jeton
- S4 · tenue · `script-src` : `'self'`, `'unsafe-eval'` (règle 11), l'adresse entière du script d'API de Grist et l'empreinte de la carte d'importation ; aucun `'unsafe-inline'`
- S5 · tenue · aucune bibliothèque de l'extérieur aujourd'hui
- S6 · tenue · aucune donnée envoyée ailleurs (l'app n'écrit encore rien dans Grist), ni mesure d'audience, ni journal d'erreurs ; aucun secret dans le dépôt
- S7 · en cours, prévue le 26/11 · `.github/dependabot.yml` suit le sous-module du kit chaque semaine ; le porteur l'active sur le dépôt live (`grist-factory`)
- S8 · tenue · kit 0.27.0 (25/11/2026), import en tête de `app/main.js` ; reste à le mesurer dans GFS
- S9 · en cours, prévue le 26/11 · `SECURITY.md` est à la racine ; le porteur active « Private vulnerability reporting » sur le dépôt live
