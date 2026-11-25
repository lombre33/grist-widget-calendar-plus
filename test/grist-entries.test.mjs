// Des lignes de Grist aux lignes du module, et des gestes aux actions (app/grist/entries.js), puis la réponse à « fermer » (app/grist/pending.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addAction, moveAction, refusalReason, toLines } from '../app/grist/entries.js';
import { answerClose, createPending } from '../app/grist/pending.js';

const utc = (y, m, d, hh = 0, mm = 0) => Date.UTC(y, m - 1, d, hh, mm) / 1000;
const col = (id, type, extra = {}) => ({ id, label: id, type, isFormula: false, choices: [], ...extra });
const columns = [
  col('Titre', 'Text'), col('Debut', 'Date'), col('Fin', 'Date'),
  col('Type', 'Choice', { choices: [{ value: 'Réunion', fill: '#dff5e8', text: '#146c48' }, { value: 'Autre', fill: null, text: null }] }),
  col('Qui', 'RefList:Gens', { target: 'Gens' }), col('Heure', 'DateTime:Europe/Paris'), col('Calcul', 'Date', { isFormula: true }), col('Noms', 'ChoiceList'),
];
const mapping = { title: 'Titre', start: 'Debut', end: 'Fin', color: 'Type', person: 'Qui' };

test('toLines : jours, fin incluse, couleur du choix, personnes nommées par la référence', () => {
  const rows = [{ id: 1, Titre: 'Atelier', Debut: utc(2026, 11, 3), Fin: utc(2026, 11, 5), Type: 'Réunion', Qui: ['L', 1, 2, 9] }];
  const { lines, unreadable } = toLines(rows, { mapping, columns, refLabels: new Map([[1, 'Ada'], [2, 'Linus']]) });
  assert.equal(unreadable, 0);
  assert.deepEqual(lines, [{ id: 1, titre: 'Atelier', debut: '2026-11-03', fin: '2026-11-05', avecHeure: false, couleur: { fond: '#dff5e8', texte: '#146c48' }, responsables: ['Ada', 'Linus', '#9'], modifiable: true }]);
});

test('toLines : sans date va au plateau, choix sans couleur, vides', () => {
  const rows = [{ id: 2, Titre: null, Debut: null, Fin: 0, Type: 'Autre', Qui: null }];
  const [line] = toLines(rows, { mapping, columns }).lines;
  assert.deepEqual([line.titre, line.debut, line.fin, line.couleur, line.responsables], ['', null, null, null, []]);
});

test('toLines : une date illisible écarte la ligne et la compte, jamais placée au hasard', () => {
  const rows = [{ id: 3, Titre: 'A', Debut: 'mardi prochain' }, { id: 4, Titre: 'B', Debut: ['E', 'TypeError'] }, { id: 5, Titre: 'C', Debut: utc(2026, 1, 1) }];
  const { lines, unreadable } = toLines(rows, { mapping, columns });
  assert.equal(unreadable, 2);
  assert.deepEqual(lines.map(l => l.id), [5]);
});

test('toLines : DateTime donne l\'heure du fuseau et avecHeure ; personnes en texte, choix multiples ; lecture seule', () => {
  const rows = [{ id: 6, Titre: 'Point', Heure: utc(2026, 7, 1, 7, 0), Noms: ['L', 'Ada', 'Linus'] }];
  const [line] = toLines(rows, { mapping: { title: 'Titre', start: 'Heure', person: 'Noms' }, columns, canMove: false }).lines;
  assert.equal(line.debut, '2026-07-01T09:00');
  assert.equal(line.avecHeure, true);
  assert.deepEqual(line.responsables, ['Ada', 'Linus']);
  assert.equal(line.modifiable, false);
});

test('moveAction : Début et Fin seulement, en secondes de Grist', () => {
  const previous = { id: 1, Titre: 'Atelier', Debut: utc(2026, 11, 3), Fin: utc(2026, 11, 5), Type: 'Réunion' };
  assert.deepEqual(moveAction('Evenements', previous, { debut: '2026-11-10', fin: '2026-11-12' }, { mapping, columns }),
    ['UpdateRecord', 'Evenements', 1, { Debut: utc(2026, 11, 10), Fin: utc(2026, 11, 12) }]);
});

