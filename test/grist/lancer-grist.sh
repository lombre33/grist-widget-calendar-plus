#!/bin/sh
# Lance un Grist neuf (image officielle, version fixée : un essai se rejoue à l'identique) pour les essais de Calendrier+ (copie du labo de Tuesday, consigne 009 de GFS) : http://localhost:8484, personne connectée par défaut, aucune donnée gardée.
# Prérequis : docker. Arrêt : docker rm -f grist-labo
docker rm -f grist-labo >/dev/null 2>&1
exec docker run --rm --name grist-labo --network host \
  -e GRIST_IN_SERVICE=true -e GRIST_FORCE_LOGIN=true -e GRIST_SUPPORT_ANON=false \
  -e GRIST_SESSION_SECRET=labo -e GRIST_DEFAULT_EMAIL=labo@example.test \
  -e GRIST_SANDBOX_FLAVOR=unsandboxed -e APP_HOME_URL=http://localhost:8484 \
  -e GRIST_ALLOW_AUTOMATIC_VERSION_CHECKING=false \
  gristlabs/grist:1.7.19
