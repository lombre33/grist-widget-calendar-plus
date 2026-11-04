# Calendrier+ : plan de développement (proposition du 02/11/2026)

Statut : **proposition**, à valider par Antoine avant tout code (règle du projet : une décision qui sort du cahier passe par une carte de décision). Ce plan tient lieu de cahier des charges en attendant ; une fois validé, il devient `docs/cahier-des-charges.md`.

## 1. Ce que c'est

Un widget Grist de calendrier, de la suite Grist Factory (GFS), qui marche **seul** sur n'importe quelle table et que **Tuesday intègre** comme sa vue Calendrier. Il corrige les trois défauts du calendrier officiel signalés par les francophones (forum, fil 3215) :

1. la semaine commence le **lundi** ;
2. il s'ouvre sur **aujourd'hui** (pas sur la date du premier enregistrement) ;
3. il affiche les **numéros de semaine** (ISO 8601).

Il travaille **avec** la donnée de Grist : il ne crée aucune table, n'écrit jamais une colonne qu'on ne lui a pas reliée, ne calcule rien qui doive rester dans Grist.

Références : Tuesday `docs/cahier-des-charges.md` 6.3 et `docs/integration-suite.md` 1 ; écran cible : onglet Calendrier de `maquettes/index.html` de Tuesday ; règles : `CLAUDE.md` de ce dépôt.

## 2. Architecture : un noyau qui ne connaît pas Grist

Une seule règle structure tout : **le module de calendrier ne parle jamais à Grist**. L'hôte (l'app Calendrier+ seule, ou Tuesday) lui donne des lignes et écrit dans Grist à sa place.

```
calendrier/              le module (ce qui ira dans le kit, voie A) : n'importe que kit/
  noyau/                 logique pure, sans DOM, testée sous Node
    dates.js             jours civils, lundi, numéros ISO, grille mois/semaine, fuseaux sans effet
    evenements.js        lignes normalisées -> événements ; sans date, début seul, fin seule
    placement.js         barres multi-jours par ligne de semaine, « +n », ordre stable
    deplacement.js       déplacer un jour : l'écart Début -> Fin est conservé
    horaire.js           blocs horaires d'un jour : colonnes des blocs qui se chevauchent, pas de 15 min, déplacement d'heure
  vue/                   DOM par `h()` du kit (jamais d'HTML interprété), glisser-déposer, clavier
  index.js               la porte d'entrée (section 3) : creerCalendrier(rappels) -> { element, definir, aller, aujourdhui, detruire }
  lien-kit.js            le seul fichier qui importe le kit (GFS n'y réécrit que ces chemins au déplacement)
app/                     l'hôte autonome : adaptateur Grist, correspondance de colonnes, GfsLink
index.html, gfs.json     la page publiée sur GitHub Pages, le manifeste de GFS
test/                    node --test (noyau, normalisation, adaptateur) ; navigateur/ (Playwright)
```

Le dossier `calendrier/` n'importe **rien** hors de `kit/` : il se déplace tel quel dans le kit si GFS choisit la voie A, et reste dans l'app si c'est la voie B. Le choix (question 11 de Tuesday) ne change donc pas le code.

## 3. Le contrat du module (réponse au fil Tuesday)

**Porte d'entrée unique** (accordée avec le fil Tuesday le 03/11, consigne 006 de GFS, point 4) :

```js
import { creerCalendrier } from './calendrier/index.js';   // dans le kit : js/calendrier/index.js
const calendrier = creerCalendrier({ onOuvrir, onDeplacer, onAjouter, onEtat });
conteneur.append(calendrier.element);                       // le module rend son élément, l'hôte le pose
calendrier.definir({ lignes, options });                    // peut être rappelé à chaque changement de données
```

