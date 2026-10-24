// おたのしみ: 満月の水槽の棚。満月1つにつき水槽が1つ。画面には、絵(SVG)だけを作る
export const COLS = 4;
export const ROWS = 5;
export const MAX = COLS * ROWS;
const W = 80;
const H = 104;
const PHOTOS = 5;

export const PERS = [
  { k: 'calm', name: 'おとなしい', d: 'ほとんど動かない。静かに、ゆっくり。' },
  { k: 'lively', name: 'いきがいい', d: 'ぴょんぴょん跳ねる。水槽の主。' },
  { k: 'drifty', name: 'ふわふわ', d: 'ゆらゆら、横に漂う。' },
  { k: 'spin', name: 'くるくる', d: 'ゆっくり自転している。' },
  { k: 'shiny', name: 'ぴかぴか', d: 'ふくらんだり、光がまたたく。' },
  { k: 'sleepy', name: 'ねぼすけ', d: '底にしずんで、ときどき浮かぶ。' },
];
const GLOWS = ['#a8c4ff', '#c0b0ff', '#9fd0ff', '#d0b8ff', '#b0c8ff', '#c8bcff']; // 青〜紫(夜の海みたいな光)
export const persOf = (n) => PERS[(n * 5 + 1) % 6];
export const glowOf = (n) => GLOWS[(n * 7 + 2) % 6];
export const photoOf = (n) => `img/moon${(((n - 1) * 2) % PHOTOS) + 1}.webp`;
export const mdLabel = (ms) => { const d = new Date(ms); return `${d.getMonth() + 1}/${d.getDate()}`; };

