// Les tables et colonnes du document, lues dans `_grist_Tables` et `_grist_Tables_column` (accès complet) : type, choix et leurs couleurs, colonne affichée d'une Référence, formule ou non.
// `fetchTable` rend des colonnes ({ id: [...], colId: [...] }) ; `rowsOf` les remet en lignes. Pur : aucun Grist, aucun DOM.
import { baseType } from './dates.js';

export function rowsOf(table) {
  if (Array.isArray(table)) return table;
  if (!table || typeof table !== 'object' || !Array.isArray(table.id)) return [];
  const names = Object.keys(table);
  return table.id.map((_, i) => Object.fromEntries(names.map(name => [name, table[name]?.[i]])));
}

export function parseOptions(raw) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string' || !raw) return {};
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' ? value : {};
  } catch (error) {
    return {};
  }
}

// Les colonnes que l'app ne propose jamais : celles de Grist (tri manuel, aides) et celles que GFS pose lui-même (`GFS_Auteur`, consigne 016 : ni lues ni écrites).
export const isHidden = colId => colId === 'manualSort' || /^gristHelper_/.test(String(colId)) || /^GFS_/.test(String(colId));
export const targetTable = type => (/^(Ref|RefList):/.test(String(type || '')) ? String(type).slice(String(type).indexOf(':') + 1) : null);

function choicesOf(options) {
  const list = Array.isArray(options.choices) ? options.choices.map(String) : [];
  const styles = options.choiceOptions && typeof options.choiceOptions === 'object' ? options.choiceOptions : {};
  return list.map(value => ({ value, fill: styles[value]?.fillColor ?? null, text: styles[value]?.textColor ?? null }));
}

// { tables: { [tableId]: { id, ref, columns: [{ id, label, type, isFormula, choices, target, visible }] } } }. Les tables de synthèse et les colonnes cachées sont écartées.
export function docModel(tablesMeta, columnsMeta) {
  const tableRows = rowsOf(tablesMeta);
  const columnRows = rowsOf(columnsMeta);
  const byRef = new Map();
  const tables = {};
  for (const t of tableRows) {
    if (!t.tableId || t.summarySourceTable || /^GristHidden_/.test(t.tableId)) continue;
    byRef.set(t.id, t.tableId);
    tables[t.tableId] = { id: t.tableId, ref: t.id, columns: [] };
  }
  const byId = new Map(columnRows.map(c => [c.id, c]));
  for (const c of columnRows) {
    const tableId = byRef.get(c.parentId);
    if (!tableId || isHidden(c.colId)) continue;
    const options = parseOptions(c.widgetOptions);
    const visible = c.visibleCol ? byId.get(c.visibleCol) : null;
    tables[tableId].columns.push({
      id: c.colId, label: c.label || c.colId, type: c.type || 'Any', isFormula: Boolean(c.isFormula) && Boolean(c.formula),
      choices: ['Choice', 'ChoiceList'].includes(baseType(c.type)) ? choicesOf(options) : [],
      target: targetTable(c.type), visible: visible ? visible.colId : null, position: c.parentPos ?? 0,
    });
  }
  for (const t of Object.values(tables)) t.columns.sort((a, b) => a.position - b.position);
  return { tables };
}

export const columnOf = (model, tableId, colId) => model?.tables?.[tableId]?.columns.find(c => c.id === colId) ?? null;
