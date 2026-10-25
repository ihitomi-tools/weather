// ホームの月の場面で、キャラがぼそっと言う「ひとり言」。言葉は固定の文から選ぶだけ(外には何も送らない)。
// role: 'h'(ひとみの役・ピンク)/'y'(もうひとりの役・ミント)。画面には触れない。

// グループごとの言葉。tired は、しんどい日(やさしい言葉だけ)
export const LINES = {
  morning: [['h', 'おはよー　いい一日になるといいね'], ['y', 'おはよー　調子はどう？']],
  night: [['h', '今日も１日おつかれさま♥'], ['y', '今日もがんばったね']],
  usual: [['h', '一緒にいると落ち着くなぁ'], ['h', 'うふふ'], ['y', '時間経つのあっという間だね'], ['y', '深呼吸をわすれずにね']],
  rain: [['h', '傘、持った？'], ['y', '雨の音、ちょっと好き'], ['h', '濡れてない？']],
  fullish: [['h', 'もうすこしで満月だね'], ['y', 'ぴったり、狙っちゃう？']],
  late: [['y', 'ちょっと待たせたね'], ['h', '来てくれた']],
  soon: [['h', 'デート楽しみだなぁ♥'], ['y', '気分盛り上がってきたね']],
  tired: [['h', 'がんばりすぎは禁物だよ'], ['y', '無理しすぎないでね'], ['h', 'ぼちぼちやっていこうね'], ['y', 'そばにいるよ'], ['h', 'そばで見守ってるよ'], ['y', '甘やかされにおいで'],
    ['h', 'ここにいるよ'], ['y', 'ゆっくりでいいよ'], ['h', '今日は、ふたりで半分こ'], ['y', 'あったかい飲みものでもどう？'], ['h', '一番近くにいられて、しあわせ'], ['y', 'ぎゅーってしたい気分'],
    ['h', 'ひとやすみ、ひとやすみ'], ['y', '少し休んだら、いっしょに星を見よう'], ['h', '今日のあなたも、ちゃんと素敵'], ['y', 'ひとやすみ、ひとやすみ']],
  // 1日に5回目・10回目に開いたときの、特別な言葉(数字は出さない)
  open5: [['h', 'あっ、また来た！'], ['y', '今日も、ここで会えたね'], ['h', 'また会えたね、うれしい'], ['y', 'おかえり〜'], ['h', '今日は、よく来てくれるね'], ['y', 'ちょうど、会いたかったところ'], ['h', '来てくれると、ぽかぽかする'], ['y', '今日は、ごきげんだね']],
  open10: [['h', 'きらきらの日だ'], ['y', '今日は、いっぱい会えたね'], ['h', '今日は、特別ごきげんだね'], ['y', '星が、ついてきたよ'], ['h', 'こんなに会えて、お月さまも大喜び'], ['y', '今日は、ふたりの日だね'], ['h', 'すごい！ 今日の月は、一等星みたい'], ['y', 'ずっと、いっしょにいる気分']],
};
// ときどき(低い確率で)、相手の名前を呼ぶ。{name} は、呼ばれる側の名前に、画面側で置きかえる
export const NAME_LINES = [['h', '{name}♥'], ['y', '{name}♥']];
export const P_NAME = 0.12;

// 午前中(5時〜12時前)に開いたときは、あいさつを1日1回、必ず出す(月のブランコの成立は待たない)
export const isMorning = (hour) => hour >= 5 && hour < 12;
export function pickGreeting({ rand = Math.random, last = '' } = {}) {
  let list = LINES.morning.map(([role, text]) => ({ role, text, group: 'morning' }));
  const other = list.filter((c) => c.text !== last);
  if (other.length) list = other;
  return list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
}

// 開いた回数(1日ごと)。朝4時が日の区切り。30秒以内の開き直しは、1回にまとめる。数は、その端末の中だけ
export const OPEN_TIERS = { 5: 'open5', 10: 'open10' };
export function bumpOpens(prev, dayKey, nowMs, mergeMs = 30000) {
  const p = prev && prev.day === dayKey ? prev : { day: dayKey, n: 0, last: 0 };
  if (p.n > 0 && nowMs - p.last < mergeMs) return { state: { ...p, last: nowMs }, tier: null };
  const n = p.n + 1;
  return { state: { day: dayKey, n, last: nowMs }, tier: OPEN_TIERS[n] || null };
}
export function pickOpenLine(tier, { rand = Math.random, last = '' } = {}) {
  let list = (LINES[tier] || []).map(([role, text]) => ({ role, text, group: tier }));
  const other = list.filter((c) => c.text !== last);
  if (other.length) list = other;
  if (!list.length) return null;
  return list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
}

export const P_USUAL = 0.5;
export const P_TIRED = 0.8;

// いまの場面で、出せるグループ。しんどい日(tiredRoles: 今日しんどい記録のある役)は、それだけ。
export function groupsFor({ hour, rain, pts, lateToday, soon, tiredRoles }) {
  if (tiredRoles && tiredRoles.length) return ['tired'];
  const g = ['usual'];
  if (hour >= 21 || hour < 3) g.push('night');
  if (rain) g.push('rain');
  if (pts >= 80 && pts < 100) g.push('fullish');
  if (lateToday) g.push('late');
  if (soon) g.push('soon');
  return g;
}

// 候補: [{ role, text, group }]。しんどい日は、しんどい人ではない側の言葉だけ(ふたりともなら、どちらも)。
export function candidates(ctx) {
  const groups = groupsFor(ctx);
  const tired = ctx.tiredRoles || [];
  const out = [];
  groups.forEach((group) => {
    LINES[group].forEach(([role, text]) => {
      if (group === 'tired' && tired.length === 1 && tired[0] === role) return; // 本人ではなく、そばにいる側が言う
      // ふだんの言葉は1回、特別な場面の言葉は2回ぶん入れて、選ばれやすくする
      const w = group === 'usual' ? 1 : 2;
      for (let i = 0; i < w; i++) out.push({ role, text, group });
    });
  });
  return out;
}

// 出すのは、月のブランコが成立した日の、成立のあとだけ(ctx.resolved)。
// 出すかどうかを決めて、出すなら1つ選ぶ。rand は 0 以上 1 未満(テストで差し替える)。last は、直前に出した言葉。
export function pickLine(ctx, { rand = Math.random, last = '' } = {}) {
  if (!ctx.resolved) return null; // 月のブランコが成立した(ふたりが触れた)あとだけ。ブランコに乗っている間は、話さない
  const tired = !!(ctx.tiredRoles && ctx.tiredRoles.length);
  if (rand() >= (tired ? P_TIRED : P_USUAL)) return null;
  if (!tired && rand() < P_NAME) { // ときどき、名前を呼ぶ
    const [role, text] = NAME_LINES[Math.min(NAME_LINES.length - 1, Math.floor(rand() * NAME_LINES.length))];
    return { role, text, group: 'name' };
  }
  let list = candidates(ctx);
  const other = list.filter((c) => c.text !== last);
  if (other.length) list = other; // 直前と同じ言葉は、続けて出さない(ほかに無いときだけ許す)
  if (!list.length) return null;
  return list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
}
