// ホームのカード(記念日の日数、次の予定までの日数)の計算と、保存する形の整理。
import { dayNum } from './cycle.js';

export const daysSince = (dateKey, todayKey) => dayNum(todayKey) - dayNum(dateKey);

// 100日ごとの節目。ちょうど100日の日は、その日を「次の節目」にする。
export const nextMilestone = (n) => Math.max(100, Math.ceil(Math.max(n, 0) / 100) * 100);

// 予定の種類: date(デート・お泊まり) / meal(ごはん) / work(いっしょの仕事) / other。
// 種類を持たない昔の予定は、名前が「デート」「お泊まりデート」のものだけ、デートとして扱う。
export const EV_TYPES = ['date', 'meal', 'work', 'train', 'car', 'trip', 'clinic', 'drink', 'shop', 'study', 'star'];
export const evType = (e) => (EV_TYPES.includes(e.kind) ? e.kind : /^(お泊まり)?デート$/.test(e.title || '') ? 'date' : 'other');
// ホームの月が「いつもの月」のままの種類(デートの日の特別な絵にしない)と、そのうち一言を出す種類
export const CALM_KINDS = ['work', 'train', 'car', 'clinic', 'drink', 'study'];
export const SAY_KINDS = ['work', 'train', 'car', 'clinic', 'study'];

// 今日以降で、いちばん近い「両方」の予定。いっしょの仕事は、デート類ではないので入れない
export function nextJoint(events, todayKey) {
  return events
    .filter((e) => e.who === 'both' && e.kind !== 'work' && (e.end && e.end > e.date ? e.end : e.date) >= todayKey) // 連続する予定は、終わりの日まで
    .sort((a, b) => ((a.date < todayKey ? todayKey : a.date) + (a.time || '')).localeCompare((b.date < todayKey ? todayKey : b.date) + (b.time || '')))[0] || null;
}

const EMPTY = () => [{ l: '', d: '' }, { l: '', d: '' }];

// 保存された形(古い版の since だけのものも含む)を、カード用に整える
// 予約(お題ストックの「次に出す」): [{ id: ストックのid, by: 予約した人のuid, secret: ひみつか, at }] を、予約した順に
const RSV_MAX = 20;
export function normalizeRsv(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  list.forEach((x) => {
    if (!x || typeof x.id !== 'string' || !x.id || seen.has(x.id)) return;
    seen.add(x.id);
    out.push({ id: x.id, by: String(x.by || ''), secret: !!x.secret, at: Number(x.at) || 0 });
  });
  return out.slice(0, RSV_MAX);
}

export function normalizeShared(p) {
  const ann = EMPTY();
  if (p && Array.isArray(p.ann)) {
    p.ann.slice(0, 2).forEach((x, i) => { ann[i] = { l: String((x && x.l) || ''), d: String((x && x.d) || '') }; });
  } else if (p && p.since) {
    ann[0].d = String(p.since);
  }
  return { ann, nl: String((p && p.nl) || ''), rsv: normalizeRsv(p && p.rsv) };
}

// 古い版でも日数が読めるように、since も一緒に入れる。rsv(お題の予約)は、カードの設定を保存しても、消えないように、いつも一緒に書く
export function buildSharedPayload({ ann, nl, rsv = [] }) {
  const payload = { ann, nl };
  if (ann[0].d) payload.since = ann[0].d;
  const r = normalizeRsv(rsv);
  if (r.length) payload.rsv = r;
  return payload;
}
