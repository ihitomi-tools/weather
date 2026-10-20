// 似たお題の見つけかた。文字の重なり具合だけで調べる(意味までは見ない)。
// 「ほとんど同じ」を見つけるのが目的なので、きびしめにしてある。

// 記号・空白・全角半角のちがいをならす
export const normalize = (s) => String(s || '').normalize('NFKC').toLowerCase().replace(/[\s　?？!！。、,.・「」『』()（）~〜ー-]/g, '');

const bigrams = (s) => {
  const out = new Map();
  for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); out.set(g, (out.get(g) || 0) + 1); }
  return out;
};

// 0〜1。1に近いほど、そっくり
export function similarity(a, b) {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  if (short.length >= 6 && long.includes(short)) return 0.9; // 片方が、もう片方の一部になっている
  const gx = bigrams(x);
  const gy = bigrams(y);
  let same = 0;
  gx.forEach((n, g) => { same += Math.min(n, gy.get(g) || 0); });
  const total = [...gx.values()].reduce((p, c) => p + c, 0) + [...gy.values()].reduce((p, c) => p + c, 0);
  return total ? (2 * same) / total : 0;
}

export const THRESHOLD = 0.7;

// items: [{ text, ... }]。似ているものを、似ている順に、最大 max 件
export function findSimilar(text, items, max = 3) {
  return items
    .map((it) => ({ item: it, score: similarity(text, it.text) }))
    .filter((x) => x.score >= THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.item);
}
