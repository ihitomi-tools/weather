// 「新着」の判定。どこまで見たかは端末の中だけに持つ(中身は入れず、印だけ)。

const hasMood = (r) => r && (r.l || (r.t && r.t.length) || r.m);

// いまの状態から、各画面の「印」を作る
// s: { me, messages, qcards, answers(Map), boxes, marks(Map), items(Map), events, days(Map), pats(Map), now }
export function sectionKeys(s) {
  const other = (m) => m.from !== s.me;
  const chat = Math.max(0, ...s.messages.filter(other).map((m) => m.ts));

  const q = s.qcards.map((c) => `c${c.n}`);
  s.answers.forEach((a) => { if (a.owner !== s.me) q.push(`a${a.n}`); });

  const b = [];
  s.boxes.forEach((x) => {
    const sealedForMe = x.kind === 'bd' && x.forUid === s.me && x.openAt > s.now;
    if (sealedForMe) return; // 自分あての誕生日ボックスは、開くまで存在も見せない
    const marks = s.marks.get(x.id) || [];
    if (x.from !== s.me) b.push(`b${x.id}`);
    marks.forEach((m) => { if (m.from !== s.me) b.push(`m${m.id}`); });
    if (x.openAt <= s.now && marks.length) b.push(`o${x.id}`);
  });

  const cal = s.events.filter((e) => e.by && e.by !== s.me).map((e) => `e${e.id}`);
  s.days.forEach((r) => { if (r.by && r.by !== s.me && hasMood(r)) cal.push(`r${r.d}|${r.l || 0}|${(r.t || []).length}|${(r.m || '').length}`); });
  s.pats.forEach((list) => list.forEach((p) => { if (p.by !== s.me) cal.push(`p${p.id}`); }));
  return { chat, q, b, cal };
}

// 見ていない印があるか
export function newFlags(keys, seen) {
  const flags = { chat: keys.chat > (seen.chat || 0) };
  ['q', 'b', 'cal'].forEach((k) => {
    const set = new Set(seen[k] || []);
    flags[k] = keys[k].some((x) => !set.has(x));
  });
  return flags;
}
