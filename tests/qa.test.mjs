import assert from 'node:assert/strict';
import test from 'node:test';
import { nextAction, cardStatus, availableStock, pickStock, orderReserved, WHISPER, isComplete, describeAnswer, fmtDuration, answerKey, localKey } from '../docs/js/qa.js';
import { nextBirthday, nextGiftBirthday, isBirthdayOn, midnightMs, birthdayDate } from '../docs/js/dates.js';

const at = (key, hh = 12) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, hh).getTime(); };
const ans = (list) => new Map(list.map(([n, owner, key]) => [answerKey(n, owner), { n, owner, at: at(key) }]));

test('お題がまだなければ、最初のお題を出す', () => {
  assert.deepEqual(nextAction([], new Map(), '2026-10-20'), { type: 'create', n: 1 });
});

test('2人とも答えたら、翌日の0時から次のお題。同じ日は待つ', () => {
  const cards = [{ n: 1, date: '2026-10-20' }];
  const a = ans([[1, 'a', '2026-10-20'], [1, 'b', '2026-10-20']]);
  assert.deepEqual(nextAction(cards, a, '2026-10-20'), { type: 'wait', until: 'tomorrow' });
  assert.deepEqual(nextAction(cards, a, '2026-10-21'), { type: 'create', n: 2 });
});

test('答えがそろうまで、日がたっても次に進まない。日がたったら、ボタンを出す', () => {
  const cards = [{ n: 1, date: '2026-10-20' }];
  const a = ans([[1, 'a', '2026-10-20']]);
  assert.deepEqual(nextAction(cards, a, '2026-10-20'), { type: 'wait', until: 'answers' });
  assert.deepEqual(nextAction(cards, a, '2026-10-21'), { type: 'skip-ok', n: 2 });
  assert.deepEqual(nextAction(cards, a, '2026-11-30'), { type: 'skip-ok', n: 2 });
});

test('2人目が翌日に答えたら、その翌日0時に次のお題', () => {
  const cards = [{ n: 1, date: '2026-10-20' }];
  const a = ans([[1, 'a', '2026-10-20'], [1, 'b', '2026-10-21']]);
  assert.deepEqual(nextAction(cards, a, '2026-10-21'), { type: 'wait', until: 'tomorrow' });
  assert.deepEqual(nextAction(cards, a, '2026-10-22'), { type: 'create', n: 2 });
});

test('お休みのカードは、あとから2人がそろえば、そろったカードになる', () => {
  const cards = [{ n: 1, date: '2026-10-20' }, { n: 2, date: '2026-10-21' }];
  let a = ans([[1, 'a', '2026-10-20']]);
  assert.equal(cardStatus(cards[0], cards, a), 'rest');
  assert.equal(cardStatus(cards[1], cards, a), 'answering');
  a = ans([[1, 'a', '2026-10-20'], [1, 'b', '2026-11-02']]);
  assert.equal(isComplete(1, a), true);
  assert.equal(cardStatus(cards[0], cards, a), 'complete');
});

test('ストックは、使ったものを除き、番号から同じ1つを選ぶ', () => {
  const stock = [{ id: 'c' }, { id: 'a' }, { id: 'b' }];
  const cards = [{ n: 1, stockId: 'a' }];
  assert.deepEqual(availableStock(stock, cards).map((s) => s.id), ['c', 'b']);
  const p1 = pickStock([{ id: 'x' }, { id: 'y' }, { id: 'z' }], 5);
  const p2 = pickStock([{ id: 'z' }, { id: 'x' }, { id: 'y' }], 5); // 並びが違っても同じ
  assert.equal(p1.id, p2.id);
  assert.equal(pickStock([], 3), null);
  const seen = new Set(Array.from({ length: 30 }, (_, n) => pickStock([{ id: 'x' }, { id: 'y' }, { id: 'z' }], n + 1).id));
  assert.ok(seen.size >= 2); // 偏りすぎない
});

test('答えの記録の文言', () => {
  assert.equal(fmtDuration(30 * 1000), '1分未満');
  assert.equal(fmtDuration(12 * 60000), '12分');
  assert.equal(fmtDuration(90 * 60000), '1時間30分');
  assert.equal(fmtDuration(120 * 60000), '2時間');
  assert.equal(fmtDuration(50 * 3600000), '2日2時間');
  const t0 = at('2026-10-20', 21);
  const s = describeAnswer({ t0, at: t0 + 14 * 60000, edits: 3 });
  assert.match(s, /^10\/20 21:14 ・ 考えた時間 14分 ・ 書き直し3回$/);
  assert.match(describeAnswer({ at: t0 }), /^10\/20 21:00$/);
  assert.equal(localKey(t0), '2026-10-20');
});

test('誕生日の計算(年なし)', () => {
  const today = new Date(2026, 9, 20);
  assert.equal(nextBirthday(10, 20, today).daysLeft, 0);
  assert.equal(nextBirthday(11, 30, today).daysLeft, 41);
  assert.equal(nextBirthday(10, 19, today).date.getFullYear(), 2027); // 過ぎていれば来年
  assert.equal(nextGiftBirthday(10, 20, today).date.getFullYear(), 2027); // 今日が誕生日なら、贈れるのは来年
  assert.equal(nextGiftBirthday(10, 25, today).daysLeft, 5);
  assert.equal(isBirthdayOn(10, 20, today), true);
  assert.equal(isBirthdayOn(10, 21, today), false);
});

