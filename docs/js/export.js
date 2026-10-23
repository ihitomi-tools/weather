// 書き出し用の、読めるテキストを作る(暗号化はされない。扱いに注意)。
const pad = (n) => String(n).padStart(2, '0');
const stamp = (ms) => { const d = new Date(ms); return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

// s: { me, partner, myUid, messages, events, days(Map), qcards, answers(Map), boxes, items(Map) }
export function buildExport(s, now = Date.now()) {
  const nameOf = (uid) => (uid === s.myUid ? s.me : s.partner);
  const out = [`ふたりの記録の書き出し(${stamp(now)})`, '※ 暗号化されていません。保管と共有には気をつけてください。', ''];

  out.push('■ メッセージ');
  s.messages.forEach((m) => out.push(`${stamp(m.ts)} ${nameOf(m.from)}: ${m.stamp || m.body || (m.img ? '(スタンプの絵)' : '(読めません)')}`));
  out.push('', '■ 予定');
  [...s.events].sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))).forEach((e) => out.push(`${e.date}${e.end && e.end > e.date ? `〜${e.end}` : ''} ${e.time || ''} ${e.title}${e.note ? `\n  ${String(e.note).replace(/\n/g, '\n  ')}` : ''}`.replace('  ', ' ')));

  out.push('', '■ 記録(生理・調子・気分)');
  [...s.days.values()].sort((a, b) => a.d.localeCompare(b.d) || String(a.by).localeCompare(String(b.by))).forEach((r) => {
    const parts = [r.p ? '生理' : '', r.l ? `調子${r.l}/5` : '', ...(r.t || []), r.m || ''].filter(Boolean);
    if (parts.length) out.push(`${r.d} ${r.by ? `${nameOf(r.by)}: ` : ''}${parts.join('、')}`);
  });

  out.push('', '■ 毎日のお題');
  s.qcards.forEach((c) => {
    out.push(`第${c.n}問 (${c.date}) ${c.text}`);
    s.answers.forEach((a) => { if (a.n === c.n) out.push(`  ${nameOf(a.owner)}: ${a.text} (${stamp(a.at)})`); });
  });

  out.push('', '■ ボックス(開いたもの)');
  s.boxes.filter((b) => b.openAt <= now).forEach((b) => {
    out.push(`${b.kind === 'bd' ? `${nameOf(b.forUid)}への誕生日ボックス` : b.title || 'タイムカプセル'} (${stamp(b.openAt)} 開封)`);
    (s.items.get(b.id) || []).forEach((i) => out.push(`  ${nameOf(i.from)}: ${i.text}`));
  });
  return out.join('\n') + '\n';
}
