import assert from 'node:assert/strict';
import test from 'node:test';
import { isEmojiOnly } from '../docs/js/emoji.js';

test('絵文字だけなら大きく表示する', () => {
  assert.equal(isEmojiOnly('😊'), true);
  assert.equal(isEmojiOnly(' 🍝🍣 '), true);
  assert.equal(isEmojiOnly('👨‍👩‍👧'), true); // 家族の絵文字は1つとして数える
  assert.equal(isEmojiOnly('🇯🇵'), true);
  assert.equal(isEmojiOnly('❤️❤️❤️'), true);
  assert.equal(isEmojiOnly('1️⃣'), true);
});

test('文字が混じる・4個以上・空は対象外', () => {
  assert.equal(isEmojiOnly('おはよう😊'), false);
  assert.equal(isEmojiOnly('😊😊😊😊'), false);
  assert.equal(isEmojiOnly('123'), false);
  assert.equal(isEmojiOnly(''), false);
  assert.equal(isEmojiOnly(null), false);
});
