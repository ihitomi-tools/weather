// 月の舞台(夜空・季節・ブランコ・ふたりの人型・特別な日)をSVGの文字で作る。
// 外の状態は moonScene(ctx) で受け取り、画面には触らない。
//   ctx: { pts, sig:{h:ms|null,y:ms|null}, first, resolved, kind, cheerUntil, revisit, variant, special,
//          season, now, winMs, pop, popUntil, sigAt:{h,y} }   (h=ひとみ=飛ぶ人 / y=かずゆき=受け止める人)
const st = {
  pts: 0, sig: { h: null, y: null }, first: null, resolved: false, cheerUntil: 0, kind: null, pop: null, popUntil: 0, sigAt: { h: 0, y: 0 },
  revisit: 0, variant: 'hug', special: 'none', hint: false, season: 'autumn', now: 0, winMs: 600000,
};

// 舞台の寸法(viewBox 300x182)。ひとみ=左のブランコ、かずゆき=右のブランコ。
const PIV = { h: [102, 6], y: [198, 6] }, ROPE = 84, MOON = [150, 88], MR = 46;

const STARS = (() => { let x = 7; const r = () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; }; return Array.from({ length: 46 }, () => [r() * 300, r() * 184, 0.5 + r() * 1.2, r() * 3]); })();
const NIGHT = { stars: 1, moon: '#39407a', moonLine: '#8f98d8', pink: '#ff9cc4', mint: '#62e6c0', line: '#aab4e8', halo: 0.22, shoot: 1 };
const SKIES = {
  spring: { ...NIGHT, stops: ['#171a45', '#33296b', '#6a3f86'], hill1: '#2a1f55', hill2: '#1d1642', tent: '#33265f', noTent: true },
  summer: { ...NIGHT, stops: ['#0a1238', '#1b2c6c', '#2c4a86'], hill1: '#15233f', hill2: '#0f1a33', tent: '#1d2d55', milky: 0.09 },
  autumn: { ...NIGHT, stops: ['#16122f', '#34244f', '#5a3358'], hill1: '#2a1c3a', hill2: '#1e1430', tent: '#3a2547', moon: '#4a3f72' },
  winter: { ...NIGHT, stops: ['#0b1130', '#1b2a5a', '#34568a'], hill1: '#7f9bc9', hill2: '#6a86b8', tent: '#9fb6dc', snow: true },
};
const SKY_LABEL = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
const skyNow = () => SKIES[skyKey()];
const skyKey = () => st.season;

const RNG = (seed) => () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const fall = (n, seed, make) => { const r = RNG(seed); return Array.from({ length: n }, (_, i) => { const x0 = r() * 300, dx = (r() - 0.5) * 50, d = 7 + r() * 8, rot = (r() * 2 - 1) * 360; return `<g class="fall" style="--x0:${x0.toFixed(0)}px;--dx:${dx.toFixed(0)}px;--d:${d.toFixed(1)}s;--rot:${rot.toFixed(0)}deg;animation-delay:-${(r() * d).toFixed(1)}s">${make(r, i)}</g>`; }).join(''); };
const DECO = {
  spring: () => `<g class="tree" transform="translate(40 150)"><path d="M-2 0 L-1 -26 L1.500 -26 L2 0Z M0 -22 L-9 -34 M0 -24 L9 -36" stroke="#2a1f55" stroke-width="2.600" fill="#2a1f55" stroke-linecap="round"/><g fill="#f5a6c8" opacity=".9"><circle cx="-10" cy="-38" r="9"/><circle cx="0" cy="-45" r="11"/><circle cx="11" cy="-39" r="9"/><circle cx="-2" cy="-34" r="8"/></g></g>
    <g class="tree" transform="translate(262 148)"><path d="M-2 0 L-1 -22 L1.500 -22 L2 0Z M0 -18 L-8 -29 M0 -20 L8 -31" stroke="#2a1f55" stroke-width="2.400" fill="#2a1f55" stroke-linecap="round"/><g fill="#f5a6c8" opacity=".9"><circle cx="-9" cy="-33" r="8"/><circle cx="0" cy="-39" r="10"/><circle cx="10" cy="-34" r="8"/></g></g>`,
  summer: () => '',
  autumn: () => [[18, 7], [46, 5], [262, 6], [284, 6]].map(([x, n]) => Array.from({ length: n }, (_, i) => { const dx = (i - n / 2) * 4; return `<g class="susuki" style="transform-origin:${x + dx}px 152px;animation-delay:-${(i * 0.4).toFixed(1)}s"><path d="M${x + dx} 152 Q${x + dx * 1.4} ${134 - (i % 3) * 4} ${x + dx * 1.9} ${120 - (i % 3) * 5}" stroke="#a98757" stroke-width="1.100" fill="none" opacity=".9"/><ellipse cx="${x + dx * 1.9}" cy="${118 - (i % 3) * 5}" rx="1.800" ry="6" fill="#d9bd8a" opacity=".9" transform="rotate(${(dx * 2).toFixed(0)} ${x + dx * 1.9} ${118 - (i % 3) * 5})"/></g>`; }).join('')).join(''),
  winter: () => '',
};
const PART = {
  spring: () => fall(10, 11, () => '<ellipse rx="2.400" ry="1.300" fill="#ffc2d9" opacity=".9"/>'),
  summer: () => {
    const r = RNG(5);
    const flies = Array.from({ length: 6 }, () => { const fx = (20 + r() * 260).toFixed(0), fy = (110 + r() * 55).toFixed(0); return `<g class="firefly" style="animation-delay:-${(r() * 6).toFixed(1)}s;animation-duration:${(5 + r() * 4).toFixed(1)}s"><circle cx="${fx}" cy="${fy}" r="4" opacity=".22"/><circle cx="${fx}" cy="${fy}" r="1.700"/></g>`; }).join('');
    const rays = Array.from({ length: 12 }, (_, i) => { const a = i * 30 * Math.PI / 180; return `<line x1="${(Math.cos(a) * 4).toFixed(1)}" y1="${(Math.sin(a) * 4).toFixed(1)}" x2="${(Math.cos(a) * 17).toFixed(1)}" y2="${(Math.sin(a) * 17).toFixed(1)}"/>`; }).join('');
    return `${flies}<g class="fw" style="translate:236px 40px">${rays}</g><g class="fw b" style="translate:58px 52px">${rays}</g>`;
  },
  autumn: () => fall(7, 23, (r, i) => `<path d="M0 -4 Q3 -1 0 4 Q-3 -1 0 -4Z" fill="${['#ff9d4d', '#e8604a', '#f2c14e'][i % 3]}" opacity=".95"/>`),
  winter: () => fall(18, 31, (r) => `<circle r="${(0.8 + r() * 1.2).toFixed(1)}" fill="#fff" opacity=".9"/>`),
};
const skyMarkup = () => {
  const key = skyKey(), k = skyNow();
  const stars = `<g style="opacity:${rainy() ? 0.3 : 1}">${STARS.map(([x, y, r, d], i) => `<circle class="${i < 16 ? 'sky-star' : 'sky-dot'}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" style="animation-delay:-${d.toFixed(2)}s"/>`).join('')}
  ${[[40, 30], [262, 24], [30, 100], [272, 90], [236, 52]].map(([x, y], i) => `<path class="sky-star" style="animation-delay:-${i * 0.7}s" transform="translate(${x} ${y})" d="M0 -5 L1.200 -1.200 L5 0 L1.200 1.200 L0 5 L-1.200 1.200 L-5 0 L-1.200 -1.200Z"/>`).join('')}</g>`;
  const tent = (x, y, h) => `<path d="M${x - 10} ${y} L${x} ${y - h} L${x + 10} ${y}Z M${x} ${y - h} L${x} ${y - h - 7}" fill="${k.tent}" stroke="${k.tent}" stroke-width="1"/>${k.snow ? `<path d="M${x - 3.6} ${y - h + 5} L${x} ${y - h} L${x + 3.6} ${y - h + 5} Q${x} ${y - h + 7} ${x - 3.6} ${y - h + 5}Z" fill="#fff"/>` : ''}`;
  return `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${k.stops[0]}"/><stop offset=".7" stop-color="${k.stops[1]}"/><stop offset="1" stop-color="${k.stops[2]}"/></linearGradient>
  <clipPath id="skyclip"><rect width="300" height="184" rx="22"/></clipPath><linearGradient id="streak" gradientUnits="userSpaceOnUse" x1="-26" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient><radialGradient id="halo2"><stop offset="0" stop-color="#ffe9a0" stop-opacity=".35"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/></radialGradient><radialGradient id="halo"><stop offset="0" stop-color="#ffd966" stop-opacity="${k.halo}"/><stop offset="1" stop-color="#ffd966" stop-opacity="0"/></radialGradient></defs>
  <g clip-path="url(#skyclip)"><rect width="300" height="184" fill="url(#sky)"/>
  <ellipse cx="150" cy="80" rx="190" ry="20" transform="rotate(-18 150 80)" fill="#fff" opacity="${k.milky || 0.04}"/>${stars}
  <circle cx="150" cy="88" r="78" fill="url(#halo)"/><line class="shoot s1" x1="-26" y1="0" x2="0" y2="0"/><line class="shoot s2" x1="-26" y1="0" x2="0" y2="0"/><line class="shoot s3" x1="-26" y1="0" x2="0" y2="0"/>
  <path d="M0 184 L0 150 Q38 138 80 149 T158 147 T236 150 T300 142 L300 184Z" fill="${k.hill1}"/>
  <path d="M0 184 L0 158 Q50 150 100 158 T200 157 T300 154 L300 184Z" fill="${k.hill2}"/>
  ${k.noTent ? '' : tent(40, 150, 16) + tent(263, 148, 18)}${DECO[key]()}${st.special === 'bday' ? bdayBack() : st.special === 'milestone' ? milestoneBack() : st.special === 'date' ? dateBack() : ''}${rainy() ? rainClouds() : ''}</g>`;
};
const skyParticles = () => `<g clip-path="url(#skyclip)" style="pointer-events:none">${rainy() && skyKey() !== 'winter' ? rainDrops() : PART[skyKey()]()}${st.special === 'bday' ? bdayFront() : st.special === 'milestone' ? milestoneFront() : st.special === 'date' ? dateFront() : ''}</g>`;

