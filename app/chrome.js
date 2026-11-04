// Le coin haut droit de l'app, selon la charte Grist Factory (section 1, « Marque ») : le logo en rond de 20 px, et la roue des Réglages juste avant lui. La barre de GFS, quand elle
// recouvre un bord du cadre, est laissée libre par une gouttière de son épaisseur (le logo et la roue suivent, puisqu'ils sont ancrés sur le cadre).
import { h } from '../kit/js/dom.js';

const BORDS = { haut: '--app-g-haut', droite: '--app-g-droite', bas: '--app-g-bas', gauche: '--app-g-gauche' };

export function monterCoin(racine, { t, ouvrirReglages }) {
  const roue = h('button', { type: 'button', id: 'app-reglages', title: t('app.reglages'), 'aria-label': t('app.reglages'), on: { click: ouvrirReglages } });
  const logo = h('img', { id: 'app-logo', src: 'img/grist-factory-logo.jpg', alt: t('app.logo'), width: '20', height: '20' });
  racine.append(roue, logo);
  return {
    retraduire() {
      roue.title = t('app.reglages');
      roue.setAttribute('aria-label', t('app.reglages'));
      logo.alt = t('app.logo');
    },
  };
}

// Ce que la barre de GFS recouvre ({ bord, epaisseur, zone }, ou null) : une gouttière du côté du bord, de l'épaisseur de la barre.
export function laisserLibre(racine, barre) {
  for (const variable of Object.values(BORDS)) racine.style.setProperty(variable, '0px');
  if (barre && BORDS[barre.bord]) racine.style.setProperty(BORDS[barre.bord], `${Math.round(barre.epaisseur)}px`);
}
