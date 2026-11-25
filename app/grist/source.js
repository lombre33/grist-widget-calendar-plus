// La source du calendrier dans Grist : quelle table, quelle correspondance, quelles lignes, et les gestes écrits. Elle ne connaît Grist que par son port (port.js) et le DOM pas du tout.
// États : 'loading' (premier chargement), 'access' (l'accès complet n'est pas donné), 'setup' (aucune correspondance valable enregistrée), 'ready', 'error'.
import { columnOf, docModel, rowsOf } from './model.js';
import { abilities, cleanMapping, recognize, verify } from './mapping.js';
import { addAction, moveAction, toLines } from './entries.js';
import { baseType } from './dates.js';
import { createPending } from './pending.js';

export const OPTION_TABLE = 'cal_table';
export const OPTION_MAPPING = 'cal_mapping';
const OPTIONS_WAIT_MS = 3000;

const isAccessError = error => /access|permission|denied/i.test(String(error?.message ?? error ?? ''));

// La colonne affichée d'une Référence, ou la première colonne de texte de la table visée.
function shownColumn(model, column) {
  const target = model.tables[column.target];
  if (!target) return null;
  if (column.visible && target.columns.some(c => c.id === column.visible)) return column.visible;
  return target.columns.find(c => baseType(c.type) === 'Text')?.id ?? null;
}

export function labelsOf(rows, colId) {
  const labels = new Map();
  for (const row of rows) {
    const value = colId ? row[colId] : null;
    labels.set(row.id, value === null || value === undefined || value === '' ? `#${row.id}` : String(value));
  }
  return labels;
}

const columnsOfState = state => state.model.tables[state.tableId]?.columns ?? [];

// La table lue : celle enregistrée si elle existe encore, sinon celle de la vue, sinon la première. La correspondance enregistrée ne vaut que pour sa table.
function chooseTable(state, options, port) {
  const wanted = typeof options?.[OPTION_TABLE] === 'string' ? options[OPTION_TABLE] : null;
  state.tableId = (wanted && state.model.tables[wanted] ? wanted : null) ?? (state.model.tables[state.sectionTable] ? state.sectionTable : null) ?? Object.keys(state.model.tables)[0] ?? null;
  state.saved = Boolean(wanted && wanted === state.tableId && options?.[OPTION_MAPPING]);
  state.mapping = state.saved ? cleanMapping(options[OPTION_MAPPING]) : recognize(columnsOfState(state)).mapping;
  port.watchOtherTable?.(Boolean(state.tableId && state.tableId !== state.sectionTable));
}

async function readLines(state, port) {
  const columns = columnsOfState(state);
  const rows = rowsOf(await port.fetchTable(state.tableId));
  const person = state.mapping.person ? columnOf(state.model, state.tableId, state.mapping.person) : null;
  let refLabels = null;
  if (person?.target) refLabels = labelsOf(rowsOf(await port.fetchTable(person.target)), shownColumn(state.model, person));
  const result = toLines(rows, { mapping: state.mapping, columns, refLabels, canMove: abilities(state.mapping, columns).move });
  state.rows = rows;
  state.lines = result.lines;
  state.unreadable = result.unreadable;
}

export function createSource(port, { onChange = () => {}, wait = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  const pending = createPending();
  const state = { status: 'loading', model: { tables: {} }, sectionTable: null, tableId: null, mapping: cleanMapping(null), lines: [], unreadable: 0, error: null, saved: false };
  let options = null;
  let gotOptions;
  const optionsReady = new Promise(resolve => { gotOptions = resolve; });
  port.onOptions(next => { options = next ?? {}; gotOptions(); if (state.status !== 'loading') reload(); });

  const columns = () => columnsOfState(state);
  const changed = () => onChange({ ...state, abilities: abilities(state.mapping, columns()) });

  async function readMetadata() {
    const { tables, columns: meta } = await port.metadata();
    state.model = docModel(tables, meta);
  }

  async function reload() {
    try {
      await readMetadata();
      chooseTable(state, options, port);
      const ok = state.tableId && state.saved && verify(state.mapping, columns()).ok;
      state.status = ok ? 'ready' : 'setup';
      if (ok) await readLines(state, port);
      state.error = null;
    } catch (error) {
      state.status = isAccessError(error) ? 'access' : 'error';
      state.error = error;
    }
    changed();
  }

  async function write(action) {
    await pending.track(port.apply([action]));
    await reload();
  }

  return {
    state,
    pending,
    async start() {
      state.sectionTable = await port.sectionTable();
      await Promise.race([optionsReady, wait(OPTIONS_WAIT_MS)]);
      options ??= {};
      await reload();
      port.subscribe(() => { if (!pending.count) reload(); });
    },
    reload,
    columnsOf: tableId => state.model.tables[tableId]?.columns ?? [],
    tables: () => Object.keys(state.model.tables),
    propose: tableId => (tableId === state.tableId && state.saved ? { mapping: { ...state.mapping }, ambiguous: {} } : recognize(state.model.tables[tableId]?.columns ?? [])),
    // Le geste « Enregistrer » de la fenêtre des colonnes : le seul endroit qui écrit les réglages de la vue.
    async save(tableId, mapping) {
      const check = verify(mapping, state.model.tables[tableId]?.columns ?? []);
      if (!check.ok) return check;
      await port.saveOptions({ ...(options ?? {}), [OPTION_TABLE]: tableId, [OPTION_MAPPING]: cleanMapping(mapping) });
      options = { ...(options ?? {}), [OPTION_TABLE]: tableId, [OPTION_MAPPING]: cleanMapping(mapping) };
      await reload();
      return check;
    },
    async move(id, dates) {
      const previous = state.rows?.find(r => r.id === id);
      if (!previous) throw new Error('ligne introuvable');
      await write(moveAction(state.tableId, previous, dates, { mapping: state.mapping, columns: columns() }));
    },
    async add(request) {
      await write(addAction(state.tableId, request, { mapping: state.mapping, columns: columns() }));
    },
  };
}
