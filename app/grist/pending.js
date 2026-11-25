// Les écritures en cours vers Grist (un déplacement, une saisie rapide), pour répondre à « fermer » de GFS (consignes 013 et 014) : l'app ne dit « oui » qu'une fois tout écrit.
// Calendrier+ écrit chaque geste tout de suite : rien d'autre n'attend. Pur : aucun Grist, aucun DOM ; l'horloge est injectable pour les essais.
export const CLOSE_WAIT_MS = 8000;

export function createPending({ wait = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  const running = new Set();
  return {
    // Suit une écriture et rend sa promesse telle quelle (son refus reste celui de l'appelant).
    track(promise) {
      const tracked = Promise.resolve(promise);
      running.add(tracked);
      const done = () => running.delete(tracked);
      tracked.then(done, done);
      return tracked;
    },
    get count() { return running.size; },
    // Vrai quand plus rien n'est en cours (refusée ou non, une écriture finie ne retient pas l'app) ; faux si le temps passe avant.
    async idle(timeoutMs = CLOSE_WAIT_MS) {
      if (running.size === 0) return true;
      let late = false;
      const clock = wait(timeoutMs).then(() => { late = true; });
      while (running.size && !late) await Promise.race([Promise.allSettled([...running]), clock]);
      return running.size === 0;
    },
  };
}

// La réponse à `fermer` : exactement `true` pour laisser partir l'app (le kit l'attend ainsi, consigne 014), `false` si une écriture n'a pas fini à temps.
export async function answerClose(pending, timeoutMs = CLOSE_WAIT_MS) {
  return (await pending.idle(timeoutMs)) === true;
}
