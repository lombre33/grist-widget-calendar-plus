# Calendrier+ : consignes pour Claude

Widget de calendrier de la suite Grist Factory Suite (GFS). Il marche seul sur n'importe quelle table, et Tuesday (`lombre33/grist-wisget-tuesday`) l'intègre comme sa vue Calendrier. Lire d'abord `docs/plan.md`.

## Règles du porteur (Antoine)

- Travail direct sur `main`, push et fusion sans demander ; des PR seulement si elles servent.
- **Tests unitaires exhaustifs dès la première ligne de code.** Chaque correction a son test, qui échoue sur l'ancien code.
- UX/UI : la charte Grist Factory, section 1 (`lombre33/publipostageGrist`, `planning/identite-ui-ux-grist-factory.md`, lire les lignes 17 à 488) : gris et un seul bleu, police du système, icônes au trait, grisé jamais masqué, panneau 700 × 400, français et anglais ensemble, vouvoiement, Annuler/Rétablir à 100 %.
- Simplicité d'abord ; périmètre par paliers ; **avec** la donnée de Grist, jamais à sa place. Déploiement : GitHub Pages, surtout sur l'instance Grist de la DINUM.
- Écrire en français, en tutoyant Antoine.
- Une décision qui sort du plan : une carte de décision d'abord, rien n'est codé avant son choix.

## Règles de GFS (voir `lombre33/grist-widget-GFS`, `docs/guide-des-apps.md`)

- Modules ES, HTML et CSS, aucun framework, aucune étape de construction ; ce qu'un outil génère est commité. GPL 3.0 (`LICENSE` octet pour octet, `"license": "GPL-3.0-only"`).
- `kit/` en sous-module (`lombre33/grist-factory-kit`) ; une app n'importe jamais une autre app. **Le dossier `calendrier/` n'importe rien hors de `kit/`** et ne parle jamais à Grist.
- Pas de calcul dans le widget ; changements de données additifs ; ne jamais écrire une colonne absente ; aucune table créée (ce widget n'en crée aucune).
- Réglages de la vue jamais écrits sans un geste de la personne ; clés préfixées `cal_`.
- `addEventListener('message')`, jamais `window.onmessage =`. Stockage du navigateur dans des `try/catch`.
- Pas de `console.log` publié ; aucun prénom de personne dans le code ; aucune couleur ni `z-index` en dur (jetons du kit).
- Fichiers de moins de 600 lignes de code, fonctions de moins de 81 lignes, complexité 15 au plus.
- GitHub Pages : aucun fichier ou dossier dont le nom commence par « _ » ou « . » ; cache de 10 minutes, donc `?v=` monté à chaque changement de CSS ou JS ; `.nojekyll` à la racine.
- Ce qui dépend de ce que Grist envoie se mesure dans un vrai Grist (labo de GFS), jamais contre un faux Grist écrit ici.
- Une passe de tests ciblée avant chaque push ; la suite complète à la demande.
