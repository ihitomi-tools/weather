// お月さま(周期)の記録から、次の予想を出す。日付は 'YYYY-MM-DD' の文字列で扱う。
const DAY = 864e5;

export const dayNum = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY);
};

export const keyOf = (num) => {
  const d = new Date(num * DAY);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

// 連続した日を、ひとまとまりにする
export function runsOf(days) {
  const nums = [...new Set([...days].map(dayNum))].sort((a, b) => a - b);
  const runs = [];
  nums.forEach((n) => {
    const last = runs[runs.length - 1];
    if (last && n === last.end + 1) { last.end = n; last.len += 1; } else runs.push({ start: n, end: n, len: 1 });
  });
  return runs.map((r) => ({ start: keyOf(r.start), end: keyOf(r.end), len: r.len }));
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

// 直近6回分の間隔の平均で、これから3回分を出す。開始日が2回分ない、間隔が極端なときは予想しない。
export function predict(days, todayKey) {
  const runs = runsOf(days);
  const none = { cycle: null, len: null, starts: [], days: new Set(), next: null };
  if (runs.length < 2) return none;
  const starts = runs.map((r) => dayNum(r.start));
  const gaps = starts.slice(1).map((s, i) => s - starts[i]).slice(-6).filter((g) => g >= 15 && g <= 60);
  if (!gaps.length) return none;
  const cycle = Math.round(mean(gaps));
  const len = Math.min(10, Math.max(1, Math.round(mean(runs.slice(-6).map((r) => r.len)))));
  const today = dayNum(todayKey);
  const recorded = new Set([...days]);
  let s = starts[starts.length - 1] + cycle;
  while (s + len <= today) s += cycle; // 過ぎてしまった予想は出さない
  const out = [];
  const marks = new Set();
  for (let k = 0; k < 3; k++, s += cycle) {
    out.push(keyOf(s));
    for (let i = 0; i < len; i++) { const key = keyOf(s + i); if (!recorded.has(key)) marks.add(key); }
  }
  const first = dayNum(out[0]);
  return { cycle, len, starts: out, days: marks, next: { start: out[0], diff: first - today } };
}
