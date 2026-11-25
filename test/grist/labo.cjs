// Le labo de Calendrier+ (repris de celui de Tuesday, consigne 009 de GFS) : un VRAI Grist (image officielle gristlabs/grist, lancée par `lancer-grist.sh`) et Calendrier+ servi par un petit serveur statique.
// Rien n'est simulé : l'app tourne dans l'iframe du widget personnalisé de Grist, avec l'API des widgets que Grist envoie. Ce qui dépend de ce que Grist envoie se mesure ici.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const racine = path.resolve(__dirname, '../..');
const GRIST = process.env.CAL_GRIST || 'http://localhost:8484';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };

function serveur() {
  return new Promise(resolve => {
    const s = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://x');
      const f = path.join(racine, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname));
      if (!f.startsWith(racine) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    }).listen(0, () => resolve(s));
  });
}

async function demarrer({ largeur = 1100, hauteur = 700 } = {}) {
  const s = await serveur();
  const widget = `http://localhost:${s.address().port}/index.html`;
  const navigateur = await chromium.launch();
  const contexte = await navigateur.newContext({ viewport: { width: largeur, height: hauteur }, locale: 'fr-FR' });
  // Le script de l'API des widgets est celui que sert CE Grist (la page de Calendrier+ le demande à docs.getgrist.com, que le labo ne joint pas).
  const api = await (await fetch(`${GRIST}/grist-plugin-api.js`)).text();
  await contexte.route('https://docs.getgrist.com/grist-plugin-api.js', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: api }));
  const violations = [];
  const page = await contexte.newPage();
  page.on('pageerror', e => violations.push(`erreur de page : ${e.message}`));
  // Violations de la politique de sécurité de Calendrier+. Connu et sans effet : l'API des widgets de Grist pose une feuille de style « grist-theme » (variables du thème de Grist), que `style-src 'self'` refuse ; Calendrier+ n'en a pas besoin (jetons du kit).
  await contexte.addInitScript(() => document.addEventListener('securitypolicyviolation', e => { if (!/grist-plugin-api\.js/.test(e.sourceFile || '')) console.error(`VIOLATION ${e.violatedDirective} ${e.sourceFile}:${e.lineNumber} ${e.blockedURI}`); }));
  page.on('console', m => { if (m.type() === 'error' && m.text().startsWith('VIOLATION')) violations.push(m.text()); });
  await page.goto(`${GRIST}/`);
  await page.waitForFunction(async () => (await (await fetch('/o/docs/api/orgs/docs/workspaces')).json())?.[0]?.id, null, { timeout: 30000 });
  const labo = { widget, navigateur, contexte, page, violations, serveur: s };
  labo.fermer = async () => { await navigateur.close(); s.close(); };
  return labo;
}

// Appels de l'API REST de Grist, avec la session du navigateur (la personne par défaut du labo).
function api(page) {
  const appeler = (url, options) => page.evaluate(async ([u, o]) => {
    const x = await fetch(`/o/docs/api${u}`, o);
    const t = await x.text();
    try { return { statut: x.status, corps: JSON.parse(t) }; } catch (e) { return { statut: x.status, corps: t }; }
  }, [url, options]);
  const post = (url, corps) => appeler(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
  return {
    appeler, post,
    actions: async (doc, liste) => { const r = await post(`/docs/${doc}/apply`, liste); if (r.statut !== 200) throw new Error(`apply ${r.statut} ${JSON.stringify(r.corps)}`); return r.corps.retValues; },
    table: async (doc, nom) => (await appeler(`/docs/${doc}/tables/${nom}/records`)).corps.records ?? [],
    tables: async doc => ((await appeler(`/docs/${doc}/tables`)).corps.tables ?? []).map(t => t.id),
    colonnes: async (doc, nom) => ((await appeler(`/docs/${doc}/tables/${nom}/columns`)).corps.columns ?? []),
    actionsFaites: async doc => (await appeler(`/docs/${doc}/sql?q=${encodeURIComponent('select max(actionNum) as n from _gristsys_ActionHistory')}`)).corps,
  };
}

// Un document neuf avec ses tables, et une page « widget personnalisé » sur la table choisie. `tables` : [{ id, colonnes: [{ id, type, widgetOptions? }], lignes: { Col: [..] } }].
async function creerDocument(labo, { nom = 'Essai', tables, tableWidget, acces = 'full' }) {
  const { page, widget } = labo;
  const a = api(page);
  const wid = (await a.appeler('/orgs/docs/workspaces')).corps[0].id;
  const doc = (await a.post(`/workspaces/${wid}/docs`, { name: `${nom} ${Date.now()}` })).corps;
  const refs = {};
  for (const t of tables) {
    const [r] = await a.actions(doc, [['AddTable', t.id, t.colonnes.map(c => ({ ...c, widgetOptions: c.widgetOptions ? JSON.stringify(c.widgetOptions) : undefined }))]]);
    refs[t.id] = r.id;
    const n = Object.values(t.lignes ?? {})[0]?.length ?? 0;
    if (n) await a.actions(doc, [['BulkAddRecord', t.id, Array(n).fill(null), t.lignes]]);
  }
  const [v] = await a.actions(doc, [['CreateViewSection', refs[tableWidget ?? tables[0].id], 0, 'custom', null, null]]);
  const custom = { mode: 'url', url: widget, access: acces, widgetId: null, pluginId: '', sectionId: v.sectionRef };
  await a.actions(doc, [['UpdateRecord', '_grist_Views_section', v.sectionRef, { options: JSON.stringify({ customView: JSON.stringify(custom) }) }]]);
  return { id: doc, vue: v.viewRef, api: a };
}

// Ouvre la page du document et rend le cadre du widget (celui de Calendrier+).
async function ouvrir(labo, doc) {
  const { page, widget } = labo;
  await page.goto(`${GRIST}/o/docs/${doc.id}/x/p/${doc.vue}`);
  const origine = new URL(widget).origin;
  let cadre = null;
  for (let i = 0; i < 100 && !cadre; i++) { cadre = page.frames().find(f => f.url().startsWith(origine)); if (!cadre) await page.waitForTimeout(200); }
  if (!cadre) throw new Error('le cadre du widget ne s\'est pas ouvert');
  page.setDefaultTimeout(8000);
  await fermerVisite(page);
  return cadre;
}

// La visite guidée de Grist recouvre un coin de la page à la première ouverture : on la ferme.
async function fermerVisite(page) {
  for (let i = 0; i < 3; i++) {
    const croix = page.locator('[class*="onboarding"] svg, .test-onboarding-close, [data-test-id="onboarding-close"]').first();
    if (await croix.count() === 0) break;
    await croix.click({ timeout: 1500 }).catch(() => {});
  }
}

module.exports = { demarrer, api, creerDocument, ouvrir, GRIST };
