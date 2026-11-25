// La fenêtre « Table et colonnes » : quelle table, et quelle colonne pour chaque rôle (Titre et Début obligatoires, signalés ; colonnes reconnues déjà choisies ; conséquence dite en
// une phrase). Elle n'écrit rien d'elle-même : seul « Enregistrer » enregistre les réglages de la vue (règle du dépôt). Grisé jamais masqué : un type qui ne convient pas reste visible.
import { h } from '../kit/js/dom.js';
import { ModalBase } from '../kit/js/modal-base.js';
import { ROLES, REQUIRED, choicesFor, verify } from './grist/mapping.js';

function reasonText(reason, t) {
  const [kind, other] = String(reason).split('.');
  return t(`col.reason.${kind}`, other ? { role: t(`col.role.${other}`) } : {});
}

function columnSelect(role, columns, mapping, t, onPick) {
  const options = choicesFor(role, columns, mapping).map(choice => {
    const name = choice.value === '' ? t('col.none') : `${choice.label} · ${choice.type}`;
    const label = choice.reason ? `${name} (${reasonText(choice.reason, t)})` : name;
    return h('option', { value: choice.value, disabled: choice.disabled || undefined, selected: (mapping[role] ?? '') === choice.value || undefined }, label);
  });
  const select = h('select', { id: `col-${role}`, dataset: { role }, on: { change: () => onPick(role, select.value || null) } }, options);
  select.value = mapping[role] ?? '';
  return select;
}

function roleRow(role, columns, mapping, t, onPick) {
  const required = REQUIRED.includes(role);
  return h('div', { class: 'columns-role' },
    h('label', { for: `col-${role}` }, t(`col.role.${role}`), required ? h('span', { class: 'columns-required', title: t('col.required') }, ' *') : null),
    columnSelect(role, columns, mapping, t, onPick),
    h('p', { class: 'columns-consequence' }, t(`col.consequence.${role}`)));
}

function tableSelect(source, tableId, t, onTable) {
  const section = source.state.sectionTable;
  const options = source.tables().map(id => h('option', { value: id, selected: id === tableId || undefined }, id === section ? `${id} (${t('col.viewTable')})` : id));
  const select = h('select', { id: 'col-table', on: { change: () => onTable(select.value) } }, options);
  select.value = tableId ?? '';
  return h('div', { class: 'columns-role' }, h('label', { for: 'col-table' }, t('col.table')), select, h('p', { class: 'columns-consequence' }, t('col.consequence.table')));
}

function summary(check, t) {
  if (!check.ok) return h('p', { class: 'columns-error', role: 'status' }, check.errors.map(e => t(`col.error.${e.reason}`, { role: t(`col.role.${e.role}`) })).join(' '));
  if (check.readOnly.length) return h('p', { class: 'columns-notice', role: 'status' }, t('col.formula', { roles: check.readOnly.map(r => t(`col.role.${r.role}`)).join(', ') }));
  return null;
}

export function createColumnsWindow({ I18n, source, onSaved = () => {}, onError = () => {} }) {
  const t = (key, vars) => I18n.t(key, vars);
  const win = ModalBase.create({ id: 'app-columns-window', titleId: 'app-columns-title', size: 'md' });
  const { cancel, ok } = win.addButtons();
  let tableId = null;
  let mapping = null;

  function fill() {
    const columns = source.columnsOf(tableId);
    const check = verify(mapping, columns);
    win.title.textContent = t('col.title');
    cancel.textContent = t('app.cancel');
    ok.textContent = t('col.save');
    ok.disabled = !check.ok;
    ok.title = check.ok ? '' : t('col.saveReason');
    const pick = (role, colId) => { mapping = { ...mapping, [role]: colId }; fill(); };
    const table = tableSelect(source, tableId, t, next => { tableId = next; mapping = source.propose(next).mapping; fill(); });
    win.body.replaceChildren(h('p', { class: 'columns-intro' }, t('col.intro')), table, ...ROLES.map(role => roleRow(role, columns, mapping, t, pick)), summary(check, t) ?? '');
  }

  cancel.addEventListener('click', () => win.hide());
  ok.addEventListener('click', async () => {
    ok.disabled = true;
    try {
      const check = await source.save(tableId, mapping);
      if (check.ok) { win.hide(); onSaved(); } else fill();
    } catch (error) {
      onError(error);
      fill();
    }
  });

  return {
    open() {
      tableId = source.state.tableId ?? source.tables()[0] ?? null;
      mapping = source.propose(tableId).mapping;
      fill();
      win.show();
    },
    isOpen: () => win.isOpen(),
    retranslate() { if (win.isOpen()) fill(); },
  };
}
