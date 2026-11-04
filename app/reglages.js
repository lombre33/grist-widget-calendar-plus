// La fenêtre des Réglages : la langue, le thème, les crédits. Dans GFS, la langue se choisit chez GFS : le choix est grisé avec sa raison, jamais masqué (guide des apps, 1.2 point 8).
import { h } from '../kit/js/dom.js';
import { ModalBase } from '../kit/js/modal-base.js';

function liste(options, valeur, surChangement, desactive) {
  const choix = h('select', { disabled: desactive || undefined, on: { change: () => surChangement(choix.value) } }, options.map(([id, texte]) => h('option', { value: id, selected: id === valeur || undefined }, texte)));
  return choix;
}

export function creerReglages({ I18n, Theme, hebergee, surLangue }) {
  const t = (cle, variables) => I18n.t(cle, variables);
  const fenetre = ModalBase.create({ id: 'app-fenetre-reglages', titleId: 'app-reglages-titre', size: 'sm' });
  const fermer = h('button', { type: 'button', class: 'pp-modal-primary', on: { click: () => fenetre.hide() } });
  fenetre.actions.append(h('span', { class: 'pp-modal-spacer' }), fermer);

  function remplir() {
    fenetre.title.textContent = t('app.reglagesTitre');
    fermer.textContent = t('app.fermer');
    const langue = h('div', { class: 'reglages-groupe' }, h('h4', null, t('app.langue')),
      liste([['fr', t('app.langueFr')], ['en', t('app.langueEn')]], I18n.language, choix => { I18n.setLanguage(choix); I18n.store(choix); surLangue(choix); }, hebergee),
      hebergee ? h('p', { class: 'reglages-raison' }, t('app.langueGfs')) : null);
    const theme = h('div', { class: 'reglages-groupe' }, h('h4', null, t('app.theme')),
      liste([['system', t('app.themeSysteme')], ['light', t('app.themeClair')], ['dark', t('app.themeSombre')]], Theme.choice, choix => Theme.set(choix), false));
    const credits = h('div', { class: 'reglages-groupe' }, h('h4', null, t('app.credits')), h('dl', { class: 'reglages-credits' },
      h('dt', null, t('app.editeur')), h('dd', null, 'Grist Factory'),
      h('dt', null, t('app.site')), h('dd', null, h('a', { href: 'https://grist-factory.fr', target: '_blank', rel: 'noopener noreferrer' }, 'grist-factory.fr')),
      h('dt', null, t('app.licence')), h('dd', null, 'GNU GPL v3.0')));
    fenetre.body.replaceChildren(langue, theme, credits);
  }
  return {
    ouvrir() { remplir(); fenetre.show(); },
    retraduire() { if (fenetre.isOpen()) remplir(); },
  };
}