function moonMarkup(f) {
  const [cx, cy] = MOON;
  let lit = '';
  if (f >= 0.999) lit = `<circle cx="${cx}" cy="${cy}" r="${MR}" fill="#ffd966"/>`;
  else if (f > 0.001) {
    const rx = MR * Math.abs(1 - 2 * f);
    lit = `<path d="M${cx} ${cy - MR} A${MR} ${MR} 0 0 1 ${cx} ${cy + MR} A${rx.toFixed(2)} ${MR} 0 0 ${f >= 0.5 ? 1 : 0} ${cx} ${cy - MR}Z" fill="#ffd966"/>`;
  }
  const crater = [[-15, -12, 7], [11, 13, 5], [-8, 20, 3.500], [20, -15, 4], [-26, 6, 3]].map(([dx, dy, r]) => `<circle cx="${cx + dx}" cy="${cy + dy}" r="${r}" fill="#000" opacity=".13"/>`).join('');
  return `<circle cx="${cx}" cy="${cy}" r="${MR}" fill="${skyNow().moon}" stroke="${skyNow().moonLine}" stroke-width="2"/>${lit}${crater}`;
}

// 人型(ピクトグラム風)。原点は「手がバーをにぎるところ」。太い棒の手足、重なるところは縁取り。
const hand = () => '';
const limb = (x1, y1, x2, y2, w) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--s-out)" stroke-width="${w + 2.200}" stroke-linecap="round"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"/>`;
const headOf = (w) => (w === 'h'
  ? '<circle cx="0" cy="7.500" r="5.300"/><path d="M-5.500 8.600 A5.500 5.500 0 0 1 5.500 8.600 L5.500 9.800 Q0 6.300 -5.500 9.800Z"/><g transform="scale(-1 1)"><path class="hair" style="transform-origin:4.400px 11px" d="M4.400 10.500 C9.800 11 11.200 16 10.200 21 C9 17.500 7.400 15 4.400 13.900Z"/><circle cx="5.400" cy="11.200" r="1.500" fill="#dfe3ea"/></g>'
  : '<circle cx="0" cy="7.500" r="5.700"/>');
const torso = (w) => (w === 'h' ? '<path d="M-5.200 13.200 Q0 11.600 5.200 13.200 L9.400 32.500 Q0 34.500 -9.400 32.500Z"/>' : '<rect x="-6.800" y="12.500" width="13.600" height="21.500" rx="4.800"/>');
const legs = (y0 = 31) => ['l', 'r'].map((k) => { const x = k === 'l' ? -2.500 : 2.500; return `<g class="leg ${k}" style="transform-origin:${x}px ${y0}px"><line x1="${x}" y1="${y0}" x2="${x}" y2="${y0 + 13.500}" stroke="currentColor" stroke-width="4.200" stroke-linecap="round"/></g>`; }).join('');
const armW = (w) => (w === 'h' ? 3.600 : 4.200);
function hangBody(w, cls = '') {
  return `<g class="perf ${w} ${cls}"${w === 'y' ? ' transform="scale(1.03 1.12)"' : ''}><g class="arm l">${limb(-7.400, 0.500, -7.200, 13.500, armW(w))}</g><g class="arm r">${limb(7.400, 0.500, 7.200, 13.500, armW(w))}</g>${legs()}${torso(w)}${headOf(w)}</g>`;
}
function airBody(w, tired = false) {
  return `<g class="perf ${w} air${tired ? ' tired' : ''}"><g class="bob"><g class="arm up l" style="transform-origin:-5px 13.5px">${limb(-5, 13.500, -7.500, 0.500, armW(w))}</g><g class="arm up r" style="transform-origin:5px 13.5px">${limb(5, 13.500, 7.500, 0.500, armW(w))}</g>${legs()}${torso(w)}${headOf(w)}
    <text class="bang" x="11" y="4">${tired ? '…' : '!'}</text></g></g>`;
}
// 受け止める人。ひざでバーにぶら下がり、腕を中央へ伸ばす。
function catcherBody(mode) {
  const arms = mode === 'none' ? '' : mode === 'down'
    ? `<g class="arm">${limb(-3.400, 26, -2.800, 38, 4.200)}</g><g class="arm">${limb(3.400, 26, 2.800, 38, 4.200)}</g>`
    : `<g class="reach" style="transform-origin:0px 27px">${limb(-2.500, 26, -21, 36, 4.200)}${limb(0, 28.500, -19, 42, 4.200)}</g>`;
  const shin = (x) => `<g class="shin"><line x1="${x}" y1="-5" x2="${x}" y2="10" stroke="currentColor" stroke-width="4.600" stroke-linecap="round"/></g>`;
  return `<g class="perf y" transform="scale(1.03 1.12)">${shin(-2.600)}${shin(2.600)}<rect x="-6.800" y="8.500" width="13.600" height="18" rx="4.800"/><circle cx="0" cy="32.500" r="5.700"/>${arms}</g>`;
}
function pairBody(mode) {
  return `${catcherBody('down')}<g transform="translate(0 43)"><g class="pairh">${hangBody('h', mode === 'cheer' ? 'rest happy' : 'rest')}</g></g>`;
}
const orbit = () => [[16, 18], [-18, 40], [15, 62], [-14, 78]].map(([x, y], i) => `<path class="spark" style="animation-delay:${1.0 + i * 0.12}s;animation-iteration-count:1" transform="translate(${x} ${y})" d="M0 -5 L1.300 -1.300 L5 0 L1.300 1.300 L0 5 L-1.300 1.300 L-5 0 L-1.300 -1.300Z"/>`).join('');

function pend(w, cls, inner, style = '', wide = false) {
  const [px, py] = PIV[w];
  const rx = wide ? 18 : 8, bx = wide ? 21 : 11;
  return `<g transform="translate(${px} ${py})"><g class="pend ${w} ${cls}" style="${style}">
    <line class="rope" x1="-3" y1="1" x2="${-rx}" y2="${ROPE}"/><line class="rope" x1="3" y1="1" x2="${rx}" y2="${ROPE}"/><circle class="rigmetal" r="3.400"/>
    <g class="hangers"><rect class="bar-l" x="${-bx}" y="${ROPE - 1.8}" width="${bx * 2}" height="3.600" rx="1.800"/><circle class="rigmetal" cx="${-bx}" cy="${ROPE}" r="2.400"/><circle class="rigmetal" cx="${bx}" cy="${ROPE}" r="2.400"/>
    <g transform="translate(0 ${ROPE})">${inner}</g></g></g></g>`;
}

// ---- 次の日になる前に開き直したときの、くっついた姿(ピクトグラム風) ----
const tube = (d, w) => `<path d="${d}" fill="none" stroke="var(--s-out)" stroke-width="${w + 2.2}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const armsOf = (who, ...ds) => `<g class="pic ${who}">${ds.map((d) => tube(d, who === 'h' ? 3.6 : 4.2)).join('')}</g>`;
function man(x, o = {}) {
  return `<g class="pic y ${o.cls || ''}" transform="translate(${x} 0) rotate(${o.tilt || 0})">
    ${o.legs || '<path d="M-3.200 -20 V-1.500 M3.200 -20 V-1.500" fill="none" stroke="currentColor" stroke-width="4.600" stroke-linecap="round"/>'}
    <rect x="-6.800" y="-40.500" width="13.600" height="21.500" rx="4.800"/>
    <g class="${o.hc || ''}" transform="rotate(${o.head || 0} 0 -39)"><circle cx="0" cy="-45.800" r="5.700"/></g>${o.arms || ''}</g>`;
}
const hairQ = []; // ふたりの腕より手前に、髪を描くための順番待ち
function woman(x, o = {}) {
  if (!o.old) hairQ.push(`<g class="pic h" transform="translate(${x} 0) rotate(${o.tilt || 0})"><g transform="rotate(${o.head || 0} 0 -35)"><g transform="scale(-1 1)"><path class="hair" style="transform-origin:4.200px -38.500px" d="M4.200 -39.500 C9.600 -39 11 -34.500 10 -29.500 C8.800 -33 7.200 -35.500 4.200 -36.500Z"/><circle cx="5.400" cy="-38.200" r="1.500" fill="#dfe3ea"/></g></g></g>`);
  const legs = o.legs || '<path d="M-2.500 -17 V-1.500 M2.500 -17 V-1.500" fill="none" stroke="currentColor" stroke-width="3.800" stroke-linecap="round"/>';
  return `<g class="pic h ${o.cls || ''}" transform="translate(${x} 0) rotate(${o.tilt || 0})">${legs}
    <path d="M-5.200 -35.500 Q0 -37 5.200 -35.500 L9.400 -16.500 Q0 -14.500 -9.400 -16.500Z"/>
    <g class="${o.hc || ''}" transform="rotate(${o.head || 0} 0 -35)"><circle cx="0" cy="-41.200" r="5.300"/><path d="M-5.500 -40.200 A5.500 5.500 0 0 1 5.500 -40.200 L5.500 -39 Q0 -42.500 -5.500 -39Z"/>
      ${o.old ? '<g transform="scale(-1 1)"><path class="hair" style="transform-origin:3px -37px" d="M3 -37.500 C8.500 -37 10.500 -31.500 9.500 -23 C8 -28.500 6.500 -32.500 2.500 -34.500Z"/><circle cx="3.800" cy="-37" r="1.300" fill="#fff" opacity=".9"/></g>' : ''}</g>${o.arms || ''}</g>`;
}
const Tg = (inner, cls = '') => `<g class="together ${cls}" transform="translate(150 154) scale(1.45)">${inner}${hairQ.splice(0).join('')}</g>`;
const bigHeart = (x, y, sc = 1) => `<path class="fheart" d="M0 5.500 C-7 0 -8 -6 -4 -7 C-2 -7.500 0 -5.500 0 -4.500 C0 -5.500 2 -7.500 4 -7 C8 -6 7 0 0 5.500Z" transform="translate(${x} ${y}) scale(${sc})"/>`;
const floatHeart = () => bigHeart(0, -66);

