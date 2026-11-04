// La page d'essai : monte le module comme le ferait un hôte, garde les appels reçus dans `essai.appels` et laisse les essais choisir les lignes, les options et la réponse de l'hôte.
import { creerCalendrier } from '/calendrier/index.js';

const essai = { appels: [], reponse: 'ok' };
const noter = (nom, valeur) => { essai.appels.push({ nom, valeur }); };
const calendrier = creerCalendrier({
  onOuvrir: id => noter('ouvrir', id),
  onDeplacer: async resultat => { noter('deplacer', resultat); if (essai.reponse === 'refus') return false; if (essai.reponse === 'erreur') throw new Error('non'); return true; },
  onAjouter: async demande => { noter('ajouter', demande); if (essai.reponse === 'refus') throw new Error('non'); return true; },
  onEtat: etat => noter('etat', etat),
});
document.getElementById('cadre').append(calendrier.element);
essai.calendrier = calendrier;
globalThis.essai = essai;
