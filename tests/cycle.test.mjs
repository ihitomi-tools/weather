import assert from 'node:assert/strict';
import test from 'node:test';
import { dayNum, keyOf, runsOf, predict } from '../docs/js/cycle.js';

const range = (a, b) => { const out = []; for (let n = dayNum(a); n <= dayNum(b); n++) out.push(keyOf(n)); return out; };

test('日付と日数の変換は往復できる(月またぎ・年またぎ)', () => {
  assert.equal(keyOf(dayNum('2026-12-31') + 1), '2027-01-01');
  assert.equal(keyOf(dayNum('2026-02-28') + 1), '2026-03-01');
  assert.equal(dayNum('2026-03-01') - dayNum('2026-02-01'), 28);
});

test('連続した日をひとまとまりにする', () => {
  const r = runsOf([...range('2026-09-07', '2026-09-11'), ...range('2026-10-05', '2026-10-09'), '2026-10-20']);
  assert.deepEqual(r.map((x) => [x.start, x.end, x.len]), [['2026-09-07', '2026-09-11', 5], ['2026-10-05', '2026-10-09', 5], ['2026-10-20', '2026-10-20', 1]]);
});

test('2回分の記録で、次の予想が出る', () => {
  const days = [...range('2026-09-07', '2026-09-11'), ...range('2026-10-05', '2026-10-09')];
  const p = predict(days, '2026-10-19');
  assert.equal(p.cycle, 28);
  assert.equal(p.len, 5);
  assert.deepEqual(p.starts, ['2026-11-02', '2026-11-30', '2026-12-28']);
  assert.deepEqual(p.next, { start: '2026-11-02', diff: 14 });
  assert.ok(p.days.has('2026-11-06') && !p.days.has('2026-11-07'));
});

test('記録が1回分だけなら、予想しない', () => {
  const p = predict(range('2026-10-05', '2026-10-09'), '2026-10-19');
  assert.equal(p.next, null);
  assert.equal(p.days.size, 0);
});

test('極端な間隔(記録の抜け)は、平均から外す', () => {
  const days = [...range('2026-06-01', '2026-06-05'), ...range('2026-08-30', '2026-09-03'), ...range('2026-09-27', '2026-10-01')]; // 90日 → 28日
  const p = predict(days, '2026-10-10');
  assert.equal(p.cycle, 28);
});

test('過ぎてしまった予想は出さず、いまの予定日にあわせる', () => {
  const days = [...range('2026-08-10', '2026-08-14'), ...range('2026-09-07', '2026-09-11')]; // 次は10/5のはず
  const p = predict(days, '2026-10-19'); // 記録がないまま10/19
  assert.equal(p.starts[0], '2026-11-02');
  assert.equal(p.next.diff, 14);
});

test('予定日の途中なら、予定日からの日数がマイナスで出る', () => {
  const days = [...range('2026-08-10', '2026-08-14'), ...range('2026-09-07', '2026-09-11')];
  const p = predict(days, '2026-10-07'); // 10/5〜10/9の予想の途中
  assert.equal(p.next.start, '2026-10-05');
  assert.equal(p.next.diff, -2);
});
