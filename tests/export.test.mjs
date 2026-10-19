import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExport } from '../docs/js/export.js';

test('書き出しに、各項目が入る', () => {
  const t = buildExport({
    me: 'ひとみ', partner: 'ゆうき', myUid: 'a',
    messages: [{ ts: 0, from: 'a', body: 'こんにちは' }, { ts: 1, from: 'b', stamp: '🍝' }],
    events: [{ date: '2026-11-01', time: '18:30', title: '映画' }],
    days: new Map([['2026-10-01', { d: '2026-10-01', p: 1, l: 3, t: ['眠い'], m: 'メモ' }]]),
    qcards: [{ n: 1, date: '2026-10-02', text: 'お題?' }],
    answers: new Map([['1|a', { n: 1, owner: 'a', text: '答え', at: 0 }]]),
    boxes: [{ id: 'x', kind: 'cap', title: '来年', openAt: 0 }, { id: 'y', kind: 'cap', title: '未開封', openAt: 9e15 }],
    items: new Map([['x', [{ from: 'b', text: '手紙' }]]]),
  });
  for (const w of ['ひとみ: こんにちは', 'ゆうき: 🍝', '映画', '生理、調子3/5、眠い、メモ', 'お題?', 'ひとみ: 答え', '来年', 'ゆうき: 手紙']) assert.ok(t.includes(w), w);
  assert.ok(!t.includes('未開封'));
});
