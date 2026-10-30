// おたのしみの部屋(ファンタジー)。背景は固定で、ふたりの様子だけが変わる。
// 夜(21時以降)は、寄り添うパターン / それまでは、別々のことをしているパターン。画面には触れない(SVGの文字列を作るだけ)。

export const SCENES = { day: ['d2', 'd3', 'd4', 'd5', 'd6', 'd8', 'd9', 'd10', 'd11', 'd12'], night: ['n1', 'n2', 'n3', 'n4'] }; // 昼の d1(SVG)は、新しい絵が届くまで、出さない。知らない名前のときの、予備として残してある
export const isNight = (hour) => hour >= 21 || hour < 5;
// false にすると、どの時間も夜の場面になる(昼の絵を差し替えているときなどに使う)
export const DAY_READY = true;

// いまの時間の様子から、1つ選ぶ。直前と同じものは、続けて出さない
export function pickScene({ hour, last = '', rand = Math.random, dayReady = DAY_READY }) {
  const all = SCENES[isNight(hour) || !dayReady ? 'night' : 'day'];
  const list = all.filter((k) => k !== last);
  const from = list.length ? list : all;
  return from[Math.min(from.length - 1, Math.floor(rand() * from.length))];
}

const SK='#ffe3d0',PK='#e0558f',MN='#3a9c80',INK='#2d2630',MH='#2f7d68';
const face=(x,y,who,tilt=0,eyes='closed')=>`<g transform="translate(${x} ${y}) rotate(${tilt})"><circle r="10" fill="${SK}"/>${who==='h'?`<path d="M-10.5 1C-12-9 -5-12 0-12S12-9 10.5 1C8-5 5-7 0-7S-8-5-10.5 1z" fill="${PK}"/><path d="M10 -2q5 8 1 15" stroke="${PK}" stroke-width="4" fill="none" stroke-linecap="round"/>`:`<path d="M-11 0C-12-10-5-13 0-13S12-10 11 0C8-6 4-8 0-8S-8-6-11 0z" fill="${MH}"/>`}${eyes==='closed'?`<path d="M-6 1q2.5 3 5 0M1 1q2.5 3 5 0" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`:eyes==='up'?`<circle cx="-3.5" cy="-.5" r="1.5" fill="${INK}"/><circle cx="3.5" cy="-.5" r="1.5" fill="${INK}"/>`:`<circle cx="-3.5" cy="1" r="1.4" fill="${INK}"/><circle cx="3.5" cy="1" r="1.4" fill="${INK}"/>`}<circle cx="-7" cy="5" r="2.4" fill="#f58a9a" opacity=".6"/><circle cx="7" cy="5" r="2.4" fill="#f58a9a" opacity=".6"/><path d="M-2.500 6.500q2.500 2 5 0" stroke="${INK}" stroke-width="1.2" fill="none" stroke-linecap="round"/></g>`;
const heart=(x,y,s=1)=>`<path transform="translate(${x} ${y}) scale(${s})" d="M0 5C-6 0 -7-5 -3.500-6 -1.500-6.500 0-5 0-3.500 0-5 1.500-6.500 3.500-6 7-5 6 0 0 5z" fill="#ff8fb0"/>`;
const tank=(x,y,i)=>`<g transform="translate(${x} ${y})"><rect width="22" height="28" rx="6" fill="#5a6cd8" stroke="#aeb8ff" stroke-opacity=".8"/><circle cx="11" cy="13" r="10" fill="${['#a8c4ff','#c0b0ff','#9fd0ff','#d0b8ff'][i%4]}" opacity=".5"/><circle cx="11" cy="13" r="5.5" fill="#e8e4d4"/><rect x="2" y="-3" width="18" height="4" rx="2" fill="#6a72b8"/></g>`;
// 背景(固定のファンタジーの部屋)
// 窓から見える月。ふたりの月(ホームの月)と同じ満ち欠け(点数÷100)で、光のかさも、点数に合わせて大きくなる
const MOONX = 188; const MOONY = 62; const MOONR = 16;
function windowMoon(pts) {
  const f = pts / 100;
  let lit = '';
  if (f >= 0.999) lit = `<circle cx="${MOONX}" cy="${MOONY}" r="${MOONR}" fill="#ffe08a"/>`;
  else if (f > 0.001) {
    const rx = MOONR * Math.abs(1 - 2 * f);
    lit = `<path d="M${MOONX} ${MOONY - MOONR} A${MOONR} ${MOONR} 0 0 1 ${MOONX} ${MOONY + MOONR} A${rx.toFixed(2)} ${MOONR} 0 0 ${f >= 0.5 ? 1 : 0} ${MOONX} ${MOONY - MOONR}Z" fill="#ffe08a"/>`;
  }
  const halo = pts < 8 ? '' : `<circle cx="${MOONX}" cy="${MOONY}" r="${(MOONR + 6 + pts * 0.22).toFixed(0)}" fill="url(#rmh)" opacity="${Math.min(1, pts / 70).toFixed(2)}"/>`;
  return `${halo}<circle cx="${MOONX}" cy="${MOONY}" r="${MOONR}" fill="#3c3a68" stroke="#6f6ca8" stroke-width="1.2"/>${lit}<circle cx="${MOONX - 6}" cy="${MOONY - 5}" r="3" fill="#000" opacity=".12"/><circle cx="${MOONX + 5}" cy="${MOONY + 6}" r="2.2" fill="#000" opacity=".12"/>`;
}
const emptyTank = (x, y) => `<g transform="translate(${x} ${y})"><rect width="22" height="28" rx="6" fill="none" stroke="#8a92d8" stroke-width="1.2" stroke-dasharray="3 3" opacity=".6"/><circle cx="11" cy="13" r="1.3" fill="#8a92d8" opacity=".6"/></g>`;
function base(o = {}){const pts = Math.max(0, Math.min(100, Number(o.pts) || 0)); const full = Math.max(0, Number(o.full) || 0); return `<defs><radialGradient id="rmh"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".75"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient><linearGradient id="fw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2a66"/><stop offset="1" stop-color="#171646"/></linearGradient><linearGradient id="ff" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c2468"/><stop offset="1" stop-color="#150f3a"/></linearGradient><radialGradient id="fl"><stop offset="0" stop-color="#ffd98a" stop-opacity=".7"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient><radialGradient id="rmg" cx="165" cy="95" r="150" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5a5ab8" stop-opacity=".35"/><stop offset="1" stop-color="#5a5ab8" stop-opacity="0"/></radialGradient><radialGradient id="rmv" cx="180" cy="170" r="260" gradientUnits="userSpaceOnUse"><stop offset=".55" stop-color="#05051a" stop-opacity="0"/><stop offset="1" stop-color="#05051a" stop-opacity=".3"/></radialGradient></defs>
<rect width="360" height="340" fill="url(#fw)"/><rect width="360" height="340" fill="url(#rmg)"/>
<g><path d="M120 122V81a45 45 0 0 1 90 0V122z" fill="#16143e" stroke="#7e6eb4" stroke-width="4" stroke-linejoin="round"/><path d="M165 36v86M120 80h90" stroke="#7e6eb4" stroke-width="3"/><rect x="113" y="122" width="104" height="7" rx="2" fill="#7a64a8"/><rect x="113" y="122" width="104" height="1.500" rx=".7" fill="#a592d0" opacity=".7"/>${windowMoon(pts)}</g>
<g fill="#ffe9a8">${[[30,60],[70,90],[250,70],[300,110],[24,96],[330,60],[132,152],[340,160]].map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="2.2" class="rmtw" style="animation-delay:-${i*.4}s"/>`).join('')}</g><g class="rmfl"><path d="M300 50q10-14 20 0t-20 0z" fill="#c0b0ff" opacity=".8"/></g>
<rect y="244" width="360" height="96" fill="url(#ff)"/><rect y="236" width="360" height="9" fill="#3a3180"/><rect y="236" width="360" height="1.500" fill="#6a5cb4" opacity=".7"/><path d="M0 264H360M0 288H360M0 316H360" stroke="#5a4ca8" stroke-width="1" opacity=".3"/>
<ellipse cx="58" cy="246" rx="56" ry="6" fill="#0a0620" opacity=".45"/><ellipse cx="160" cy="264" rx="52" ry="6" fill="#0a0620" opacity=".4"/>
<g><rect x="15" y="120" width="86" height="118" fill="#2a1830"/><rect x="15" y="120" width="86" height="12" fill="#000" opacity=".2"/><rect x="8" y="112" width="100" height="8" rx="2" fill="#7a64a8"/><rect x="8" y="112" width="100" height="1.500" rx=".7" fill="#a592d0" opacity=".7"/><rect x="10" y="120" width="5" height="122" fill="#6e5a9e"/><rect x="101" y="120" width="5" height="122" fill="#6e5a9e"/>${[176, 232].map((y) => `<rect x="15" y="${y + 6}" width="86" height="4" fill="#000" opacity=".25"/><rect x="12" y="${y}" width="92" height="6" rx="1" fill="#7a64a8"/><rect x="12" y="${y}" width="92" height="1.500" fill="#a592d0" opacity=".7"/>`).join('')}${[[20,140],[46,140],[72,140],[20,196],[46,196]].map(([x, y], i) => (i < full ? tank(x, y, i) : emptyTank(x, y))).join('')}</g>
<g><path d="M122 235h8l-2 27h-4zM186 235h8l-2 27h-4z" fill="#5e4c92"/><rect x="118" y="229" width="76" height="10" fill="#5e4c92"/><rect x="146" y="231" width="20" height="6" rx="1" fill="#4e3e82" stroke="#8a76b8" stroke-opacity=".6" stroke-width=".6"/><circle cx="156" cy="234" r="1.600" fill="#b8a6e0"/><rect x="112" y="222" width="88" height="7" rx="2" fill="#7a64a8"/><rect x="112" y="222" width="88" height="1.500" rx=".7" fill="#a592d0" opacity=".7"/><ellipse cx="142" cy="224" rx="22" ry="2.600" fill="#000" opacity=".28"/><image class="rm-book" href="img/room/book.webp" x="116" y="190" width="52" height="35"/><g transform="translate(0 -4)"><ellipse cx="186" cy="198" rx="26" ry="22" fill="url(#fl)"/><path d="M180 226v-22l-8-9" stroke="#caa" stroke-width="3" fill="none"/><path d="M164 186l17-5 3 11z" fill="#d9a85a"/></g></g>
<rect width="360" height="340" fill="url(#rmv)"/>`;}
// ベッド・ソファ
const sofaBack=(x,y)=>`<rect x="${x}" y="${y}" width="144" height="44" rx="16" fill="#7a5aa8"/>`;
const sofaFront=(x,y)=>`<rect x="${x+8}" y="${y+26}" width="128" height="42" rx="14" fill="#5a3d8a"/><rect x="${x}" y="${y+8}" width="22" height="60" rx="10" fill="#5a3d8a"/><rect x="${x+122}" y="${y+8}" width="22" height="60" rx="10" fill="#5a3d8a"/>`;
// 絵ごとの、床にふれている所の影: [x, y, 横の半径, 縦の半径, かたむき(度)]。絵のファイル(横560)の上の位置。
// 脚・足・ソファの脚など、床にふれる所に、小さな影を置く(場面ごとに、足元が違うため)。ないときは、絵の下に1つ。
export const SHADOWS = {
  d2: [[60, 405, 40, 9], [82, 468, 11, 4], [230, 546, 14, 5], [300, 490, 34, 7], [410, 497, 62, 11]],
  d3: [[150, 292, 40, 8], [80, 343, 10, 4], [14, 302, 9, 3], [225, 217, 16, 5], [452, 320, 16, 5], [320, 290, 40, 6]],
  d4: [[250, 190, 14, 4], [462, 285, 14, 4], [403, 300, 16, 4], [355, 262, 32, 6], [360, 262, 100, 13]],
  d5: [[150, 293, 36, 7], [40, 328, 26, 6], [230, 214, 14, 4], [535, 272, 16, 4], [345, 292, 38, 6], [380, 245, 160, 14, 10]],
  d6: [[22, 500, 12, 4], [228, 502, 12, 4], [118, 558, 14, 5], [418, 474, 16, 5], [295, 458, 45, 8], [250, 380, 190, 18, 29]],
  d8: [[140, 432, 10, 4], [295, 502, 10, 5], [460, 432, 10, 4], [130, 383, 75, 9], [480, 383, 70, 9], [385, 405, 20, 5]],
  d9: [[25, 625, 22, 7], [170, 665, 26, 7], [520, 580, 22, 6], [290, 630, 130, 14, 30], [455, 665, 70, 14, -28]],
  d10: [[148, 417, 10, 4], [305, 490, 10, 5], [460, 417, 10, 4], [130, 372, 80, 9], [490, 362, 70, 9], [418, 380, 18, 5]],
  d11: [[60, 655, 42, 8], [148, 640, 36, 7], [137, 674, 10, 4], [352, 797, 14, 5], [495, 722, 10, 4], [448, 675, 9, 3], [345, 697, 45, 7], [545, 612, 8, 3]],
  d12: [[62, 335, 16, 5], [532, 430, 16, 5], [418, 495, 16, 5], [130, 520, 115, 9], [290, 505, 40, 6]],
  n1: [[32, 352, 14, 5], [275, 460, 18, 6], [552, 300, 12, 4], [150, 395, 135, 14, 25], [415, 385, 150, 14, -25]],
  n2: [[42, 390, 16, 5], [530, 385, 16, 5], [150, 450, 55, 8], [270, 470, 70, 8], [285, 392, 245, 11]],
  n3: [[280, 338, 265, 9]],
  n4: [[42, 328, 16, 5], [532, 380, 16, 5], [412, 445, 16, 5], [270, 415, 22, 6], [335, 435, 26, 6], [225, 385, 190, 12, 17], [470, 408, 80, 12, -28]],
};
const PIC_W = 560; // 絵のファイルの横(ピクセル)
const shadowOf = (k, x, y, w, h) => {
  const sh = SHADOWS[k];
  if (!sh) return `<ellipse cx="${x + w / 2}" cy="${y + h - 3}" rx="${w * .46}" ry="5" fill="#0a0620" opacity=".4"/>`;
  const f = w / PIC_W;
  const r = (n) => Math.round(n * 10) / 10;
  return `<g opacity=".42" filter="url(#rmsh)">${sh.map(([cx, cy, rx, ry, a]) => `<ellipse cx="${r(x + cx * f)}" cy="${r(y + cy * f)}" rx="${r(rx * f)}" ry="${r(ry * f)}" fill="#0a0620"${a ? ` transform="rotate(${a} ${r(x + cx * f)} ${r(y + cy * f)})"` : ''}/>`).join('')}</g>`;
};
const pic=(k,x,y,w,h)=>`<filter id="rmsh" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="1.3"/></filter>${shadowOf(k, x, y, w, h)}<image href="img/room/${k}.webp" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
// 絵のファイルで出す場面: 名前 → [x, y, 幅, 高さ](画面360x340のなか。足元が床になるように)。
// 足すとき: docs/img/room/<名前>.webp を置く → ここに1行 → sw.js の FILES にも書く(tests/room.test.mjs が、そろっているか見張る)
export const PICS = { n1: [180, 187, 177, 149], n2: [217, 221, 130, 115], n3: [216, 258, 127, 78], n4: [216, 228, 131, 108], d2: [172, 165, 175, 172], d3: [156, 210, 204, 127], d4: [142, 186, 218, 149], d5: [155, 214, 205, 122], d6: [207, 194, 141, 143], d8: [218, 228, 118, 109], d9: [228, 202, 105, 135], d10: [215, 226, 124, 111], d11: [238, 195, 99, 142], d12: [210, 205, 134, 132] };
const S={
 // 昼の d1(SVG)。PICS に d1 を足せば、絵のほうが優先される
 d1:()=>`<g transform="translate(150 196)"><rect x="-12" y="-8" width="26" height="30" rx="10" fill="${PK}"/>${face(1,-24,'h',-10,'open')}<path d="M10 4l12 14" stroke="${PK}" stroke-width="5" stroke-linecap="round"/></g>${sofaBack(206,290)}<rect x="270" y="252" width="40" height="46" rx="12" fill="${MN}"/>${face(290,240,'y',4,'open')}<rect x="276" y="270" width="30" height="20" rx="3" fill="#fff7e6" stroke="#caa"/><path d="M291 270v20" stroke="#caa"/>${sofaFront(206,290)}`,
 d2:()=>`<g transform="translate(56 232)"><rect x="-12" y="-6" width="26" height="40" rx="10" fill="${PK}"/>${face(1,-20,'h',12,'up')}<rect x="-8" y="34" width="9" height="32" rx="4" fill="${PK}"/><rect x="3" y="34" width="9" height="32" rx="4" fill="${PK}"/></g>${sofaBack(206,290)}<rect x="262" y="256" width="40" height="44" rx="12" fill="${MN}"/>${face(282,244,'y',16)}${sofaFront(206,290)}<text x="316" y="236" font-size="14" fill="#fff" opacity=".8" class="rmtw">z</text><text x="326" y="224" font-size="11" fill="#fff" opacity=".8" class="rmtw">z</text>`,
 d3:()=>`<g transform="translate(228 276)"><rect x="-12" y="-6" width="26" height="40" rx="10" fill="${PK}"/>${face(1,-20,'h',-8,'open')}<path d="M14 6l26 8" stroke="${PK}" stroke-width="5" stroke-linecap="round"/><path d="M40 14l8-6h8l-4 12z" fill="#9fd0ff"/><path d="M52 22q2 8-2 14" stroke="#9fd0ff" stroke-width="2" fill="none" class="rmtw"/></g><g transform="translate(150 200)"><rect x="-12" y="-8" width="26" height="30" rx="10" fill="${MN}"/>${face(1,-24,'y',-6,'open')}<rect x="14" y="2" width="30" height="20" rx="2" fill="#2a2f6a" stroke="#8a8fd0"/><rect x="16" y="4" width="26" height="14" fill="#9fd0ff" opacity=".6"/></g>`
};

