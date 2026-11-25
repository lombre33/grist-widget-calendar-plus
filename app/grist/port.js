// Le port vers Grist (API des widgets, accès complet) : un adaptateur MINCE, sans logique, vérifié dans un vrai Grist (labo de GFS), jamais contre un faux Grist écrit ici.
// Toute lecture passe par `fetchTable` (des secondes pour Date et DateTime) ; `onRecords` ne sert que de signal de changement. Les réglages de la vue (`cal_table`, `cal_mapping`)
// ne s'écrivent que par `saveOptions`, appelé au clic « Enregistrer ».
const POLL_MS = 20000;

export function createGristPort(grist, { doc = globalThis.document } = {}) {
  const listeners = new Set();
  const notify = () => { for (const fn of [...listeners]) fn(); };
  let timer = null;

  grist.onRecords?.(() => notify());
  // Une table autre que celle de la vue ne prévient pas : une relecture à intervalle tant que la page est visible.
  const poll = on => {
    if (on && !timer) timer = setInterval(() => { if (!doc?.hidden && listeners.size) notify(); }, POLL_MS);
    if (!on && timer) { clearInterval(timer); timer = null; }
  };

  return {
    async metadata() {
      const [tables, columns] = await Promise.all([grist.docApi.fetchTable('_grist_Tables'), grist.docApi.fetchTable('_grist_Tables_column')]);
      return { tables, columns };
    },
    async sectionTable() {
      try {
        const id = (await grist.getSelectedTableId?.()) ?? (await grist.selectedTable?.getTableId?.());
        return id ? String(id) : null;
      } catch (error) {
        return null;
      }
    },
    fetchTable: tableId => grist.docApi.fetchTable(tableId),
    async apply(actions) {
      const answer = await grist.docApi.applyUserActions(actions);
      return answer?.retValues ?? [];
    },
    onOptions(fn) { grist.onOptions?.(options => fn(options ?? {})); },
    saveOptions: options => grist.setOptions(options),
    subscribe(fn, { otherTable = false } = {}) {
      listeners.add(fn);
      poll(otherTable);
      return () => { listeners.delete(fn); if (!listeners.size) poll(false); };
    },
    watchOtherTable: on => poll(on),
  };
}