`creerCalendrier(rappels)` rend `{ element, definir({ lignes, options }), aller(jour), aujourdhui(), detruire() }`. Le module ne touche ni `document.body` ni `window` : tout vit dans `element`. Sa feuille est `css/calendrier.css` (liée par l'hôte, après `tokens.css`).

Entrée : `definir({ lignes, options })`.

```
ligne = { id, titre, debut, fin, avecHeure, statut, couleur, responsables, modifiable }
```

- `debut` / `fin` : texte `AAAA-MM-JJ` (jour sans heure, **cas par défaut**) ou `AAAA-MM-JJTHH:mm` (si `avecHeure`). Le **module ignore les fuseaux** : l'hôte convertit les secondes de Grist (Date UTC, DateTime avec fuseau de la colonne) en jours civils. Une seule fonction le fait, testée avec les décalages d'été et d'hiver.
- **`fin` inclusive** pour un jour sans heure (une tâche du 3 au 5 couvre trois jours), comme l'échéance de Tuesday.
- Début seul ou fin seule : un événement d'un jour. Ni l'un ni l'autre : plateau « Sans date ».
- `couleur` : `{ fond, texte }` tels que Grist les donne (ce sont des données, pas des couleurs écrites dans le code) ; absente, un jeton du kit.
- `modifiable: false` sur une ligne ou `lectureSeule` en option : glisser grisé, avec la raison dite en infobulle.
- `options` : `debutSemaine` (1 = lundi, par défaut), `vue` (`mois` | `semaine`), `jourCourant`, `langue`, `maintenant` (une horloge injectée : c'est ce qui rend « s'ouvre sur aujourd'hui » testable).

Sortie (les rappels donnés à `creerCalendrier`, l'hôte répond) :

- `onOuvrir(id)` : clic sur un événement.
- `onDeplacer({ id, debut, fin })` : renvoie une promesse ; si l'hôte la refuse, l'événement **revient à sa place** (le module ne garde aucun état faux). **Annuler / Rétablir est à l'hôte** (Tuesday a le sien ; seul, Calendrier+ branche celui de Grist par `UpdateRecord`).
- `onAjouter({ debut, titre })` : clic sur un jour vide, ou bouton « + Tâche ». **Saisie rapide (choix d'Antoine, 04/11)** : le module ouvre sur place un champ de titre dans le jour (ou à l'heure cliquée dans les vues Semaine et Jour) ; Entrée envoie `{ debut, titre }`, Échap annule, un titre vide n'envoie rien. L'hôte crée la ligne et rend une promesse ; refusée, le champ revient avec le titre gardé.
- `onEtat({ vue, jourCourant })` : pour que l'hôte retienne la vue par `GfsLink.storageSet` (jamais écrit dans les réglages de la vue sans geste).

Deux ajouts à proposer au fil Tuesday par rapport à leur brouillon : `avecHeure` et `modifiable`, et la promesse de retour sur `onDeplacer`.

## 4. Périmètre par paliers

**V1 : « Voir ce qui tombe quand » (Tuesday en a besoin)**
- Mois, Semaine et **Jour**, lundi, aujourd'hui, numéros de semaine, navigation et « Aujourd'hui ».
- **Heures (choix d'Antoine, 04/11)** : les lignes avec heure (`AAAA-MM-JJTHH:mm`, colonne DateTime) s'affichent en blocs horaires dans les vues Semaine et Jour, au-dessus d'une bande « Toute la journée » pour les jours entiers ; les blocs qui se chevauchent se partagent la largeur ; glisser un bloc change le jour et l'heure (pas de 15 minutes, durée conservée) ; dans le mois, l'heure précède le titre.
- Événements d'un jour et multi-jours (barres), « +n » avec liste du jour.
- Glisser un événement sur un autre jour (écart conservé) ; plateau « Sans date » et dépôt sur un jour.
- « + Tâche » et clic sur un jour : demander à l'hôte d'ajouter.
- Clair / sombre, français / anglais ensemble, 700 × 400, clavier complet, grisé jamais masqué.
- App autonome : choix de la table par la liste avec recherche de la charte, correspondance de colonnes (Titre, Début, Fin, Couleur, Personne ; obligatoires signalés, colonnes reconnues déjà choisies, conséquences dites en une phrase), écritures Début/Fin seulement.
- `gfs.json`, `GfsLink` (langue, zone de la barre, stockage), page publiée sur Pages.

**V1.1** : étirer une barre ou un bloc par ses bords (changer Fin ou Début) ; filtre par personne ; recherche.

**V2** : plusieurs sources superposées (deux tables, une couleur chacune : le « calendrier d'équipe » de Monday) ; export `.ics` (extension GFS, donc chargée au premier usage) ; récurrence en lecture seule (l'écriture reste à Grist).

**Hors périmètre** : créer des tables, formulaires, automatisations, rappels (Form+, Automation+).

## 5. Tests (dès la première ligne de code)

- **Noyau sous Node** (`node --test`), exhaustif, chaque correction avec son test qui échoue sur l'ancien code : semaine au lundi et au dimanche ; numéros ISO aux bornes (S53, 29-31 décembre en S1, 1er-3 janvier en S52/53) ; années bissextiles ; mois de 28 à 31 jours, grilles de 4, 5 et 6 semaines ; changements d'heure (aucune dérive d'un jour) ; barres qui traversent les semaines ; « +n » ; déplacement qui conserve l'écart, y compris sur fin de mois ; lignes sans date, début seul, fin seule, fin avant début (refusée, jamais « réparée » en silence) ; `maintenant` injecté.
- **Hygiène** automatique (celle du kit) : ni `console.log`, ni couleur ou `z-index` en dur, ni `window.onmessage =`, ni fichier de plus de 600 lignes, ni fonction de plus de 80, complexité 15 au plus.
- **Navigateur** (Playwright, comme le kit) : rendu 700 × 400 clair et sombre, glisser-déposer, clavier.
- **Dans un vrai Grist** (labo de GFS), jamais contre un faux Grist écrit ici : ce que Grist envoie pour Date et DateTime, les couleurs des choix, le curseur, les lignes ajoutées. L'adaptateur est un fichier mince, vérifié là ; je demanderai au fil GFS comment lancer le labo.

## 6. Ordre des lots

1. **Socle** : `CLAUDE.md`, `LICENSE`, `.nojekyll`, `kit/` en sous-module (v0.2.0), `package.json` (`GPL-3.0-only`, scripts de test), hygiène, workflow Pages. *(fait : `LICENSE`, `.nojekyll`, ce plan)*
2. **Noyau + tests** : `dates`, `evenements`, `placement`, `deplacement` *(fait, 79913e1)* ; puis `horaire` (blocs horaires, déplacement d'heure) avec ses essais.
3. **Vue mois** sur données de démonstration (page sans Grist), charte, clair/sombre, fr/en.
4. **Premier module prêt pour le kit, tôt** (choix d'Antoine du 04/11 : « module du kit tout de suite », pas de sous-cadre) : dès que la vue mois tient (lot 3) avec la porte d'entrée de la section 3, `GFS-ETAT.md` dit « module prêt » (commit, dossier `calendrier/`, `css/calendrier.css`, essais) ; GFS le déplace dans le kit (`js/calendrier/index.js`) et Tuesday l'affiche dans sa vue Calendrier, même en POC. Les vues semaine et jour, le glisser et le reste arrivent ensuite par versions du kit.
5. **Vues semaine et jour** (blocs horaires, bande « Toute la journée »), « +n », clavier.
6. **Glisser-déposer** et plateau « Sans date ».
7. **App autonome** : adaptateur Grist, correspondance de colonnes, écritures, lecture seule.
8. **GFS** : `gfs.json`, `GfsLink`, `GFS-ETAT.md`, mesure dans un vrai Grist.
9. **Tuesday** : module monté dans la vue Calendrier de Tuesday (voie A ou B selon la réponse de GFS).

Chaque lot : une passe de tests ciblée, push sur `main`, `?v=` monté, run Pages vert et changement vu en ligne.

## 7. Questions ouvertes et défauts pris

| # | Question | Défaut pris |
|---|---|---|
| 1 | Nom | Calendrier+ / Calendar+, id GFS `calendrier`, clés de réglages préfixées `cal_` |
| 2 | Heures en V1 | **Oui (carte d'Antoine, 04/11)** : vue Jour et blocs horaires dès la V1 ; pas de 15 minutes ; fuseau : l'hôte convertit, le module ne voit que des heures locales |
| 3 | Voie A ou B pour Tuesday | **A, module du kit, tout de suite** (GFS, 03/11 ; Antoine, 04/11) : pas de sous-cadre ni de page `?embarque=1` |
| 4 | Correspondance de colonnes | La fenêtre de la charte, la même que Tuesday ; réglages écrits seulement par un geste (rappel « Enregistrer ») |
| 5 | Fin inclusive | Oui |
| 6 | Ajout depuis un jour vide | **Saisie rapide du titre** sur place (carte d'Antoine, 04/11) ; la fiche complète reste chez l'hôte (clic sur l'événement créé) |
