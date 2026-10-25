// おたのしみの部屋(ファンタジー)。背景は固定で、ふたりの様子だけが変わる。
// 夜(21時以降)は、寄り添うパターン / それまでは、別々のことをしているパターン。画面には触れない(SVGの文字列を作るだけ)。

export const SCENES = { day: ['d1', 'd2', 'd3'], night: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'] };
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
function base(){return `<defs><linearGradient id="fw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2a7a"/><stop offset="1" stop-color="#150f3a"/></linearGradient><linearGradient id="ff" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1f5a"/><stop offset="1" stop-color="#160f38"/></linearGradient><radialGradient id="fl"><stop offset="0" stop-color="#ffd98a" stop-opacity=".7"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient></defs>
<rect width="360" height="340" fill="url(#fw)"/>
<g><rect x="120" y="36" width="90" height="86" rx="40" fill="#1a1456" stroke="#8a8fd0" stroke-width="4"/><path d="M165 36v86M120 80h90" stroke="#8a8fd0" stroke-width="3"/><circle cx="188" cy="62" r="16" fill="#f3efe0"/><circle cx="182" cy="56" r="4" fill="#fff" opacity=".5"/></g>
<g fill="#ffe9a8">${[[30,60],[70,90],[250,70],[300,110],[20,150],[330,60],[110,150],[340,160]].map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="2.2" class="rmtw" style="animation-delay:-${i*.4}s"/>`).join('')}</g><g class="rmfl"><path d="M300 50q10-14 20 0t-20 0z" fill="#c0b0ff" opacity=".8"/></g>
<rect y="262" width="360" height="78" fill="url(#ff)"/>
<g><rect x="12" y="120" width="92" height="6" fill="#7a5aa8"/><rect x="12" y="176" width="92" height="6" fill="#7a5aa8"/><rect x="12" y="232" width="92" height="6" fill="#7a5aa8"/><rect x="10" y="120" width="5" height="120" fill="#7a5aa8"/><rect x="101" y="120" width="5" height="120" fill="#7a5aa8"/>${tank(20,140,0)}${tank(46,140,1)}${tank(72,140,2)}${tank(20,196,3)}${tank(46,196,0)}</g>
<g><rect x="116" y="226" width="80" height="9" rx="2" fill="#5a4a8a"/><rect x="122" y="235" width="7" height="36" fill="#5a4a8a"/><rect x="186" y="235" width="7" height="36" fill="#5a4a8a"/>${diary(132,190)}<ellipse cx="186" cy="198" rx="26" ry="22" fill="url(#fl)"/><path d="M180 226v-22l-8-9" stroke="#caa" stroke-width="3" fill="none"/><path d="M164 186l17-5 3 11z" fill="#d9a85a"/></g>
<g transform="translate(206 250)"><path d="M0 12q-4-14 6-16 10 2 6 16z" fill="#ff9cc4"/><rect x="4" y="10" width="4" height="10" fill="#e8d8f8"/></g><g transform="translate(228 256) scale(.8)"><path d="M0 12q-4-14 6-16 10 2 6 16z" fill="#9fd0ff"/><rect x="4" y="10" width="4" height="10" fill="#e8d8f8"/></g>`;}
// ベッド・ソファ
const bedBase=(w=136)=>`<rect x="-4" y="-34" width="${w+8}" height="14" rx="6" fill="#7a5aa8"/><rect x="-4" y="40" width="10" height="26" fill="#7a5aa8"/><rect x="${w-6}" y="40" width="10" height="26" fill="#7a5aa8"/><rect x="0" y="-8" width="${w}" height="52" rx="10" fill="#efe6ff"/>`;
const sofaBack=(x,y)=>`<rect x="${x}" y="${y}" width="144" height="44" rx="16" fill="#7a5aa8"/>`;
const sofaFront=(x,y)=>`<rect x="${x+8}" y="${y+26}" width="128" height="42" rx="14" fill="#5a3d8a"/><rect x="${x}" y="${y+8}" width="22" height="60" rx="10" fill="#5a3d8a"/><rect x="${x+122}" y="${y+8}" width="22" height="60" rx="10" fill="#5a3d8a"/>`;
const S={
 // 夜
 n1:()=>`<g transform="translate(214 282)">${bedBase()}<ellipse cx="28" cy="-8" rx="22" ry="11" fill="#fff2fb"/><ellipse cx="96" cy="-8" rx="22" ry="11" fill="#fff2fb"/>${face(30,-12,'h',-6)}${face(94,-12,'y',6)}<path d="M-2 -2H138V40q-2 8-10 8H8q-10 0-10-8z" fill="#5b6ad8"/><path d="M-2 -2H138" stroke="#8f9bf0" stroke-width="9" stroke-linecap="round"/>${heart(68,-30,1.2)}</g>`,
 n2:()=>`<g transform="translate(214 282)">${bedBase()}<rect x="30" y="-60" width="34" height="48" rx="12" fill="${PK}"/><rect x="72" y="-58" width="36" height="52" rx="12" fill="${MN}"/>${face(47,-70,'h',8)}${face(90,-72,'y',-4,'open')}<rect x="-2" y="-8" width="140" height="10" rx="5" fill="#5b6ad8"/>${heart(62,-98,1.1)}</g>`,
 n3:()=>`${sofaBack(206,290)}<rect x="244" y="248" width="34" height="48" rx="12" fill="${PK}"/><rect x="284" y="246" width="36" height="50" rx="12" fill="${MN}"/>${face(261,238,'h',10)}${face(302,236,'y',-8)}${sofaFront(206,290)}${heart(282,206,1.2)}`,
 n4:()=>`<g><rect x="244" y="246" width="30" height="56" rx="12" fill="${PK}"/><rect x="274" y="244" width="32" height="58" rx="12" fill="${MN}"/><rect x="246" y="298" width="10" height="34" rx="4" fill="${PK}"/><rect x="260" y="298" width="10" height="34" rx="4" fill="${PK}"/><rect x="278" y="300" width="10" height="32" rx="4" fill="${MN}"/><rect x="292" y="300" width="10" height="32" rx="4" fill="${MN}"/>${face(259,234,'h',10,'up')}${face(290,232,'y',-10,'up')}<path d="M272 262q4 6 8 0" stroke="${PK}" stroke-width="5" fill="none" stroke-linecap="round"/></g><path d="M196 70 L290 160" stroke="#fff" stroke-width="2" opacity=".7"/><circle cx="196" cy="70" r="3" fill="#fff"/>${heart(275,206,1.2)}`,
 n5:()=>`${sofaBack(206,290)}<rect x="270" y="250" width="40" height="48" rx="12" fill="${MN}"/>${face(292,238,'y',-4)}<g transform="translate(228 276)"><rect x="0" y="0" width="64" height="20" rx="10" fill="${PK}"/>${face(-6,6,'h',-80)}</g>${sofaFront(206,290)}${heart(268,214,1.1)}`,
 n6:()=>`<g transform="translate(214 282)">${bedBase()}<rect x="30" y="-60" width="34" height="48" rx="12" fill="${PK}"/><rect x="72" y="-58" width="36" height="52" rx="12" fill="${MN}"/>${face(47,-70,'h',8)}${face(90,-72,'y',-4)}<path d="M22 -52q28 -14 56 -2 28 -12 44 8v44H22z" fill="#9f8cf0" opacity=".95"/><path d="M22 -52q28 -14 56 -2 28 -12 44 8" stroke="#c0b0ff" stroke-width="4" fill="none"/><rect x="-2" y="-8" width="140" height="10" rx="5" fill="#5b6ad8"/>${heart(66,-98,1.1)}</g>`,
 // 昼
 d1:()=>`<g transform="translate(150 196)"><rect x="-12" y="-8" width="26" height="30" rx="10" fill="${PK}"/>${face(1,-24,'h',-10,'open')}<path d="M10 4l12 14" stroke="${PK}" stroke-width="5" stroke-linecap="round"/></g>${sofaBack(206,290)}<rect x="270" y="252" width="40" height="46" rx="12" fill="${MN}"/>${face(290,240,'y',4,'open')}<rect x="276" y="270" width="30" height="20" rx="3" fill="#fff7e6" stroke="#caa"/><path d="M291 270v20" stroke="#caa"/>${sofaFront(206,290)}`,
 d2:()=>`<g transform="translate(56 232)"><rect x="-12" y="-6" width="26" height="40" rx="10" fill="${PK}"/>${face(1,-20,'h',12,'up')}<rect x="-8" y="34" width="9" height="32" rx="4" fill="${PK}"/><rect x="3" y="34" width="9" height="32" rx="4" fill="${PK}"/></g>${sofaBack(206,290)}<rect x="262" y="256" width="40" height="44" rx="12" fill="${MN}"/>${face(282,244,'y',16)}${sofaFront(206,290)}<text x="316" y="236" font-size="14" fill="#fff" opacity=".8" class="rmtw">z</text><text x="326" y="224" font-size="11" fill="#fff" opacity=".8" class="rmtw">z</text>`,
 d3:()=>`<g transform="translate(228 276)"><rect x="-12" y="-6" width="26" height="40" rx="10" fill="${PK}"/>${face(1,-20,'h',-8,'open')}<path d="M14 6l26 8" stroke="${PK}" stroke-width="5" stroke-linecap="round"/><path d="M40 14l8-6h8l-4 12z" fill="#9fd0ff"/><path d="M52 22q2 8-2 14" stroke="#9fd0ff" stroke-width="2" fill="none" class="rmtw"/></g><g transform="translate(150 200)"><rect x="-12" y="-8" width="26" height="30" rx="10" fill="${MN}"/>${face(1,-24,'y',-6,'open')}<rect x="14" y="2" width="30" height="20" rx="2" fill="#2a2f6a" stroke="#8a8fd0"/><rect x="16" y="4" width="26" height="14" fill="#9fd0ff" opacity=".6"/></g>`
};

// タップできる場所(棚→月の棚 / デスクの日記帳→日記帳)。ふたりの場所は、まだタップできない
const HOT = `<g class="rm-hot" data-go="shelf" role="button" tabindex="0" aria-label="月の棚"><rect x="6" y="112" width="104" height="132" rx="8" fill="transparent"/></g>
<g class="rm-hot" data-go="diary" role="button" tabindex="0" aria-label="日記帳"><rect x="118" y="176" width="86" height="66" rx="8" fill="transparent"/></g>`;

export function roomSvg(key) {
  const scene = S[key] || S.d1;
  return `<svg viewBox="0 0 360 340" class="rm-svg" role="group" aria-label="おたのしみの部屋">${base()}${scene()}${HOT}</svg>`;
}
