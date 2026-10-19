import assert from 'node:assert/strict';
import test from 'node:test';
import * as c from '../docs/js/crypto.js';

test('バックアップコードは往復できる', () => {
  const k = c.newSecret();
  const code = c.toCode(k);
  assert.match(code, /^([A-Z2-7]{6}-)+[A-Z2-7]{1,6}$/);
  assert.deepEqual(c.fromCode(code), k);
  assert.deepEqual(c.fromCode(code.toLowerCase().replaceAll('-', ' ')), k);
});

test('1文字違うコードは検出される', () => {
  const code = c.toCode(c.newSecret());
  const bad = (code[0] === 'A' ? 'B' : 'A') + code.slice(1);
  assert.throws(() => c.fromCode(bad));
  assert.throws(() => c.fromCode('ABC'));
});

test('暗号化して復号できる / 種類違い・キー違いは失敗する', async () => {
  const k1 = await c.importKey(c.newSecret());
  const k2 = await c.importKey(c.newSecret());
  const doc = await c.encryptJson(k1, 'messages', { body: 'こんにちは' });
  assert.equal(doc.v, 1);
  assert.deepEqual(await c.decryptJson(k1, 'messages', doc), { body: 'こんにちは' });
  await assert.rejects(c.decryptJson(k1, 'events', doc));
  await assert.rejects(c.decryptJson(k2, 'messages', doc));
});

test('同じ内容でも暗号文は毎回変わる', async () => {
  const k = await c.importKey(c.newSecret());
  const a = await c.encryptJson(k, 'messages', { body: 'x' });
  const b = await c.encryptJson(k, 'messages', { body: 'x' });
  assert.notEqual(a.ct, b.ct);
});

test('日ごとの保存名は、同じキー・同じ日なら同じで、日付が分からない', async () => {
  const k = c.newSecret();
  const a = await c.dayId(k, '2026-10-19');
  assert.equal(a, await c.dayId(k, '2026-10-19'));
  assert.notEqual(a, await c.dayId(k, '2026-10-20'));
  assert.notEqual(a, await c.dayId(c.newSecret(), '2026-10-19'));
  assert.match(a, /^[A-Za-z0-9_-]{43}$/);
  assert.ok(!a.includes('2026'));
});

test('確認番号は同じキーなら同じ', async () => {
  const k = c.newSecret();
  assert.equal(await c.fingerprint(k), await c.fingerprint(k));
  assert.match(await c.fingerprint(k), /^\d{3} \d{3}$/);
});