// ハグ(参考: 腕がX字に交差)
function hugScene() {
  // 向かい合って、ぎゅっ。からだは並べて、頭はよせ合う。おたがいの腕が、相手の背中にまわる(それぞれ1本ずつ見える)
  return Tg(woman(-8, { tilt: 4, head: 11 }) + man(8, { tilt: -4, head: -11 }) + armsOf('h', 'M-4 -33 Q5 -29 14.500 -31.500') + armsOf('y', 'M4 -37 Q-4 -33 -14 -28') + floatHeart());
}
// キス: 近づいて、ちゅっ。しばらくして離れ、またくり返す
function kissScene() {
  const W = woman(-6.500, { head: 0, hc: 'hd kw', old: true }), M = man(6.500, { head: 0, hc: 'hd km' });
  const arms = armsOf('h', 'M-2.500 -33.500 Q3 -32 9.500 -26.500') + armsOf('y', 'M2.500 -38 Q-3 -34 -9 -27.500');
  const pop = '<g class="kisspop" transform="translate(0 -62)"><path d="M0 5.500 C-7 0 -8 -6 -4 -7 C-2 -7.500 0 -5.500 0 -4.500 C0 -5.500 2 -7.500 4 -7 C8 -6 7 0 0 5.500Z" fill="#ff7fb0" transform="scale(1.300)"/><text x="0" y="-12" text-anchor="middle" font-size="7.500" font-weight="800" fill="#ffe3ee" font-family="var(--font)">ちゅっ</text></g>';
  return Tg(`<g class="kissW" style="--dx:-9px">${W}</g><g class="kissM" style="--dx:9px">${M}</g><g class="kissarms">${arms}</g>${pop}`);
}
// 手をつないで、ハート
function handsScene() {
  return Tg(woman(-14, { head: 6 }) + man(14, { head: -6 }) + armsOf('h', 'M-19.500 -33 Q-24 -28 -27 -22', 'M-9.500 -33.500 Q-5 -30 0 -27') + armsOf('y', 'M21 -37.500 Q25.500 -31 27.500 -24', 'M8 -38 Q4.500 -32 0.500 -27.500') + bigHeart(0, -62, 2.2));
}
// ほっぺにちゅ(かずゆきが、照れるひとみのほっぺに)
function cheekScene() {
  const legs = '<path d="M-2.500 -17 V-1.500" fill="none" stroke="currentColor" stroke-width="3.800" stroke-linecap="round"/><g class="kickback" style="transform-origin:2.500px -17px"><path d="M2.500 -17 L3 -9.500 L9.500 -4.500" fill="none" stroke="currentColor" stroke-width="3.800" stroke-linecap="round" stroke-linejoin="round"/></g>';
  return Tg(woman(-6, { head: 5, legs }) + man(7, { tilt: -7, head: -12 }) + armsOf('h', 'M-11 -33.500 Q-18 -38 -10 -44', 'M-1 -33.500 Q4 -30.500 7.500 -23.500') + armsOf('y', 'M2.500 -38.500 Q-4 -35 -10.500 -31.500') + bigHeart(-1, -58, 1.100));
}
// 相合傘(その場でゆっくり足踏み。雨の日)
function umbrellaScene() {
  const canopy = '<g class="umb"><path d="M-30 -64 Q-25 -86 0 -88 Q25 -86 30 -64 Q22.500 -69.500 15 -64 Q7.500 -69.500 0 -64 Q-7.500 -69.500 -15 -64 Q-22.500 -69.500 -30 -64Z" fill="#b9a4ff" stroke="var(--s-out)" stroke-width="1.600" stroke-linejoin="round"/><path d="M0 -88 L-15 -64 M0 -88 L15 -64 M0 -88 L-30 -64 M0 -88 L30 -64" stroke="#8d78d6" stroke-width="1" fill="none"/><path d="M0 -88 V-92" stroke="#8d78d6" stroke-width="1.600" stroke-linecap="round"/><path d="M0 -64 V-47" stroke="var(--s-out)" stroke-width="2.600" stroke-linecap="round"/><path d="M0 -64 V-47" stroke="#e8dcff" stroke-width="1.200" stroke-linecap="round"/></g>';
  const step = (x, w) => `<g class="step ${w}"><path d="M${x} ${w === 'h' ? -17 : -20} V-1.500" fill="none" stroke="currentColor" stroke-width="${w === 'h' ? 3.800 : 4.600}" stroke-linecap="round"/></g>`;
  const wl = step(-2.500, 'h') + '<g class="step r2">' + step(2.500, 'h').replace('<g class="step h">', '') ;
  const legsW = `<g class="stp a" style="transform-origin:-2.500px -17px"><path d="M-2.500 -17 V-1.500" fill="none" stroke="currentColor" stroke-width="3.800" stroke-linecap="round"/></g><g class="stp b" style="transform-origin:2.500px -17px"><path d="M2.500 -17 V-1.500" fill="none" stroke="currentColor" stroke-width="3.800" stroke-linecap="round"/></g>`;
  const legsM = `<g class="stp b" style="transform-origin:-3.200px -20px"><path d="M-3.200 -20 V-1.500" fill="none" stroke="currentColor" stroke-width="4.600" stroke-linecap="round"/></g><g class="stp a" style="transform-origin:3.200px -20px"><path d="M3.200 -20 V-1.500" fill="none" stroke="currentColor" stroke-width="4.600" stroke-linecap="round"/></g>`;
  const arms = armsOf('h', 'M-3.500 -33.500 Q1 -31.500 5 -28') + armsOf('y', 'M1.500 -38.500 Q-1.500 -43 0 -47.500');
  return `<g class="together rainwalk" transform="translate(150 154) scale(1.45)"><g class="rbob">${woman(-8, { head: 4, legs: legsW })}${man(8, { head: -3, legs: legsM })}${arms}${hairQ.splice(0).join('')}${canopy}</g></g>`;
}
// 丘に並んで座って、月を見る(うしろ姿。ひとみはかずゆきの肩にもたれる)
function hillScene() {
  const her = `<g class="pic h" transform="translate(-8.500 -1) rotate(9)"><path d="M-4.600 -24.500 Q0 -26 4.600 -24.500 L7.800 -2 L-7.800 -2Z"/><circle cx="0" cy="-32" r="5.300"/><path d="M-5.500 -31 A5.500 5.500 0 0 1 5.500 -31 L5.500 -29.800 Q0 -33.300 -5.500 -29.800Z"/><g transform="scale(-1 1)"><path class="hair" style="transform-origin:3px -28px" d="M3 -28.500 C8.500 -28 10.500 -22.500 9.500 -13.500 C8 -19.500 6.500 -23.500 2.500 -25.500Z"/></g></g>`;
  const him = `<g class="pic y" transform="translate(8.500 -1) rotate(-3)"><rect x="-6.800" y="-31" width="13.600" height="29" rx="4.800"/><circle cx="0" cy="-36.500" r="5.700"/></g>`;
  return Tg(her + him + `<g class="patback">${armsOf('y', 'M-3 -28.500 Q-9 -27 -15.500 -25')}</g>`);
}