// 水や泡のための、共通の部品(画面に1つだけ置く)
export const SHELF_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<radialGradient id="bbG" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#dfe8ff" stop-opacity=".02"/><stop offset=".72" stop-color="#cfe0ff" stop-opacity=".08"/><stop offset=".9" stop-color="#e8f0ff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity=".7"/></radialGradient>
<linearGradient id="bbR" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9fe8ff" stop-opacity=".9"/><stop offset=".5" stop-color="#d9b8ff" stop-opacity=".25"/><stop offset="1" stop-color="#ffc8e8" stop-opacity=".8"/></linearGradient>
<symbol id="bub" viewBox="-5 -5 10 10" overflow="visible"><circle r="4.4" fill="url(#bbG)"/><circle r="4.4" fill="none" stroke="url(#bbR)" stroke-width=".55"/><ellipse cx="-1.5" cy="-1.8" rx="1.25" ry=".7" fill="#fff" opacity=".95" transform="rotate(-35 -1.5 -1.8)"/><circle cx="1.7" cy="2" r=".38" fill="#fff" opacity=".65"/></symbol>
<filter id="wob" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.035 0.06" numOctaves="1" seed="3" result="n"><animate attributeName="baseFrequency" dur="9s" values="0.035 0.06;0.05 0.04;0.035 0.06" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2"/></filter>
<filter id="bl"><feGaussianBlur stdDeviation=".7"/></filter>
<linearGradient id="tkbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#171c46"/><stop offset="1" stop-color="#0f1330"/></linearGradient>
<linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a3794a"/><stop offset="1" stop-color="#6e4d2e"/></linearGradient>
<radialGradient id="lamp"><stop offset="0" stop-color="#ffd98a" stop-opacity=".35"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient>
</defs></svg>`;

let uid = 0;
const bubble = (x, y, sz, dl, dur, sw, d) =>
  `<g class="bub1" style="animation-delay:-${d + dl}s;animation-duration:${dur}s"><g class="bs" style="animation-delay:-${sw}s"><use href="#bub" x="${x - sz / 2}" y="${y - sz / 2}" width="${sz}" height="${sz}"/></g></g>`;

// 水槽(中身のスケール 80×104)。n=満月の番号、wob=水のゆらめき(1つだけ大きく見せるときだけ)
export function tankInner(n, { filled = true, label = '', wob = false, num = true } = {}) {
  const id = `t${(uid += 1)}`;
  const d = (n % 5) * 0.9;
  const P = persOf(n);
  const G = glowOf(n);
  const moon = filled ? `
    <circle cx="40" cy="44" r="31" fill="url(#g${id})" class="${P.k === 'shiny' ? 'gp' : 'shim'}" style="animation-delay:-${d}s"/>
    <g class="mo p-${P.k}" style="animation-delay:-${d}s"${wob ? ' filter="url(#wob)"' : ''}>
      <g mask="url(#k${id})"><g class="${P.k === 'spin' ? 'spinimg' : ''}"><image href="${photoOf(n)}" x="26.5" y="30.5" width="27" height="27"/></g><circle cx="40" cy="44" r="13.5" fill="url(#l${id})"/><circle cx="35.5" cy="39.5" r="9" fill="#fff" opacity=".13" filter="url(#bl)"/></g>
    </g>
    <g>${bubble(24, 64, 3.2, 0, 8, 0, d)}${bubble(56, 66, 5.2, 2.5, 9.5, 1, d)}${bubble(30, 68, 2.2, 4.5, 7, 0.5, d)}${bubble(50, 64, 4, 1.2, 8.5, 1.7, d)}${bubble(40, 66, 2.6, 6, 10, 0.9, d)}</g>
    <path d="M14 26 q6 -3 12 0 t12 0 t12 0 t12 0" stroke="#bcd0ff" stroke-width="1" fill="none" opacity=".5" class="ripple" style="animation-delay:-${d}s"/>`
    : '<circle cx="40" cy="44" r="13.5" fill="none" stroke="#6a72b8" stroke-width="1" stroke-dasharray="2 3" opacity=".5"/><circle cx="40" cy="44" r="1.4" fill="#8a92d8" opacity=".5"/>';
  return `<defs>
   <radialGradient id="g${id}"><stop offset="0" stop-color="${G}" stop-opacity="1"/><stop offset=".45" stop-color="${G}" stop-opacity=".5"/><stop offset="1" stop-color="${G}" stop-opacity="0"/></radialGradient>
   <radialGradient id="l${id}" cx=".34" cy=".3" r=".95"><stop offset=".3" stop-color="#000" stop-opacity="0"/><stop offset=".75" stop-color="#0c1020" stop-opacity=".38"/><stop offset="1" stop-color="#080b18" stop-opacity=".72"/></radialGradient>
   <radialGradient id="kk${id}"><stop offset=".86" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
   <mask id="k${id}"><circle cx="40" cy="44" r="13.5" fill="url(#kk${id})"/></mask>
   <linearGradient id="w${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${filled ? '#3f5cb4' : '#262c63'}"/><stop offset="1" stop-color="${filled ? '#1a2468' : '#181d48'}"/></linearGradient>
   <linearGradient id="s${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  ${filled ? `<circle cx="40" cy="44" r="46" fill="url(#g${id})" opacity=".55" class="shim" style="animation-delay:-${d}s"/>` : ''}
  <rect x="9" y="12" width="62" height="64" rx="11" fill="url(#w${id})" stroke="#aeb8ff" stroke-opacity="${filled ? 0.7 : 0.35}" stroke-width="1.5"/>
  ${moon}
  <g opacity="${filled ? 1 : 0.3}"><use href="#bub" x="49.5" y="66.5" width="5" height="5"/><use href="#bub" x="54.8" y="60.8" width="3.2" height="3.2"/><use href="#bub" x="48.6" y="54.6" width="2.4" height="2.4"/></g>
  <path d="M14 20 q-1 24 4 46" stroke="url(#s${id})" stroke-width="3.2" fill="none" stroke-linecap="round" opacity="${filled ? 0.85 : 0.45}"/>
  <rect x="9" y="8" width="62" height="7" rx="3.5" fill="#6a72b8" opacity="${filled ? 0.9 : 0.5}"/>
  <rect x="14" y="78" width="52" height="11" rx="3" fill="${filled ? '#8a6a3c' : '#4a3f3a'}"/>
  ${filled && num ? `<text x="40" y="86.5" font-size="8" text-anchor="middle" fill="#ffe9b0" font-weight="800" font-family="'M PLUS Rounded 1c','BIZ UDPGothic',sans-serif">${n}</text>` : ''}
  ${filled && label ? `<text x="40" y="99" font-size="6.5" text-anchor="middle" fill="#cfd6ff" font-family="'M PLUS Rounded 1c','BIZ UDPGothic',sans-serif">${label}</text>` : ''}`;
}

// 1つだけ大きく見せる(詳細・お祝い)
export const tankSvg = (n, opts = {}) => `<svg viewBox="0 0 ${W} ${H}" class="oto-one" aria-hidden="true">${tankInner(n, { wob: true, ...opts })}</svg>`;

// 棚(5段×4個)。fulls = [{ n, at }]
export function shelfSvg(fulls, start = 0) {
  const rh = H + 10;
  const pad = 6;
  const wTotal = COLS * W + (COLS + 1) * pad;
  const hTotal = ROWS * rh + 18;
  const byN = new Map(fulls.map((f) => [f.n, f]));
  let s = `<svg viewBox="0 0 ${wTotal} ${hTotal}" class="oto-shelf" role="group" aria-label="満月の棚">
  <rect width="${wTotal}" height="${hTotal}" fill="url(#tkbg)"/>
  <g fill="#fff" opacity=".6">${Array.from({ length: 30 }, (_, k) => `<circle cx="${(k * 53) % wTotal}" cy="${(k * 37) % hTotal}" r="${k % 3 ? 0.7 : 1.1}"/>`).join('')}</g>`;
  for (let r = 0; r < ROWS; r += 1) {
    const y = 8 + r * rh;
    s += `<ellipse cx="${wTotal / 2}" cy="${y + H - 6}" rx="${wTotal / 2}" ry="30" fill="url(#lamp)"/>`;
    for (let c = 0; c < COLS; c += 1) {
      const n = start + r * COLS + c + 1;
      const f = byN.get(n);
      const x = pad + c * (W + pad);
      s += f
        ? `<g transform="translate(${x} ${y})" class="oto-tk" data-n="${n}" role="button" tabindex="0" aria-label="${n}個目の満月、${mdLabel(f.at)}"><rect x="4" y="2" width="72" height="100" fill="transparent"/>${tankInner(n, { label: mdLabel(f.at) })}</g>`
        : `<g transform="translate(${x} ${y})">${tankInner(n, { filled: false })}</g>`;
    }
    s += `<rect x="0" y="${y + H - 2}" width="${wTotal}" height="9" fill="url(#wood)"/><rect x="0" y="${y + H - 2}" width="${wTotal}" height="2" fill="#c9a06a" opacity=".8"/><rect x="0" y="${y + H + 7}" width="${wTotal}" height="4" fill="#000" opacity=".35"/>`;
  }
  return `${s}</svg>`;
}
