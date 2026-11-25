// La correspondance des colonnes (app/grist/mapping.js) et la lecture du schéma (app/grist/model.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abilities, accepts, choicesFor, cleanMapping, normalize, recognize, verify } from '../app/grist/mapping.js';
import { docModel, isHidden, parseOptions, rowsOf, targetTable } from '../app/grist/model.js';

const col = (id, type, extra = {}) => ({ id, label: extra.label ?? id, type, isFormula: false, choices: [], ...extra });

test('normalize : sans accents, casse ni ponctuation', () => {
  assert.equal(normalize('Date_de_Début'), 'date de debut');
  assert.equal(normalize('  ÉCHÉANCE! '), 'echeance');
  assert.equal(normalize(null), '');
});

test('accepts : chaque rôle ne lit que ses types', () => {
  assert.ok(accepts('title', col('T', 'Text')));
  assert.ok(!accepts('title', col('T', 'Numeric')));
  assert.ok(accepts('start', col('D', 'Date')) && accepts('start', col('D', 'DateTime:Europe/Paris')));
  assert.ok(!accepts('start', col('D', 'Text')));
  assert.ok(accepts('color', col('C', 'Choice')) && !accepts('color', col('C', 'ChoiceList')));
  for (const type of ['Text', 'Choice', 'ChoiceList', 'Ref:Gens', 'RefList:Gens']) assert.ok(accepts('person', col('P', type)), type);
  assert.ok(!accepts('person', col('P', 'Date')));
  assert.ok(!accepts('title', null));
});

test('recognize : par le nom, en français et en anglais', () => {
  const fr = recognize([col('Titre', 'Text'), col('Debut', 'Date'), col('Fin', 'Date'), col('Statut', 'Choice'), col('Responsable', 'Ref:Gens')]);
  assert.deepEqual(fr.mapping, { title: 'Titre', start: 'Debut', end: 'Fin', color: 'Statut', person: 'Responsable' });
  const en = recognize([col('Name', 'Text'), col('Start_Date', 'DateTime:UTC', { label: 'Start date' }), col('End', 'DateTime:UTC'), col('Owner', 'Text')]);
  assert.deepEqual(en.mapping, { title: 'Name', start: 'Start_Date', end: 'End', color: null, person: 'Owner' });
});

test('recognize : par le type quand une seule colonne convient, jamais pour Fin, Couleur ni Personne', () => {
  const { mapping } = recognize([col('Libre', 'Text'), col('Quand_exactement', 'Date'), col('Autre', 'Choice')]);
  assert.equal(mapping.title, 'Libre');
  assert.equal(mapping.start, 'Quand_exactement');
  assert.equal(mapping.end, null);
  assert.equal(mapping.color, null);
});

test('recognize : deux colonnes au même nom reconnu restent un choix à faire', () => {
  const { mapping, ambiguous } = recognize([col('Titre', 'Text'), col('Debut', 'Date'), col('Start', 'Date')]);
  assert.equal(mapping.start, null);
  assert.deepEqual(ambiguous.start, ['Debut', 'Start']);
  const deux = recognize([col('A', 'Date'), col('B', 'Date'), col('Titre', 'Text')]);
  assert.equal(deux.mapping.start, null, 'deux dates sans nom reconnu : aucune n\'est prise');
});

test('recognize : une colonne ne sert qu\'un rôle', () => {
  const { mapping } = recognize([col('Titre', 'Text'), col('Date', 'Date')]);
  assert.equal(mapping.start, 'Date');
  assert.equal(mapping.end, null);
});

test('verify : obligatoires, colonne absente, type, Début = Fin, formule en lecture seule', () => {
  const columns = [col('T', 'Text'), col('D', 'Date'), col('F', 'Date', { isFormula: true }), col('N', 'Numeric')];
  assert.deepEqual(verify(cleanMapping({}), columns).errors.map(e => [e.role, e.reason]), [['title', 'missing'], ['start', 'missing']]);
  assert.deepEqual(verify({ title: 'T', start: 'X' }, columns).errors.map(e => e.reason), ['absent']);
  assert.deepEqual(verify({ title: 'N', start: 'D' }, columns).errors.map(e => e.reason), ['type']);
  assert.deepEqual(verify({ title: 'T', start: 'D', end: 'D' }, columns).errors.map(e => e.reason), ['same']);
  const formula = verify({ title: 'T', start: 'D', end: 'F' }, columns);
  assert.equal(formula.ok, true);
  assert.deepEqual(formula.readOnly, [{ role: 'end', colId: 'F' }]);
});

