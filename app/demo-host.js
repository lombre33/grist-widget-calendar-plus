// L'hôte hors de Grist : le module sur des lignes de démonstration, qui bougent en mémoire seulement. Rien n'est écrit nulle part, et le bandeau le dit.
import { h } from '../kit/js/dom.js';
import { lignesDeDemonstration } from './demo.js';

export function startDemo({ racine, emplacement, I18n, creerCalendrier }) {
  let lignes = lignesDeDemonstration();
  let calendrier = null;
  const refresh = () => calendrier.definir({ lignes, options: { langue: I18n.language } });
  calendrier = creerCalendrier({
    onOuvrir: () => {},
    onDeplacer: async ({ id, debut, fin }) => { lignes = lignes.map(ligne => (ligne.id === id ? { ...ligne, debut, fin } : ligne)); refresh(); },
    onAjouter: async ({ debut, titre }) => { lignes = [...lignes, { id: Date.now(), titre, debut }]; refresh(); },
  });
  emplacement.append(calendrier.element);
  refresh();
  const bandeau = h('div', { class: 'demo-bandeau', role: 'status' }, I18n.t('app.demo'));
  racine.append(bandeau);
  return {
    openColumns: null,
    refresh() { refresh(); bandeau.textContent = I18n.t('app.demo'); },
  };
}
