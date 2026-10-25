import assert from 'node:assert/strict';
import test from 'node:test';
import { LINES, NAME_LINES, groupsFor, candidates, pickLine, pickGreeting, isMorning, bumpOpens, pickOpenLine, OPEN_TIERS, P_USUAL, P_TIRED, P_NAME } from '../docs/js/hitorigoto.js';

const base = { resolved: true, hour: 14, rain: false, pts: 10, lateToday: false, soon: false, tiredRoles: [] };

test('ふだんの昼は、「ふだん」の言葉だけ', () => {
  assert.deepEqual(groupsFor(base), ['usual']);
});
test('夜・雨・満月が近い・おまたせ・デートが近い で、グループが増える', () => {
  assert.ok(!groupsFor({ ...base, hour: 8 }).includes('morning')); // 朝のあいさつは、別に出す(1日1回、必ず)
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
  ['usual', 'tired', 'morning', 'night', 'rain', 'open5', 'open10'].forEach((g) => { assert.ok(LINES[g].some(([r]) => r === 'h') && LINES[g].some(([r]) => r === 'y'), g); });
});

test('月のブランコが成立するまで(ふたりが触れるまで)は、話さない', () => {
  assert.equal(pickLine({ ...base, resolved: false }, { rand: () => 0 }), null);
  assert.equal(pickLine({ ...base, resolved: false, tiredRoles: ['h'] }, { rand: () => 0 }), null);
  assert.ok(pickLine(base, { rand: () => 0 }));
});

test('午前中(5時〜12時前)に開いたら、あいさつ。朝の言葉だけから選ぶ', () => {
  assert.ok(isMorning(5) && isMorning(11) && !isMorning(4) && !isMorning(12));
  const texts = LINES.morning.map(([, t]) => t);
  for (let i = 0; i < 10; i++) assert.ok(texts.includes(pickGreeting({ rand: () => i / 10 }).text));
  assert.notEqual(pickGreeting({ rand: () => 0, last: texts[0] }).text, texts[0]);
});
test('ときどき、相手の名前を呼ぶ(低い確率・しんどい日は呼ばない)', () => {
  let n = 0;
  const r1 = () => { n += 1; return n === 1 ? 0 : (n === 2 ? 0.01 : 0); }; // 出る → 名前を呼ぶ
  const call = pickLine(base, { rand: r1 });
  assert.equal(call.group, 'name');
  assert.ok(NAME_LINES.some(([role, text]) => role === call.role && text === call.text) && call.text.includes('{name}'));
  const noCall = pickLine(base, { rand: (() => { let m = 0; return () => { m += 1; return m === 1 ? 0 : (m === 2 ? P_NAME : 0); }; })() });
  assert.notEqual(noCall.group, 'name'); // 12%以上なら、ふつうの言葉
  const tiredPick = pickLine({ ...base, tiredRoles: ['h'] }, { rand: () => 0 });
  assert.equal(tiredPick.group, 'tired');
});

test('開いた回数: 1日5回目と10回目だけ特別。30秒以内の開き直しは、1回にまとめる', () => {
  let st = null; const tiers = [];
  for (let i = 0; i < 12; i++) { const r = bumpOpens(st, '2026-10-25', 1e9 + i * 60000); st = r.state; tiers.push(r.tier); }
  assert.deepEqual(tiers, [null, null, null, null, 'open5', null, null, null, null, 'open10', null, null]);
  assert.deepEqual(OPEN_TIERS, { 5: 'open5', 10: 'open10' });
  const a = bumpOpens(null, 'd', 1000); const b = bumpOpens(a.state, 'd', 1000 + 29000);
  assert.equal(b.state.n, 1); assert.equal(b.tier, null);
  const c = bumpOpens(b.state, 'd', 1000 + 29000 + 30000); assert.equal(c.state.n, 2);
});
test('開いた回数は、日がかわると数え直す', () => {
  let st = null;
  for (let i = 0; i < 4; i++) st = bumpOpens(st, 'd1', 1e9 + i * 60000).state;
  assert.equal(st.n, 4);
  const r = bumpOpens(st, 'd2', 1e9 + 5 * 60000);
  assert.equal(r.state.n, 1); assert.equal(r.tier, null);
});
test('特別な言葉: 避ける言い回しを使わず、直前と同じものは続けない', () => {
  [...LINES.open5, ...LINES.open10, ...LINES.tired].forEach(([, t]) => assert.ok(!/無理しない|しんどい|だめ|ダメ/.test(t), t));
  const last = LINES.open5[0][1];
  for (let i = 0; i < 20; i++) assert.notEqual(pickOpenLine('open5', { rand: () => i / 20, last }).text, last);
  assert.equal(pickOpenLine('open10', { rand: () => 0 }).group, 'open10');
});
