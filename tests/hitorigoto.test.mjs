import assert from 'node:assert/strict';
import test from 'node:test';
import { LINES, groupsFor, candidates, pickLine, P_USUAL, P_TIRED } from '../docs/js/hitorigoto.js';

const base = { resolved: true, hour: 14, rain: false, pts: 10, lateToday: false, soon: false, tiredRoles: [] };

test('ふだんの昼は、「ふだん」の言葉だけ', () => {
  assert.deepEqual(groupsFor(base), ['usual']);
});
test('朝・夜・雨・満月が近い・おまたせ・デートが近い で、グループが増える', () => {
  assert.ok(groupsFor({ ...base, hour: 8 }).includes('morning'));
  assert.ok(groupsFor({ ...base, hour: 22 }).includes('night'));
  assert.ok(groupsFor({ ...base, hour: 1 }).includes('night'));
  assert.ok(groupsFor({ ...base, rain: true }).includes('rain'));
  assert.ok(groupsFor({ ...base, pts: 85 }).includes('fullish'));
  assert.ok(!groupsFor({ ...base, pts: 100 }).includes('fullish'));
  assert.ok(groupsFor({ ...base, lateToday: true }).includes('late'));
  assert.ok(groupsFor({ ...base, soon: true }).includes('soon'));
});
test('しんどい日は、やさしい言葉だけ(ほかのグループは混ざらない)', () => {
  const g = groupsFor({ ...base, rain: true, hour: 8, tiredRoles: ['h'] });
  assert.deepEqual(g, ['tired']);
  candidates({ ...base, rain: true, tiredRoles: ['h'] }).forEach((c) => assert.equal(c.group, 'tired'));
});
test('しんどい日は、しんどい本人ではない側のキャラが言う', () => {
  assert.ok(candidates({ ...base, tiredRoles: ['h'] }).every((c) => c.role === 'y'));
  assert.ok(candidates({ ...base, tiredRoles: ['y'] }).every((c) => c.role === 'h'));
  const both = candidates({ ...base, tiredRoles: ['h', 'y'] });
  assert.ok(both.some((c) => c.role === 'h') && both.some((c) => c.role === 'y'));
});
test('出る確率: ふだん50%、しんどい日80%', () => {
  assert.equal(pickLine(base, { rand: () => P_USUAL }), null); // 0.5 は出ない
  assert.ok(pickLine(base, { rand: () => 0.49 }));
  assert.equal(pickLine({ ...base, tiredRoles: ['h'] }, { rand: () => P_TIRED }), null);
  assert.ok(pickLine({ ...base, tiredRoles: ['h'] }, { rand: () => 0.79 }));
});
test('直前と同じ言葉は、続けて出さない', () => {
  const only = { ...base, tiredRoles: ['h'] }; // y の3つだけ
  const last = LINES.tired.filter(([r]) => r === 'y')[0][1];
  for (let i = 0; i < 20; i++) {
    let n = 0;
    const r = () => { n += 1; return n === 1 ? 0 : (i / 20); };
    assert.notEqual(pickLine(only, { rand: r, last }).text, last);
  }
});
test('言葉の数: どのグループにも、ふたりの口調の言葉がある(特別な場面を除く)', () => {
  ['usual', 'tired', 'morning', 'night', 'rain'].forEach((g) => { assert.ok(LINES[g].some(([r]) => r === 'h') && LINES[g].some(([r]) => r === 'y'), g); });
});

test('月のブランコが成立するまで(ふたりが触れるまで)は、話さない', () => {
  assert.equal(pickLine({ ...base, resolved: false }, { rand: () => 0 }), null);
  assert.equal(pickLine({ ...base, resolved: false, tiredRoles: ['h'] }, { rand: () => 0 }), null);
  assert.ok(pickLine(base, { rand: () => 0 }));
});
