// 月のしくみ(触れた記録 → ポイント・満月・今日の様子)。画面には触らない。
import { localKey } from './qa.js';
import { daysSince, CALM_KINDS, SAY_KINDS } from './card.js';
import { isBirthdayOn } from './dates.js';

export const DAY_START_HOUR = 4; // 1日の区切りは朝4時
export const WINDOW_MS = 10 * 60 * 1000; // 10分以内に2人目が触れたら「ぴったり」
export const PTS = { sync: 5, late: 1 };
export const FULL_AT = 100;

export const dayKey4 = (ms) => localKey(ms - DAY_START_HOUR * 3600e3);

export const seasonOf = (date) => {
  const m = date.getMonth() + 1;
  return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
};

// signals: [{ role: 'h'|'y', at: ms }](1人が1日に触れられるのは1回)
export function analyzeMoon(signals, nowMs, winMs = WINDOW_MS) {
  const byDay = new Map();
  signals.forEach((s) => {
    const k = dayKey4(s.at);
    if (!byDay.has(k)) byDay.set(k, {});
    const d = byDay.get(k);
    if (d[s.role] == null || s.at < d[s.role]) d[s.role] = s.at;
  });
  const keys = [...byDay.keys()].sort();
  const days = [];
  const fulls = [];
  let total = 0;
  let sync = 0;
  let late = 0;
  keys.forEach((key) => {
    const d = byDay.get(key);
    if (d.h == null || d.y == null) return;
    const kind = Math.abs(d.h - d.y) <= winMs ? 'sync' : 'late';
    const pts = PTS[kind];
    const at = Math.max(d.h, d.y);
    const before = total;
    total += pts;
    if (kind === 'sync') sync += 1; else late += 1;
    days.push({ key, kind, pts, at, first: d.h < d.y ? 'h' : 'y', h: d.h, y: d.y });
    for (let n = Math.floor(before / FULL_AT) + 1; n <= Math.floor(total / FULL_AT); n += 1) fulls.push({ n, at });
  });
  const tk = dayKey4(nowMs);
  const t = byDay.get(tk) || {};
  const done = days.find((x) => x.key === tk) || null;
  return {
    total, pts: total % FULL_AT, sync, late, days, fulls,
    today: { key: tk, h: t.h == null ? null : t.h, y: t.y == null ? null : t.y, resolved: !!done, kind: done ? done.kind : null, first: done ? done.first : (t.h != null ? 'h' : t.y != null ? 'y' : null) },
  };
}

// 100日ごと、または1年ごとの記念日か
export function isMilestone(dateKey, todayKey) {
  if (!dateKey) return false;
  const n = daysSince(dateKey, todayKey);
  if (n <= 0) return false;
  return n % 100 === 0 || (dateKey.slice(5) === todayKey.slice(5) && Number(todayKey.slice(0, 4)) > Number(dateKey.slice(0, 4)));
}

// 今日の特別な日(誕生日 > 記念日 > デート)。todayKey は端末のカレンダー日付
export function specialOf({ todayKey, today, birthdays, anns, events }) {
  if (birthdays.some((b) => b && isBirthdayOn(b.m, b.d, today))) return 'bday';
  if (anns.some((a) => a && a.d && isMilestone(a.d, todayKey))) return 'milestone';
  if (events.some((e) => e.who === 'both' && !CALM_KINDS.includes(e.kind) && e.date <= todayKey && todayKey <= (e.end && e.end > e.date ? e.end : e.date))) return 'date';
  return 'none';
}

// ふたりの役(h=飛ぶ人 / y=受け止める人)。自分の選びがあれば優先し、なければ相手と逆、それも無ければ、IDの順で決める
export function rolesOf(myUid, otherUid, myRole, otherRole) {
  const ok = (r) => r === 'h' || r === 'y';
  const flip = { h: 'y', y: 'h' };
  let mine = ok(myRole) ? myRole : null;
  if (!mine && ok(otherRole)) mine = flip[otherRole];
  if (!mine) mine = !otherUid || myUid < otherUid ? 'h' : 'y';
  const other = ok(otherRole) && otherRole !== mine ? otherRole : flip[mine];
  const out = {};
  out[myUid] = mine;
  if (otherUid) out[otherUid] = other;
  return out;
}

// 今日が、仕事・出張・通院・勉強のような「いっしょの日」か(ホームの月に、一言を出す)
export const workOn = ({ todayKey, events }) => events.some((e) => SAY_KINDS.includes(e.kind) && e.who === 'both' && e.date <= todayKey && todayKey <= (e.end && e.end > e.date ? e.end : e.date));
