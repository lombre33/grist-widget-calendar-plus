# Calendrier+

Le widget de calendrier de [Grist Factory Suite (GFS)](https://github.com/lombre33/grist-widget-GFS) : il marche seul sur n'importe quelle table de Grist, et Tuesday l'intègre comme sa vue Calendrier. Le module du calendrier est dans le kit commun (`kit/js/calendrier/`) ; cette app le monte. Plan : [`docs/plan.md`](docs/plan.md) ; état pour GFS : [`GFS-ETAT.md`](GFS-ETAT.md).

## Essayer

```
node --test "test/*.test.mjs"          # essais unitaires
node --test "test/navigateur/*.test.mjs" # essais dans Chromium
node outils/versionner.mjs             # après tout changement de JS ou de CSS (carte d'importation, ?v=, empreinte)
```

## Stockage du navigateur

Calendrier+ garde des choix d'affichage dans `localStorage` (jamais le contenu d'un document, ni d'un événement) : `cal_theme` (le thème) et `cal_lang` (la langue). Dans GFS, ces choix partent chez GFS, qui héberge l'app. Calendrier+ n'écrit ni `sessionStorage`, ni IndexedDB, ni cookie. Tout accès est dans un `try/catch` : l'app marche sans.

## Sécurité

Voir [`SECURITY.md`](SECURITY.md). La page n'appelle que son propre site et le script d'API de Grist ; sa politique de sécurité ferme le reste (règles S1 à S9 de GFS : `GFS-ETAT.md`).

## Dépôt

`kit/` est un sous-module : le kit commun de GFS (`lombre33/grist-factory-kit`, commit `ed0a575`, v0.27.0). Après un clone : `git submodule update --init`.

Licence : GNU GPL 3.0 (voir `LICENSE`).
