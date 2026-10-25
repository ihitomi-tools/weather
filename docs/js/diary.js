// おたのしみの日記帳: 何かが入っている日(お題・調子やメモ・予定)を、古い順に並べる。画面には触れない(本のめくりは、createBook)。

const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

// cards: [{ date }] / recKeys: 調子・メモが入っている日のキー / events: [{ date, end? }] / todayKey: 今日まで(未来は出さない)
export function diaryKeys({ cards = [], recKeys = [], events = [], todayKey }) {
  const set = new Set();
  cards.forEach((c) => c.date && set.add(c.date));
  recKeys.forEach((k) => set.add(k));
  events.forEach((e) => {
    if (!e.date) return;
    const end = e.end && e.end > e.date ? e.end : e.date;
    const d = parse(e.date);
    for (let i = 0; i < 40 && keyOf(d) <= end; i += 1) { set.add(keyOf(d)); d.setDate(d.getDate() + 1); } // 連続する予定は、日ごとに(長くても40日まで)
  });
  return [...set].filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k) && k <= todayKey).sort();
}

// 月のふせん。古い月 → 新しい月。多いときは、新しい方から12個まで
export function monthTabs(keys, max = 12) {
  const months = [...new Set(keys.map((k) => k.slice(0, 7)))];
  return months.slice(-max).map((ym) => ({ ym, index: keys.findIndex((k) => k.startsWith(ym)) }));
}

// いま開く日。しおり(前に開いていた日)があって、まだ残っていればそこ。なければ、いちばん新しい日
export function startIndex(keys, bookmark) {
  const i = bookmark ? keys.indexOf(bookmark) : -1;
  return i >= 0 ? i : Math.max(0, keys.length - 1);
}

// 本。renderPage(key) が、ページの中身(ノード)を返す。めくる動きは、ページが左のとじ目を軸にめくれる
export function createBook({ h, keys, start, renderPage, onTurn, reduce = false }) {
  let cur = start;
  let busy = false;
  const stage = h('div', { class: 'dstage' });
  const pageEl = (i, cls) => { const el = h('div', { class: `dpage ${cls}` }); el.append(...renderPage(keys[i])); return el; };
  const pn = h('span', { class: 'dpn' });
  const prev = h('button', { type: 'button' }, '‹ 前の日');
  const next = h('button', { type: 'button' }, '次の日 ›');
  const tabs = h('div', { class: 'dtabs' });
  const ribbon = h('button', { class: 'dribbon', type: 'button', 'aria-label': 'いちばん新しいページへ' });
  function show() {
    stage.replaceChildren(pageEl(cur, 'cur'));
    pn.textContent = `${cur + 1} / ${keys.length}`;
    prev.disabled = cur === 0;
    next.disabled = cur === keys.length - 1;
    [...tabs.children].forEach((b) => b.classList.toggle('on', b.dataset.m === keys[cur].slice(0, 7)));
    if (onTurn) onTurn(keys[cur]);
  }
  function go(to) {
    if (busy || to < 0 || to >= keys.length || to === cur) return;
    if (reduce) { cur = to; show(); return; }
    busy = true;
    const old = stage.firstChild;
    const fwd = to > cur;
    const np = pageEl(to, fwd ? 'under' : 'cur flipback');
    if (fwd) { stage.insertBefore(np, old); old.classList.add('flip'); } else stage.append(np);
    setTimeout(() => { cur = to; busy = false; show(); }, 560);
  }
  prev.addEventListener('click', () => go(cur - 1));
  next.addEventListener('click', () => go(cur + 1));
  ribbon.addEventListener('click', () => go(keys.length - 1));
  // 指の動き: 斜めでも、横が少しでも強ければ「めくる」。たて向きは、自分でページをスクロールする
  // (ブラウザに任せると、斜めの動きは、たてのスクロールが先に反応して、めくれないため。stage は touch-action: none)
  let g = null;
  let moved = false;
  let raf = 0;
  const topPage = () => stage.querySelector('.dpage.cur');
  stage.addEventListener('pointerdown', (e) => {
    cancelAnimationFrame(raf);
    const pg = topPage();
    g = { x: e.clientX, y: e.clientY, axis: '', sc: pg ? pg.scrollTop : 0, last: e.clientY, lt: e.timeStamp, v: 0 };
    moved = false;
  });
  stage.addEventListener('pointermove', (e) => {
    if (!g) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      g.axis = Math.abs(dx) >= Math.abs(dy) * 0.8 ? 'x' : 'y'; // 横を、少し優先する
      moved = true;
    }
    if (g.axis === 'y') {
      const pg = topPage();
      if (pg) pg.scrollTop = g.sc - dy;
      const dt = e.timeStamp - g.lt;
      if (dt > 0) g.v = (g.last - e.clientY) / dt; // 上へ動くほど、プラス(px/ms)
      g.last = e.clientY; g.lt = e.timeStamp;
    }
  });
  const endGesture = (e) => {
    if (!g) return;
    const gg = g;
    g = null;
    if (!gg.axis) return;
    if (gg.axis === 'x') {
      const dx = e.clientX - gg.x;
      if (Math.abs(dx) > 40) go(dx < 0 ? cur + 1 : cur - 1);
      return;
    }
    const pg = topPage();
    let v = gg.v * 16; // 1コマ(16ms)あたりのpx。指を離したあと、少しすべる
    const step = () => { if (!pg || Math.abs(v) < 0.5) return; pg.scrollTop += v; v *= 0.94; raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  };
  stage.addEventListener('pointerup', endGesture);
  stage.addEventListener('pointercancel', () => { g = null; });
  stage.addEventListener('click', (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true); // 動かしたあとの、おまけのタップは無視
  monthTabs(keys).forEach(({ ym, index }) => {
    const b = h('button', { type: 'button', 'data-m': ym }, `${Number(ym.slice(5))}月`);
    b.addEventListener('click', () => go(index));
    tabs.append(b);
  });
  const book = h('div', { class: 'dbook' }, ribbon, tabs, stage);
  const root = h('div', { class: 'dwrap' }, book, h('div', { class: 'dnav' }, prev, pn, next));
  show();
  return {
    root,
    key: () => keys[cur],
    // いまのページの中身が変わったとき(調子を書いた・予定が増えたなど)に、めくらず、その場で描き直す
    refreshPage() {
      const top = stage.querySelector('.dpage.cur');
      if (!top || busy) return;
      const tmp = h('div', {});
      tmp.append(...renderPage(keys[cur]));
      if (tmp.innerHTML !== top.innerHTML) top.replaceChildren(...tmp.childNodes);
    },
  };
}
