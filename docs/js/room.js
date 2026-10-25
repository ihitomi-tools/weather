// おたのしみの部屋(ファンタジー)。背景は固定で、ふたりの様子だけが変わる。
// 夜(21時以降)は、寄り添うパターン / それまでは、別々のことをしているパターン。画面には触れない(SVGの文字列を作るだけ)。

export const SCENES = { day: ['d1', 'd2', 'd3'], night: ['n1', 'n2', 'n3', 'n4'] };
export const isNight = (hour) => hour >= 21 || hour < 5;

// いまの時間の様子から、1つ選ぶ。直前と同じものは、続けて出さない
export function pickScene({ hour, last = '', rand = Math.random }) {
  const all = SCENES[isNight(hour) ? 'night' : 'day'];
  const list = all.filter((k) => k !== last);
  const from = list.length ? list : all;
  return from[Math.min(from.length - 1, Math.floor(rand() * from.length))];
}

const SK='#ffe3d0',PK='#e0558f',MN='#3a9c80',INK='#2d2630',MH='#2f7d68';
const face=(x,y,who,tilt=0,eyes='closed')=>`<g transform="translate(${x} ${y}) rotate(${tilt})"><circle r="10" fill="${SK}"/>${who==='h'?`<path d="M-10.5 1C-12-9 -5-12 0-12S12-9 10.5 1C8-5 5-7 0-7S-8-5-10.5 1z" fill="${PK}"/><path d="M10 -2q5 8 1 15" stroke="${PK}" stroke-width="4" fill="none" stroke-linecap="round"/>`:`<path d="M-11 0C-12-10-5-13 0-13S12-10 11 0C8-6 4-8 0-8S-8-6-11 0z" fill="${MH}"/>`}${eyes==='closed'?`<path d="M-6 1q2.5 3 5 0M1 1q2.5 3 5 0" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`:eyes==='up'?`<circle cx="-3.5" cy="-.5" r="1.5" fill="${INK}"/><circle cx="3.5" cy="-.5" r="1.5" fill="${INK}"/>`:`<circle cx="-3.5" cy="1" r="1.4" fill="${INK}"/><circle cx="3.5" cy="1" r="1.4" fill="${INK}"/>`}<circle cx="-7" cy="5" r="2.4" fill="#f58a9a" opacity=".6"/><circle cx="7" cy="5" r="2.4" fill="#f58a9a" opacity=".6"/><path d="M-2.500 6.500q2.500 2 5 0" stroke="${INK}" stroke-width="1.2" fill="none" stroke-linecap="round"/></g>`;
const heart=(x,y,s=1)=>`<path transform="translate(${x} ${y}) scale(${s})" d="M0 5C-6 0 -7-5 -3.500-6 -1.500-6.500 0-5 0-3.500 0-5 1.500-6.500 3.500-6 7-5 6 0 0 5z" fill="#ff8fb0"/>`;
const tank=(x,y,i)=>`<g transform="translate(${x} ${y})"><rect width="22" height="28" rx="6" fill="#5a6cd8" stroke="#aeb8ff" stroke-opacity=".8"/><circle cx="11" cy="13" r="10" fill="${['#a8c4ff','#c0b0ff','#9fd0ff','#d0b8ff'][i%4]}" opacity=".5"/><circle cx="11" cy="13" r="5.5" fill="#e8e4d4"/><rect x="2" y="-3" width="18" height="4" rx="2" fill="#6a72b8"/></g>`;
const diary=(x,y)=>`<g transform="translate(${x} ${y}) rotate(-6)"><rect width="42" height="34" rx="3" fill="#5a2f1c"/><rect x="4" y="4" width="34" height="26" fill="none" stroke="#e9c978" stroke-width="1.2"/><rect x="11" y="11" width="20" height="12" fill="none" stroke="#e9c978"/><rect x="39" y="3" width="3" height="28" fill="#fbf3df"/><rect x="31" y="30" width="4" height="12" fill="#c9443d"/></g>`;
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
function base(o = {}){const pts = Math.max(0, Math.min(100, Number(o.pts) || 0)); const full = Math.max(0, Number(o.full) || 0); return `<defs><radialGradient id="rmh"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".75"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient><linearGradient id="fw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2a66"/><stop offset="1" stop-color="#171646"/></linearGradient><linearGradient id="ff" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c2468"/><stop offset="1" stop-color="#150f3a"/></linearGradient><radialGradient id="fl"><stop offset="0" stop-color="#ffd98a" stop-opacity=".7"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient><radialGradient id="rmg" cx="165" cy="95" r="150" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5a5ab8" stop-opacity=".35"/><stop offset="1" stop-color="#5a5ab8" stop-opacity="0"/></radialGradient><radialGradient id="rmv" cx="180" cy="170" r="260" gradientUnits="userSpaceOnUse"><stop offset=".55" stop-color="#05051a" stop-opacity="0"/><stop offset="1" stop-color="#05051a" stop-opacity=".45"/></radialGradient></defs>
<rect width="360" height="340" fill="url(#fw)"/><rect width="360" height="340" fill="url(#rmg)"/>
<g><path d="M120 122V81a45 45 0 0 1 90 0V122z" fill="#16143e" stroke="#7e6eb4" stroke-width="4" stroke-linejoin="round"/><path d="M165 36v86M120 80h90" stroke="#7e6eb4" stroke-width="3"/><rect x="113" y="122" width="104" height="7" rx="2" fill="#7a64a8"/><rect x="113" y="122" width="104" height="1.500" rx=".7" fill="#a592d0" opacity=".7"/>${windowMoon(pts)}</g>
<g fill="#ffe9a8">${[[30,60],[70,90],[250,70],[300,110],[20,150],[330,60],[110,150],[340,160]].map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="2.2" class="rmtw" style="animation-delay:-${i*.4}s"/>`).join('')}</g><g class="rmfl"><path d="M300 50q10-14 20 0t-20 0z" fill="#c0b0ff" opacity=".8"/></g>
<rect y="244" width="360" height="96" fill="url(#ff)"/><rect y="236" width="360" height="9" fill="#3a3180"/><rect y="236" width="360" height="1.500" fill="#6a5cb4" opacity=".7"/><path d="M0 264H360M0 288H360M0 316H360" stroke="#5a4ca8" stroke-width="1" opacity=".3"/>
<ellipse cx="58" cy="246" rx="56" ry="6" fill="#0a0620" opacity=".45"/><ellipse cx="160" cy="273" rx="52" ry="6" fill="#0a0620" opacity=".4"/>
<g><rect x="15" y="120" width="86" height="118" fill="#2a1830"/><rect x="15" y="120" width="86" height="12" fill="#000" opacity=".2"/><rect x="8" y="112" width="100" height="8" rx="2" fill="#7a64a8"/><rect x="8" y="112" width="100" height="1.500" rx=".7" fill="#a592d0" opacity=".7"/><rect x="10" y="120" width="5" height="122" fill="#6e5a9e"/><rect x="101" y="120" width="5" height="122" fill="#6e5a9e"/>${[176, 232].map((y) => `<rect x="15" y="${y + 6}" width="86" height="4" fill="#000" opacity=".25"/><rect x="12" y="${y}" width="92" height="6" rx="1" fill="#7a64a8"/><rect x="12" y="${y}" width="92" height="1.500" fill="#a592d0" opacity=".7"/>`).join('')}${[[20,140],[46,140],[72,140],[20,196],[46,196]].map(([x, y], i) => (i < full ? tank(x, y, i) : emptyTank(x, y))).join('')}</g>
<g><path d="M122 235h8l-2 36h-4zM186 235h8l-2 36h-4z" fill="#5e4c92"/><rect x="118" y="229" width="76" height="10" fill="#5e4c92"/><rect x="146" y="231" width="20" height="6" rx="1" fill="#4e3e82" stroke="#8a76b8" stroke-opacity=".6" stroke-width=".6"/><circle cx="156" cy="234" r="1.600" fill="#b8a6e0"/><rect x="112" y="222" width="88" height="7" rx="2" fill="#7a64a8"/><rect x="112" y="222" width="88" height="1.500" rx=".7" fill="#a592d0" opacity=".7"/>${diary(132,186)}<g transform="translate(0 -4)"><ellipse cx="186" cy="198" rx="26" ry="22" fill="url(#fl)"/><path d="M180 226v-22l-8-9" stroke="#caa" stroke-width="3" fill="none"/><path d="M164 186l17-5 3 11z" fill="#d9a85a"/></g></g>
<g transform="translate(206 250)"><path d="M0 12q-4-14 6-16 10 2 6 16z" fill="#ff9cc4"/><rect x="4" y="10" width="4" height="10" fill="#e8d8f8"/></g><g transform="translate(228 256) scale(.8)"><path d="M0 12q-4-14 6-16 10 2 6 16z" fill="#9fd0ff"/><rect x="4" y="10" width="4" height="10" fill="#e8d8f8"/></g><rect width="360" height="340" fill="url(#rmv)"/>`;}
// ベッド・ソファ
const sofaBack=(x,y)=>`<rect x="${x}" y="${y}" width="144" height="44" rx="16" fill="#7a5aa8"/>`;
const sofaFront=(x,y)=>`<rect x="${x+8}" y="${y+26}" width="128" height="42" rx="14" fill="#5a3d8a"/><rect x="${x}" y="${y+8}" width="22" height="60" rx="10" fill="#5a3d8a"/><rect x="${x+122}" y="${y+8}" width="22" height="60" rx="10" fill="#5a3d8a"/>`;
const pic=(k,x,y,w,h)=>`<ellipse cx="${x+w/2}" cy="${y+h-3}" rx="${w*.46}" ry="5" fill="#0a0620" opacity=".4"/><image href="img/room/${k}.webp" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
const S={
 // 夜(絵のファイルを置く。位置は、足元が床になるように)
 n1:()=>pic('n1',204,210,150,126),
 n2:()=>pic('n2',212,213,140,123),
 n3:()=>pic('n3',204,244,150,92),
 n4:()=>pic('n4',212,221,140,115),
 // 昼
 d1:()=>`<g transform="translate(150 196)"><rect x="-12" y="-8" width="26" height="30" rx="10" fill="${PK}"/>${face(1,-24,'h',-10,'open')}<path d="M10 4l12 14" stroke="${PK}" stroke-width="5" stroke-linecap="round"/></g>${sofaBack(206,290)}<rect x="270" y="252" width="40" height="46" rx="12" fill="${MN}"/>${face(290,240,'y',4,'open')}<rect x="276" y="270" width="30" height="20" rx="3" fill="#fff7e6" stroke="#caa"/><path d="M291 270v20" stroke="#caa"/>${sofaFront(206,290)}`,
 d2:()=>`<g transform="translate(56 232)"><rect x="-12" y="-6" width="26" height="40" rx="10" fill="${PK}"/>${face(1,-20,'h',12,'up')}<rect x="-8" y="34" width="9" height="32" rx="4" fill="${PK}"/><rect x="3" y="34" width="9" height="32" rx="4" fill="${PK}"/></g>${sofaBack(206,290)}<rect x="262" y="256" width="40" height="44" rx="12" fill="${MN}"/>${face(282,244,'y',16)}${sofaFront(206,290)}<text x="316" y="236" font-size="14" fill="#fff" opacity=".8" class="rmtw">z</text><text x="326" y="224" font-size="11" fill="#fff" opacity=".8" class="rmtw">z</text>`,
 d3:()=>`<g transform="translate(228 276)"><rect x="-12" y="-6" width="26" height="40" rx="10" fill="${PK}"/>${face(1,-20,'h',-8,'open')}<path d="M14 6l26 8" stroke="${PK}" stroke-width="5" stroke-linecap="round"/><path d="M40 14l8-6h8l-4 12z" fill="#9fd0ff"/><path d="M52 22q2 8-2 14" stroke="#9fd0ff" stroke-width="2" fill="none" class="rmtw"/></g><g transform="translate(150 200)"><rect x="-12" y="-8" width="26" height="30" rx="10" fill="${MN}"/>${face(1,-24,'y',-6,'open')}<rect x="14" y="2" width="30" height="20" rx="2" fill="#2a2f6a" stroke="#8a8fd0"/><rect x="16" y="4" width="26" height="14" fill="#9fd0ff" opacity=".6"/></g>`
};

// タップできる場所(棚→月の棚 / デスクの日記帳→日記帳)。ふたりの場所は、まだタップできない
const HOT = `<g class="rm-hot" data-go="shelf" role="button" tabindex="0" aria-label="月の棚"><rect x="6" y="112" width="104" height="132" rx="8" fill="transparent"/></g>
<g class="rm-hot" data-go="diary" role="button" tabindex="0" aria-label="日記帳"><rect x="118" y="176" width="86" height="66" rx="8" fill="transparent"/></g>`;

export function roomSvg(key, opts = {}) {
  const scene = S[key] || S.d1;
  return `<svg viewBox="0 0 360 340" class="rm-svg" role="group" aria-label="おたのしみの部屋">${base(opts)}${scene()}${HOT}</svg>`;
}
