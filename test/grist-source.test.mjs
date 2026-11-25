// La source (app/grist/source.js) sur un port d'essai : sa logique seulement (états, choix de la table, réglages écrits au seul « Enregistrer », gestes écrits). Ce que Grist envoie
// vraiment se mesure dans le labo (test/grist/), jamais ici : le port d'essai rend des valeurs au format déjà mesuré (fetchTable en colonnes, dates en secondes).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSource, labelsOf, OPTION_MAPPING, OPTION_TABLE } from '../app/grist/source.js';

const utc = (y, m, d) => Date.UTC(y, m - 1, d) / 1000;
const META = {
  tables: { id: [1, 2], tableId: ['Evenements', 'Gens'], summarySourceTable: [0, 0] },
  columns: {
    id: [10, 11, 12, 13, 20], parentId: [1, 1, 1, 1, 2], colId: ['Titre', 'Debut', 'Fin', 'Qui', 'Nom'], label: ['Titre', 'Début', 'Fin', 'Qui', 'Nom'],
    type: ['Text', 'Date', 'Date', 'Ref:Gens', 'Text'], isFormula: [false, false, false, false, false], formula: ['', '', '', '', ''],
    widgetOptions: ['', '', '', '', ''], visibleCol: [0, 0, 0, 20, 0], parentPos: [1, 2, 3, 4, 1],
  },
};

function fakePort({ options = undefined, metaError = null } = {}) {
  const port = {
    applied: [], saved: [], optionsFn: null, subscribed: null, watching: false,
    data: {
      Evenements: { id: [1, 2], Titre: ['Atelier', 'Congé'], Debut: [utc(2026, 11, 3), null], Fin: [utc(2026, 11, 4), null], Qui: [1, 0] },
      Gens: { id: [1], Nom: ['Ada'] },
    },
    async metadata() { if (metaError) throw metaError; return META; },
    async sectionTable() { return 'Evenements'; },
    async fetchTable(id) { return port.data[id]; },
    async apply(actions) { port.applied.push(...actions); return [1]; },
    onOptions(fn) { port.optionsFn = fn; if (options !== undefined) queueMicrotask(() => fn(options)); },
    async saveOptions(next) { port.saved.push(next); },
    subscribe(fn) { port.subscribed = fn; },
    watchOtherTable(on) { port.watching = on; },
  };
  return port;
}

const start = async (port, onChange = () => {}) => {
  const source = createSource(port, { onChange, wait: () => Promise.resolve() });
  await source.start();
  return source;
};

test('sans réglage enregistré : « setup », la correspondance reconnue est proposée, rien n\'est écrit', async () => {
  const port = fakePort({ options: null });
  const source = await start(port);
  assert.equal(source.state.status, 'setup');
  assert.equal(source.state.tableId, 'Evenements');
  assert.deepEqual(source.propose('Evenements').mapping, { title: 'Titre', start: 'Debut', end: 'Fin', color: null, person: 'Qui' });
  assert.deepEqual(port.saved, []);
  assert.deepEqual(port.applied, []);
});

test('« Enregistrer » écrit cal_table et cal_mapping, puis le calendrier lit ses lignes', async () => {
  const port = fakePort({ options: null });
  const states = [];
  const source = await start(port, s => states.push(s));
  const check = await source.save('Evenements', source.propose('Evenements').mapping);
  assert.equal(check.ok, true);
  assert.deepEqual(port.saved, [{ [OPTION_TABLE]: 'Evenements', [OPTION_MAPPING]: { title: 'Titre', start: 'Debut', end: 'Fin', color: null, person: 'Qui' } }]);
  assert.equal(source.state.status, 'ready');
  assert.deepEqual(source.state.lines.map(l => [l.id, l.debut, l.fin, l.responsables]), [[1, '2026-11-03', '2026-11-04', ['Ada']], [2, null, null, []]]);
  assert.equal(states.at(-1).abilities.move, true);
});

test('« Enregistrer » refuse une correspondance incomplète sans rien écrire', async () => {
  const port = fakePort({ options: null });
  const source = await start(port);
  const check = await source.save('Evenements', { title: 'Titre' });
  assert.equal(check.ok, false);
  assert.deepEqual(port.saved, []);
});

test('réglage enregistré : prêt tout de suite ; un glisser écrit Début et Fin, une saisie rapide Titre et Début', async () => {
  const port = fakePort({ options: { cal_table: 'Evenements', cal_mapping: { title: 'Titre', start: 'Debut', end: 'Fin' } } });
  const source = await start(port);
  assert.equal(source.state.status, 'ready');
  await source.move(1, { debut: '2026-11-10', fin: '2026-11-11' });
  await source.add({ debut: '2026-11-20', titre: 'Revue' });
  assert.deepEqual(port.applied, [['UpdateRecord', 'Evenements', 1, { Debut: utc(2026, 11, 10), Fin: utc(2026, 11, 11) }], ['AddRecord', 'Evenements', null, { Titre: 'Revue', Debut: utc(2026, 11, 20) }]]);
  assert.deepEqual(port.saved, [], 'un geste sur le calendrier n\'écrit jamais les réglages de la vue');
  await assert.rejects(source.move(99, { debut: '2026-11-10', fin: '2026-11-10' }), /introuvable/);
});

test('une colonne enregistrée qui a disparu : retour à « setup », jamais une écriture dans une colonne absente', async () => {
  const port = fakePort({ options: { cal_table: 'Evenements', cal_mapping: { title: 'Titre', start: 'Supprimee' } } });
  const source = await start(port);
  assert.equal(source.state.status, 'setup');
});

test('une table enregistrée qui n\'existe plus : la table de la vue est reprise', async () => {
  const port = fakePort({ options: { cal_table: 'Disparue', cal_mapping: { title: 'Titre', start: 'Debut' } } });
  const source = await start(port);
  assert.equal(source.state.tableId, 'Evenements');
  assert.equal(source.state.status, 'setup');
});

test('une autre table que celle de la vue : relue à intervalle (elle ne prévient pas)', async () => {
  const port = fakePort({ options: { cal_table: 'Gens', cal_mapping: { title: 'Nom', start: null } } });
  await start(port);
  assert.equal(port.watching, true);
});

test('pas d\'accès complet : « access » ; autre erreur : « error »', async () => {
  assert.equal((await start(fakePort({ options: null, metaError: new Error('Access not granted') }))).state.status, 'access');
  assert.equal((await start(fakePort({ options: null, metaError: new Error('boom') }))).state.status, 'error');
});

test('sans réponse d\'options de Grist : la source démarre quand même', async () => {
  const source = await start(fakePort());
  assert.equal(source.state.status, 'setup');
});

test('labelsOf : le nom affiché, ou #id quand il est vide', () => {
  assert.deepEqual([...labelsOf([{ id: 1, Nom: 'Ada' }, { id: 2, Nom: '' }], 'Nom')], [[1, 'Ada'], [2, '#2']]);
});
