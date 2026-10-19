// 絵文字だけ(1〜3個)のメッセージかどうか。そうなら、スタンプと同じ大きさで表示する。
const EMOJI = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}{2}|[#*0-9]️?⃣)/u;

export function isEmojiOnly(text, max = 3) {
  const t = (text || '').trim();
  if (!t || typeof Intl === 'undefined' || !Intl.Segmenter) return false;
  const parts = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(t)].map((s) => s.segment);
  return parts.length >= 1 && parts.length <= max && parts.every((p) => EMOJI.test(p));
}
