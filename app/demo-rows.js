// Les lignes de démonstration (hors de Grist) : des dates relatives à aujourd'hui, pour que le calendrier ne s'ouvre jamais sur un mois vide. Rien n'est écrit nulle part.
import { ajouterJours, aujourdhui, debutDeSemaine } from '../kit/js/calendrier/noyau/dates.js';

export function demoRows(now) {
  const monday = debutDeSemaine(aujourdhui(now));
  const day = n => ajouterJours(monday, n);
  return [
    { id: 1, titre: 'Rédiger le cahier des charges', debut: day(-2), fin: day(2), couleur: { fond: '#dff5e8', texte: '#146c48' } },
    { id: 2, titre: 'Arbitrage budget', debut: day(1), couleur: { fond: '#fdf0d5', texte: '#8a5a00' } },
    { id: 3, titre: 'Point d\'équipe', debut: `${day(1)}T09:30`, fin: `${day(1)}T10:30` },
    { id: 4, titre: 'Atelier maquettes', debut: `${day(1)}T10:00`, fin: `${day(1)}T12:00` },
    { id: 5, titre: 'Choix de l\'hébergeur', debut: day(8), couleur: { fond: '#fde3e3', texte: '#c53030' } },
    { id: 6, titre: 'Charte graphique', debut: day(10), fin: day(12) },
    { id: 7, titre: 'Tests utilisateurs', debut: day(16) },
    { id: 8, titre: 'À planifier : revue de contenu' },
    { id: 9, titre: 'À planifier : sauvegarde' },
  ];
}
