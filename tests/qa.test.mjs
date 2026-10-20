import assert from 'node:assert/strict';
import test from 'node:test';
import { nextAction, cardStatus, availableStock, pickStock, isComplete, describeAnswer, fmtDuration, answerKey, localKey } from '../docs/js/qa.js';
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
