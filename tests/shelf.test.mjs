import test from 'node:test';
import assert from 'node:assert/strict';
import { photoOf, persOf, glowOf, shelfSvg, tankSvg, PERS, MAX } from '../docs/js/shelf.js';

test('月の写真は5枚を順に使い、続けて同じにならない', () => {
  const names = Array.from({ length: 10 }, (_, i) => photoOf(i + 1));
  assert.equal(new Set(names).size, 5);
  assert.equal(names[0], 'img/moon1.webp');
  names.slice(1).forEach((n, i) => assert.notEqual(n, names[i]));
});

test('性格は6種類がひとめぐりし、光は青〜紫の6色', () => {
  assert.equal(new Set(Array.from({ length: 6 }, (_, i) => persOf(i + 1).k)).size, PERS.length);
  assert.equal(new Set(Array.from({ length: 6 }, (_, i) => glowOf(i + 1))).size, 6);
});

test('棚は5段×4個。満月の数だけ、タップできる水槽ができる', () => {
  assert.equal(MAX, 20);
  const svg = shelfSvg([{ n: 1, at: new Date(2026, 9, 21).getTime() }, { n: 2, at: new Date(2026, 10, 9).getTime() }]);
  assert.equal((svg.match(/class="oto-tk"/g) || []).length, 2);
  assert.ok(svg.includes('10/21') && svg.includes('11/9'));
  assert.equal((svg.match(/fill="url\(#wood\)"/g) || []).length, 5);
});

test('21個目からは、2枚目の棚として、番号が続く', () => {
  const svg = shelfSvg([{ n: 21, at: Date.now() }], 20);
  assert.ok(svg.includes('data-n="21"'));
});

test('水槽を1つだけ描くと、水のゆらめきが付く', () => {
  assert.ok(tankSvg(3).includes('filter="url(#wob)"'));
  assert.ok(!shelfSvg([{ n: 1, at: Date.now() }]).includes('filter="url(#wob)"'));
});
