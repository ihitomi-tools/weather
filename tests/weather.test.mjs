import assert from 'node:assert/strict';
import test from 'node:test';
import { isRainy, describe, parseForecast, loadWeather } from '../docs/js/weather.js';

const sample = () => ({
  current: { temperature_2m: 18.4, weather_code: 3 },
  hourly: {
    time: Array.from({ length: 48 }, (_, i) => `2026-10-${19 + Math.floor(i / 24)}T${String(i % 24).padStart(2, '0')}:00`),
    temperature_2m: Array.from({ length: 48 }, (_, i) => 10 + i / 10),
    weather_code: Array.from({ length: 48 }, () => 61),
  },
  daily: {
    time: ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'],
    weather_code: [3, 61, 0, 1, 2, 95, 71],
    temperature_2m_max: [21.2, 18, 20, 23, 24, 22, 19],
    temperature_2m_min: [14.4, 13, 13, 15, 16, 15, 13],
  },
});

test('天気コードを日本語と種類に変換する', () => {
  assert.deepEqual(describe(0), { kind: 'sun', text: '快晴' });
  assert.equal(describe(63).kind, 'rain');
  assert.equal(describe(73).kind, 'snow');
  assert.equal(describe(99).text, '雷雨');
});

test('予報を表示用に整える', () => {
  const w = parseForecast(sample(), new Date(2026, 9, 19, 21, 30));
  assert.equal(w.now.temp, 18);
  assert.equal(w.hours.length, 6);
  assert.equal(w.hours[0].label, 'いま');
  assert.equal(w.hours[0].temp, Math.round(10 + 21 / 10)); // 21時の値
  assert.equal(w.hours[3].label, '0時');
  assert.equal(w.days.length, 7);
  assert.equal(w.days[0].label, '今日');
  assert.equal(w.days[1].label, '火'); // 2026-10-20は火曜
  assert.equal(w.todayMax, 21);
});

test('通信に失敗したら保存済みの値を使い、なければnull', async () => {
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const city = { name: '東京', lat: 1, lon: 2 };
  const ok = await loadWeather(city, async () => ({ ok: true, json: async () => sample() }));
  assert.equal(ok.stale, false);
  const ng = await loadWeather(city, async () => { throw new Error('offline'); });
  assert.equal(ng.stale, true);
  assert.equal(ng.data.now.temp, 18);
  store.clear();
  assert.equal((await loadWeather(city, async () => { throw new Error('offline'); })).data, null);
});

test('雨の日の判定: いまか、きょうの天気が雨のとき', () => {
  const s = sample();
  const base = parseForecast(s, new Date(2026, 9, 19, 21, 30));
  assert.equal(isRainy(base), false); // いまはくもり、きょうもくもり
  s.current.weather_code = 63;
  assert.equal(isRainy(parseForecast(s, new Date(2026, 9, 19, 21, 30))), true);
  const t = sample();
  t.daily.weather_code[0] = 80; // きょう1日の天気がにわか雨
  assert.equal(isRainy(parseForecast(t, new Date(2026, 9, 19, 21, 30))), true);
  assert.equal(isRainy(null), false);
});
