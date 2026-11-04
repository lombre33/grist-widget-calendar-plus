// Point d'entrée de Calendrier+ seul : thème et langue d'abord (sinon la page s'affiche en clair, en français, puis bascule), l'ambiance de GFS, le lien avec GFS, puis le calendrier.
// Cette version montre le module sur des lignes de démonstration ; la connexion aux tables de Grist vient ensuite (docs/plan.md, lot 7).
import { Ambiance } from '../kit/js/ambiance.js';
import { h } from '../kit/js/dom.js';
import { GfsLink } from '../kit/js/gfs-link.js';
import { I18n } from '../kit/js/i18n.js';
import { Theme } from '../kit/js/theme.js';
import { creerCalendrier } from '../calendrier/index.js';
import { monterCoin, laisserLibre } from './chrome.js';
import { lignesDeDemonstration } from './demo.js';
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
  let lignes = lignesDeDemonstration();
  let calendrier = null;

  const rafraichir = () => calendrier.definir({ lignes, options: { langue: I18n.language } });
  calendrier = creerCalendrier({
    onOuvrir: () => {},
    onDeplacer: async ({ id, debut, fin }) => { lignes = lignes.map(ligne => (ligne.id === id ? { ...ligne, debut, fin } : ligne)); rafraichir(); },
    onAjouter: async ({ debut, titre }) => { lignes = [...lignes, { id: Date.now(), titre, debut }]; rafraichir(); },
  });
  emplacement.append(calendrier.element);
  rafraichir();
  racine.append(h('div', { class: 'demo-bandeau', role: 'status' }, I18n.t(dansGrist ? 'app.demoGrist' : 'app.demo')));

  const reglages = creerReglages({ I18n, Theme, hebergee, surLangue: () => {} });
  const coin = monterCoin(racine, { t: I18n.t, ouvrirReglages: () => reglages.ouvrir() });
  I18n.onChange(() => { rafraichir(); coin.retraduire(); reglages.retraduire(); });
  laisserLibre(racine, GfsLink.bar());
  GfsLink.onBar(barre => laisserLibre(racine, barre));
}

demarrer();
