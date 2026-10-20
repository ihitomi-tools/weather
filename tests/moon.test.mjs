import test from 'node:test';
import assert from 'node:assert/strict';
import { moonScene, VARIANTS } from '../docs/js/moon.js';

const base = { pts: 12, sig: { h: null, y: null }, first: null, resolved: false, kind: null, cheerUntil: 0, revisit: 0, variant: 'hug', special: 'none', season: 'autumn', now: Date.now(), winMs: 600000, pop: null, popUntil: 0, sigAt: { h: 0, y: 0 } };
const bad = (svg) => /undefined|NaN|null|\[object/.test(svg);

test('どの状態でも、壊れたSVGにならない', () => {
  const states = [];
  ['spring', 'summer', 'autumn', 'winter'].forEach((season) => states.push({ season }));
  ['none', 'date', 'bday', 'milestone'].forEach((special) => states.push({ special }));
  states.push({ sig: { h: base.now - 1000, y: null }, first: 'h' });
  states.push({ sig: { h: base.now - 3600e3, y: null }, first: 'h' });
  states.push({ sig: { h: null, y: base.now - 1000 }, first: 'y' });
  states.push({ sig: { h: base.now, y: base.now }, resolved: true, kind: 'sync', first: 'h', cheerUntil: base.now + 5000 });
  states.push({ sig: { h: base.now, y: base.now }, resolved: true, kind: 'late', first: 'y', cheerUntil: base.now + 5000 });
  states.push({ sig: { h: base.now, y: base.now }, resolved: true, kind: 'sync', first: 'h' });
  VARIANTS.forEach((variant) => states.push({ sig: { h: base.now, y: base.now }, resolved: true, kind: 'sync', first: 'h', revisit: 1, variant }));
  [0, 30, 60, 90].forEach((pts) => states.push({ pts }));
  states.forEach((o) => {
    const svg = moonScene({ ...base, ...o });
    assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), JSON.stringify(o));
    assert.ok(!bad(svg), `${JSON.stringify(o)}: ${(svg.match(/.{20}(undefined|NaN|null|\[object).{20}/) || [''])[0]}`);
    assert.equal((svg.match(/<g[ >]/g) || []).length, (svg.match(/<\/g>/g) || []).length, JSON.stringify(o));
  });
});

test('相合傘の日は雨(冬は雪のまま)', () => {
  const o = { sig: { h: base.now, y: base.now }, resolved: true, kind: 'sync', first: 'h', revisit: 1, variant: 'umbrella' };
  assert.ok(moonScene({ ...base, ...o, season: 'summer' }).includes('drop2'));
  assert.ok(!moonScene({ ...base, ...o, season: 'winter' }).includes('drop2'));
  assert.ok(!moonScene({ ...base, ...o, variant: 'hug' }).includes('drop2'));
});

test('特別な日の飾り', () => {
  assert.ok(moonScene({ ...base, special: 'bday' }).includes('bfw'));
  assert.ok(moonScene({ ...base, special: 'milestone' }).includes('hb'));
  assert.ok(moonScene({ ...base, special: 'date' }).includes('wheel'));
});