test('abilities : une formule sur Début ou Fin interdit le glisser, sur Titre la saisie rapide', () => {
  const columns = [col('T', 'Text'), col('TF', 'Text', { isFormula: true }), col('D', 'Date'), col('DF', 'Date', { isFormula: true })];
  assert.deepEqual(abilities({ title: 'T', start: 'D' }, columns), { show: true, move: true, add: true });
  assert.deepEqual(abilities({ title: 'T', start: 'DF' }, columns), { show: true, move: false, add: false });
  assert.deepEqual(abilities({ title: 'TF', start: 'D' }, columns), { show: true, move: true, add: false });
  assert.deepEqual(abilities({ title: null, start: 'D' }, columns), { show: false, move: false, add: false });
});

test('cleanMapping : seuls les rôles connus, en textes', () => {
  assert.deepEqual(cleanMapping({ title: 'T', start: 3, bidon: 'X' }), { title: 'T', start: null, end: null, color: null, person: null });
  assert.deepEqual(cleanMapping('pas un objet'), { title: null, start: null, end: null, color: null, person: null });
});

test('choicesFor : toutes les colonnes, grisées avec leur raison, jamais retirées', () => {
  const columns = [col('T', 'Text'), col('D', 'Date'), col('F', 'Date')];
  const start = choicesFor('start', columns, { title: 'T', start: 'D', end: 'F' });
  assert.deepEqual(start.map(c => [c.value, c.disabled, c.reason]), [['', true, 'required'], ['T', true, 'type'], ['D', false, null], ['F', true, 'used.end']]);
  const end = choicesFor('end', columns, { title: 'T', start: 'D' });
  assert.deepEqual(end.map(c => [c.value, c.disabled]), [['', false], ['T', true], ['D', true], ['F', false]]);
});

test('rowsOf : des colonnes de fetchTable aux lignes', () => {
  assert.deepEqual(rowsOf({ id: [1, 2], A: ['x', 'y'] }), [{ id: 1, A: 'x' }, { id: 2, A: 'y' }]);
  assert.deepEqual(rowsOf(null), []);
  assert.deepEqual(rowsOf({ A: [1] }), []);
  assert.deepEqual(rowsOf([{ id: 1 }]), [{ id: 1 }]);
});

test('docModel : tables, colonnes dans leur ordre, choix colorés, références ; synthèses et colonnes cachées écartées', () => {
  const tables = { id: [1, 2, 3], tableId: ['Evenements', 'Gens', 'Evenements_summary'], summarySourceTable: [0, 0, 1] };
  const columns = {
    id: [10, 11, 12, 13, 14, 15, 16, 20],
    parentId: [1, 1, 1, 1, 1, 1, 1, 2],
    colId: ['Titre', 'Quand', 'Type', 'Qui', 'manualSort', 'GFS_Auteur', 'gristHelper_Display', 'Nom'],
    label: ['Titre', 'Quand', 'Type', 'Qui', '', '', '', 'Nom'],
    type: ['Text', 'DateTime:Europe/Paris', 'Choice', 'Ref:Gens', 'ManualSortPos', 'Text', 'Any', 'Text'],
    isFormula: [false, false, false, false, false, false, true, false],
    formula: ['', '', '', '', '', '', '$Qui.Nom', ''],
    widgetOptions: ['', '', JSON.stringify({ choices: ['Réunion', 'Congé'], choiceOptions: { Réunion: { fillColor: '#dff5e8', textColor: '#146c48' } } }), '', '', '', '', ''],
    visibleCol: [0, 0, 0, 20, 0, 0, 0, 0],
    parentPos: [2, 1, 3, 4, 5, 6, 7, 1],
  };
  const model = docModel(tables, columns);
  assert.deepEqual(Object.keys(model.tables), ['Evenements', 'Gens']);
  const ev = model.tables.Evenements.columns;
  assert.deepEqual(ev.map(c => c.id), ['Quand', 'Titre', 'Type', 'Qui']);
  assert.deepEqual(ev.find(c => c.id === 'Type').choices, [{ value: 'Réunion', fill: '#dff5e8', text: '#146c48' }, { value: 'Congé', fill: null, text: null }]);
  const qui = ev.find(c => c.id === 'Qui');
  assert.equal(qui.target, 'Gens');
  assert.equal(qui.visible, 'Nom');
});

test('isHidden, targetTable, parseOptions', () => {
  assert.ok(isHidden('GFS_Auteur') && isHidden('manualSort') && isHidden('gristHelper_X'));
  assert.ok(!isHidden('Titre'));
  assert.equal(targetTable('RefList:Gens'), 'Gens');
  assert.equal(targetTable('Text'), null);
  assert.deepEqual(parseOptions('{pas du json'), {});
  assert.deepEqual(parseOptions({ a: 1 }), { a: 1 });
});
