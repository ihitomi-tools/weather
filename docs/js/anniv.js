// 日記帳の、記念日ステッカー。日付 → 絵のファイル(docs/img/anniv/)。
// 足しかた: tools/cut-anniv.py で絵を作り、ここに1行足して、docs/sw.js の FILES にも足す。
export const ANNIV_STICKERS = {
  '2026-10-27': '2026-10-27.webp', // 500日記念日
  '2026-10-28': '2026-10-28.webp', // Stay with you(ハグ)
};

// 写真風の絵: ページのいちばん上(日付の見出しの、すぐ下)に貼る
export const DAY_PHOTOS = {
  '2026-10-29': { file: '2026-10-29.webp', w: 750, h: 420 }, // みんなでごはん
};

export const dayPhoto = (day) => (DAY_PHOTOS[day] ? { src: `img/anniv/${DAY_PHOTOS[day].file}`, w: DAY_PHOTOS[day].w, h: DAY_PHOTOS[day].h } : null);

export const annivSticker = (day) => (ANNIV_STICKERS[day] ? `img/anniv/${ANNIV_STICKERS[day]}` : null);
