import assert from 'node:assert/strict';
import test from 'node:test';
import { canRecord, unseenPats } from '../docs/js/share.js';

test('記録の持ち主だけが入力できる', () => {
  assert.equal(canRecord(new Set(), 'a'), true); // まだ記録がない
  assert.equal(canRecord(new Set(['a']), 'a'), true); // 自分の記録
  assert.equal(canRecord(new Set(['a']), 'b'), false); // 相手の記録がある
  assert.equal(canRecord(new Set(['a', 'b']), 'a'), false); // 他の人の記録も混じる
  assert.equal(canRecord(new Set([undefined]), 'b'), true); // 持ち主のいない古い記録
});

test('まだ見ていない、他の人からのよしよしだけを新しい順に出す', () => {
  const pats = [
    { by: 'b', at: 100, d: '2026-10-01' },
    { by: 'b', at: 300, d: '2026-10-03' },
    { by: 'a', at: 400, d: '2026-10-04' }, // 自分のものは数えない
    { by: 'b', at: 200, d: '2026-10-02' },
  ];
  assert.deepEqual(unseenPats(pats, 'a', 0).map((p) => p.d), ['2026-10-03', '2026-10-02', '2026-10-01']);
  assert.deepEqual(unseenPats(pats, 'a', 200).map((p) => p.d), ['2026-10-03']);
  assert.deepEqual(unseenPats(pats, 'a', 300), []);
});