// ---- ふえた場面 ----
// 後ろからぎゅっ(かずゆきがうしろから、ひとみのおなかに腕をまわす)
function backhugScene() {
  const him = man(3.500, { head: -8 });
  const her = woman(-3.500, { head: 8 });
  const arms = armsOf('y', 'M-5.500 -37 Q-11 -28 -0.500 -25', 'M11.500 -37 Q15 -27 1.500 -25.500');
  return Tg(him + her + arms + floatHeart());
}
// 肩を組んで、ゆらゆら(ふたりで同じほうにゆれる)
function shoulderScene() {
  const arms = armsOf('y', 'M1 -38.500 Q-6 -38.500 -12 -33.500') + armsOf('h', 'M-2 -33 Q5 -28.500 13.500 -27.500');
  return Tg(`<g class="swaypair">${woman(-8, { head: 7 })}${man(8, { head: -6 })}${arms}</g>`);
}
// 手をつないで、くるくる(ひとみがくるっと回る)
function danceScene() {
  const arms = armsOf('y', 'M8 -38 Q4.500 -32 0.500 -27.500') + armsOf('h', 'M-9.500 -33.500 Q-5 -30 0 -27');
  return Tg(`<g class="bobpair"><g class="spinw">${woman(-14, { head: 0 })}</g>${man(14, { head: -6 })}${arms}</g>`);
}
// 頭ぽんぽん(かずゆきが、ひとみの頭をぽんぽん)
function headpatScene() {
  const arm = `<g class="hpat">${armsOf('y', 'M2 -38.500 Q-5 -42 -8 -47.500')}</g>`;
  return Tg(woman(-9, { head: 6 }) + man(8, { head: -6 }) + arm + floatHeart());
}
// おんぶ(ひとみがかずゆきの背中に乗る)
function piggyScene() {
  const her = `<g transform="translate(0 -13)">${woman(0, { head: 0, legs: '' })}</g>`;
  const knees = armsOf('h', 'M-6.500 -26 L-11.500 -19', 'M6.500 -26 L11.500 -19');
  const around = armsOf('h', 'M-5 -43.500 Q0 -39 5 -43.500');
  return `<g class="together" transform="translate(150 154) scale(1.45)"><g class="rbob">${her}${man(0, { head: 0 })}${knees}${around}${hairQ.splice(0).join('')}${bigHeart(15, -60, 0.9)}</g></g>`;
}
// お姫さま抱っこ(ひとみが、かずゆきの腕の中で横になる)
function cradleScene() {
  const her = `<g transform="translate(24 -33) rotate(-90)">${woman(0, { head: -10 })}</g>`;
  const arms = armsOf('y', 'M-5 -38 Q-10 -31 -3 -27.500', 'M6 -38 Q13 -30 7 -25.500');
  return Tg(`<g class="swaypair">${man(0, { head: 0 })}${her}${arms}${hairQ.splice(0).join('')}</g>${bigHeart(2, -64, 1)}`);
}
const VARIANT_LABEL = { cheek: 'ほっぺにちゅ', hill: '丘に座って月を見る', umbrella: '相合傘', kiss: 'キス', hug: 'ハグ', hands: '手をつないでハート', backhug: '後ろからぎゅっ', shoulder: '肩を組んでゆらゆら', dance: '手をつないでくるくる', headpat: '頭ぽんぽん', piggy: 'おんぶ', cradle: 'お姫さま抱っこ' };
const VARIANT_FN = { cheek: cheekScene, hill: hillScene, umbrella: umbrellaScene, kiss: kissScene, hug: hugScene, hands: handsScene, backhug: backhugScene, shoulder: shoulderScene, dance: danceScene, headpat: headpatScene, piggy: piggyScene, cradle: cradleScene };

