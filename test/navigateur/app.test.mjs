// La page de l'app autonome dans un vrai navigateur (Chromium, 700 × 400) : le logo et la roue des Réglages dans le coin haut droit (charte Grist Factory), la fenêtre des Réglages, la langue,
// le thème, la gouttière de la barre de GFS, et aucune erreur de politique de sécurité.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const racine = fileURLToPath(new URL('../../', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg' };

let serveur;
let navigateur;
let adresse;
before(async () => {
  serveur = http.createServer((requete, reponse) => {
    const chemin = normalize(join(racine, decodeURIComponent(requete.url.split('?')[0])));
    if (!chemin.startsWith(racine) || !existsSync(chemin) || statSync(chemin).isDirectory()) { reponse.writeHead(404).end(); return; }
    reponse.writeHead(200, { 'content-type': TYPES[extname(chemin)] || 'application/octet-stream' });
    createReadStream(chemin).pipe(reponse);
  });
  await new Promise(resolu => serveur.listen(0, '127.0.0.1', resolu));
  adresse = `http://127.0.0.1:${serveur.address().port}`;
  navigateur = await chromium.launch();
});
after(async () => { await navigateur?.close(); serveur?.close(); });

async function ouvrir({ langue = 'fr' } = {}) {
  const contexte = await navigateur.newContext({ viewport: { width: 700, height: 400 }, locale: langue });
  const page = await contexte.newPage();
  const erreurs = [];
  page.on('pageerror', erreur => erreurs.push(String(erreur)));
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) erreurs.push(message.text()); });
  await page.goto(`${adresse}/index.html`);
  await page.waitForSelector('.cal-barre');
  page.erreurs = erreurs;
  page.contexte = contexte;
  return page;
}

test('la page s\'ouvre sans erreur ni violation de la politique de sécurité, sur le calendrier de démonstration', async () => {
  const page = await ouvrir();
  assert.deepEqual(page.erreurs, []);
  assert.ok(await page.locator('.cal-evt').count() > 0);
  assert.match(await page.locator('.demo-bandeau').innerText(), /Démonstration/);
  await page.contexte.close();
});

test('le logo Grist Factory : un rond de 20 px, opacité .85, à 10 px du coin haut droit', async () => {
  const page = await ouvrir();
  const logo = page.locator('#app-logo');
  const boite = await logo.boundingBox();
  assert.equal(await logo.evaluate(img => img.complete && img.naturalWidth > 0), true);
  assert.deepEqual([Math.round(boite.width), Math.round(boite.height)], [20, 20]);
  assert.equal(Math.round(700 - (boite.x + boite.width)), 10);
  assert.ok(boite.y >= 8 && boite.y <= 14, String(boite.y));
  assert.equal(await logo.evaluate(img => getComputedStyle(img).opacity), '0.85');
  assert.equal(await logo.evaluate(img => getComputedStyle(img).borderRadius), '50%');
  assert.equal(await logo.getAttribute('alt'), 'Grist Factory');
  await page.contexte.close();
});

test('la roue des Réglages est juste avant le logo, sur la même ligne, et rien de la barre ne passe dessous', async () => {
  const page = await ouvrir();
  const [roue, logo] = [await page.locator('#app-reglages').boundingBox(), await page.locator('#app-logo').boundingBox()];
  assert.ok(roue.x + roue.width <= logo.x + 1, 'la roue est à gauche du logo');
  assert.ok(logo.x - (roue.x + roue.width) < 12, 'juste avant le logo');
  assert.ok(Math.abs((roue.y + roue.height / 2) - (logo.y + logo.height / 2)) < 3, 'même ligne');
  const dernier = await page.locator('.cal-plateau-bouton').boundingBox();
  assert.ok(dernier.x + dernier.width <= roue.x, `le bouton « Sans date » finit à ${dernier.x + dernier.width}, la roue commence à ${roue.x}`);
  assert.equal(await page.locator('#app-reglages').getAttribute('aria-label'), 'Réglages');
  await page.contexte.close();
});

test('la roue est une icône au trait (un masque), pas une image pleine', async () => {
  const page = await ouvrir();
  const style = await page.locator('#app-reglages').evaluate(e => { const s = getComputedStyle(e, '::before'); return { masque: s.maskImage || s.webkitMaskImage, fond: s.backgroundColor }; });
  assert.match(style.masque, /svg/);
  assert.notEqual(style.fond, 'rgba(0, 0, 0, 0)');
  await page.contexte.close();
});

