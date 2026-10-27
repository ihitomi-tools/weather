import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SCENES, PICS, DAY_READY, isNight, pickScene, roomSvg, toneOf } from '../docs/js/room.js';

test('夜は21時から朝5時まで', () => {
  assert.equal(isNight(20), false); assert.equal(isNight(21), true); assert.equal(isNight(2), true); assert.equal(isNight(4), true); assert.equal(isNight(5), false);
});
test('昼は昼のパターン、夜は夜のパターンから選ぶ。直前と同じものは続けない', () => {
  for (let i = 0; i < 30; i += 1) {
    const day = pickScene({ hour: 14, last: 'd1', rand: () => i / 30, dayReady: true });
    assert.ok(SCENES.day.includes(day) && day !== 'd1');
    const night = pickScene({ hour: 22, last: 'n3', rand: () => i / 30 });
    assert.ok(SCENES.night.includes(night) && night !== 'n3');
  }
});
test('絵: どのパターンも、棚と日記帳がタップできて、ふたりの場所はタップできない', () => {
  [...SCENES.day, ...SCENES.night].forEach((k) => {
    const svg = roomSvg(k);
    assert.ok(svg.includes('data-go="shelf"') && svg.includes('data-go="diary"'), k);
    assert.ok(!/data-go="(couple|whisper)"/.test(svg), k);
  });
});
test('絵: 知らないパターンでも、昼の1つ目の絵になる', () => { assert.equal(roomSvg('zzz'), roomSvg('d1')); });

test('絵: 窓の月は点数で満ち欠けし、棚の水槽は満月の数だけ光る', () => {
  const dashed = (svg) => (svg.match(/stroke-dasharray="3 3"/g) || []).length;
  assert.equal(dashed(roomSvg('d1', { pts: 0, full: 0 })), 5);
  assert.equal(dashed(roomSvg('d1', { pts: 0, full: 2 })), 3);
  assert.equal(dashed(roomSvg('d1', { pts: 0, full: 9 })), 0);
  assert.ok(!roomSvg('d1', { pts: 0 }).includes('fill="url(#rmh)"')); // 新月は、光のかさなし
  assert.ok(roomSvg('d1', { pts: 80 }).includes('fill="url(#rmh)"'));
  assert.notEqual(roomSvg('d1', { pts: 20 }), roomSvg('d1', { pts: 70 }));
  assert.ok(roomSvg('d1', { pts: 100 }).includes('<circle cx="188" cy="62" r="16" fill="#ffe08a"/>')); // 満月
});

test('絵のファイルで出す場面: ファイルがあり、sw.js にも書いてあり、画面の中におさまる', () => {
  const sw = fs.readFileSync(new URL('../docs/sw.js', import.meta.url), 'utf8');
  Object.entries(PICS).forEach(([k, [x, y, w, h]]) => {
    assert.ok(fs.existsSync(new URL(`../docs/img/room/${k}.webp`, import.meta.url)), `${k}.webp がない`);
    assert.ok(sw.includes(`'img/room/${k}.webp'`), `${k} が sw.js の FILES にない`);
    assert.ok(x >= 0 && y >= 0 && x + w <= 360 && y + h <= 340, `${k} が画面からはみ出す`);
    assert.ok(roomSvg(k).includes(`img/room/${k}.webp`), k);
  });
});
test('絵: 夜も昼も、どの場面も絵のファイル', () => { [...SCENES.night, ...SCENES.day].forEach((k) => assert.ok(PICS[k], k)); });
test('DAY_READY が false の間は、昼間も夜の場面。true なら、昼は昼の場面', () => {
  for (let i = 0; i < 20; i += 1) {
    assert.ok(SCENES.night.includes(pickScene({ hour: 14, rand: () => i / 20, dayReady: false })));
    assert.ok(SCENES.day.includes(pickScene({ hour: 14, rand: () => i / 20, dayReady: true })));
  }
  assert.equal(typeof DAY_READY, 'boolean');
});
test('机の本の絵がある(sw.js にも書いてある)', () => {
  assert.ok(fs.existsSync(new URL('../docs/img/room/book.webp', import.meta.url)));
  assert.ok(fs.readFileSync(new URL('../docs/sw.js', import.meta.url), 'utf8').includes("'img/room/book.webp'"));
});

test('時間の色: 朝 5〜10時 / 昼 10〜15時 / 午後〜夕方 15〜21時 / 夜 21〜5時', () => {
  const t = (h) => toneOf(h);
  assert.deepEqual([4, 5, 9, 10, 14, 15, 20, 21, 23, 0].map(t), ['night', 'morning', 'morning', 'noon', 'noon', 'evening', 'evening', 'night', 'night', 'night']);
});

test('昼の部屋: toneを渡すと、昼の色(窓は空と太陽、月と星は消える)。渡さなければ、これまでの背景', () => {
  const plain = roomSvg('d2', { pts: 100 });
  assert.ok(plain.includes('fill="#16143e"') && plain.includes('<circle cx="188" cy="62" r="16" fill="#ffe08a"/>'));
  ['morning', 'noon', 'evening'].forEach((tone) => {
    const s = roomSvg('d2', { pts: 100, tone });
    assert.ok(s.includes('id="rmsky"') && s.includes('fill="url(#rmsky)"'), tone);
    assert.ok(!s.includes('fill="#16143e"') && !s.includes('class="rmtw"') && !s.includes('<circle cx="188" cy="62"'), tone);
    assert.ok(s.includes('img/room/d2.webp') && s.includes('class="rm-hot"'), tone); // ふたりの絵と、タップできる場所は、そのまま
    assert.notEqual(s, plain);
  });
  assert.notEqual(roomSvg('d2', { tone: 'morning' }), roomSvg('d2', { tone: 'evening' }));
  assert.equal(roomSvg('n1', { pts: 100, tone: 'noon' }), roomSvg('n1', { pts: 100 })); // 夜の絵(n…)には、昼の色をつけない
});
