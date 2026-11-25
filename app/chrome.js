// Le coin haut droit de l'app, selon la charte Grist Factory (section 1, « Marque ») : le logo en rond de 20 px, et la roue des Réglages juste avant lui. La barre de GFS, quand elle
// recouvre un bord du cadre, est laissée libre par une gouttière de son épaisseur (le logo et la roue suivent, puisqu'ils sont ancrés sur le cadre).
import { h } from '../kit/js/dom.js';

const EDGES = { haut: '--app-gutter-top', droite: '--app-gutter-right', bas: '--app-gutter-bottom', gauche: '--app-gutter-left' };

export function mountCorner(root, { t, openSettings }) {
  const gear = h('button', { type: 'button', id: 'app-settings', title: t('app.settings'), 'aria-label': t('app.settings'), on: { click: openSettings } });
  const logo = h('img', { id: 'app-logo', src: 'img/grist-factory-logo.jpg', alt: t('app.logo'), width: '20', height: '20' });
  root.append(gear, logo);
  return {
    retranslate() {
      gear.title = t('app.settings');
      gear.setAttribute('aria-label', t('app.settings'));
      logo.alt = t('app.logo');
    },
  };
}

// Ce que la barre de GFS recouvre ({ bord, epaisseur, zone }, ou null) : une gouttière du côté du bord, de l'épaisseur de la barre.
export function keepClear(root, bar) {
  for (const cssVar of Object.values(EDGES)) root.style.setProperty(cssVar, '0px');
  if (bar && EDGES[bar.bord]) root.style.setProperty(EDGES[bar.bord], `${Math.round(bar.epaisseur)}px`);
}
