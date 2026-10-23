// 毎日のお題の決まり。日付は 'YYYY-MM-DD'(端末の時刻)で扱う。

export const answerKey = (n, owner) => `${n}|${owner}`;

const pad = (n) => String(n).padStart(2, '0');
export const localKey = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

// answers: Map(answerKey -> { n, owner, at, ... })
export function ownersOf(n, answers) {
  const owners = new Set();
  answers.forEach((a) => { if (a.n === n) owners.add(a.owner); });
  return owners;
}

export const isComplete = (n, answers) => ownersOf(n, answers).size >= 2;

// 2人目が答えた日(その日の翌日0時に、次のお題が出る)
export function completedKey(n, answers) {
  let at = 0;
  answers.forEach((a) => { if (a.n === n && a.at > at) at = a.at; });
  return localKey(at);
}

// いまのお題の次に、何をするか
//  create : 次のお題を出す(ストックから選ぶ。空なら入力してもらう)
//  skip-ok: 答えが片方しかないまま日がたった。「次のお題を出す」ボタンを見せる
//  wait   : 待つ(明日0時まで / 答えがそろうまで)
export function nextAction(cards, answers, todayKey) {
  if (!cards.length) return { type: 'create', n: 1 };
  const last = cards[cards.length - 1];
  if (isComplete(last.n, answers)) {
    return todayKey > completedKey(last.n, answers) ? { type: 'create', n: last.n + 1 } : { type: 'wait', until: 'tomorrow' };
  }
  return todayKey > last.date ? { type: 'skip-ok', n: last.n + 1 } : { type: 'wait', until: 'answers' };
}

// カードの状態: answering(いまのお題) / complete(そろった) / rest(お休み。あとから答えられる)
export function cardStatus(card, cards, answers) {
  if (isComplete(card.n, answers)) return 'complete';
  return card.n === cards[cards.length - 1].n ? 'answering' : 'rest';
}

// まだ使っていないストック
export function availableStock(stock, cards) {
  const used = new Set(cards.map((c) => c.stockId).filter(Boolean));
  return stock.filter((s) => !used.has(s.id));
}

// 番号から決まる「ランダム」。2人の端末で、同じストックなら同じお題を選ぶ。
// 選びかた: ①前のお題を足した人(lastBy)と、ちがう人が足したお題を優先 ②そのなかで、前と同じカテゴリ(lastCat)を避ける。
// どちらも、ほかに選べるものが無いときは、そのまま選ぶ。2台の端末で同じ結果になるように、ストックと番号と前のお題だけで決める。
export const WHISPER = 'whisper'; // 「ひそひそ話」: デートの前の日にだけ出る。それまで、中身は画面に出さない

// whisperOk: 明日がデートの日(=今日が、デートの前日)。その日は「ひそひそ話」だけから選び(100%)、ほかの日は、ひそひそ話を除いて選ぶ。
export function pickStock(avail, n, lastCat = null, lastBy = null, whisperOk = false) {
  const whispers = avail.filter((s) => s.cat === WHISPER);
  const base = whisperOk && whispers.length ? whispers : avail.filter((s) => s.cat !== WHISPER);
  if (!base.length) return null;
  let pool = [...base].sort((a, b) => a.id.localeCompare(b.id));
  if (lastBy) { const o = pool.filter((s) => s.from !== lastBy); if (o.length) pool = o; }
  if (lastCat) { const o = pool.filter((s) => (s.cat || null) !== lastCat); if (o.length) pool = o; }
  return pool[(Math.imul(n, 2654435761) >>> 0) % pool.length];
}

export function fmtDuration(ms) {
  const min = Math.floor(ms / 60000);
  if (min < 1) return '1分未満';
  if (min < 60) return `${min}分`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}時間${min % 60 ? `${min % 60}分` : ''}`;
  return `${Math.floor(h / 24)}日${h % 24 ? `${h % 24}時間` : ''}`;
}

// 答えの下に出す、小さな記録(いつ答えたか、どのくらい悩んだか)
export function describeAnswer(a) {
  const d = new Date(a.at);
  const parts = [`${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`];
  if (a.t0 && a.at > a.t0) parts.push(`考えた時間 ${fmtDuration(a.at - a.t0)}`);
  if (a.edits > 0) parts.push(`書き直し${a.edits}回`);
  return parts.join(' ・ ');
}

// ---- 予想 ----
// 先に答えた人が、相手の答えを予想できる(任意)。予想は答えが来るまで書き直せて、
// 相手が答えたら、予想した本人が「ぴったり/おしい/ぜんぜん」を選ぶ。選ぶまで、相手には「予想がある」ことだけ見せる。
export const RATES = ['hit', 'near', 'miss'];
export const isRate = (r) => RATES.includes(r);
export const guessOf = (n, owner, guesses) => guesses.get(answerKey(n, owner));
export const otherGuessOf = (n, me, guesses) => [...guesses.values()].find((g) => g.n === n && g.owner !== me);

// 自分の予想の段階
//  none : 予想できない(まだ答えていない / 相手が先に答えていた)、または予想していない
//  open : 答えたあと、相手が答えるまで。書く・書き直せる
//  judge: 相手が答えた。判定待ち
//  done : 判定ずみ
export function guessPhase(n, me, answers, guesses) {
  if (!answers.has(answerKey(n, me))) return 'none';
  const g = guessOf(n, me, guesses);
  const theirs = ownersOf(n, answers).size >= 2;
  if (g && isRate(g.r)) return 'done';
  if (g && theirs) return 'judge';
  return theirs ? 'none' : 'open';
}

// 相手の予想がこちらにどう見えるか: null(なし) / 'locked'(あるが判定待ち) / 'shown'(判定ずみ)
// 自分が答えたあとにだけ見える(答える前に、予想があることを匂わせない)
export function partnerGuessView(n, me, answers, guesses) {
  if (!answers.has(answerKey(n, me))) return null;
  const g = otherGuessOf(n, me, guesses);
  if (!g) return null;
  return isRate(g.r) ? 'shown' : 'locked';
}
