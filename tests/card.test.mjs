import assert from 'node:assert/strict';
import test from 'node:test';
import { daysSince, nextMilestone, nextJoint, normalizeShared, buildSharedPayload } from '../docs/js/card.js';

test('日数と次の節目', () => {
  assert.equal(daysSince('2026-01-01', '2026-01-01'), 0);
  assert.equal(daysSince('2025-12-31', '2026-01-02'), 2);
  assert.equal(nextMilestone(0), 100);
  assert.equal(nextMilestone(99), 100);
  assert.equal(nextMilestone(100), 100);
  assert.equal(nextMilestone(101), 200);
  assert.equal(nextMilestone(-3), 100);
});

test('次の「両方」の予定を選ぶ', () => {
  const ev = [
    { title: '自分だけ', who: 'me', date: '2026-10-20' },
    { title: '遠い', who: 'both', date: '2026-11-01' },
    { title: '夜', who: 'both', date: '2026-10-25', time: '19:00' },
    { title: '昼', who: 'both', date: '2026-10-25', time: '12:00' },
    { title: '過去', who: 'both', date: '2026-10-01' },
  ];
  assert.equal(nextJoint(ev, '2026-10-19').title, '昼');
  assert.equal(nextJoint(ev, '2026-10-26').title, '遠い');
  // 連続する予定は、終わりの日まで「次の予定」として残る
  assert.equal(nextJoint([{ who: 'both', date: '2026-10-20', end: '2026-10-22', title: '旅行' }], '2026-10-21').title, '旅行');
  assert.equal(nextJoint([{ who: 'both', date: '2026-10-20', end: '2026-10-22', title: '旅行' }], '2026-10-23'), null);
  assert.equal(nextJoint(ev, '2026-12-01'), null);
  assert.equal(nextJoint(ev, '2026-10-25').title, '昼'); // 当日も含む
});

test('保存された形を整える(古い版のsinceにも対応)', () => {
  assert.deepEqual(normalizeShared(null), { ann: [{ l: '', d: '' }, { l: '', d: '' }], nl: '' });
  assert.deepEqual(normalizeShared({ since: '2025-06-20' }).ann[0], { l: '', d: '2025-06-20' });
  const p = normalizeShared({ ann: [{ l: 'A', d: '2025-01-01' }, { l: 'B', d: '' }, { l: 'C', d: 'x' }], nl: 'N' });
  assert.equal(p.ann.length, 2);
  assert.equal(p.ann[0].l, 'A');
  assert.equal(p.nl, 'N');
});

test('保存する形には、古い版のためのsinceも入る', () => {
  const ann = [{ l: 'A', d: '2025-01-01' }, { l: '', d: '' }];
  assert.equal(buildSharedPayload({ ann, nl: '' }).since, '2025-01-01');
  assert.equal('since' in buildSharedPayload({ ann: [{ l: '', d: '' }, { l: '', d: '' }], nl: '' }), false);
});