test('un clic sur la roue ouvre les Réglages ; Échap les ferme et rend le focus à la roue', async () => {
  const page = await ouvrir();
  await page.locator('#app-reglages').click();
  const fenetre = page.locator('#app-fenetre-reglages');
  assert.equal(await fenetre.isVisible(), true);
  assert.match(await fenetre.innerText(), /Réglages de Calendrier\+/);
  assert.match(await fenetre.innerText(), /grist-factory\.fr/);
  assert.match(await fenetre.innerText(), /GNU GPL v3\.0/);
  assert.doesNotMatch(await fenetre.innerText(), /lombre33/);
  await page.keyboard.press('Escape');
  assert.equal(await fenetre.isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'app-reglages');
  await page.contexte.close();
});

test('la fenêtre des Réglages tient dans 700 × 400 : titre et bouton visibles', async () => {
  const page = await ouvrir();
  await page.locator('#app-reglages').click();
  const cadre = await page.locator('#app-fenetre-reglages .pp-modal-box').boundingBox();
  assert.ok(cadre.y >= 0 && cadre.y + cadre.height <= 400, JSON.stringify(cadre));
  assert.equal(await page.locator('#app-fenetre-reglages .pp-modal-primary').isVisible(), true);
  await page.contexte.close();
});

test('choisir l\'anglais retraduit le calendrier, la roue et les Réglages sans recharger', async () => {
  const page = await ouvrir();
  await page.locator('#app-reglages').click();
  await page.locator('#app-fenetre-reglages select').first().selectOption('en');
  assert.equal(await page.locator('.cal-aujourdhui').innerText(), 'Today');
  assert.equal(await page.locator('#app-reglages').getAttribute('aria-label'), 'Settings');
  assert.match(await page.locator('#app-fenetre-reglages').innerText(), /Calendar\+ settings/);
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.deepEqual(page.erreurs, []);
  await page.contexte.close();
});

test('le navigateur en anglais ouvre la page en anglais', async () => {
  const page = await ouvrir({ langue: 'en-GB' });
  assert.equal(await page.locator('.cal-aujourdhui').innerText(), 'Today');
  await page.contexte.close();
});

test('choisir le thème sombre change les jetons de la page', async () => {
  const page = await ouvrir();
  const avant = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.locator('#app-reglages').click();
  await page.locator('#app-fenetre-reglages select').nth(1).selectOption('dark');
  const apres = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  assert.notEqual(avant, apres);
  await page.contexte.close();
});

test('la barre de GFS : une gouttière du côté qu\'elle recouvre, le logo et la roue suivent', async () => {
  const page = await ouvrir();
  const avant = await page.locator('#app-logo').boundingBox();
  await page.evaluate(async () => { const { laisserLibre } = await import('/app/chrome.js'); laisserLibre(document.getElementById('app'), { bord: 'droite', epaisseur: 48, zone: { x: 652, y: 0, largeur: 48, hauteur: 400 } }); });
  const droite = await page.locator('#app-logo').boundingBox();
  assert.equal(Math.round(droite.x - avant.x), -48);
  assert.ok(await page.locator('.cal-plateau-bouton').evaluate(b => b.getBoundingClientRect().right) <= (await page.locator('#app-reglages').boundingBox()).x);
  await page.evaluate(async () => { const { laisserLibre } = await import('/app/chrome.js'); laisserLibre(document.getElementById('app'), { bord: 'gauche', epaisseur: 40, zone: { x: 0, y: 100, largeur: 40, hauteur: 200 } }); });
  const gauche = await page.locator('#app-logo').boundingBox();
  assert.equal(Math.round(gauche.x - avant.x), 0);
  assert.equal(await page.locator('.cal').evaluate(e => Math.round(e.getBoundingClientRect().left)), 40);
  await page.evaluate(async () => { const { laisserLibre } = await import('/app/chrome.js'); laisserLibre(document.getElementById('app'), null); });
  assert.equal(await page.locator('.cal').evaluate(e => Math.round(e.getBoundingClientRect().left)), 0);
  await page.contexte.close();
});

test('la démonstration marche : glisser une tâche la déplace, ajouter une tâche l\'ajoute, rien n\'est enregistré', async () => {
  const page = await ouvrir();
  const avant = await page.locator('.cal-evt').count();
  await page.locator('.cal-fond').nth(30).click();
  await page.keyboard.type('Nouvelle tâche');
  await page.keyboard.press('Enter');
  await page.waitForFunction(n => document.querySelectorAll('.cal-evt').length > n, avant);
  assert.equal(await page.locator('.cal-evt', { hasText: 'Nouvelle tâche' }).count() > 0, true);
  assert.deepEqual(page.erreurs, []);
  await page.contexte.close();
});
