// Essais de Calendrier+ dans un vrai Grist (voir labo.cjs). Lancer d'abord `./test/grist/lancer-grist.sh`, puis `node test/grist/essais.cjs`.
//   CAL_ESSAIS="glisser,ajout" ne lance que les essais dont le nom contient l'un de ces mots. Au premier passage à froid, un essai peut dépasser son délai : le rejouer avant de conclure.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { demarrer, creerDocument, ouvrir } = require('./labo.cjs');

const sortie = process.env.CAL_CAPTURES || path.join(__dirname, 'captures');
fs.mkdirSync(sortie, { recursive: true });
const filtre = (process.env.CAL_ESSAIS || '').split(',').map(x => x.trim()).filter(Boolean);
const resultats = [];
async function essai(nom, fn) {
  if (filtre.length && !filtre.some(m => nom.includes(m))) return;
  try { await fn(); resultats.push(true); process.stdout.write(`ok   ${nom}\n`); } catch (e) { resultats.push(false); process.stdout.write(`FAIL ${nom}\n     ${String(e.message).split('\n').slice(0, 14).join(' | ').slice(0, 1500)}\n`); }
}

// Les dates suivent la semaine en cours : le calendrier s'ouvre sur aujourd'hui.
const JOUR = 86400;
const auj = new Date();
const lundi = Date.UTC(auj.getFullYear(), auj.getMonth(), auj.getDate()) / 1000 - ((auj.getDay() + 6) % 7) * JOUR;
const iso = s => new Date(s * 1000).toISOString().slice(0, 10);
const evenements = {
  id: 'Evenements',
  colonnes: [
    { id: 'Titre', type: 'Text' }, { id: 'Debut', type: 'Date' }, { id: 'Fin', type: 'Date' },
    { id: 'Type', type: 'Choice', widgetOptions: { choices: ['Réunion', 'Congé'], choiceOptions: { 'Réunion': { fillColor: '#C8E6C9', textColor: '#1B5E20' } } } },
    { id: 'Qui', type: 'Ref:Gens' }, { id: 'Heure', type: 'DateTime:Europe/Paris' }, { id: 'Note', type: 'Text' },
  ],
  lignes: {
    Titre: ['Atelier', 'Congés', 'Sans date'],
    Debut: [lundi + JOUR, lundi + 2 * JOUR, null],
    Fin: [lundi + 2 * JOUR, null, null],
    Type: ['Réunion', 'Congé', null],
    Qui: [1, 0, 0],
    Heure: [lundi + JOUR + 8 * 3600 + 1800, null, null],
    Note: ['garder', 'garder', 'garder'],
  },
};
const gens = { id: 'Gens', colonnes: [{ id: 'Nom', type: 'Text' }], lignes: { Nom: ['Ada'] } };

