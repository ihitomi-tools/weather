import test from 'node:test';
import assert from 'node:assert/strict';
import { sectionKeys, newFlags } from '../docs/js/news.js';

const base = () => ({ me: 'a', messages: [], qcards: [], answers: new Map(), boxes: [], marks: new Map(), items: new Map(), events: [], days: new Map(), pats: new Map(), now: 1000 });

test('見たあとは新着が消え、相手の動きだけが新着になる', () => {
  const s = base();
  s.messages = [{ from: 'a', ts: 5 }, { from: 'b', ts: 7 }];
  const seen = sectionKeys(s);
  assert.deepEqual(newFlags(sectionKeys(s), seen), { chat: false, q: false, b: false, cal: false });
  s.messages.push({ from: 'b', ts: 9 });
  s.answers.set('1|b', { n: 1, owner: 'b' });
  s.events.push({ id: 'e1', by: 'b' });
  const f = newFlags(sectionKeys(s), seen);
  assert.equal(f.chat, true);
  assert.equal(f.q, true);
  assert.equal(f.cal, true);
  assert.equal(f.b, false);
});

test('自分の動きは新着にならない', () => {
  const s = base();
  const seen = sectionKeys(s);
  s.messages.push({ from: 'a', ts: 9 });
  s.events.push({ id: 'e1', by: 'a' });
  s.answers.set('1|a', { n: 1, owner: 'a' });
  const f = newFlags(sectionKeys(s), seen);
  assert.equal(f.chat || f.cal || f.q, false);
});

test('自分あての未開封の誕生日ボックスは、新着に出ない', () => {
  const s = base();
  const seen = sectionKeys(s);
  s.boxes.push({ id: 'x', kind: 'bd', forUid: 'a', openAt: 5000, from: 'b' });
  s.marks.set('x', [{ id: 'm1', from: 'b' }]);
  assert.equal(newFlags(sectionKeys(s), seen).b, false);
  s.now = 6000;
  assert.equal(newFlags(sectionKeys(s), seen).b, true);
});

test('相手の記録・よしよし・開いたボックスが新着になる', () => {
  const s = base();
  const seen = sectionKeys(s);
  s.days.set('d', { d: '2026-10-20', by: 'b', l: 3 });
  assert.equal(newFlags(sectionKeys(s), seen).cal, true);
  const s2 = base();
  const seen2 = sectionKeys(s2);
  s2.pats.set('2026-10-20', [{ id: 'p1', by: 'b' }]);
  assert.equal(newFlags(sectionKeys(s2), seen2).cal, true);
  const s3 = base();
  s3.boxes.push({ id: 'y', kind: 'cap', openAt: 2000, from: 'a' });
  s3.marks.set('y', [{ id: 'm', from: 'a' }]);
  const seen3 = sectionKeys(s3);
  s3.now = 3000;
  assert.equal(newFlags(sectionKeys(s3), seen3).b, true);
});
