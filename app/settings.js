// La fenêtre des Réglages : la langue, le thème, les crédits. Dans GFS, la langue se choisit chez GFS : le choix est grisé avec sa raison, jamais masqué (guide des apps, 1.2 point 8).
import { h } from '../kit/js/dom.js';
import { ModalBase } from '../kit/js/modal-base.js';

function picker(options, value, onPick, disabled) {
  const select = h('select', { disabled: disabled || undefined, on: { change: () => onPick(select.value) } }, options.map(([id, text]) => h('option', { value: id, selected: id === value || undefined }, text)));
  return select;
}

export function createSettings({ I18n, Theme, hosted, onLanguage, openColumns = null }) {
  const t = (key, vars) => I18n.t(key, vars);
  const win = ModalBase.create({ id: 'app-settings-window', titleId: 'app-settings-title', size: 'sm' });
  const close = h('button', { type: 'button', class: 'pp-modal-primary', on: { click: () => win.hide() } });
  win.actions.append(h('span', { class: 'pp-modal-spacer' }), close);

  function fill() {
    win.title.textContent = t('app.settingsTitle');
    close.textContent = t('app.close');
    const language = h('div', { class: 'settings-group' }, h('h4', null, t('app.language')),
      picker([['fr', t('app.languageFr')], ['en', t('app.languageEn')]], I18n.language, choice => { I18n.setLanguage(choice); I18n.store(choice); onLanguage(choice); }, hosted),
      hosted ? h('p', { class: 'settings-reason' }, t('app.languageGfs')) : null);
    const theme = h('div', { class: 'settings-group' }, h('h4', null, t('app.theme')),
      picker([['system', t('app.themeSystem')], ['light', t('app.themeLight')], ['dark', t('app.themeDark')]], Theme.choice, choice => Theme.set(choice), false));
    const credits = h('div', { class: 'settings-group' }, h('h4', null, t('app.credits')), h('dl', { class: 'settings-credits' },
      h('dt', null, t('app.publisher')), h('dd', null, 'Grist Factory'),
      h('dt', null, t('app.website')), h('dd', null, h('a', { href: 'https://grist-factory.fr', target: '_blank', rel: 'noopener noreferrer' }, 'grist-factory.fr')),
      h('dt', null, t('app.license')), h('dd', null, 'GNU GPL v3.0')));
    // Dans Grist : la table et les colonnes que lit le calendrier (la fenêtre des colonnes, qui n'enregistre qu'à son bouton « Enregistrer »).
    const columns = openColumns ? h('div', { class: 'settings-group' }, h('h4', null, t('col.title')),
      h('button', { type: 'button', id: 'app-open-columns', on: { click: () => { win.hide(); openColumns(); } } }, t('col.open'))) : null;
    win.body.replaceChildren(...[columns, language, theme, credits].filter(Boolean));
  }
  return {
    open() { fill(); win.show(); },
    retranslate() { if (win.isOpen()) fill(); },
  };
}
