// L'app autonome (app/, css/, index.html) : les règles du dépôt qui se lisent dans le code, et la carte d'importation à jour (GitHub Pages met tout en cache 10 minutes : `?v=` doit suivre).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { versionner } from '../outils/versionner.mjs';

const racine = new URL('../', import.meta.url);
const lire = chemin => readFileSync(new URL(chemin, racine), 'utf8');
function lister(dossier, filtre, relatif = '') {
  return readdirSync(new URL(`${dossier}/${relatif}`, racine)).flatMap(nom => {
    const chemin = `${relatif}${nom}`;
    return statSync(new URL(`${dossier}/${chemin}`, racine)).isDirectory() ? lister(dossier, filtre, `${chemin}/`) : (filtre.test(nom) ? [`${dossier}/${chemin}`] : []);
  });
}
const code = texte => texte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1').replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''").replace(/`(?:[^`\\]|\\.)*`/g, '``');
const scripts = lister('app', /\.js$/);
const feuilles = ['css/app.css', ...lister('calendrier', /\.css$/)];

test('l\'app : pas de console, pas de window.onmessage, pas de HTML par chaîne, pas d\'attribut style, stockage dans un try/catch', () => {
  assert.ok(scripts.length >= 4);
  for (const chemin of scripts) {
    const corps = code(lire(chemin));
    assert.doesNotMatch(corps, /console\.(log|debug|info|trace|dir)\b/, chemin);
    assert.doesNotMatch(corps, /\bonmessage\s*=/, chemin);
    assert.doesNotMatch(corps, /\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write|\beval\s*\(|new Function\s*\(/, chemin);
    assert.doesNotMatch(corps, /\.setAttribute\(\s*'style'|\.style\.cssText|\.style\s*=\s/, chemin);
    assert.doesNotMatch(corps, /\b(localStorage|sessionStorage|indexedDB)\b/, `${chemin} : le stockage passe par le kit`);
  }
});

test('l\'app n\'importe que le kit, le module et elle-même, jamais une autre app', () => {
  for (const chemin of scripts) {
    for (const [, cible] of lire(chemin).matchAll(/^\s*import\s[^;]*?from\s+'([^']+)'/gm)) assert.match(cible, /^\.\.?\/(\.\.\/)?(kit\/js|calendrier|app)?\/?[A-Za-z0-9_./-]*\.js$/, `${chemin} importe ${cible}`);
  }
});

test('les feuilles : aucune couleur ni z-index en dur, des jetons seulement', () => {
  for (const chemin of feuilles) assert.doesNotMatch(lire(chemin).replace(/\/\*[\s\S]*?\*\//g, ''), /#[0-9a-fA-F]{3,8}\b(?![^"]*")|\brgba?\(|\bhsla?\(|z-index\s*:\s*-?\d/, chemin);
});

test('aucun fichier ou dossier du site ne commence par « _ » ou « . » (hors .nojekyll), et .nojekyll est là', () => {
  const trouves = [];
  const parcourir = (dossier, relatif = '') => {
    for (const nom of readdirSync(new URL(`${dossier}${relatif}`, racine))) {
      if (['node_modules', '.git', 'test'].includes(nom)) continue;
      if (/^[_.]/.test(nom) && nom !== '.nojekyll' && !(relatif === '' && ['.gitmodules', '.gitignore'].includes(nom))) trouves.push(`${relatif}${nom}`);
      if (statSync(new URL(`${dossier}${relatif}${nom}`, racine)).isDirectory() && !/^[_.]/.test(nom) && nom !== 'kit') parcourir(dossier, `${relatif}${nom}/`);
    }
  };
  parcourir('');
  assert.deepEqual(trouves, []);
  assert.equal(readdirSync(racine).includes('.nojekyll'), true);
});

test('index.html : la carte d\'importation, l\'empreinte et les ?v= sont à jour (node outils/versionner.mjs)', () => {
  const version = JSON.parse(lire('package.json')).version;
  const fichiers = ['app', 'calendrier', 'kit/js'].flatMap(d => lister(d, /\.js$/)).sort();
  const html = lire('index.html');
  assert.equal(versionner(html, version, fichiers), html, 'relancez node outils/versionner.mjs');
  assert.match(html, new RegExp(`app/main\\.js\\?v=${version.replace(/\./g, '\\.')}`));
});

test('la politique de sécurité de la page : pas de style en ligne, pas d\'autre site que docs.getgrist.com/grist-plugin-api.js', () => {
  const politique = lire('index.html').match(/Content-Security-Policy" content="([^"]+)"/)[1];
  assert.match(politique, /style-src 'self';/);
  assert.doesNotMatch(politique, /'unsafe-inline'/);
  const sites = [...politique.matchAll(/https?:\/\/[^\s;]+/g)].map(m => m[0]);
  assert.deepEqual(sites, ['https://docs.getgrist.com/grist-plugin-api.js']);
  assert.doesNotMatch(lire('index.html'), /<style|style="/);
});
