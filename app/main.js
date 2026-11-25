// Point d'entrée de Calendrier+ seul : thème et langue d'abord (sinon la page s'affiche en clair, en français, puis bascule), l'ambiance de GFS, le lien avec GFS, puis le calendrier.
// Dans Grist, le calendrier lit la table choisie et écrit Début et Fin (adaptateur de app/grist/, docs/plan.md lot 7) ; hors de Grist, il montre des lignes de démonstration.
// Le relais des appels que la politique de sécurité de la page bloque (règle S8, kit 0.25.0) : en tête, avant que les autres modules s'évaluent.
import '../kit/js/violations-start.js';
import { Ambiance } from '../kit/js/ambiance.js';
import { GfsLink } from '../kit/js/gfs-link.js';
import { I18n } from '../kit/js/i18n.js';
import { Theme } from '../kit/js/theme.js';
import { creerCalendrier } from '../kit/js/calendrier/index.js';
import { monterCoin, laisserLibre } from './chrome.js';
import { startDemo } from './demo-host.js';
import { startGrist } from './grist-host.js';
import { creerReglages } from './reglages.js';
import { TEXTES } from './textes.js';

Theme.init({ storageKey: 'cal_theme' });
I18n.add(TEXTES);
I18n.init({ storageKey: 'cal_lang' });
I18n.translateDom();
GfsLink.onLanguage(langue => I18n.setLanguage(langue));
Ambiance.start();

async function demarrer() {
  await GfsLink.ready;
  const racine = document.getElementById('app');
  const emplacement = document.getElementById('calendrier');
  const hebergee = GfsLink.context() !== null;
  const dansGrist = typeof globalThis.grist === 'object' && globalThis.parent !== globalThis;
  const hote = dansGrist
    ? startGrist({ grist: globalThis.grist, racine, emplacement, I18n, GfsLink, creerCalendrier })
    : startDemo({ racine, emplacement, I18n, creerCalendrier });

  const reglages = creerReglages({ I18n, Theme, hebergee, surLangue: () => {}, ouvrirColonnes: hote.openColumns });
  const coin = monterCoin(racine, { t: I18n.t, ouvrirReglages: () => reglages.ouvrir() });
  I18n.onChange(() => { hote.refresh(); coin.retraduire(); reglages.retraduire(); });
  laisserLibre(racine, GfsLink.bar());
  GfsLink.onBar(barre => laisserLibre(racine, barre));
}

demarrer();
