// ホームの月の場面で、キャラがぼそっと言う「ひとり言」。言葉は固定の文から選ぶだけ(外には何も送らない)。
// role: 'h'(ひとみの役・ピンク)/'y'(もうひとりの役・ミント)。画面には触れない。

// グループごとの言葉。tired は、しんどい日(やさしい言葉だけ)
export const LINES = {
  morning: [['h', 'おはよ。今日もゆるっといこ'], ['y', 'おはよう。水、飲んだ？']],
  night: [['h', 'おつかれさま。もう休んでいいよ'], ['y', '今日もがんばったね']],
  usual: [['h', 'ここ、落ち着くね'], ['h', '今日のいいこと、ひとつ探そう'], ['y', 'ぼーっとするの、いいね'], ['y', 'おなかすいたな'], ['h', 'ふふ']],
  rain: [['h', '傘、持った？'], ['y', '雨の音、ちょっと好き'], ['h', '濡れてない？']],
  fullish: [['h', 'もうすこしで満月だね'], ['y', 'ぴったり、狙っちゃう？']],
  late: [['y', 'ちょっと待たせたね'], ['h', '来てくれた']],
  soon: [['h', '会えるの、楽しみ'], ['y', '何着ようかな']],
  tired: [['h', '無理しなくていいよ'], ['y', '今日はゆっくりしよう'], ['h', 'ここまで来てるだけで、えらいよ'], ['y', 'そばにいるよ'], ['h', '何もしなくていい日も、あっていいよ'], ['y', 'あったかいもの、飲もう']],
};

export const P_USUAL = 0.5;
export const P_TIRED = 0.8;

// いまの場面で、出せるグループ。しんどい日(tiredRoles: 今日しんどい記録のある役)は、それだけ。
export function groupsFor({ hour, rain, pts, lateToday, soon, tiredRoles }) {
  if (tiredRoles && tiredRoles.length) return ['tired'];
  const g = ['usual'];
  if (hour >= 5 && hour < 11) g.push('morning');
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
  let list = candidates(ctx);
  const other = list.filter((c) => c.text !== last);
  if (other.length) list = other; // 直前と同じ言葉は、続けて出さない(ほかに無いときだけ許す)
  if (!list.length) return null;
  return list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
}
