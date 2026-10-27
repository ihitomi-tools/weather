// 気分のタグの仕分け。タグは、これまでどおり「ただの文字」で保存する(昔の記録は、そのまま)。
// どこに入るか・どんな色か・漢字の丸は何かは、表示のときに、文字から決める。

// えらぶ画面に並べる、決まったタグ
export const MARU = ['元気', 'よく眠れた', '疲れた']; // こころともからだとも言い切れない。見出しなしで、いちばん上
export const KOKORO = ['うれしい', 'たのしい', 'おだやか', 'わくわく', 'さみしい', 'イライラ', '不安', '落ち込み', 'こころの疲れ'];
export const KARADA = ['眠い', 'だるい', '食欲がない', 'からだの疲れ'];
export const PAIN = ['頭が痛い', 'おなかが痛い', '腰が痛い', '肩こり', '筋肉痛']; // からだの中の「いたいところ」
export const SEIRI = ['生理痛', '量が多い', '量が少ない', '胸が張る']; // 生理のスイッチを入れた日の、ひとみの画面だけ
export const LEGACY = ['むくみ']; // 選べなくした。昔の記録に入っていれば、からだとして出す

export const PRESET_TAGS = new Set([...MARU, ...KOKORO, ...KARADA, ...PAIN, ...SEIRI, ...LEGACY]);

// 「痛い」「痛み」「〇痛」で終わる言葉(自分で足したタグも)。「痛くない」は、終わりが違うので入らない
const PAIN_END = /(痛い|痛み|痛)$/;
export const isPain = (t) => PAIN.includes(t) || t === '生理痛' || PAIN_END.test(t);

// 'pain' | 'maru' | 'kokoro' | 'karada' | 'seiri' | 'other'
export function tagKind(t) {
  if (isPain(t)) return 'pain';
  if (MARU.includes(t)) return 'maru';
  if (KOKORO.includes(t)) return 'kokoro';
  if (KARADA.includes(t) || LEGACY.includes(t)) return 'karada';
  if (SEIRI.includes(t)) return 'seiri';
  return 'other';
}

// 痛い場所の、漢字1文字の丸。上から順に、はじめに当たったもの
const PARTS = [
  [/頭/, '頭', 'head'], [/胃/, '胃', 'stomach'], [/おなか|お腹|腹/, '腹', 'stomach'], [/腰/, '腰', 'waist'],
  [/首/, '首', 'shoulder'], [/肩/, '肩', 'shoulder'], [/胸/, '胸', 'chest'], [/筋/, '筋', 'muscle'], [/生理/, '生', 'period'],
  [/歯/, '歯', 'tooth'], [/目|眼/, '目', 'eye'], [/喉|のど/, '喉', 'throat'], [/背/, '背', 'waist'], [/足|脚/, '足', 'muscle'], [/膝|ひざ/, '膝', 'muscle'],
];
export function painBadge(t) {
  for (const [re, ch, color] of PARTS) if (re.test(t)) return { ch, color };
  return { ch: '痛', color: 'other' };
}

// 並べる順(タグを、仕分けて返す)。順番は、えらんだ順のまま
export function groupTags(tags) {
  const out = { pain: [], maru: [], kokoro: [], karada: [], seiri: [], other: [] };
  (tags || []).forEach((t) => out[tagKind(t)].push(t));
  return out;
}