// 場面の中で、ときどき出る、ランダムなしぐさ(app.js が時間をおいて、ひとつ選んで付ける)。キスは自分の動きがあるので、しぐさは付けない
const GESTURES = ['hopW', 'hopM', 'hopB', 'nudge', 'heart'];
export const gesturesFor = (variant) => (variant === 'kiss' ? [] : variant === 'umbrella' ? ['heart'] : GESTURES);
// しぐさのハート(ふだんは見えない)
const gestureHearts = () => '<g class="gx">' + [[-16, 108, 0], [14, 100, 0.25], [0, 92, 0.5]].map(([x, y, d]) => `<path class="gh" style="animation-delay:${d}s" d="M0 5.500 C-7 0 -8 -6 -4 -7 C-2 -7.500 0 -5.500 0 -4.500 C0 -5.500 2 -7.500 4 -7 C8 -6 7 0 0 5.500Z" transform="translate(${150 + x} ${y})"/>`).join('') + '</g>';
const VARIANTS = Object.keys(VARIANT_FN);

// ---- 誕生日の豪華な飾り / ポイントに応じた華やかさ ----
const BDAY_COLORS = ['#ff9cc4', '#62e6c0', '#ffd966', '#b9a4ff', '#7fe0ff'];
function burst(cx, cy, r, color, delay, dur) {
  const rays = Array.from({ length: 16 }, (_, i) => { const a = i * 22.5 * Math.PI / 180; return `<line x1="${(Math.cos(a) * r * 0.35).toFixed(1)}" y1="${(Math.sin(a) * r * 0.35).toFixed(1)}" x2="${(Math.cos(a) * r).toFixed(1)}" y2="${(Math.sin(a) * r).toFixed(1)}"/><circle cx="${(Math.cos(a) * r * 1.08).toFixed(1)}" cy="${(Math.sin(a) * r * 1.08).toFixed(1)}" r="1.200" fill="${color}" stroke="none"/>`; }).join('');
  return `<g class="bfw" style="translate:${cx}px ${cy}px;stroke:${color};animation-delay:-${delay}s;animation-duration:${dur}s">${rays}</g>`;
}
function bdayBack() {
  const flags = Array.from({ length: 11 }, (_, i) => { const t = (i + 0.5) / 11, x = 14 + t * 272, y = 18 + Math.sin(t * Math.PI) * 18; return `<path d="M${(x - 6).toFixed(1)} ${(y - 1).toFixed(1)} L${(x + 6).toFixed(1)} ${(y - 1).toFixed(1)} L${x.toFixed(1)} ${(y + 12).toFixed(1)}Z" fill="${BDAY_COLORS[i % 5]}" opacity=".95"/>`; }).join('');
  const cake = `<g transform="translate(236 152)"><ellipse cx="0" cy="1" rx="26" ry="3.500" fill="#000" opacity=".25"/><rect x="-18" y="-12" width="36" height="12" rx="3" fill="#ffe3ee"/><path d="M-18 -9 q4.500 5 9 0 q4.500 5 9 0 q4.500 5 9 0 q4.500 5 9 0" fill="none" stroke="#ff9cc4" stroke-width="2"/><rect x="-13" y="-22" width="26" height="10" rx="3" fill="#fff3d9"/><path d="M-13 -19 q3.200 4 6.500 0 q3.200 4 6.500 0 q3.200 4 6.500 0 q3.200 4 6.500 0" fill="none" stroke="#ffb3d1" stroke-width="1.800"/><rect x="-8" y="-30" width="16" height="8" rx="2.500" fill="#ffe3ee"/>
    ${[-4.500, 0, 4.500].map((x, i) => `<rect x="${x - 0.8}" y="-37" width="1.600" height="7" fill="#7fe0ff"/><ellipse class="flame" cx="${x}" cy="-39.500" rx="1.600" ry="2.800" fill="#ffd966" style="transform-origin:${x}px -36.700px;animation-delay:-${i * 0.3}s"/>`).join('')}<circle cx="-10" cy="-14" r="1.700" fill="#ff5f8f"/><circle cx="2" cy="-15" r="1.700" fill="#ff5f8f"/><circle cx="12" cy="-14" r="1.700" fill="#ff5f8f"/></g>`;
  const gifts = `<g transform="translate(58 152)"><rect x="-12" y="-14" width="24" height="14" rx="2" fill="#b9a4ff"/><rect x="-2" y="-14" width="4" height="14" fill="#ffd966"/><rect x="-12" y="-9" width="24" height="3.500" fill="#ffd966"/><path d="M0 -14 q-9 -9 -4 -10 q4 0 4 10 q0 -10 4 -10 q5 1 -4 10Z" fill="#ffd966"/></g><g transform="translate(78 152)"><rect x="-8" y="-9" width="16" height="9" rx="1.500" fill="#7fe0ff"/><rect x="-1.500" y="-9" width="3" height="9" fill="#ff9cc4"/></g>`;
  return `${burst(70, 56, 24, '#ffd966', 0, 7)}${burst(232, 50, 28, '#ff9cc4', 2.500, 8)}${burst(150, 24, 20, '#7fe0ff', 5, 9)}${burst(40, 104, 16, '#b9a4ff', 1.500, 6.500)}${burst(264, 104, 16, '#62e6c0', 4, 7.500)}<path d="M8 17 Q150 56 292 17" fill="none" stroke="#e8dcff" stroke-width="1.200" opacity=".8"/>${flags}${gifts}${cake}`;
}
const bdayFront = () => fall(28, 41, (r, i) => `<rect x="-2" y="-1" width="4" height="2.200" rx=".6" fill="${BDAY_COLORS[i % 5]}"/>`)
  + [[34, 15, '#ff9cc4'], [270, 18, '#62e6c0'], [92, 21, '#ffd966'], [208, 16, '#b9a4ff'], [150, 20, '#7fe0ff']].map(([x, d, col], i) => `<g class="rise" style="--bx:${x}px;--d:${d}s;animation-delay:-${i * 3.200}s"><ellipse rx="6" ry="7.500" fill="${col}" opacity=".95"/><path d="M0 7.500 Q-2 14 1 20" stroke="#e8dcff" stroke-width=".8" fill="none"/></g>`).join('');
