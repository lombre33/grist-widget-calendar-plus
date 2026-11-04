// Génère la carte d'importation (adresses versionnées `?v=`) et l'empreinte de la politique de sécurité de index.html. Ce qu'un outil génère est commité. À lancer après chaque changement de JS ou de CSS :
//   node outils/versionner.mjs            (la version vient de package.json ; montez-la d'abord)
// GitHub Pages met tout en cache 10 minutes : sans `?v=`, une correction n'arrive pas. Une seule adresse par module, la même partout.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const racine = new URL('../', import.meta.url).pathname;
const DOSSIERS = ['app', 'kit/js'];

function modules(dossier, sortie = []) {
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) modules(chemin, sortie);
    else if (nom.endsWith('.js')) sortie.push(relative(racine, chemin));
  }
  return sortie;
}

export function carte(version, fichiers) {
  return JSON.stringify({ imports: Object.fromEntries(fichiers.map(f => [`./${f}`, `./${f}?v=${version}`])) }, null, 2);
}

export const empreinte = texte => `'sha256-${createHash('sha256').update(texte).digest('base64')}'`;

export function versionner(html, version, fichiers) {
  const corps = `\n${carte(version, fichiers)}\n`;
  return html
    .replace(/(<script type="importmap">)[\s\S]*?(<\/script>)/, `$1${corps}$2`)
    .replace(/'sha256-[A-Za-z0-9+/=]+'/, empreinte(corps))
    .replace(/\?v=[0-9.]+(?=")/g, `?v=${version}`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const version = JSON.parse(readFileSync(join(racine, 'package.json'), 'utf8')).version;
  const fichiers = DOSSIERS.flatMap(d => modules(join(racine, d))).sort();
  const chemin = join(racine, 'index.html');
  writeFileSync(chemin, versionner(readFileSync(chemin, 'utf8'), version, fichiers));
  process.stdout.write(`index.html : version ${version}, ${fichiers.length} modules\n`);
}
