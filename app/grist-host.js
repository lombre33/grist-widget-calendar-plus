// L'hôte dans Grist : le module du kit sur la table choisie. La source (grist/source.js) lit et écrit ; ici, on branche les rappels du module, l'avis de l'état (accès, colonnes,
// lignes écartées, refus d'écriture), la fenêtre des colonnes, et la réponse à « fermer » de GFS (consignes 013 et 014 : rien ne part avant la fin des écritures en cours).
import { h } from '../kit/js/dom.js';
import { createColumnsWindow } from './columns-window.js';
import { refusalReason } from './grist/entries.js';
import { answerClose } from './grist/pending.js';
import { createGristPort } from './grist/port.js';
import { createSource } from './grist/source.js';

const VIEW_KEY = 'cal_view';
const FLASH_MS = 6000;
const SAVED_FLASH_MS = 15000;

// L'avis que la personne lit sous le calendrier, selon l'état : { key, vars, action } ou null.
export function noticeFor(state) {
  if (!state || state.status === 'loading') return null;
  if (state.status === 'access') return { key: 'status.access' };
  if (state.status === 'setup') return { key: 'status.columns', action: 'col.open' };
  if (state.status === 'error') return { key: 'status.error' };
  if (state.unreadable > 0) return { key: 'status.unreadable', vars: { n: state.unreadable } };
  if (!state.abilities?.move) return { key: 'status.formula' };
  return null;
}

function readView(GfsLink) {
  try { return GfsLink.storageGet(VIEW_KEY) ?? undefined; } catch (error) { return undefined; }
}

export function startGrist({ grist, root, slot, I18n, GfsLink, creerCalendrier }) {
  const t = (key, vars) => I18n.t(key, vars);
  let state = null;
  let flashKey = null;
  let flashTimer = null;
  let setupShown = false;
  const view = readView(GfsLink);
  const text = h('span');
  const button = h('button', { type: 'button', class: 'app-notice-action', on: { click: () => columns.open() } });
  const notice = h('div', { class: 'app-notice', role: 'status' }, text, button);
  notice.hidden = true;
  root.append(notice);

  const source = createSource(createGristPort(grist), { onChange: next => { state = next; render(); } });
  // Grist garde les réglages posés par le widget en attente, avec son propre bouton « Enregistrer » sur la vue (mesuré dans Grist 1.7.19) : on le dit.
  const columns = createColumnsWindow({ I18n, source, onSaved: () => flash('col.keep', SAVED_FLASH_MS), onError: error => flash(refusalReason(error)) });

  function flash(key, duration = FLASH_MS) {
    flashKey = key;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { flashKey = null; render(); }, duration);
    render();
  }

  const guarded = action => async request => {
    try {
      await action(request);
    } catch (error) {
      flash(refusalReason(error));
      throw error; // le module remet l'événement à sa place, ou rend le champ avec le titre gardé
    }
  };

  const calendar = creerCalendrier({
    onOuvrir: id => { try { grist.setCursorPos?.({ rowId: id }); } catch (error) { /* une autre table que celle de la vue : rien à montrer */ } },
    onDeplacer: guarded(({ id, debut, fin }) => source.move(id, { debut, fin })),
    onAjouter: guarded(request => source.add(request)),
    onEtat: ({ vue }) => { try { GfsLink.storageSet(VIEW_KEY, vue); } catch (error) { /* le navigateur refuse : la vue ne sera pas retenue */ } },
  });
  slot.append(calendar.element);

  function renderNotice() {
    const shown = flashKey ? { key: flashKey } : noticeFor(state);
    notice.hidden = !shown;
    if (!shown) return;
    text.textContent = t(shown.key, shown.vars ?? {});
    button.hidden = !shown.action;
    if (shown.action) button.textContent = t(shown.action);
  }

  function render() {
    const ready = state?.status === 'ready';
    calendar.definir({ lignes: ready ? state.lines : [], options: { langue: I18n.language, lectureSeule: !(ready && state.abilities.move), vue: view } });
    renderNotice();
    if (state?.status === 'setup' && !setupShown && !columns.isOpen()) { setupShown = true; columns.open(); }
  }

  grist.ready({ requiredAccess: 'full', onEditOptions: () => columns.open() });
  GfsLink.onClose?.(() => answerClose(source.pending));
  render();
  source.start();

  return {
    openColumns: () => columns.open(),
    refresh() { render(); columns.retranslate(); },
  };
}