test('うるう日の誕生日は、うるう年でない年は2/28', () => {
  assert.equal(birthdayDate(2, 29, 2027).getDate(), 28);
  assert.equal(birthdayDate(2, 29, 2028).getDate(), 29);
  assert.equal(isBirthdayOn(2, 29, new Date(2027, 1, 28)), true);
});

test('開封日は端末の0時', () => {
  assert.equal(new Date(midnightMs('2026-12-01')).getHours(), 0);
  assert.equal(new Date(midnightMs('2026-12-01')).getDate(), 1);
});

test('前のお題と同じカテゴリは、続けて選ばない(2台で同じ結果)', () => {
  const s = [{ id: 'a', cat: 'daily' }, { id: 'b', cat: 'daily' }, { id: 'c', cat: 'mem' }];
  for (let n = 1; n <= 20; n++) assert.equal(pickStock(s, n, 'daily').id, 'c');
  assert.equal(pickStock([{ id: 'a', cat: 'daily' }], 3, 'daily').id, 'a'); // ほかに無ければ、そのまま選ぶ
  assert.equal(pickStock([...s].reverse(), 7, 'daily').id, pickStock(s, 7, 'daily').id); // 並びがちがっても同じ
  assert.equal(pickStock(s, 5).id, pickStock([...s].reverse(), 5).id); // カテゴリを使わないときは、今まで通り
});

test('足した人が、できるだけ交互になる。片方しか無いときは、そのまま選ぶ', () => {
  const s = [{ id: 'a', from: 'u1' }, { id: 'b', from: 'u1' }, { id: 'c', from: 'u2' }, { id: 'd', from: 'u2' }];
  for (let n = 1; n <= 20; n++) {
    assert.equal(pickStock(s, n, null, 'u1').from, 'u2');
    assert.equal(pickStock(s, n, null, 'u2').from, 'u1');
  }
  assert.equal(pickStock([{ id: 'a', from: 'u1' }], 3, null, 'u1').id, 'a'); // 相手のお題が無ければ、同じ人でも選ぶ
  // 交互が先。同じ人のお題のなかで、カテゴリを避ける
  const t = [{ id: 'a', from: 'u2', cat: 'daily' }, { id: 'b', from: 'u2', cat: 'mem' }, { id: 'c', from: 'u1', cat: 'mem' }];
  for (let n = 1; n <= 20; n++) assert.equal(pickStock(t, n, 'daily', 'u1').id, 'b');
  for (let n = 1; n <= 20; n++) assert.equal(pickStock(t, n, 'mem', 'u1').id, 'a');
  assert.equal(pickStock([...t].reverse(), 9, 'mem', 'u1').id, pickStock(t, 9, 'mem', 'u1').id); // 並びがちがっても同じ
});

import { guessPhase, partnerGuessView, isRate } from '../docs/js/qa.js';
{
  const A = (...o) => new Map(o.map((u) => [answerKey(1, u), { n: 1, owner: u }]));
  const G = (...gs) => new Map(gs.map((g) => [answerKey(1, g.owner), { n: 1, ...g }]));
  test('予想: 答える前は予想できない', () => assert.equal(guessPhase(1, 'a', A(), G()), 'none'));
  test('予想: 先に答えたら書ける(書き直しOK)', () => {
    assert.equal(guessPhase(1, 'a', A('a'), G()), 'open');
    assert.equal(guessPhase(1, 'a', A('a'), G({ owner: 'a', text: 'x' })), 'open');
  });
  test('予想: 相手が先に答えていたら予想できない', () => assert.equal(guessPhase(1, 'a', A('b', 'a'), G()), 'none'));
  test('予想: 相手が答えたら判定待ち、判定したら完了', () => {
    assert.equal(guessPhase(1, 'a', A('a', 'b'), G({ owner: 'a', text: 'x' })), 'judge');
    assert.equal(guessPhase(1, 'a', A('a', 'b'), G({ owner: 'a', text: 'x', r: 'near' })), 'done');
  });
  test('予想: 相手の予想は、判定まで「あること」だけ見える', () => {
    assert.equal(partnerGuessView(1, 'b', A('a', 'b'), G({ owner: 'a', text: 'x' })), 'locked');
    assert.equal(partnerGuessView(1, 'b', A('a', 'b'), G({ owner: 'a', text: 'x', r: 'hit' })), 'shown');
    assert.equal(partnerGuessView(1, 'b', A('a'), G({ owner: 'a', text: 'x' })), null);
    assert.equal(partnerGuessView(1, 'b', A('a', 'b'), G()), null);
  });
  test('予想: 判定は3つだけ', () => { assert.ok(isRate('hit') && isRate('near') && isRate('miss')); assert.ok(!isRate('x') && !isRate(undefined)); });
}