const partyHat = () => '<g transform="translate(166 47) rotate(24)"><path d="M0 0 L-10 -26 L10 -26Z" fill="#ff9cc4" stroke="var(--s-out)" stroke-width="1.200" stroke-linejoin="round"/><path d="M-4 -12 L4 -12 M-7 -19 L7 -19" stroke="#fff" stroke-width="1.600" stroke-linecap="round"/><circle cy="-28" r="4" fill="#ffd966"/></g>';
// ポイントが増えるほど、月のまわりが華やかに
function aura(pts) {
  if (pts < 8) return '';
  const n = Math.min(14, Math.floor(pts / 7));
  let out = `<circle cx="150" cy="88" r="${(56 + pts * 0.22).toFixed(0)}" fill="url(#halo2)" opacity="${(Math.min(1, pts / 70)).toFixed(2)}"/>`;
  for (let i = 0; i < n; i++) { const a = i * 137.5 * Math.PI / 180, rr = 58 + (i % 3) * 7; out += `<path class="aura-spark" style="animation-delay:-${(i * 0.43).toFixed(2)}s" transform="translate(${(150 + Math.cos(a) * rr).toFixed(1)} ${(88 + Math.sin(a) * rr * 0.92).toFixed(1)}) scale(${(0.6 + (i % 3) * 0.25).toFixed(2)})" d="M0 -6 L1.600 -1.600 L6 0 L1.600 1.600 L0 6 L-1.600 1.600 L-6 0 L-1.600 -1.600Z"/>`; }
  if (pts >= 50) out += '<circle class="aura-ring" cx="150" cy="88" r="58" fill="none" stroke="#ffd966" stroke-width="1.200" stroke-dasharray="1.500 5" opacity=".6"/>';
  if (pts >= 80) out += `<g class="aura-orbit">${Array.from({ length: 12 }, (_, i) => { const a = i * 30 * Math.PI / 180; return `<circle cx="${(150 + Math.cos(a) * 68).toFixed(1)}" cy="${(88 + Math.sin(a) * 68).toFixed(1)}" r="${i % 2 ? 1.100 : 1.800}" fill="#fff6c8"/>`; }).join('')}</g>`;
  return out;
}


