// Règles de sécurité de la suite (guide des apps 1.4, consignes 017 à 019 de GFS, appliquées à Calendrier+ à la demande du porteur le 25/11) : la politique de la page, le relais des appels bloqués, Dependabot, SECURITY.md, la phrase de stockage du README.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const lire = chemin => readFileSync(new URL(`../${chemin}`, import.meta.url), 'utf8');
const html = lire('index.html');
const politique = new Map(
  html.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/)[1].split(';').map(d => d.trim()).filter(Boolean)
    .map(d => { const [nom, ...valeurs] = d.split(/\s+/); return [nom, valeurs]; }),
);

test('S1 et S2 : une politique en balise, qui part de default-src \'none\' et ferme object, base et form', () => {
  assert.deepEqual(politique.get('default-src'), ["'none'"]);
  for (const d of ['object-src', 'base-uri', 'form-action', 'frame-src']) assert.deepEqual(politique.get(d), ["'none'"], d);
});

test('S3 : les appels sortants n\'ouvrent que \'self\' (et data: pour les images), jamais * ni https:', () => {
  for (const [nom, valeurs] of politique) {
    for (const v of valeurs) assert.ok(!['*', 'https:', 'http:'].includes(v), `${nom} ouvre ${v}`);
  }
  assert.deepEqual(politique.get('connect-src'), ["'self'"]);
  assert.deepEqual(politique.get('img-src'), ["'self'", 'data:']);
  for (const d of ['font-src', 'media-src', 'worker-src']) assert.equal(politique.has(d), false, `${d} reste fermé par default-src`);
});

test('S4 : script-src ne garde que \'self\', le script d\'API de Grist par son adresse entière, \'unsafe-eval\' et l\'empreinte de la carte d\'importation', () => {
  const scripts = politique.get('script-src');
  assert.ok(scripts.includes('https://docs.getgrist.com/grist-plugin-api.js'));
  for (const v of scripts) {
    assert.ok(v === "'self'" || v === "'unsafe-eval'" || v === 'https://docs.getgrist.com/grist-plugin-api.js' || /^'sha256-[A-Za-z0-9+/=]+'$/.test(v), `script-src ouvre ${v}`);
  }
  assert.ok(!scripts.includes("'unsafe-inline'"));
});

test('S5 : la page ne charge de l\'extérieur que, au plus, le script de Grist (pas encore chargé : l\'adaptateur Grist vient ensuite), sans bibliothèque', () => {
  const externes = [...html.matchAll(/<script[^>]*\ssrc="(https?:[^"]+)"/g)].map(m => m[1]);
  assert.ok(externes.every(adresse => adresse === 'https://docs.getgrist.com/grist-plugin-api.js'), externes.join(', '));
});

test('S8 : le relais des appels bloqués est la première ligne du module d\'entrée, avant tout autre import', () => {
  const main = lire('app/main.js');
  const imports = [...main.matchAll(/^import .*$/gm)].map(m => m[0]);
  assert.equal(imports[0], "import '../kit/js/violations-start.js';");
  assert.equal(main.match(/violations-start/g).length, 1, 'un seul démarrage du relais');
  assert.ok(existsSync(new URL('../kit/js/violations-start.js', import.meta.url)), 'le kit est à 0.25.0 ou après');
});

test('la référence du kit est le commit ed0a575 (kit 0.27.0) ou un commit qui le contient', () => {
  const root = new URL('..', import.meta.url).pathname;
  const reference = execFileSync('git', ['-C', root, 'ls-files', '-s', 'kit'], { encoding: 'utf8' }).split(/\s+/)[1];
  assert.match(reference, /^[0-9a-f]{40}$/);
  const kit = JSON.parse(lire('kit/package.json'));
  const [maj, min] = kit.version.split('.').map(Number);
  assert.ok(maj > 0 || min >= 27, `kit ${kit.version} : 0.27.0 ou après`);
});

test('S7 : Dependabot suit le sous-module du kit', () => {
  const dependabot = lire('.github/dependabot.yml');
  assert.match(dependabot, /package-ecosystem: "gitsubmodule"/);
  assert.match(dependabot, /interval: "weekly"/);
});

test('S9 : SECURITY.md dit où signaler une faille, en privé', () => {
  const securite = lire('SECURITY.md');
  assert.match(securite, /Report a vulnerability/);
  assert.match(securite, /Security policy/);
});

test('le README dit que l\'app garde des choix dans localStorage, avec les vraies clés, et que ce n\'est jamais le contenu d\'un document', () => {
  const readme = lire('README.md');
  assert.match(readme, /localStorage/);
  for (const cle of ['cal_theme', 'cal_lang']) assert.ok(readme.includes(cle), cle);
  assert.match(readme, /jamais le contenu/);
});

test('les clés dites dans le README sont celles que le code écrit', () => {
  const main = lire('app/main.js');
  assert.match(main, /storageKey: 'cal_theme'/);
  assert.match(main, /storageKey: 'cal_lang'/);
});

test('aucun stockage de navigateur autre que localStorage : ni sessionStorage, ni IndexedDB, ni cookie', () => {
  for (const f of ['app/main.js', 'app/chrome.js', 'app/settings.js']) assert.doesNotMatch(lire(f), /sessionStorage|indexedDB|document\.cookie/, f);
});
