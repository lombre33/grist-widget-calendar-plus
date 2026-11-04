// Les lignes de démonstration (hors de Grist) : des dates relatives à aujourd'hui, pour que le calendrier ne s'ouvre jamais sur un mois vide. Rien n'est écrit nulle part.
import { ajouterJours, aujourdhui, debutDeSemaine } from '../kit/js/calendrier/noyau/dates.js';

export function lignesDeDemonstration(maintenant) {
  const lundi = debutDeSemaine(aujourdhui(maintenant));
  const jour = n => ajouterJours(lundi, n);
  return [
    { id: 1, titre: 'Rédiger le cahier des charges', debut: jour(-2), fin: jour(2), couleur: { fond: '#dff5e8', texte: '#146c48' } },
    { id: 2, titre: 'Arbitrage budget', debut: jour(1), couleur: { fond: '#fdf0d5', texte: '#8a5a00' } },
    { id: 3, titre: 'Point d\'équipe', debut: `${jour(1)}T09:30`, fin: `${jour(1)}T10:30` },
    { id: 4, titre: 'Atelier maquettes', debut: `${jour(1)}T10:00`, fin: `${jour(1)}T12:00` },
    { id: 5, titre: 'Choix de l\'hébergeur', debut: jour(8), couleur: { fond: '#fde3e3', texte: '#c53030' } },
    { id: 6, titre: 'Charte graphique', debut: jour(10), fin: jour(12) },
    { id: 7, titre: 'Tests utilisateurs', debut: jour(16) },
    { id: 8, titre: 'À planifier : revue de contenu' },
    { id: 9, titre: 'À planifier : sauvegarde' },
  ];
}