// タップできる場所(棚→月の棚 / デスクの日記帳→日記帳)。ふたりの場所は、まだタップできない
const HOT = `<g class="rm-hot" data-go="shelf" role="button" tabindex="0" aria-label="月の棚"><rect x="6" y="112" width="104" height="132" rx="8" fill="transparent"/></g>
<g class="rm-hot" data-go="diary" role="button" tabindex="0" aria-label="日記帳"><rect x="113" y="172" width="91" height="94" rx="8" fill="transparent"/></g>`;

// 昼の部屋: 時間で、背景の色と、窓の外が変わる(朝 / 昼 / 午後〜夕方)。夜は、いまの夜の部屋のまま
export const toneOf = (hour) => (isNight(hour) ? 'night' : hour < 10 ? 'morning' : hour < 15 ? 'noon' : 'evening');
const TONES = {
  morning: { wall: ['#eefaf6', '#d3efe6'], floor: ['#cfe3ec', '#b4cfdc'], glow: '#ffffff', sky: ['#7fc8ff', '#d9f0ff'], frame: '#8fb8c8', sill: '#b2d2de', shelf: '#bcdbe6', shelfIn: '#eef8fb', line: '#e8f7f6', line2: '#a8ccd8', sun: '#fff0a0', ray: '#ffffff', rayOp: 0.55, shadow: '#5a7a8a', vig: '#5a8aa0', vigOp: 0.12 },
  noon: { wall: ['#f1e8ff', '#dccdf3'], floor: ['#e8cfae', '#d4b48c'], glow: '#ffffff', sky: ['#a9dcff', '#e3f4ff'], frame: '#a98fd6', sill: '#c8b0ec', shelf: '#d2bdea', shelfIn: '#f4eafa', line: '#ece0fb', line2: '#cdb9ee', sun: '#ffd95a', ray: '#fff7d6', rayOp: 0.5, shadow: '#7a6a9a', vig: '#8a6aa8', vigOp: 0.14 },
  evening: { wall: ['#fff0dc', '#f6d9bd'], floor: ['#e6bb85', '#cf9a60'], glow: '#fff3c8', sky: ['#ffd9a8', '#fff1d4'], frame: '#c79a78', sill: '#e0b894', shelf: '#e8c4a0', shelfIn: '#fff3e4', line: '#fff0e0', line2: '#e0b48c', sun: '#ffc94a', ray: '#fff0b8', rayOp: 0.55, shadow: '#8a5a3a', vig: '#b0703a', vigOp: 0.16 },
};
// 夜の背景の色を、昼の色に入れかえる(背景だけ。ふたりの絵は、そのまま)。月と星は消して、太陽と雲に、窓から床へ日ざしを入れる
function dayify(svg, tone) {
  const c = TONES[tone];
  if (!c) return svg;
  let s = svg;
  const swap = (a, b) => { s = s.split(a).join(b); };
  swap('stop-color="#2a2a66"', `stop-color="${c.wall[0]}"`); swap('stop-color="#171646"', `stop-color="${c.wall[1]}"`);
  swap('stop-color="#2c2468"', `stop-color="${c.floor[0]}"`); swap('stop-color="#150f3a"', `stop-color="${c.floor[1]}"`);
  swap('stop-color="#5a5ab8" stop-opacity=".35"', `stop-color="${c.glow}" stop-opacity=".8"`); swap('stop-color="#5a5ab8" stop-opacity="0"', `stop-color="${c.glow}" stop-opacity="0"`);
  swap('stop-color="#05051a" stop-opacity=".3"', `stop-color="${c.vig}" stop-opacity="${c.vigOp}"`); swap('stop-color="#05051a" stop-opacity="0"', `stop-color="${c.vig}" stop-opacity="0"`);
  swap('fill="#16143e"', 'fill="url(#rmsky)"');
  swap('#7e6eb4', c.frame); swap('#7a64a8', c.sill); swap('#a592d0', c.line); swap('#b8a6e0', c.line2); swap('#6e5a9e', c.shelf); swap('#5e4c92', c.shelf); swap('#4e3e82', c.shelf); swap('#8a76b8', c.line2);
  swap('#2a1830', c.shelfIn); swap('#3a3180', c.shelf); swap('#6a5cb4', c.line2); swap('#5a4ca8', c.line2); swap('#5a3d8a', c.shelf);
  swap('#0a0620', c.shadow);
  s = s.replace(/<g fill="#ffe9a8">.*?<\/g>/s, ''); // 星
  s = s.replace(/<g class="rmfl">.*?<\/g>/s, ''); // 夜に飛ぶ光
  s = s.replace(/<circle cx="188" cy="62"[^>]*\/>/g, '').replace(/<path d="M188 46[^>]*\/>/g, '').replace(/<circle cx="182"[^>]*\/>/g, '').replace(/<circle cx="193"[^>]*\/>/g, ''); // 窓の月
  const defs = `<linearGradient id="rmsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.sky[0]}"/><stop offset="1" stop-color="${c.sky[1]}"/></linearGradient><radialGradient id="rmsun"><stop offset="0" stop-color="${c.sun}" stop-opacity=".95"/><stop offset=".45" stop-color="${c.sun}" stop-opacity=".5"/><stop offset="1" stop-color="${c.sun}" stop-opacity="0"/></radialGradient><linearGradient id="rmray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.ray}" stop-opacity="${c.rayOp}"/><stop offset="1" stop-color="${c.ray}" stop-opacity="0"/></linearGradient>`;
  s = s.replace('</defs>', `${defs}</defs>`);
  const sun = `<circle cx="150" cy="64" r="30" fill="url(#rmsun)"/><circle cx="150" cy="64" r="11" fill="${c.sun}"/><g fill="#fff" opacity=".92"><ellipse cx="196" cy="52" rx="14" ry="5"/><ellipse cx="204" cy="48" rx="9" ry="5"/><ellipse cx="136" cy="100" rx="12" ry="4.500"/><ellipse cx="144" cy="97" rx="7" ry="4"/></g>`;
  s = s.replace('<rect x="113" y="122" width="104" height="7"', `<clipPath id="rmwc"><path d="M120 122V81a45 45 0 0 1 90 0V122z"/></clipPath><g clip-path="url(#rmwc)">${sun}</g><rect x="113" y="122" width="104" height="7"`);
  const rays = '<g><path d="M126 129L214 129L262 250L120 250Z" fill="url(#rmray)"/><path d="M150 129L172 129L196 250L150 250Z" fill="#fff" opacity=".18"/></g>';
  s = s.replace('fill="url(#rmv)"/>', `fill="url(#rmv)"/>${rays}`);
  return s;
}

// opts.tone: 昼の絵(d…)のとき、'morning' | 'noon' | 'evening' を渡すと、昼の部屋の色になる。渡さなければ、これまでの(夜の)背景
export function roomSvg(key, opts = {}) {
  const k = PICS[key] || S[key] ? key : 'd1';
  const scene = PICS[k] ? () => pic(k, ...PICS[k]) : S[k];
  const body = `${base(opts)}${scene()}${HOT}`;
  const tone = opts.tone && k.startsWith('d') ? opts.tone : '';
  return `<svg viewBox="0 0 360 340" class="rm-svg" role="group" aria-label="おたのしみの部屋">${tone ? dayify(body, tone) : body}</svg>`;
}
