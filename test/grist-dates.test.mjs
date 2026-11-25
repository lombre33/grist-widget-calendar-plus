// La conversion des dates de Grist (app/grist/dates.js) : Date à minuit UTC, DateTime dans le fuseau de la colonne, passages à l'heure d'été et d'hiver, valeurs vides et illisibles.
// Ces essais tournent sous trois fuseaux de machine (`npm run test:fuseaux`) : le résultat ne doit jamais dépendre de l'heure de la machine.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_HOUR, fromGrist, isDayText, partsInZone, timeZoneOf, toGrist } from '../app/grist/dates.js';

const utc = (y, m, d, hh = 0, mm = 0) => Date.UTC(y, m - 1, d, hh, mm) / 1000;
const PARIS = 'DateTime:Europe/Paris';

test('Date : minuit UTC donne le jour, sans glisser d\'un jour selon la machine', () => {
  assert.equal(fromGrist(utc(2026, 11, 19), 'Date'), '2026-11-19');
  assert.equal(fromGrist(utc(2024, 2, 29), 'Date'), '2024-02-29');
  assert.equal(fromGrist(utc(2026, 12, 31), 'Date'), '2026-12-31');
  assert.equal(fromGrist(utc(2027, 1, 1), 'Date'), '2027-01-01');
  assert.equal(fromGrist(utc(1969, 12, 31), 'Date'), '1969-12-31', 'une date avant 1970 (valeur négative)');
});

test('valeurs vides, nulles, 0 ou non numériques : pas de date (jamais le 01/01/1970)', () => {
  for (const value of [null, undefined, '', 0, 'demain', NaN, Infinity, ['E', 'TypeError']]) assert.equal(fromGrist(value, 'Date'), null, String(value));
  assert.equal(fromGrist(utc(2026, 1, 1), 'Text'), null, 'une colonne qui n\'est pas une date');
});

test('DateTime : l\'heure est celle du fuseau de la colonne, en hiver et en été', () => {
  assert.equal(fromGrist(utc(2026, 1, 15, 8, 30), PARIS), '2026-01-15T09:30');
  assert.equal(fromGrist(utc(2026, 7, 15, 8, 30), PARIS), '2026-07-15T10:30');
  assert.equal(fromGrist(utc(2026, 7, 15, 23, 30), PARIS), '2026-07-16T01:30', 'le jour change avec le fuseau');
  assert.equal(fromGrist(utc(2026, 7, 15, 8, 30), 'DateTime:America/Los_Angeles'), '2026-07-15T01:30');
  assert.equal(fromGrist(utc(2026, 7, 15, 8, 30), 'DateTime:UTC'), '2026-07-15T08:30');
});

test('DateTime au fuseau inconnu : lu en UTC plutôt qu\'une page cassée', () => {
  assert.equal(fromGrist(utc(2026, 7, 15, 8, 30), 'DateTime:Pas/Un_Fuseau'), '2026-07-15T08:30');
  assert.equal(timeZoneOf('DateTime:'), 'UTC');
  assert.equal(timeZoneOf('Date'), null);
});

test('Date vers Grist : minuit UTC ; une heure donnée est laissée (la colonne n\'en garde pas)', () => {
  assert.equal(toGrist('2026-11-19', 'Date'), utc(2026, 11, 19));
  assert.equal(toGrist('2026-11-19T14:15', 'Date'), utc(2026, 11, 19));
  assert.equal(toGrist('', 'Date'), null);
  assert.equal(toGrist(null, 'Date'), null);
});

test('DateTime vers Grist : l\'heure murale du fuseau, des deux côtés du changement d\'heure', () => {
  assert.equal(toGrist('2026-01-15T09:30', PARIS), utc(2026, 1, 15, 8, 30));
  assert.equal(toGrist('2026-07-15T10:30', PARIS), utc(2026, 7, 15, 8, 30));
  // Le 29/03/2026 (passage à l'heure d'été à Paris, 2 h → 3 h) et le 25/10/2026 (retour, 3 h → 2 h).
  assert.equal(toGrist('2026-03-29T01:00', PARIS), utc(2026, 3, 29, 0, 0));
  assert.equal(toGrist('2026-03-29T04:00', PARIS), utc(2026, 3, 29, 2, 0));
  assert.equal(toGrist('2026-10-25T04:00', PARIS), utc(2026, 10, 25, 3, 0));
  assert.equal(toGrist('2026-10-24T23:00', PARIS), utc(2026, 10, 24, 21, 0));
});

test('aller-retour : chaque quart d\'heure d\'une semaine qui change d\'heure revient à l\'identique', () => {
  for (const zone of [PARIS, 'DateTime:America/Los_Angeles', 'DateTime:Pacific/Auckland']) {
    for (let s = utc(2026, 10, 22); s < utc(2026, 11, 3); s += 900) {
      const text = fromGrist(s, zone);
      const back = toGrist(text, zone);
      assert.equal(fromGrist(back, zone), text, `${zone} ${text}`);
    }
  }
});

test('DateTime et jour sans heure : l\'heure de l\'ancienne valeur est gardée, sinon l\'heure par défaut', () => {
  const ancienne = utc(2026, 7, 15, 12, 45); // 14:45 à Paris
  assert.equal(fromGrist(toGrist('2026-07-20', PARIS, ancienne), PARIS), '2026-07-20T14:45');
  assert.equal(fromGrist(toGrist('2026-12-20', PARIS, ancienne), PARIS), '2026-12-20T14:45', 'même heure murale, de l\'été à l\'hiver');
  assert.equal(fromGrist(toGrist('2026-07-20', PARIS), PARIS), `2026-07-20T${String(DEFAULT_HOUR).padStart(2, '0')}:00`);
  assert.equal(fromGrist(toGrist('2026-07-20', PARIS, 0), PARIS), `2026-07-20T${String(DEFAULT_HOUR).padStart(2, '0')}:00`, '0 est une date vide');
});

test('textes illisibles : une erreur, jamais une date « réparée »', () => {
  for (const text of ['2026-02-30', '2026-13-01', '19/11/2026', '2026-11-19T25:00', '2026-11-19T10:60', 'demain']) assert.throws(() => toGrist(text, 'Date'), /illisible/, text);
  assert.throws(() => toGrist('2026-11-19', 'Text'), /illisible/);
  assert.equal(isDayText('2026-11-19'), true);
  assert.equal(isDayText('2026-11-19T10:00'), false);
  assert.equal(isDayText('2026-02-30'), false);
});

test('partsInZone rend 0 h et non 24 h à minuit', () => {
  assert.equal(partsInZone(utc(2026, 7, 15, 22, 0), 'Europe/Paris').hour, 0);
});
