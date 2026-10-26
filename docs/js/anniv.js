// 日記帳の、記念日ステッカー。日付 → 絵のファイル(docs/img/anniv/)。
// 足しかた: tools/cut-anniv.py で絵を作り、ここに1行足して、docs/sw.js の FILES にも足す。
export const ANNIV_STICKERS = {
  '2026-10-26': '2026-10-26.webp', // 500日記念日
};

export const annivSticker = (day) => (ANNIV_STICKERS[day] ? `img/anniv/${ANNIV_STICKERS[day]}` : null);