test('おやすみ前: デートの前日だけ出て(その日は必ず)、ほかの日は出ない', () => {
  const avail = [{ id: 'a', from: 'u1', cat: 'daily' }, { id: 'b', from: 'u2', cat: WHISPER }, { id: 'c', from: 'u1', cat: 'fav' }];
  for (let n = 1; n <= 30; n++) {
    assert.equal(pickStock(avail, n, null, null, true).id, 'b'); // デートの前日は、100%
    assert.notEqual(pickStock(avail, n, null, null, false).id, 'b'); // ふだんの日は、出ない
    assert.notEqual(pickStock(avail, n).id, 'b');
  }
});
test('おやすみ前: 前日でも、ストックがなければ、ふつうのお題から選ぶ。おやすみ前しか残っていない日は、選ばない', () => {
  const normal = [{ id: 'a', from: 'u1', cat: 'daily' }];
  assert.equal(pickStock(normal, 3, null, null, true).id, 'a');
  assert.equal(pickStock([{ id: 'b', from: 'u2', cat: WHISPER }], 3, null, null, false), null);
});

test('予約: 予約があれば、いちばん先の予約を選ぶ(使用済み・おやすみ前・ないものは、とばす)', () => {
  const avail = [
    { id: 'a', text: 'A', from: 'u1' }, { id: 'b', text: 'B', from: 'u2' }, { id: 'c', text: 'C', from: 'u1' },
    { id: 'w', text: 'W', from: 'u1', cat: WHISPER },
  ];
  assert.equal(pickStock(avail, 1, null, null, false, [{ id: 'b' }, { id: 'a' }]).id, 'b'); // 先の予約が先
  assert.equal(pickStock(avail, 1, null, null, false, [{ id: 'gone' }, { id: 'c' }]).id, 'c'); // 使用済み・消えたものは、とばす
  assert.equal(pickStock(avail, 1, null, null, false, [{ id: 'w' }, { id: 'a' }]).id, 'a'); // おやすみ前は、予約でも、出さない
  // 前と同じカテゴリでも、予約が先
  const cat = [{ id: 'x', text: 'X', from: 'u1', cat: 'memory' }, { id: 'y', text: 'Y', from: 'u2', cat: 'future' }];
  assert.equal(pickStock(cat, 3, 'memory', 'u2', false, [{ id: 'x' }]).id, 'x');
  // 予約がなければ、これまでどおり(2台の端末で、同じ結果)
  assert.equal(pickStock(avail, 7).id, pickStock(avail, 7, null, null, false, []).id);
});

test('予約: デートの前日(おやすみ前の日)は、おやすみ前が先。予約は、次の日まで待つ', () => {
  const avail = [{ id: 'a', text: 'A', from: 'u1' }, { id: 'w', text: 'W', from: 'u1', cat: WHISPER }];
  assert.equal(pickStock(avail, 1, null, null, true, [{ id: 'a' }]).id, 'w');
  assert.equal(pickStock(avail.filter((x) => x.id === 'a'), 1, null, null, true, [{ id: 'a' }]).id, 'a'); // おやすみ前が無ければ、予約を出す
});

test('予約の順番: 2件以上のときは、前のお題を足した人と、ちがう人のお題が先(ふたりが交互)', () => {
  const avail = [
    { id: 'a', text: 'A', from: 'u1' }, { id: 'b', text: 'B', from: 'u1' }, { id: 'c', text: 'C', from: 'u2' }, { id: 'd', text: 'D', from: 'u2' },
  ];
  const ids = (l) => l.map((x) => x.id).join('');
  const r = (...x) => x.map((id) => ({ id }));
  // 前のお題が u1 → u2 のお題が先。そのあとは、また u1、…と交互
  assert.equal(ids(orderReserved(r('a', 'b', 'c', 'd'), avail, 'u1')), 'cadb');
  // 前のお題が u2 → u1 のお題が先
  assert.equal(ids(orderReserved(r('c', 'a', 'd', 'b'), avail, 'u2')), 'acbd');
  // 前の人が分からない(はじめて)ときは、予約した順
  assert.equal(ids(orderReserved(r('b', 'c', 'a'), avail, null)), 'bca'); // b(u1) → 次は違う人 c(u2) → a(u1)
  // 片方の人のお題しかないときは、予約した順のまま
  assert.equal(ids(orderReserved(r('b', 'a'), avail, 'u2')), 'ba');
  assert.equal(ids(orderReserved(r('b', 'a'), avail, 'u1')), 'ba');
  // 予約が1件のときは、前の人と同じでも、その1件が出る(予約が先)
  assert.equal(ids(orderReserved(r('a'), avail, 'u1')), 'a');
  assert.equal(pickStock(avail, 1, null, 'u1', false, r('a', 'c')).id, 'c');
  assert.equal(pickStock(avail, 1, null, 'u2', false, r('c', 'a')).id, 'a');
  // 使用済み・消えた・おやすみ前は、とばす。同じidが重なっても、1つ
  const w = [...avail, { id: 'w', text: 'W', from: 'u2', cat: WHISPER }];
  assert.equal(ids(orderReserved(r('w', 'gone', 'a', 'a'), w, 'u2')), 'a');
});
