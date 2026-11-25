// L'hôte hors de Grist : le module sur des lignes de démonstration, qui bougent en mémoire seulement. Rien n'est écrit nulle part, et le bandeau le dit.
import { h } from '../kit/js/dom.js';
import { demoRows } from './demo-rows.js';

export function startDemo({ root, slot, I18n, creerCalendrier }) {
  let rows = demoRows();
  let calendar = null;
  const refresh = () => calendar.definir({ lignes: rows, options: { langue: I18n.language } });
  calendar = creerCalendrier({
    onOuvrir: () => {},
    onDeplacer: async ({ id, debut, fin }) => { rows = rows.map(row => (row.id === id ? { ...row, debut, fin } : row)); refresh(); },
    onAjouter: async ({ debut, titre }) => { rows = [...rows, { id: Date.now(), titre, debut }]; refresh(); },
  });
  slot.append(calendar.element);
  refresh();
  const banner = h('div', { class: 'demo-banner', role: 'status' }, I18n.t('app.demo'));
  root.append(banner);
  return {
    openColumns: null,
    refresh() { refresh(); banner.textContent = I18n.t('app.demo'); },
  };
}
