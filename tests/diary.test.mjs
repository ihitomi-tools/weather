import test from 'node:test';
import assert from 'node:assert/strict';
import { diaryKeys, diaryPages, dayOfPage, monthTabs, startIndex } from '../docs/js/diary.js';

test('日記の日: お題・調子やメモ・予定のどれかがある日だけ、古い順。未来は出さない', () => {
  const keys = diaryKeys({
    cards: [{ date: '2026-10-24' }, { date: '2026-10-22' }, { date: '2026-10-22' }],
    recKeys: ['2026-10-20', '2026-10-24'],
    events: [{ date: '2026-10-18' }, { date: '2026-11-30' }],
    todayKey: '2026-10-25',
  });
  assert.deepEqual(keys, ['2026-10-18', '2026-10-20', '2026-10-22', '2026-10-24']);
});

test('連続する予定は、日ごとにページになる(今日まで)', () => {
  const keys = diaryKeys({ events: [{ date: '2026-10-23', end: '2026-10-27' }], todayKey: '2026-10-25' });
  assert.deepEqual(keys, ['2026-10-23', '2026-10-24', '2026-10-25']);
});

test('空のとき・おかしな日付は、ページにしない', () => {
  assert.deepEqual(diaryKeys({ todayKey: '2026-10-25' }), []);
  assert.deepEqual(diaryKeys({ recKeys: ['abc', ''], cards: [{ date: '' }], todayKey: '2026-10-25' }), []);
});

test('月のふせん: 古い月から。13か月以上は、新しい12個', () => {
  const keys = ['2026-09-13', '2026-09-27', '2026-10-20', '2026-10-24'];
  assert.deepEqual(monthTabs(keys), [{ ym: '2026-09', index: 0 }, { ym: '2026-10', index: 2 }]);
  const many = Array.from({ length: 14 }, (_, i) => `${2025 + Math.floor((i + 8) / 12)}-${String(((i + 8) % 12) + 1).padStart(2, '0')}-01`);
  assert.equal(monthTabs(many).length, 12);
  assert.equal(monthTabs(many)[11].ym, many[13].slice(0, 7));
});

test('開く日: しおりがあればそこ、なければ、いちばん新しい日', () => {
  const keys = ['2026-10-18', '2026-10-20', '2026-10-24'];
  assert.equal(startIndex(keys, '2026-10-20'), 1);
  assert.equal(startIndex(keys, '2026-10-01'), 2);
  assert.equal(startIndex(keys, null), 2);
  assert.equal(startIndex([], null), 0);
});

test('1日=2ページ: できごと、そのあとにお題(お題が出た日だけ)', () => {
  const pages = diaryPages(['2026-10-20', '2026-10-22', '2026-10-24'], (d) => d !== '2026-10-22');
  assert.deepEqual(pages, ['2026-10-20#e', '2026-10-20#c', '2026-10-22#e', '2026-10-24#e', '2026-10-24#c']);
  assert.equal(dayOfPage('2026-10-24#c'), '2026-10-24'); assert.equal(dayOfPage('2026-10-24'), '2026-10-24');
  assert.deepEqual(monthTabs(pages), [{ ym: '2026-10', index: 0 }]);
});
