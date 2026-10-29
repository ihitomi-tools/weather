// 記念日ステッカー: 日付の一覧にある絵が、ファイルとして在って、オフラインでも読めるよう sw.js にも入っているか。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ANNIV_STICKERS, annivSticker, DAY_PHOTOS, dayPhoto } from '../docs/js/anniv.js';

const sw = fs.readFileSync(new URL('../docs/sw.js', import.meta.url), 'utf8');

test('記念日ステッカーの日付と絵', () => {
  const days = Object.keys(ANNIV_STICKERS);
  assert.ok(days.length >= 1);
  for (const d of days) {
    assert.match(d, /^\d{4}-\d{2}-\d{2}$/, `${d} は、日付の形ではない`);
    const f = ANNIV_STICKERS[d];
    assert.ok(fs.existsSync(new URL(`../docs/img/anniv/${f}`, import.meta.url)), `${f} がない`);
    assert.ok(sw.includes(`'img/anniv/${f}'`), `${f} が sw.js の FILES にない`);
  }
});

test('annivSticker: 絵がある日だけ、パスを返す', () => {
  assert.equal(annivSticker('2026-10-27'), 'img/anniv/2026-10-27.webp');
  assert.equal(annivSticker('2026-10-28'), 'img/anniv/2026-10-28.webp');
  assert.equal(annivSticker('2026-10-29'), null);
});

test('写真風の絵: ファイルと sw.js と大きさ', () => {
  for (const d of Object.keys(DAY_PHOTOS)) {
    const p = DAY_PHOTOS[d];
    assert.match(d, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(fs.existsSync(new URL(`../docs/img/anniv/${p.file}`, import.meta.url)), `${p.file} がない`);
    assert.ok(sw.includes(`'img/anniv/${p.file}'`), `${p.file} が sw.js の FILES にない`);
    assert.ok(p.w > 0 && p.h > 0);
  }
  assert.equal(dayPhoto('2026-10-29').src, 'img/anniv/2026-10-29.webp');
  assert.equal(dayPhoto('2026-10-28'), null);
});
