// Des lignes de Grist aux lignes du module ({ id, titre, debut, fin, avecHeure, couleur, responsables, modifiable }, docs/plan.md section 3), et des gestes du module aux actions
// de Grist. On n'écrit que Début et Fin à un déplacement, Titre et Début à une saisie rapide ; jamais une colonne absente, à formule, ou non reliée. Pur : aucun Grist, aucun DOM.
import { baseType, fromGrist, toGrist } from './dates.js';
import { verify } from './mapping.js';

const EMPTY = value => value === null || value === undefined || value === '';
const isList = value => Array.isArray(value) && value[0] === 'L';
const listItems = value => (isList(value) ? value.slice(1) : Array.isArray(value) ? value : EMPTY(value) ? [] : [value]);

// Une valeur de date que Grist garde telle quelle sans pouvoir la lire (texte tapé dans une colonne Date, erreur de formule) : la ligne est écartée et comptée, jamais placée au hasard.
const unreadableDate = value => !EMPTY(value) && typeof value !== 'number';

function textOf(value) {
  if (EMPTY(value)) return '';
  if (Array.isArray(value)) return isList(value) ? value.slice(1).join(', ') : '';
  return String(value);
}

function colorOf(value, column) {
  if (!column || EMPTY(value)) return null;
  const choice = column.choices.find(c => c.value === String(value));
  return choice && (choice.fill || choice.text) ? { fond: choice.fill, texte: choice.text } : null;
}

function peopleOf(value, column, labels) {
  if (!column || EMPTY(value)) return [];
  const base = baseType(column.type);
  const items = listItems(value);
  if (base === 'Ref' || base === 'RefList') return items.filter(id => typeof id === 'number' && id > 0).map(id => labels?.get(id) ?? `#${id}`);
  return items.filter(item => !EMPTY(item)).map(String);
}

// rows : lignes de `fetchTable` ; columns : celles de la table (model.js) ; refLabels : Map(identifiant → texte) de la colonne Personne quand c'est une Référence.
// Rend { lines, unreadable } : `unreadable` compte les lignes écartées pour une date illisible (l'hôte le dit).
export function toLines(rows, { mapping, columns, refLabels = null, canMove = true }) {
  const col = role => (mapping[role] ? columns.find(c => c.id === mapping[role]) ?? null : null);
  const [title, start, end, color, person] = ['title', 'start', 'end', 'color', 'person'].map(col);
  const lines = [];
  let unreadable = 0;
  for (const row of rows) {
    const rawStart = start ? row[start.id] : null;
    const rawEnd = end ? row[end.id] : null;
    if (unreadableDate(rawStart) || unreadableDate(rawEnd)) { unreadable++; continue; }
    const debut = start ? fromGrist(rawStart, start.type) : null;
    const fin = end ? fromGrist(rawEnd, end.type) : null;
    lines.push({
      id: row.id, titre: title ? textOf(row[title.id]) : '', debut, fin,
      avecHeure: Boolean((debut && debut.includes('T')) || (fin && fin.includes('T'))),
      couleur: color ? colorOf(row[color.id], color) : null,
      responsables: person ? peopleOf(row[person.id], person, refLabels) : [],
      modifiable: canMove,
    });
  }
  return { lines, unreadable };
}

function writableColumn(mapping, columns, role) {
  const colId = mapping[role];
  const column = colId ? columns.find(c => c.id === colId) : null;
  if (!column) throw new Error(`écriture refusée : ${role} (colonne absente)`);
  if (column.isFormula) throw new Error(`écriture refusée : ${role} (colonne à formule)`);
  return column;
}

function assertUsable(mapping, columns) {
  if (!verify(mapping, columns).ok) throw new Error('écriture refusée : correspondance incomplète');
}

// Un déplacement : Début reçoit `debut` ; Fin reçoit `fin` si elle est reliée et que la ligne en avait une, ou que le geste donne une durée (fin différente du début).
// `previous` : la ligne de Grist avant le geste, pour garder l'heure d'une colonne DateTime quand le module rend un jour sans heure.
export function moveAction(tableId, previous, { debut, fin }, { mapping, columns }) {
  assertUsable(mapping, columns);
  const values = {};
  const start = writableColumn(mapping, columns, 'start');
  values[start.id] = toGrist(debut, start.type, previous?.[start.id]);
  if (mapping.end) {
    const hadEnd = typeof previous?.[mapping.end] === 'number' && previous[mapping.end] !== 0;
    if (hadEnd || (!EMPTY(fin) && fin !== debut)) {
      const end = writableColumn(mapping, columns, 'end');
      values[end.id] = toGrist(fin || debut, end.type, previous?.[end.id]);
    }
  }
  return ['UpdateRecord', tableId, previous.id, values];
}

// Une saisie rapide : une ligne neuve avec son titre et son début ; rien d'autre n'est écrit (la fiche complète reste à Grist).
export function addAction(tableId, { debut, titre }, { mapping, columns }) {
  assertUsable(mapping, columns);
  const name = typeof titre === 'string' ? titre.trim() : '';
  if (!name) throw new Error('écriture refusée : titre vide');
  const title = writableColumn(mapping, columns, 'title');
  const start = writableColumn(mapping, columns, 'start');
  return ['AddRecord', tableId, null, { [title.id]: name, [start.id]: toGrist(debut, start.type) }];
}

// Un refus de Grist en clé de message : la personne lit pourquoi, jamais le texte brut de l'erreur.
export function refusalReason(error) {
  const text = String(error?.message ?? error ?? '');
  if (/formula|formule/i.test(text)) return 'refus.formule';
  if (/access|permission|denied|read-only|readonly|blocked by access rules/i.test(text)) return 'refus.droit';
  if (/table introuvable|column .* not found|KeyError|Invalid column|absente/i.test(text)) return 'refus.colonne';
  return 'refus.autre';
}
