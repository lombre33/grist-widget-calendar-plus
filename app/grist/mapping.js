// La correspondance des colonnes : quel rôle du calendrier (Titre, Début, Fin, Couleur, Personne) lit quelle colonne de la table. Reconnaissance par le nom, puis par le type quand une
// seule colonne convient ; toujours proposée, jamais enregistrée sans un geste. Vérification avant d'afficher ou d'écrire. Pur : aucun Grist, aucun DOM.
import { baseType } from './dates.js';

export const ROLES = ['title', 'start', 'end', 'color', 'person'];
export const REQUIRED = ['title', 'start'];
// Les rôles que l'app écrit : Début et Fin à chaque déplacement, Titre et Début à la saisie rapide. Une colonne à formule y reste lisible, mais l'écriture est refusée et dite.
export const WRITTEN = ['title', 'start', 'end'];

const TYPES = {
  title: ['Text'],
  start: ['Date', 'DateTime'],
  end: ['Date', 'DateTime'],
  color: ['Choice'],
  person: ['Text', 'Choice', 'ChoiceList', 'Ref', 'RefList'],
};

const NAMES = {
  title: ['titre', 'title', 'nom', 'name', 'intitule', 'libelle', 'sujet', 'objet', 'evenement', 'event', 'tache', 'task', 'summary'],
  start: ['debut', 'start', 'date de debut', 'date debut', 'start date', 'starts', 'commence', 'date', 'jour', 'day', 'quand', 'when'],
  end: ['fin', 'end', 'date de fin', 'date fin', 'end date', 'ends', 'echeance', 'due', 'due date', 'deadline', 'jusqu au', 'until'],
  color: ['couleur', 'color', 'colour', 'categorie', 'category', 'type', 'statut', 'status', 'etat'],
  person: ['personne', 'person', 'responsable', 'owner', 'assignee', 'assigne', 'qui', 'who', 'participant', 'participants', 'equipe', 'team'],
};

// Comparaison sans accents, casse ni ponctuation (« Date_de_début » = « date de debut »).
export function normalize(text) {
  return String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/gi, 'oe').replace(/æ/gi, 'ae').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export const accepts = (role, column) => Boolean(column && TYPES[role]?.includes(baseType(column.type)));
const byName = (role, column) => NAMES[role].includes(normalize(column.label)) || NAMES[role].includes(normalize(column.id));

export const emptyMapping = () => Object.fromEntries(ROLES.map(role => [role, null]));

// Rend { mapping, ambiguous } : un rôle que plusieurs colonnes revendiquent par leur nom reste vide, avec ses candidates dans `ambiguous`.
export function recognize(columns) {
  const mapping = emptyMapping();
  const ambiguous = {};
  const taken = new Set();
  const candidates = role => columns.filter(c => accepts(role, c) && !taken.has(c.id));
  const place = (role, column) => { mapping[role] = column.id; taken.add(column.id); };
  for (const role of ROLES) {
    const named = candidates(role).filter(c => byName(role, c));
    if (named.length === 1) place(role, named[0]);
    else if (named.length > 1) ambiguous[role] = named.map(c => c.id);
  }
  // Par le type, seulement là où il n'y a aucun doute : une seule colonne de texte pour le titre, une seule colonne de date pour le début.
  for (const role of ['title', 'start']) {
    if (mapping[role] || ambiguous[role]) continue;
    const list = candidates(role);
    if (list.length === 1) place(role, list[0]);
  }
  return { mapping, ambiguous };
}

// Garde d'une correspondance enregistrée ce qui a encore un sens : un rôle inconnu tombe, une valeur qui n'est pas un texte devient null.
export function cleanMapping(raw) {
  const mapping = emptyMapping();
  if (!raw || typeof raw !== 'object') return mapping;
  for (const role of ROLES) mapping[role] = typeof raw[role] === 'string' && raw[role] ? raw[role] : null;
  return mapping;
}

// { ok, errors: [{ role, colId, reason }], readOnly: [{ role, colId }] } ; reason : 'missing' | 'absent' | 'type' | 'same'.
// Une colonne à formule n'est pas une erreur : elle se lit, et le rôle écrit devient lecture seule (dit à la personne).
export function verify(mapping, columns) {
  const errors = [];
  const readOnly = [];
  for (const role of REQUIRED) if (!mapping?.[role]) errors.push({ role, colId: null, reason: 'missing' });
  for (const role of ROLES) {
    const colId = mapping?.[role];
    if (!colId) continue;
    const column = columns.find(c => c.id === colId);
    if (!column) errors.push({ role, colId, reason: 'absent' });
    else if (!accepts(role, column)) errors.push({ role, colId, reason: 'type' });
    else if (column.isFormula && WRITTEN.includes(role)) readOnly.push({ role, colId });
  }
  if (mapping?.start && mapping.start === mapping.end) errors.push({ role: 'end', colId: mapping.end, reason: 'same' });
  return { ok: errors.length === 0, errors, readOnly };
}

// Les choix d'un rôle dans la fenêtre des colonnes : toutes les colonnes de la table, dans leur ordre ; celles d'un type que le rôle ne lit pas sont grisées avec leur raison, jamais
// retirées ; celle d'un autre rôle est grisée aussi (une colonne ne sert qu'un rôle). « Aucune » est un vrai choix, sauf pour un rôle obligatoire.
export function choicesFor(role, columns, mapping = {}) {
  const usedBy = colId => ROLES.find(other => other !== role && mapping[other] === colId) ?? null;
  const list = columns.map(column => {
    const other = usedBy(column.id);
    const reason = !accepts(role, column) ? 'type' : other ? `used.${other}` : null;
    return { value: column.id, label: column.label, type: baseType(column.type), disabled: reason !== null, reason };
  });
  return [{ value: '', label: null, type: null, disabled: REQUIRED.includes(role), reason: REQUIRED.includes(role) ? 'required' : null }, ...list];
}

// Ce que la correspondance permet, pour griser avec sa raison (jamais masquer).
export function abilities(mapping, columns) {
  const check = verify(mapping, columns);
  const formula = role => check.readOnly.some(r => r.role === role);
  return {
    show: check.ok,
    move: check.ok && !formula('start') && !formula('end'),
    add: check.ok && !formula('title') && !formula('start'),
  };
}
