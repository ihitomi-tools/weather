// ひとみ(彼女)とゆうき(彼氏)の人型。顔はなく、太い丸みの棒で描く。
// 重なる部分の縁取りの色は、置く場所の背景(--cbg)に合わせる。
const OUT = 'var(--cbg, var(--surface))';
const tube = (d, w) => `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="${w + 2.2}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const WH = 3.6, WM = 4.2;
// ひとみ。x は位置、o.arms は腕(tube)、o.legs は足の上書き、o.rot は全体の傾き
function woman(x = 0, o = {}) {
  const legs = o.legs || '<path d="M-2.500 -17 V-1.500 M2.500 -17 V-1.500" fill="none" stroke="currentColor" stroke-width="3.800" stroke-linecap="round"/>';
  return `<g class="h" style="color:var(--pink-deep);fill:var(--pink-deep)" transform="translate(${x} ${o.y || 0}) rotate(${o.rot || 0})">${legs}
    <path d="M-5.200 -35.500 Q0 -37 5.200 -35.500 L9.400 -16.500 Q0 -14.500 -9.400 -16.500Z"/>
    <g transform="rotate(${o.head || 0} 0 -35)"><circle cx="0" cy="-41.200" r="5.300"/><path d="M-5.500 -40.200 A5.500 5.500 0 0 1 5.500 -40.200 L5.500 -39 Q0 -42.500 -5.500 -39Z"/>
      </g>${o.arms ? o.arms(WH) : ''}<g class="tail" transform="scale(-1 1)"><path d="M-4.200 -39.500 C-9.600 -39 -11 -34.500 -10 -29.500 C-8.800 -33 -7.200 -35.500 -4.200 -36.500Z" stroke="var(--cbg, var(--surface))" stroke-width=".7" stroke-linejoin="round"/><circle cx="-5.400" cy="-38.200" r="1.500" fill="#d2d6dd"/></g>${o.extra || ''}</g>`;
}
function man(x = 0, o = {}) {
  const legs = o.legs || '<path d="M-3.200 -20 V-1.500 M3.200 -20 V-1.500" fill="none" stroke="currentColor" stroke-width="4.600" stroke-linecap="round"/>';
  return `<g class="y" style="color:var(--mint-deep);fill:var(--mint-deep)" transform="translate(${x} ${o.y || 0}) rotate(${o.rot || 0})">${legs}
    <rect x="-6.800" y="-40.500" width="13.600" height="21.500" rx="4.800"/>
    <g transform="rotate(${o.head || 0} 0 -39)"><circle cx="0" cy="-45.800" r="5.700"/></g>${o.arms ? o.arms(WM) : ''}${o.extra || ''}</g>`;
}
const A = (...ds) => (w) => ds.map((d) => tube(d, w)).join('');
const heartP = (x, y, s = 1, c = 'var(--pink-deep)') => `<path d="M0 5.500 C-7 0 -8 -6 -4 -7 C-2 -7.500 0 -5.500 0 -4.500 C0 -5.500 2 -7.500 4 -7 C8 -6 7 0 0 5.500Z" fill="${c}" transform="translate(${x} ${y}) scale(${s})"/>`;

const pinkC = 'color:var(--pink-deep);fill:var(--pink-deep)', mintC = 'color:var(--mint-deep);fill:var(--mint-deep)';

const cloud = (x, y, c, drops) => `<g transform="translate(${x} ${y})"><path d="M-10 0 a5.500 5.500 0 0 1 2.500 -10 a8 8 0 0 1 15 -1.500 a5.500 5.500 0 0 1 3.500 11.500Z" fill="${c}" stroke="var(--cbg, var(--surface))" stroke-width="1"/>${drops ? '<g stroke="#7fb0ff" stroke-width="1.500" stroke-linecap="round"><path d="M-6 3 v5 M0 4 v6 M6 3 v5"/></g>' : ''}</g>`;

const zzz = (x, y) => `<g fill="var(--muted)" font-weight="800" font-family="var(--font)"><text x="${x}" y="${y}" font-size="8">z</text><text x="${x + 6}" y="${y - 6}" font-size="6">z</text></g>`;

const slump = (who, rain) => { const f = who === 'h' ? woman : man; const a = who === 'h' ? A('M-5.500 -33.500 Q-8 -27 -6 -21', 'M5.500 -33.500 Q8 -27 6 -21') : A('M-6.500 -37.500 Q-9 -30 -7 -22', 'M6.500 -37.500 Q9 -30 7 -22'); return `<svg viewBox="-22 -72 44 76" aria-hidden="true">${f(0, { head: rain ? 16 : 10, rot: rain ? 3 : 2, arms: a })}${cloud(0, who === 'h' ? -52 : -58, rain ? '#8d94b8' : '#c7cde6', rain)}</svg>`; };

const sigh = (who) => { const f = who === 'h' ? woman : man; const a = who === 'h' ? A('M-5.500 -33.500 Q-8 -27 -7 -21', 'M5.500 -33.500 Q8 -27 7 -21') : A('M-6.500 -37.500 Q-9 -30 -8 -22', 'M6.500 -37.500 Q9 -30 8 -22'); return `<svg viewBox="-24 -64 48 68" aria-hidden="true">${f(0, { head: 22, arms: a })}<g fill="var(--muted)" opacity=".75"><ellipse cx="10" cy="${who === 'h' ? -30 : -33}" rx="3.600" ry="2.200"/><ellipse cx="15" cy="${who === 'h' ? -27 : -30}" rx="2.600" ry="1.600"/><ellipse cx="19" cy="${who === 'h' ? -25 : -28}" rx="1.800" ry="1.100"/></g></svg>`; };


const hiza = () => `<svg viewBox="-42 -40 84 46" aria-hidden="true"><g class="y" style="${mintC}"><rect x="-22" y="-11" width="17" height="11" rx="5.500"/>${tube('M-20 -4.500 H-40', 4.600)}</g><g class="h" style="${pinkC}"><rect x="-6" y="-10" width="34" height="9.500" rx="4.500" stroke="var(--cbg, var(--surface))" stroke-width="1.400" stroke-linejoin="round"/><path d="M7 -24 Q14 -25.500 21 -24 L27 -8 Q14 -5.500 1 -8Z"/><circle cx="14" cy="-31.500" r="5.300"/><path d="M8.500 -30.500 A5.500 5.500 0 0 1 19.500 -30.500 L19.500 -29.300 Q14 -33 8.500 -29.300Z"/><g class="tail" transform="translate(28 0) scale(-1 1)"><path d="M9.800 -29 C4.600 -28.500 3.200 -24 4 -19.500 C5.200 -23 6.800 -25.500 9.800 -26.500Z" stroke="var(--cbg, var(--surface))" stroke-width=".7" stroke-linejoin="round"/><circle cx="8.600" cy="-28" r="1.500" fill="#d2d6dd"/></g></g><g class="y" style="${mintC}"><circle cx="-3" cy="-14.500" r="6.200" stroke="var(--cbg, var(--surface))" stroke-width="1.400" stroke-linejoin="round"/></g><g class="h" style="${pinkC}">${tube('M10 -22 Q4 -22 0 -19.500', 3.600)}</g></svg>`;


const bust = (w, size = 30) => w === 'h'
  ? `<svg class="bust" viewBox="-12 -14 24 24" width="${size}" height="${size}" aria-hidden="true"><circle r="12" cx="0" cy="-2" fill="var(--pink)" opacity=".4"/><g transform="translate(0 -2) scale(.74) translate(0 2)" style="color:var(--pink-deep);fill:var(--pink-deep)"><path d="M-8 10 Q-8 2 0 2 Q8 2 8 10Z"/><circle cx="0" cy="-3.500" r="5.600"/><path d="M-5.800 -2.500 A5.800 5.800 0 0 1 5.800 -2.500 L5.800 -1.200 Q0 -5 -5.800 -1.200Z"/><g transform="scale(-1 1)"><path d="M-4.600 -1.500 C-10 -1 -11.300 3.500 -10.500 7.500 C-9.200 4.500 -7.600 2 -4.600 0.800Z" stroke="var(--pink)" stroke-width=".7" stroke-linejoin="round"/><circle cx="-5.600" cy="-0.800" r="1.400" fill="#d2d6dd"/></g></g></svg>`
  : `<svg class="bust" viewBox="-12 -14 24 24" width="${size}" height="${size}" aria-hidden="true"><circle r="12" cx="0" cy="-2" fill="var(--mint)" opacity=".4"/><g transform="translate(0 -2) scale(.74) translate(0 2)" style="color:var(--mint-deep);fill:var(--mint-deep)"><path d="M-9 10 Q-9 2.500 0 2.500 Q9 2.500 9 10Z"/><circle cx="0" cy="-3.500" r="6"/></g></svg>`;


const ARMS = {
  h: { stand: A('M-5.500 -34 Q-8 -27 -7.500 -21', 'M5.500 -34 Q8 -27 7.500 -21'), wave: A('M-5.500 -34 Q-8 -27 -7.500 -21', 'M5.500 -34.500 Q12 -38 13 -47'), jump: A('M-5 -35 Q-12 -42 -10 -52', 'M5 -35 Q12 -42 10 -52'), heart: A('M-5 -35 Q-13 -45 -2.500 -54', 'M5 -35 Q13 -45 2.500 -54'), think: A('M-5.500 -34 Q0 -29 5 -31', 'M5.500 -34.500 Q10 -35 4 -38.500'), hold: A('M-5.500 -34 Q-11 -29 -5 -26', 'M5.500 -34 Q11 -29 5 -26') },
  y: { stand: A('M-6.500 -38 Q-9 -30 -8.500 -22', 'M6.500 -38 Q9 -30 8.500 -22'), wave: A('M-6.500 -38 Q-9 -30 -8.500 -22', 'M6.500 -38.500 Q14 -42 15 -52'), jump: A('M-6.500 -39 Q-14 -46 -12 -57', 'M6.500 -39 Q14 -46 12 -57'), heart: A('M-6.500 -39 Q-15 -50 -2.500 -58', 'M6.500 -39 Q15 -50 2.500 -58'), think: A('M-6.500 -38 Q0 -33 5.500 -35', 'M6.500 -38.500 Q11.500 -40 4.500 -43'), pat: A('M6.500 -38 Q9 -30 8.500 -22', 'M-6.500 -38.500 Q-14 -42 -19 -48'), hold: A('M-6.500 -38 Q-12 -32 -5.500 -29', 'M6.500 -38 Q12 -32 5.500 -29') },
};
const JUMP_LEGS = { h: '<path d="M-2.500 -17 L-6 -4 M2.500 -17 L6 -4" fill="none" stroke="currentColor" stroke-width="3.800" stroke-linecap="round"/>', y: '<path d="M-3.200 -20 L-7 -4 M3.200 -20 L7 -4" fill="none" stroke="currentColor" stroke-width="4.600" stroke-linecap="round"/>' };

// ひとり: stand(立つ)・wave(手を振る)・jump(ジャンプ)・rain(しんどい)・sigh(いまいち)
export function figure(role, kind) {
  if (kind === 'rain') return slump(role, true);
  if (kind === 'sigh') return sigh(role);
  const f = role === 'h' ? woman : man;
  const jump = kind === 'jump';
  const view = role === 'h' ? '-22 -64 44 70' : '-22 -70 44 76';
  return `<svg class="chara" viewBox="${view}" aria-hidden="true">${f(0, { y: jump ? -7 : 0, arms: ARMS[role][kind], legs: jump ? JUMP_LEGS[role] : null })}</svg>`;
}

// ふたり: wave(手を振る)・think(考える)・heart(ハート)・cake(ケーキ)・gift(プレゼント)・pat(男性→女性のよしよし)
export function pair(kind) {
  const hx = -11, yx = 11;
  const ex = {
    heart: { h: heartP(0, -60, 1.100), y: heartP(0, -64, 1.100) },
    think: { h: '<g fill="var(--muted)"><circle cx="9" cy="-52" r="1.300"/><circle cx="13" cy="-55" r="1.700"/><circle cx="18" cy="-59" r="2.200"/></g>', y: '<g fill="var(--muted)"><circle cx="9" cy="-56" r="1.300"/><circle cx="13" cy="-59" r="1.700"/><circle cx="18" cy="-63" r="2.200"/></g>' },
    cake: { h: '<g transform="translate(0 -26)"><rect x="-8" y="-3" width="16" height="7" rx="2" fill="#ffe3ee" stroke="var(--cbg, var(--surface))" stroke-width="1"/><rect x="-5" y="-8" width="10" height="5" rx="1.500" fill="#fff3d9"/><rect x="-.6" y="-13" width="1.200" height="5" fill="#7fe0ff"/><ellipse cx="0" cy="-15" rx="1.300" ry="2.200" fill="#ffd966"/></g>', y: '<g transform="translate(0 -29)"><rect x="-8" y="-3" width="16" height="7" rx="2" fill="#ffe3ee" stroke="var(--cbg, var(--surface))" stroke-width="1"/><rect x="-5" y="-8" width="10" height="5" rx="1.500" fill="#fff3d9"/><rect x="-.6" y="-13" width="1.200" height="5" fill="#7fe0ff"/><ellipse cx="0" cy="-15" rx="1.300" ry="2.200" fill="#ffd966"/></g>' },
    gift: { h: '<g transform="translate(0 -25)"><rect x="-7" y="-7" width="14" height="10" rx="1.500" fill="#b9a4ff" stroke="var(--cbg, var(--surface))" stroke-width="1"/><rect x="-1.200" y="-7" width="2.400" height="10" fill="#ffd966"/><path d="M0 -7 q-5 -6 -2 -6 q3 0 2 6 q-1 -6 2 -6 q3 0 -2 6Z" fill="#ffd966"/></g>', y: '<g transform="translate(0 -28)"><rect x="-7" y="-7" width="14" height="10" rx="1.500" fill="#b9a4ff" stroke="var(--cbg, var(--surface))" stroke-width="1"/><rect x="-1.200" y="-7" width="2.400" height="10" fill="#ffd966"/><path d="M0 -7 q-5 -6 -2 -6 q3 0 2 6 q-1 -6 2 -6 q3 0 -2 6Z" fill="#ffd966"/></g>' },
  }[kind] || {};
  const arm = kind === 'cake' || kind === 'gift' ? 'hold' : kind;
  const a = kind === 'pat' ? { h: ARMS.h.stand, y: ARMS.y.pat } : { h: ARMS.h[arm], y: ARMS.y[arm] };
  return `<svg class="chara" viewBox="-34 -68 68 74" aria-hidden="true"><g transform="translate(${hx} 0)">${woman(0, { head: kind === 'pat' ? 4 : 0, arms: a.h, extra: ex.h || '' })}</g><g transform="translate(${yx} 0)">${man(0, { arms: a.y, extra: ex.y || '' })}</g></svg>`;
}

// ひざまくら(ひとみ→ゆうきのよしよし)
export const lapPat = () => hiza().replace('<svg', '<svg class="chara"');
export { bust };