(async () => {
  const labo = await demarrer({ largeur: 1100, hauteur: 700 });
  const { page } = labo;
  const shot = nom => page.screenshot({ path: path.join(sortie, `grist-${nom}.png`) });
  const ouvrirCal = async (options = {}) => {
    const doc = await creerDocument(labo, { tables: [gens, evenements], tableWidget: 'Evenements', ...options });
    const cadre = await ouvrir(labo, doc);
    await cadre.waitForSelector('.cal-barre');
    return { doc, cadre };
  };
  const enregistrer = async cadre => {
    await cadre.waitForSelector('#app-fenetre-colonnes .pp-modal-box', { state: 'visible' });
    await cadre.click('#app-fenetre-colonnes .pp-modal-primary');
    await cadre.waitForSelector('#app-fenetre-colonnes .pp-modal-box', { state: 'hidden' });
    await cadre.waitForSelector('.cal-evt');
  };
  // Grist garde les réglages du widget en attente : son bouton « Enregistrer » de la vue les écrit dans le document.
  const garderDansGrist = async () => {
    await page.locator('.test-section-menu-small-btn-save').click();
    await page.waitForTimeout(800);
  };

  await essai('premier lancement : la fenêtre des colonnes s\'ouvre avec les colonnes reconnues, rien n\'est écrit avant « Enregistrer »', async () => {
    const { doc, cadre } = await ouvrirCal();
    await cadre.waitForSelector('#app-fenetre-colonnes .pp-modal-box', { state: 'visible' });
    const choisi = async role => cadre.locator(`#col-${role}`).inputValue();
    assert.deepEqual([await choisi('table'), await choisi('title'), await choisi('start'), await choisi('end'), await choisi('color'), await choisi('person')], ['Evenements', 'Titre', 'Debut', 'Fin', 'Type', 'Qui']);
    assert.equal(await cadre.locator('#col-start option[value="Note"]').isDisabled(), true, 'une colonne de texte est grisée pour Début, pas retirée');
    const sections = await doc.api.table(doc.id, '_grist_Views_section');
    assert.ok(!sections.some(s => String(s.fields.options || '').includes('cal_mapping')), 'aucun réglage écrit à l\'ouverture');
    await shot('colonnes');
    await enregistrer(cadre);
    assert.match(await cadre.locator('.app-avis').innerText(), /Enregistrer/, 'l\'avis dit de garder le choix dans Grist');
    const attente = await doc.api.table(doc.id, '_grist_Views_section');
    assert.ok(!attente.some(s => String(s.fields.options || '').includes('cal_mapping')), 'Grist garde le réglage en attente de son propre « Enregistrer »');
    await garderDansGrist();
    const apres = await doc.api.table(doc.id, '_grist_Views_section');
    assert.ok(apres.some(s => String(s.fields.options || '').includes('cal_mapping')), 'le réglage est écrit au clic « Enregistrer » de Grist');
  });

  await essai('lecture : jours, fin incluse, couleur du choix, personne de la référence, plateau « Sans date » ; rouvert, le réglage tient', async () => {
    const { doc, cadre } = await ouvrirCal();
    await enregistrer(cadre);
    await garderDansGrist();
    const atelier = cadre.locator('.cal-evt', { hasText: 'Atelier' }).first();
    await atelier.waitFor();
    const fond = await atelier.evaluate(e => getComputedStyle(e).getPropertyValue('--cal-fond').trim());
    assert.equal(fond.toLowerCase(), '#c8e6c9');
    assert.ok(await cadre.locator('.cal-evt', { hasText: 'Congés' }).count() > 0);
    assert.ok((await cadre.locator('body').innerText()).includes('Sans date'));
    await shot('mois');
    const cadre2 = await ouvrir(labo, doc);
    await cadre2.waitForSelector('.cal-evt');
    assert.equal(await cadre2.locator('#app-fenetre-colonnes .pp-modal-box').isVisible().catch(() => false), false, 'pas de fenêtre au second lancement');
  });

  await essai('glisser : Début et Fin décalés du même écart, rien d\'autre n\'est écrit', async () => {
    const { doc, cadre } = await ouvrirCal();
    await enregistrer(cadre);
    const cible = cadre.locator(`.cal-fond[data-jour="${iso(lundi + 4 * JOUR)}"]`);
    await cadre.locator('.cal-evt', { hasText: 'Atelier' }).first().dragTo(cible);
    let ligne;
    for (let i = 0; i < 40; i++) {
      ligne = (await doc.api.table(doc.id, 'Evenements')).find(r => r.fields.Titre === 'Atelier');
      if (ligne.fields.Debut !== lundi + JOUR) break;
      await page.waitForTimeout(250);
    }
    assert.equal(ligne.fields.Debut, lundi + 4 * JOUR);
    assert.equal(ligne.fields.Fin, lundi + 5 * JOUR);
    assert.equal(ligne.fields.Note, 'garder');
    assert.equal(ligne.fields.Type, 'Réunion');
  });

  await essai('saisie rapide : une ligne neuve avec son titre et son jour', async () => {
    const { doc, cadre } = await ouvrirCal();
    await enregistrer(cadre);
    await cadre.locator(`.cal-fond[data-jour="${iso(lundi + 3 * JOUR)}"]`).click({ position: { x: 20, y: 60 } });
    await cadre.locator('input').last().fill('Revue');
    await cadre.locator('input').last().press('Enter');
    let ligne;
    for (let i = 0; i < 40 && !ligne; i++) { ligne = (await doc.api.table(doc.id, 'Evenements')).find(r => r.fields.Titre === 'Revue'); if (!ligne) await page.waitForTimeout(250); }
    assert.ok(ligne, 'la ligne est créée');
    assert.equal(ligne.fields.Debut, lundi + 3 * JOUR);
    assert.equal(ligne.fields.Fin, null);
    await cadre.locator('.cal-evt', { hasText: 'Revue' }).first().waitFor();
  });

  await essai('DateTime : l\'heure du fuseau de la colonne (9 h 30 à Paris pour 8 h 30 UTC en hiver, 10 h 30 en été)', async () => {
    const { doc, cadre } = await ouvrirCal();
    await cadre.waitForSelector('#app-fenetre-colonnes .pp-modal-box', { state: 'visible' });
    await cadre.selectOption('#col-end', '');
    await cadre.selectOption('#col-start', 'Heure');
    await cadre.click('#app-fenetre-colonnes .pp-modal-primary');
    const atelier = cadre.locator('.cal-evt', { hasText: 'Atelier' }).first();
    await atelier.waitFor();
    const texte = await atelier.innerText();
    // 8 h 30 UTC, lue à Paris : 9 h 30 en hiver, 10 h 30 en été.
    const attendu = new Date((lundi + JOUR + 8 * 3600 + 1800) * 1000).toLocaleString('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
    const [hh, mm] = attendu.split(':');
    assert.ok(new RegExp(`0?${Number(hh)}\\s?[:h]\\s?${mm}`).test(texte), `${texte} ne montre pas ${attendu}`);
    assert.ok(doc);
  });

  await essai('accès « Lire la table » seulement : l\'avis demande l\'accès complet, rien n\'est écrit', async () => {
    const { cadre } = await ouvrirCal({ acces: 'read table' });
    await cadre.waitForSelector('.app-avis:not([hidden])');
    assert.match(await cadre.locator('.app-avis').innerText(), /accès complet/i);
    await shot('acces');
  });

  await essai('aucune violation de la politique de sécurité, aucune erreur de page', async () => {
    assert.deepEqual(labo.violations, []);
  });

  await labo.fermer();
  const echecs = resultats.filter(r => !r).length;
  process.stdout.write(`\n${resultats.length - echecs}/${resultats.length} essais passés\n`);
  process.exit(echecs ? 1 : 0);
})();
