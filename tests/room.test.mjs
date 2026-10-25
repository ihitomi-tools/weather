import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, isNight, pickScene, roomSvg } from '../docs/js/room.js';

test('夜は21時から朝5時まで', () => {
  assert.equal(isNight(20), false); assert.equal(isNight(21), true); assert.equal(isNight(2), true); assert.equal(isNight(4), true); assert.equal(isNight(5), false);
});
test('昼は昼のパターン、夜は夜のパターンから選ぶ。直前と同じものは続けない', () => {
  for (let i = 0; i < 30; i += 1) {
    const day = pickScene({ hour: 14, last: 'd1', rand: () => i / 30 });
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
