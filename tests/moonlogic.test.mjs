import test from 'node:test';
import assert from 'node:assert/strict';
import { dayKey4, analyzeMoon, isMilestone, specialOf, rolesOf, seasonOf, WINDOW_MS } from '../docs/js/moonlogic.js';

const at = (y, m, d, h, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();

test('1日の区切りは朝4時', () => {
  assert.equal(dayKey4(at(2026, 10, 20, 3, 59)), '2026-10-19');
  assert.equal(dayKey4(at(2026, 10, 20, 4, 0)), '2026-10-20');
  assert.equal(dayKey4(at(2026, 10, 21, 0, 30)), '2026-10-20');
});

test('10分以内は「ぴったり」5点、あとから追いかけたら「おまたせ」1点', () => {
  const now = at(2026, 10, 20, 22);
  const a = analyzeMoon([{ role: 'h', at: at(2026, 10, 20, 21, 0) }, { role: 'y', at: at(2026, 10, 20, 21, 9) }], now);
  assert.equal(a.total, 5); assert.equal(a.sync, 1); assert.equal(a.today.kind, 'sync'); assert.equal(a.today.first, 'h');
  const b = analyzeMoon([{ role: 'y', at: at(2026, 10, 20, 9, 0) }, { role: 'h', at: at(2026, 10, 20, 21, 0) }], now);
  assert.equal(b.total, 1); assert.equal(b.late, 1); assert.equal(b.today.kind, 'late'); assert.equal(b.today.first, 'y');
  assert.equal(WINDOW_MS, 600000);
});

test('片方だけの日は、ポイントにならず、待っている状態', () => {
  const a = analyzeMoon([{ role: 'h', at: at(2026, 10, 20, 21, 0) }], at(2026, 10, 20, 22));
  assert.equal(a.total, 0); assert.equal(a.today.resolved, false); assert.equal(a.today.first, 'h'); assert.equal(a.today.y, null);
});

test('朝4時をまたぐと、別の日として数える', () => {
  const sig = [{ role: 'h', at: at(2026, 10, 20, 23, 55) }, { role: 'y', at: at(2026, 10, 21, 0, 3) }, { role: 'h', at: at(2026, 10, 21, 4, 5) }];
  const a = analyzeMoon(sig, at(2026, 10, 21, 5));
  assert.equal(a.total, 5);
  assert.equal(a.today.key, '2026-10-21'); assert.equal(a.today.resolved, false);
});

test('100ポイントで満月になり、回数と日時が残る。そのあと新月に戻る', () => {
  const sig = [];
  for (let i = 0; i < 21; i += 1) { sig.push({ role: 'h', at: at(2026, 1, 1 + i, 21, 0) }, { role: 'y', at: at(2026, 1, 1 + i, 21, 2) }); }
  const a = analyzeMoon(sig, at(2026, 1, 30, 12));
  assert.equal(a.total, 105); assert.equal(a.pts, 5); assert.equal(a.fulls.length, 1); assert.equal(a.fulls[0].n, 1);
  assert.equal(new Date(a.fulls[0].at).getDate(), 20);
});

test('記念日: 100日ごと・1年ごと', () => {
  assert.equal(isMilestone('2026-01-01', '2026-04-11'), true); // 100日
  assert.equal(isMilestone('2025-10-20', '2026-10-20'), true); // 1周年
  assert.equal(isMilestone('2026-10-20', '2026-10-20'), false);
  assert.equal(isMilestone('2026-01-01', '2026-04-10'), false);
});

test('特別な日の優先順位は 誕生日 > 記念日 > デート', () => {
  const base = { todayKey: '2026-04-11', today: new Date(2026, 3, 11), birthdays: [], anns: [{ d: '2026-01-01' }], events: [{ who: 'both', date: '2026-04-11' }] };
  assert.equal(specialOf(base), 'milestone');
  assert.equal(specialOf({ ...base, birthdays: [{ m: 4, d: 11 }] }), 'bday');
  assert.equal(specialOf({ ...base, anns: [] }), 'date');
  assert.equal(specialOf({ ...base, anns: [], events: [{ who: 'me', date: '2026-04-11' }] }), 'none');
});

test('役の決め方', () => {
  assert.deepEqual(rolesOf('a', 'b', 'h', null), { a: 'h', b: 'y' });
  assert.deepEqual(rolesOf('a', 'b', null, 'h'), { a: 'y', b: 'h' });
  assert.deepEqual(rolesOf('a', 'b', null, null), { a: 'h', b: 'y' });
  assert.deepEqual(rolesOf('b', 'a', null, null), { b: 'y', a: 'h' });
  assert.deepEqual(rolesOf('a', 'b', 'h', 'h'), { a: 'h', b: 'y' });
});

test('季節', () => {
  assert.equal(seasonOf(new Date(2026, 3, 1)), 'spring');
  assert.equal(seasonOf(new Date(2026, 6, 1)), 'summer');
  assert.equal(seasonOf(new Date(2026, 9, 1)), 'autumn');
  assert.equal(seasonOf(new Date(2026, 0, 1)), 'winter');
});
