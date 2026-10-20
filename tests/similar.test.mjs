import assert from 'node:assert/strict';
import test from 'node:test';
import { normalize, similarity, findSimilar } from '../docs/js/similar.js';

test('記号や空白、全角半角のちがいは、同じとみなす', () => {
  assert.equal(normalize(' 好きな 食べ物は? '), '好きな食べ物は');
  assert.equal(similarity('好きな食べ物は?', '好きな食べ物は？'), 1);
  assert.equal(similarity('ＡＢＣ', 'abc'), 1);
});

test('ほとんど同じ言い方は、似ているとみなす', () => {
  assert.ok(similarity('好きな食べ物は?', 'いちばん好きな食べ物は?') >= 0.7);
  assert.ok(similarity('最近うれしかったことは?', '最近うれしかったことは何?') >= 0.7);
  assert.ok(similarity('行ってみたい場所は?', '行ってみたい場所はどこ?') >= 0.7);
});

test('話題がちがうものは、似ているとみなさない', () => {
  assert.ok(similarity('好きな食べ物は?', '好きな映画は?') < 0.7);
  assert.ok(similarity('子どものころの夢は?', '最近うれしかったことは?') < 0.7);
  assert.equal(similarity('', 'あ'), 0);
});

test('似ているものを、似ている順に返す', () => {
  const items = [{ text: '好きな映画は?', id: 1 }, { text: 'いちばん好きな食べ物は?', id: 2 }, { text: '好きな食べ物は?', id: 3 }];
  const r = findSimilar('好きな食べ物は?', items);
  assert.deepEqual(r.map((x) => x.id), [3, 2]);
});
