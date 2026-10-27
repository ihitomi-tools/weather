import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tagKind, isPain, painBadge, groupTags, PRESET_TAGS, PAIN, SEIRI } from '../docs/js/tags.js';

test('痛い系: 「痛い」「痛み」「〇痛」で終わるものと、決めたタグ', () => {
  ['頭が痛い', 'おなかが痛い', '腰が痛い', '肩こり', '筋肉痛', '生理痛', '胃が痛い', '頭痛', '胃痛', '歯が痛い', '首の痛み'].forEach((t) => assert.equal(tagKind(t), 'pain', t));
});

test('「痛くない」などは、痛い系に入らない', () => {
  ['頭が痛くない', '痛みがない', '痛くなかった', '痛くない'].forEach((t) => assert.equal(isPain(t), false, t));
});

test('仕分け', () => {
  assert.equal(tagKind('胸が張る'), 'seiri');
  assert.equal(tagKind('量が多い'), 'seiri');
  assert.equal(tagKind('元気'), 'maru');
  assert.equal(tagKind('疲れた'), 'maru'); // 昔の記録
  assert.equal(tagKind('疲れてる'), 'maru');
  assert.equal(tagKind('よく眠れた'), 'maru');
  assert.equal(tagKind('こころの疲れ'), 'kokoro');
  assert.equal(tagKind('不安'), 'kokoro');
  assert.equal(tagKind('眠い'), 'karada');
  assert.equal(tagKind('からだの疲れ'), 'karada');
  assert.equal(tagKind('むくみ'), 'karada'); // 昔の記録
  assert.equal(tagKind('会議つかれた'), 'other');
});

test('漢字の丸', () => {
  assert.deepEqual(painBadge('頭が痛い'), { ch: '頭', color: 'head' });
  assert.deepEqual(painBadge('腰が痛い'), { ch: '腰', color: 'waist' });
  assert.deepEqual(painBadge('胃が痛い'), { ch: '胃', color: 'stomach' });
  assert.deepEqual(painBadge('おなかが痛い'), { ch: '腹', color: 'stomach' });
  assert.deepEqual(painBadge('肩こり'), { ch: '肩', color: 'shoulder' });
  assert.deepEqual(painBadge('首が痛い'), { ch: '首', color: 'shoulder' });
  assert.deepEqual(painBadge('筋肉痛'), { ch: '筋', color: 'muscle' });
  assert.deepEqual(painBadge('生理痛'), { ch: '生', color: 'period' });
  assert.deepEqual(painBadge('ひざが痛い'), { ch: '膝', color: 'muscle' });
  assert.deepEqual(painBadge('なんか痛い'), { ch: '痛', color: 'other' });
});

test('groupTags: 順番はえらんだ順、昔の記録の言葉も落とさない', () => {
  const g = groupTags(['眠い', '頭が痛い', '不安', '胃が痛い', '元気', 'むくみ', '会議つかれた']);
  assert.deepEqual(g.pain, ['頭が痛い', '胃が痛い']);
  assert.deepEqual(g.karada, ['眠い', 'むくみ']);
  assert.deepEqual(g.maru, ['元気']);
  assert.deepEqual(g.other, ['会議つかれた']);
  assert.equal(Object.values(g).flat().length, 7);
});

test('決めたタグは、全部、PRESET に入っている(自分で足したタグとして、数えない)', () => {
  [...PAIN, ...SEIRI, 'むくみ', '元気', '疲れた', '疲れてる'].forEach((t) => assert.ok(PRESET_TAGS.has(t), t));
});
