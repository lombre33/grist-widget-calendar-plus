// Les règles du dépôt qui se lisent dans le code du module (`calendrier/`) : il n'importe que lui-même et, par un seul fichier, le kit ; il ne parle pas à Grist ni au navigateur
// hors de son élément ; pas de HTML construit par chaîne, pas de console, pas de couleur ni de z-index en dur, pas de fichier de plus de 600 lignes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';

const racine = new URL('../calendrier/', import.meta.url);
function lister(dossier, relatif = '') {
  return readdirSync(new URL(relatif, dossier)).flatMap(nom => {
    const chemin = `${relatif}${nom}`;
    return statSync(new URL(chemin, dossier)).isDirectory() ? lister(dossier, `${chemin}/`) : [chemin];
  });
}
const lire = chemin => readFileSync(new URL(chemin, racine), 'utf8');
const tous = lister(racine);
const scripts = tous.filter(chemin => chemin.endsWith('.js')).map(chemin => ({ chemin, texte: lire(chemin) }));
const feuilles = tous.filter(chemin => chemin.endsWith('.css')).map(chemin => ({ chemin, texte: lire(chemin) }));

// Le code sans ses commentaires ni ses chaînes : une règle ne vise pas un texte qui cite `innerHTML` pour l'interdire.
function code(texte) {
  return texte
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')
    .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
}

test('le module a des fichiers à tester', () => {
  assert.ok(scripts.length >= 5);
});

test('les imports : des fichiers du module par chemin relatif ; le kit seulement par lien-kit.js', () => {
  for (const { chemin, texte } of scripts) {
    for (const [, cible] of texte.matchAll(/^\s*(?:import|export)\s[^;]*?from\s+'([^']+)'/gm)) {
      if (cible.startsWith('../kit/') || cible.startsWith('../../kit/')) assert.match(chemin, /(^|\/)lien-kit\.js$/, `${chemin} importe le kit directement : ${cible}`);
      else assert.match(cible, /^\.{1,2}\/(?!kit\/)[A-Za-z0-9_./-]+\.js$/, `${chemin} importe ${cible}`);
    }
    assert.doesNotMatch(code(texte), /\bimport\s*\(|\brequire\s*\(|https?:\/\//, `${chemin} : import dynamique ou adresse`);
  }
});

test('le module ne parle ni à Grist ni à la fenêtre : pas de grist, window, parent, postMessage, document.body', () => {
  for (const { chemin, texte } of scripts) {
    assert.doesNotMatch(code(texte), /\bgrist\b|\bwindow\b|\bparent\b|\bpostMessage\b|\bdocument\.body\b|\bonmessage\b|\blocalStorage\b|\bsessionStorage\b/, chemin);
  }
});

test('aucun HTML par chaîne, aucun eval, aucune boîte du navigateur, aucun attribut style', () => {
  for (const { chemin, texte } of scripts) {
    const corps = code(texte);
    assert.doesNotMatch(corps, /\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write/, chemin);
    assert.doesNotMatch(corps, /\beval\s*\(|new Function\s*\(/, chemin);
    assert.doesNotMatch(corps, /(^|[^.\w])(prompt|confirm|alert)\s*\(/, chemin);
    assert.doesNotMatch(corps, /\.setAttribute\(\s*'style'|\.style\.cssText|\.style\s*=\s/, chemin);
  }
});

test('rien dans la console hors avertissements et erreurs', () => {
  for (const { chemin, texte } of scripts) assert.doesNotMatch(code(texte), /console\.(log|debug|info|trace|dir)\b/, chemin);
});

test('aucune couleur ni z-index en dur dans les feuilles (les jetons du kit)', () => {
  for (const { chemin, texte } of feuilles) {
    const corps = texte.replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(corps, /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|z-index\s*:\s*-?\d/, chemin);
  }
});

test('aucun fichier ne dépasse 600 lignes', () => {
  for (const { chemin, texte } of [...scripts, ...feuilles]) assert.ok(texte.split('\n').length <= 600, chemin);
});

test('chaque module dit en tête à quoi il sert', () => {
  for (const { chemin, texte } of scripts) assert.match(texte, /^\/\/ \S/, `${chemin} sans commentaire de tête`);
});

test('le module n\'a aucun prénom de personne dans son code', () => {
  for (const { chemin, texte } of scripts) assert.doesNotMatch(code(texte), /\b(Antoine|Camille|Alex|Claude)\b/, chemin);
});
