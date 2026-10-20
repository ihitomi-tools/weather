// ホームのカード(記念日の日数、次の予定までの日数)の計算と、保存する形の整理。
import { dayNum } from './cycle.js';

export const daysSince = (dateKey, todayKey) => dayNum(todayKey) - dayNum(dateKey);

// 100日ごとの節目。ちょうど100日の日は、その日を「次の節目」にする。
export const nextMilestone = (n) => Math.max(100, Math.ceil(Math.max(n, 0) / 100) * 100);

// 今日以降で、いちばん近い「両方」の予定
export function nextJoint(events, todayKey) {
  return events
    .filter((e) => e.who === 'both' && (e.end && e.end > e.date ? e.end : e.date) >= todayKey) // 連続する予定は、終わりの日まで
    .sort((a, b) => ((a.date < todayKey ? todayKey : a.date) + (a.time || '')).localeCompare((b.date < todayKey ? todayKey : b.date) + (b.time || '')))[0] || null;
}

const EMPTY = () => [{ l: '', d: '' }, { l: '', d: '' }];

// 保存された形(古い版の since だけのものも含む)を、カード用に整える
export function normalizeShared(p) {
  const ann = EMPTY();
  if (p && Array.isArray(p.ann)) {
    p.ann.slice(0, 2).forEach((x, i) => { ann[i] = { l: String((x && x.l) || ''), d: String((x && x.d) || '') }; });
  } else if (p && p.since) {
    ann[0].d = String(p.since);
  }
  return { ann, nl: String((p && p.nl) || '') };
}

// 古い版でも日数が読めるように、since も一緒に入れる
export function buildSharedPayload({ ann, nl }) {
  const payload = { ann, nl };
  if (ann[0].d) payload.since = ann[0].d;
  return payload;
}