// ---- デートの日: 観覧車と気球、ふたりの間をハートが行き来する ----
function dateBack() {
  const gond = Array.from({ length: 10 }, (_, i) => { const a = i * 36 * Math.PI / 180; return `<circle cx="${(Math.cos(a) * 26).toFixed(1)}" cy="${(Math.sin(a) * 26).toFixed(1)}" r="3" fill="${BDAY_COLORS[i % 5]}" opacity=".95"/>`; }).join('');
  const spokes = Array.from({ length: 10 }, (_, i) => { const a = i * 36 * Math.PI / 180; return `<line x1="0" y1="0" x2="${(Math.cos(a) * 26).toFixed(1)}" y2="${(Math.sin(a) * 26).toFixed(1)}"/>`; }).join('');
  const bulbs = Array.from({ length: 12 }, (_, i) => { const a = i * 30 * Math.PI / 180; return `<circle class="bulb" cx="${(Math.cos(a) * 26).toFixed(1)}" cy="${(Math.sin(a) * 26).toFixed(1)}" r="1.100" style="animation-delay:-${(i * 0.15).toFixed(2)}s"/>`; }).join('');
  return `<g transform="translate(244 118)"><path d="M0 0 L-16 36 M0 0 L16 36" stroke="#3a3c78" stroke-width="2" fill="none"/><g class="wheel"><circle r="26" fill="none" stroke="#6a6cb0" stroke-width="1.600"/><g stroke="#6a6cb0" stroke-width="1">${spokes}</g>${gond}</g>${bulbs}</g>
    <g class="dballoon" style="--bx:34px"><ellipse rx="7" ry="8.500" fill="#ff9cc4"/><path d="M-3 8 L-2 13 L2 13 L3 8Z" fill="#b9a4ff"/><path d="M-2 13 h4 v3 h-4Z" fill="#ffd966"/></g>`;
}
const dateFront = () => Array.from({ length: 6 }, (_, i) => `<path class="dheart" style="--x:${(112 + (i % 3) * 38).toFixed(0)}px;animation-delay:-${(i * 1.1).toFixed(1)}s" d="M0 5.500 C-7 0 -8 -6 -4 -7 C-2 -7.500 0 -5.500 0 -4.500 C0 -5.500 2 -7.500 4 -7 C8 -6 7 0 0 5.500Z" transform="scale(${(0.7 + (i % 3) * 0.2).toFixed(2)})"/>`).join('');

// ---- 記念日(キリ番): ハートづくしの豪華な飾り ----
const HEART = 'M0 5.500 C-7 0 -8 -6 -4 -7 C-2 -7.500 0 -5.500 0 -4.500 C0 -5.500 2 -7.500 4 -7 C8 -6 7 0 0 5.500Z';
function heartBurst(cx, cy, r, color, delay, dur) {
  const hs = Array.from({ length: 10 }, (_, i) => { const a = i * 36 * Math.PI / 180; return `<path d="${HEART}" fill="${color}" stroke="none" transform="translate(${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}) scale(.55)"/>`; }).join('');
  return `<g class="bfw hb" style="translate:${cx}px ${cy}px;animation-delay:-${delay}s;animation-duration:${dur}s">${hs}</g>`;
}
function milestoneBack() {
  const hearts = Array.from({ length: 11 }, (_, i) => { const t = (i + 0.5) / 11, x = 14 + t * 272, y = 18 + Math.sin(t * Math.PI) * 18; return `<path d="${HEART}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(1.200)" fill="${['#ff9cc4', '#ffd966', '#ff7fb0'][i % 3]}"/>`; }).join('');
  return `${heartBurst(70, 56, 20, '#ff9cc4', 0, 7)}${heartBurst(232, 50, 22, '#ffd966', 2.500, 8)}${heartBurst(150, 24, 16, '#ff7fb0', 5, 9)}<path d="M8 17 Q150 56 292 17" fill="none" stroke="#ffe9a0" stroke-width="1.200" opacity=".85"/>${hearts}`;
}
const milestoneFront = () => fall(20, 53, (r, i) => `<path d="${HEART}" fill="${['#ff9cc4', '#ffd966', '#ff7fb0'][i % 3]}" transform="scale(${(0.5 + (i % 4) * 0.12).toFixed(2)})"/>`);
const crown = () => '<g transform="translate(150 41)"><path d="M-11 0 L-12 -14 L-6 -8 L0 -17 L6 -8 L12 -14 L11 0Z" fill="#ffd966" stroke="var(--s-out)" stroke-width="1.200" stroke-linejoin="round"/><circle cx="0" cy="-17" r="2" fill="#ff7fb0"/><circle cx="-12" cy="-14" r="1.600" fill="#ff7fb0"/><circle cx="12" cy="-14" r="1.600" fill="#ff7fb0"/></g>';

// ---- 相合傘の日は雨(冬は雪のまま) ----
const rainy = () => st.resolved && st.revisit > 0 && st.variant === 'umbrella' && Date.now() >= st.cheerUntil;
const rainClouds = () => '<g class="rclouds"><g fill="#2a2d5e" opacity=".92"><ellipse cx="56" cy="14" rx="46" ry="14"/><ellipse cx="96" cy="8" rx="36" ry="13"/><ellipse cx="150" cy="10" rx="44" ry="13"/><ellipse cx="212" cy="9" rx="40" ry="13"/><ellipse cx="258" cy="15" rx="44" ry="14"/></g><g fill="#3a3e78" opacity=".7"><ellipse cx="30" cy="26" rx="30" ry="9"/><ellipse cx="120" cy="24" rx="34" ry="9"/><ellipse cx="190" cy="24" rx="32" ry="9"/><ellipse cx="270" cy="28" rx="30" ry="9"/></g></g>';
const rainDrops = () => { const r = RNG(77); return Array.from({ length: 38 }, (_, i) => { const x = r() * 320 - 10, d = 0.9 + r() * 0.7; return `<line class="drop2" x1="0" y1="0" x2="-1.800" y2="7" style="--rx:${x.toFixed(0)}px;--rd:${d.toFixed(2)}s;animation-delay:-${(r() * d).toFixed(2)}s"/>`; }).join('') + Array.from({ length: 5 }, (_, i) => `<ellipse class="ripple" cx="${(60 + i * 46)}" cy="${(160 + (i % 2) * 6)}" rx="1" ry=".4" style="animation-delay:-${(i * 0.5).toFixed(1)}s"/>`).join(''); };

