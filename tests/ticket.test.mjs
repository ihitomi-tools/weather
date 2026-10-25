import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTrip, typeOf, dateLabel } from '../docs/js/ticket.js';

const TEXT = `甲府 → 宇都宮
2026年10月31日(土) 16:39出発

乗換回数：2回
所要時間：3時間14分

[出発] 甲府
│ 16:39発(２番線)
│ あずさ78号[指定席]
│ 18:29着(７番線)
[乗換] 新宿
│ 18:33発(８番線)
│ ＪＲ中央線
│ 快速 東京行き
│ 18:47着(１番線)
[乗換] 東京
│ 19:00発(２３番線)
│ なすの269号[指定席］
│ 19:53着(１番線)
[到着] 宇都宮
宇都宮 → 甲府
2026年11月01日(日) 20:23出発

乗換回数：1回
所要時間：3時間15分
営業km：243.6km

[出発] 宇都宮
│ 20:23発(４番線)
│ やまびこ66号[指定席]
│ 21:12着(２０番線)
[乗換] 東京
│ 21:45発(１番線)
│ かいじ57号[指定席]
│ 23:38着(１番線)
[到着] 甲府`;

test('乗換案内: 往路と復路を、区間つきで読み取る', () => {
  const r = parseTrip(TEXT);
  assert.equal(r.length, 2);
  assert.equal(r[0].from, '甲府'); assert.equal(r[0].to, '宇都宮'); assert.equal(r[0].date, '2026-10-31');
  assert.equal(r[0].dep, '16:39'); assert.equal(r[0].arr, '19:53');
  assert.equal(r[0].legs.length, 3);
  assert.deepEqual(r[0].legs[1], { from: '新宿', to: '東京', dep: '18:33', depTr: '8番線', arr: '18:47', arrTr: '1番線', lines: ['ＪＲ中央線', '快速 東京行き'] });
  assert.equal(r[0].meta['乗換回数'], '2回'); assert.equal(r[0].meta['所要時間'], '3時間14分');
  assert.equal(r[1].legs.length, 2); assert.equal(r[1].date, '2026-11-01'); assert.equal(r[1].meta['営業km'], '243.6km');
  assert.equal(r[1].arr, '23:38');
});

test('読み取れない文章は、何も返さない(いつもどおり文章のまま)', () => {
  assert.deepEqual(parseTrip('ごはんに行った。おいしかった'), []);
  assert.deepEqual(parseTrip(''), []);
  assert.deepEqual(parseTrip(null), []);
  assert.deepEqual(parseTrip('甲府 → 宇都宮\n2026年10月31日(土) 16:39出発'), []);
});

test('途中で切れた文章(到着がない)は、旅券にしない', () => {
  assert.deepEqual(parseTrip(TEXT.slice(0, TEXT.indexOf('[到着] 宇都宮'))), []);
});

test('種類: 新幹線・特急・普通快速', () => {
  assert.equal(typeOf(['なすの269号[指定席］']).cls, 'shin');
  assert.equal(typeOf(['あずさ78号[指定席]']).cls, 'ltd');
  assert.equal(typeOf(['ＪＲ中央線', '快速 東京行き']).cls, 'local');
});

test('日付の表示', () => { assert.equal(dateLabel('2026-10-31'), '10/31(土)'); });
