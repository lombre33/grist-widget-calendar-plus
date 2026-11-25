// La seule conversion entre les dates de Grist et les jours civils du module (docs/plan.md, section 3) : le module ignore les fuseaux, l'hôte convertit ici.
// Grist donne une colonne Date en secondes à minuit UTC, et une colonne DateTime en secondes UTC lues dans le fuseau de la colonne (« DateTime:Europe/Paris »).
// Le module reçoit « AAAA-MM-JJ » (Date) ou « AAAA-MM-JJTHH:mm » (DateTime, l'heure du fuseau de la colonne). Tout le calcul passe par l'UTC, jamais par l'heure de la machine.

const DAY = 86400;
const DAY_TEXT = /^(\d{4})-(\d{2})-(\d{2})$/;
const MOMENT_TEXT = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/;
// L'heure posée sur une colonne DateTime quand le module rend un jour sans heure et que la ligne n'en avait pas encore.
export const DEFAULT_HOUR = 9;

const pad = (n, size = 2) => String(n).padStart(size, '0');
export const baseType = type => String(type || '').split(':')[0];
export const isDateType = type => ['Date', 'DateTime'].includes(baseType(type));
export const timeZoneOf = type => (baseType(type) === 'DateTime' ? String(type).slice('DateTime:'.length) || 'UTC' : null);

function formatterFor(timeZone) {
  const settings = { hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
  try {
    return new Intl.DateTimeFormat('en-GB', { ...settings, timeZone });
  } catch (error) {
    return new Intl.DateTimeFormat('en-GB', { ...settings, timeZone: 'UTC' }); // un fuseau inconnu de ce navigateur : l'UTC plutôt qu'une page cassée
  }
}

// Les parties (année… seconde) d'un instant vu dans un fuseau.
export function partsInZone(seconds, timeZone) {
  const parts = Object.fromEntries(formatterFor(timeZone).formatToParts(new Date(seconds * 1000)).map(p => [p.type, p.value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), hour: Number(parts.hour) % 24, minute: Number(parts.minute), second: Number(parts.second) };
}

// L'écart (en secondes) entre l'heure du fuseau et l'UTC à cet instant.
function offsetAt(seconds, timeZone) {
  const p = partsInZone(seconds, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) / 1000 - seconds;
}

// Une heure murale (celle que la personne lit dans le fuseau) vers l'instant UTC. Deux passes : la seconde corrige l'écart quand l'heure d'été change entre les deux.
function wallToUtc(wall, timeZone) {
  const local = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second ?? 0) / 1000;
  const first = local - offsetAt(local, timeZone);
  return local - offsetAt(first, timeZone);
}

function readMoment(text) {
  const m = typeof text === 'string' ? MOMENT_TEXT.exec(text) : null;
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  const hasTime = m[4] !== undefined;
  const hour = hasTime ? Number(m[4]) : null;
  const minute = hasTime ? Number(m[5]) : null;
  if (hasTime && (hour > 23 || minute > 59)) return null;
  return { year, month, day, hour, minute };
}

export const isDayText = text => typeof text === 'string' && DAY_TEXT.test(text) && readMoment(text) !== null;

// Valeur de Grist vers le texte du module. Vide, non numérique ou 0 (la date vide de Grist, jamais le 01/01/1970) : null.
export function fromGrist(value, type) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value === 0 || !isDateType(type)) return null;
  const zone = timeZoneOf(type);
  if (!zone) {
    const d = new Date(Math.floor(value / DAY) * DAY * 1000);
    return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const p = partsInZone(value, zone);
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

// Texte du module vers la valeur à écrire. Date : minuit UTC du jour (une heure éventuelle est laissée, la colonne n'en garde pas).
// DateTime : l'heure donnée, dans le fuseau de la colonne ; un jour sans heure garde l'heure de l'ancienne valeur (DEFAULT_HOUR si elle n'en avait pas).
// Un texte vide rend null (la date s'efface) ; un texte illisible lève une erreur (jamais « réparé » en silence).
export function toGrist(text, type, previous = null) {
  if (text === null || text === undefined || text === '') return null;
  const moment = readMoment(text);
  if (!moment || !isDateType(type)) throw new Error(`date illisible : ${text}`);
  const zone = timeZoneOf(type);
  if (!zone) return Date.UTC(moment.year, moment.month - 1, moment.day) / 1000;
  let { hour, minute } = moment;
  let second = 0;
  if (hour === null) {
    const old = typeof previous === 'number' && previous !== 0 ? partsInZone(previous, zone) : { hour: DEFAULT_HOUR, minute: 0, second: 0 };
    ({ hour, minute, second } = old);
  }
  return wallToUtc({ year: moment.year, month: moment.month, day: moment.day, hour, minute, second }, zone);
}
