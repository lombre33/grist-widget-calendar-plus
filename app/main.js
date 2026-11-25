// Point d'entrée de Calendrier+ seul : thème et langue d'abord (sinon la page s'affiche en clair, en français, puis bascule), l'ambiance de GFS, le lien avec GFS, puis le calendrier.
// Dans Grist, le calendrier lit la table choisie et écrit Début et Fin (adaptateur de app/grist/, docs/plan.md lot 7) ; hors de Grist, il montre des lignes de démonstration.
// Le relais des appels que la politique de sécurité de la page bloque (règle S8, kit 0.25.0) : en tête, avant que les autres modules s'évaluent.
import '../kit/js/violations-start.js';
import { Ambiance } from '../kit/js/ambiance.js';
import { GfsLink } from '../kit/js/gfs-link.js';
import { I18n } from '../kit/js/i18n.js';
import { Theme } from '../kit/js/theme.js';
import { creerCalendrier } from '../kit/js/calendrier/index.js';
import { mountCorner, keepClear } from './chrome.js';
import { startDemo } from './demo-host.js';
import { startGrist } from './grist-host.js';
import { createSettings } from './settings.js';
import { TEXTS } from './texts.js';

Theme.init({ storageKey: 'cal_theme' });
I18n.add(TEXTS);
I18n.init({ storageKey: 'cal_lang' });
I18n.translateDom();
GfsLink.onLanguage(language => I18n.setLanguage(language));
Ambiance.start();

async function start() {
  await GfsLink.ready;
  const root = document.getElementById('app');
  const slot = document.getElementById('calendar');
  const hosted = GfsLink.context() !== null;
  const inGrist = typeof globalThis.grist === 'object' && globalThis.parent !== globalThis;
  const host = inGrist
    ? startGrist({ grist: globalThis.grist, root, slot, I18n, GfsLink, creerCalendrier })
    : startDemo({ root, slot, I18n, creerCalendrier });

  const settings = createSettings({ I18n, Theme, hosted, onLanguage: () => {}, openColumns: host.openColumns });
  const corner = mountCorner(root, { t: I18n.t, openSettings: () => settings.open() });
  I18n.onChange(() => { host.refresh(); corner.retranslate(); settings.retranslate(); });
  keepClear(root, GfsLink.bar());
  GfsLink.onBar(bar => keepClear(root, bar));
}

start();