test('moveAction : une ligne sans Fin n\'en reçoit pas pour un jour, mais en reçoit une quand le geste donne une durée', () => {
  const previous = { id: 2, Debut: utc(2026, 11, 3), Fin: null };
  assert.deepEqual(moveAction('E', previous, { debut: '2026-11-04', fin: '2026-11-04' }, { mapping, columns })[3], { Debut: utc(2026, 11, 4) });
  assert.deepEqual(moveAction('E', previous, { debut: '2026-11-04', fin: '2026-11-06' }, { mapping, columns })[3], { Debut: utc(2026, 11, 4), Fin: utc(2026, 11, 6) });
  assert.deepEqual(moveAction('E', previous, { debut: '2026-11-04', fin: '2026-11-04' }, { mapping: { ...mapping, end: null }, columns })[3], { Debut: utc(2026, 11, 4) }, 'Fin non reliée : jamais écrite');
});

test('moveAction : DateTime à l\'heure donnée, ou à l\'heure d\'avant pour un jour sans heure', () => {
  const m = { title: 'Titre', start: 'Heure' };
  const previous = { id: 3, Heure: utc(2026, 7, 1, 7, 0) };
  assert.deepEqual(moveAction('E', previous, { debut: '2026-07-02T14:15', fin: '2026-07-02T15:15' }, { mapping: m, columns })[3], { Heure: utc(2026, 7, 2, 12, 15) });
  assert.deepEqual(moveAction('E', previous, { debut: '2026-12-02', fin: '2026-12-02' }, { mapping: m, columns })[3], { Heure: utc(2026, 12, 2, 8, 0) }, '9 h à Paris, en hiver');
});

test('moveAction : refusé sur une colonne à formule ou une correspondance incomplète, sans action', () => {
  assert.throws(() => moveAction('E', { id: 1 }, { debut: '2026-01-01', fin: '2026-01-01' }, { mapping: { title: 'Titre', start: 'Calcul' }, columns }), /formule/);
  assert.throws(() => moveAction('E', { id: 1 }, { debut: '2026-01-01', fin: '2026-01-01' }, { mapping: { title: 'Titre' }, columns }), /incomplète/);
  assert.throws(() => moveAction('E', { id: 1 }, { debut: '2026-02-30', fin: '2026-02-30' }, { mapping, columns }), /illisible/);
});

test('addAction : titre et début seulement ; titre vide refusé', () => {
  assert.deepEqual(addAction('E', { debut: '2026-11-19', titre: '  Revue  ' }, { mapping, columns }), ['AddRecord', 'E', null, { Titre: 'Revue', Debut: utc(2026, 11, 19) }]);
  assert.deepEqual(addAction('E', { debut: '2026-07-01T10:30', titre: 'Point' }, { mapping: { title: 'Titre', start: 'Heure' }, columns })[3], { Titre: 'Point', Heure: utc(2026, 7, 1, 8, 30) });
  assert.throws(() => addAction('E', { debut: '2026-11-19', titre: '   ' }, { mapping, columns }), /titre vide/);
});

test('refusalReason : la raison lisible d\'un refus de Grist', () => {
  assert.equal(refusalReason(new Error('Blocked by access rules')), 'refusal.rights');
  assert.equal(refusalReason(new Error('écriture refusée : start (colonne à formule)')), 'refusal.formula');
  assert.equal(refusalReason(new Error('Invalid column "Debut"')), 'refusal.column');
  assert.equal(refusalReason('autre chose'), 'refusal.other');
});

test('fermer : oui tout de suite sans écriture en cours ; après la fin d\'une écriture ; non si elle ne finit pas à temps', async () => {
  const pending = createPending();
  assert.equal(await answerClose(pending, 50), true);
  let finish;
  pending.track(new Promise(resolve => { finish = resolve; }));
  assert.equal(pending.count, 1);
  setTimeout(() => finish(), 10);
  assert.equal(await answerClose(pending, 1000), true);
  assert.equal(pending.count, 0);
  pending.track(new Promise(() => {}));
  assert.equal(await answerClose(pending, 20), false);
});

test('fermer : une écriture refusée ne retient pas l\'app, et son refus reste celui de l\'appelant', async () => {
  const pending = createPending();
  const tracked = pending.track(Promise.reject(new Error('refusé')));
  await assert.rejects(tracked, /refusé/);
  assert.equal(await answerClose(pending, 50), true);
});