const apex = (w) => { const [px, py] = PIV[w]; const a = 35 * Math.PI / 180; return [px + (w === 'h' ? 1 : -1) * ROPE * Math.sin(a), py + ROPE * Math.cos(a)]; };

function effects(kind) {
  let out = '';
  const spark = (x, y, i, n) => `<path class="spark" style="animation-delay:${1.05 + i * 0.18}s;animation-iteration-count:${n}" transform="translate(${x} ${y})" d="M0 -6 L1.600 -1.600 L6 0 L1.600 1.600 L0 6 L-1.600 1.600 L-6 0 L-1.600 -1.600Z"/>`;
  const heart = (hx, d, sc) => `<path class="heart up" style="--hx:${hx}px;animation-delay:${d}s" transform="scale(${sc})" d="M0 5.500 C-7 0 -8 -6 -4 -7 C-2 -7.500 0 -5.500 0 -4.500 C0 -5.500 2 -7.500 4 -7 C8 -6 7 0 0 5.500Z"/>`;
  if (kind === 'sync') {
    // ぴったり: 輪が広がり、星がまたたき、ハートが5つ月にたまる
    out += '<circle class="ring" cx="150" cy="88" r="6"/>';
    [[96, 36], [204, 40], [120, 140], [182, 144], [150, 24], [72, 96], [230, 100], [150, 150]].forEach(([x, y], i) => { out += spark(x, y, i, 3); });
    [60, 105, 150, 195, 240].forEach((x, i) => { out += heart(x, 1 + i * 0.16, 1); });
  } else {
    // 後追い: しずくが月に落ち、ハートが1つ静かにたまる
    out += '<path class="drip" d="M0 -7 C4 -1 5 2 0 5 C-5 2 -4 -1 0 -7Z"/>';
    [[110, 30], [190, 36], [150, 150]].forEach(([x, y], i) => { out += spark(x, y, i, 1); });
    out += heart(150, 1.3, 1);
  }
  return out;
}

function popHtml() {
  if (Date.now() >= st.popUntil || !st.pop) return '';
  const w = st.pop;
  const [px, py] = w === 'h' ? [100, 80] : [200, 80];
  return `<path class="hpop" style="--px:${px}px;--py:${py}px" d="M0 5.500 C-7 0 -8 -6 -4 -7 C-2 -7.500 0 -5.500 0 -4.500 C0 -5.500 2 -7.500 4 -7 C8 -6 7 0 0 5.500Z"/>`;
}


function scene() {
  const hint = st.hint ? '<circle class="hintc" cx="150" cy="88" r="44"/>' : '';
  const cheer = Date.now() < st.cheerUntil;
  const tired = !!(st.sig.h && !st.resolved && st.sig.y == null && st.now - st.sig.h > st.winMs);
  const lateCatch = st.kind === 'late';
  const s = st.sig;
  let h, y, extra = '', glow = '';
  if (cheer) {
    const [ax, ay] = apex('h');
    if (st.first === 'y') h = pend('h', 'out', hangBody('h', 'early'));
    else { h = pend('h', 'empty', ''); extra += `<g style="translate:${ax}px ${ay + (lateCatch ? 14 : 0)}px" class="early">${airBody('h', lateCatch)}</g>`; }
    y = pend('y', 'carry', `<g class="early"><g class="catcher">${catcherBody('reach')}</g></g><g class="late-in"><g class="${lateCatch ? '' : 'twirl'}">${pairBody('cheer')}${lateCatch ? '' : orbit()}</g></g>`, `--a0:0deg`);
    extra += effects(st.kind);
    glow = lateCatch ? 'moon-glow' : 'moon-glow big';
  } else if (st.resolved && st.revisit > 0) {
    h = pend('h', 'empty', '');
    y = pend('y', 'empty', '');
    extra += VARIANT_FN[st.variant]() + gestureHearts();
  } else if (st.resolved) {
    h = pend('h', 'empty', '');
    y = pend('y', 'rest', pairBody('rest'));
  } else if (s.h) {
    const [ax, ay] = apex('h');
    const settled = Date.now() - st.sigAt.h > 1200; // 飛び出しの動きを、描き直しのたびにやり直さない
    h = settled ? pend('h', 'empty', '') : pend('h', 'out', hangBody('h', 'early'));
    extra += `<g style="translate:${ax}px ${ay + (tired ? 14 : 0)}px" class="${settled ? '' : 'late-in'}">${airBody('h', tired)}</g>`;
    y = pend('y', 'idle', hangBody('y', 'idle'));
  } else if (s.y) {
    h = pend('h', 'idle', hangBody('h', 'idle'));
    const settledY = Date.now() - st.sigAt.y > 1200; // 開き直しや描き直しのたびに、でんぐり返しをやり直さない
    y = pend('y', 'ready', `<g class="catcher${settledY ? ' still' : ''}">${catcherBody('reach')}</g>`);
  } else {
    const ex = st.special === 'date' ? ' excited' : '';
    h = pend('h', 'idle' + ex, hangBody('h', 'idle'));
    y = pend('y', 'idle' + ex, hangBody('y', 'idle'));
  }
  return `<svg class="scene" viewBox="0 0 300 184" aria-hidden="true" style="--s-pink:${skyNow().pink};--s-mint:${skyNow().mint};--s-line:${skyNow().line}">
    ${skyMarkup()}<line class="rig" x1="70" y1="6" x2="230" y2="6"/>
    ${glow ? `<circle class="glowdisc${glow.includes('big') ? ' big' : ''}" cx="150" cy="88" r="68" fill="url(#halo2)"/>` : ''}<g>${aura(st.special === 'milestone' ? Math.max(st.pts, 90) : st.pts)}${moonMarkup(st.pts / 100)}${st.special === 'bday' ? partyHat() : ''}${st.special === 'milestone' ? crown() : ''}</g>${h}${y}${extra}${popHtml()}${hint}${skyParticles()}</svg>`;
}


export function moonScene(ctx) {
  Object.assign(st, ctx);
  return scene();
}
export { VARIANTS, VARIANT_LABEL };
export const SEASON_LABEL = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
export const phaseName = (p) => (p >= 95 ? '満月まであと少し' : p >= 75 ? '十三夜のころ' : p >= 50 ? '半月をこえた' : p >= 25 ? '三日月から上弦へ' : p > 0 ? '細い三日月' : '新月');
