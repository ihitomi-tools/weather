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
    stage.replaceChildren(pageEl(cur, 'top'));
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
    const np = pageEl(to, fwd ? 'under' : 'top flipback');
    if (fwd) { stage.insertBefore(np, old); old.classList.add('flip'); } else stage.append(np);
    setTimeout(() => { cur = to; busy = false; show(); }, 560);
  }
  prev.addEventListener('click', () => go(cur - 1));
  next.addEventListener('click', () => go(cur + 1));
  ribbon.addEventListener('click', () => go(keys.length - 1));
  let x0 = null;
  let y0 = null;
  stage.addEventListener('pointerdown', (e) => { if (e.target.closest('button, a, input, textarea')) { x0 = null; return; } x0 = e.clientX; y0 = e.clientY; });
  stage.addEventListener('pointerup', (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0;
    const dy = e.clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? cur + 1 : cur - 1);
  });
  stage.addEventListener('pointercancel', () => { x0 = null; });
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
      const top = stage.querySelector('.dpage.top');
      if (!top || busy) return;
      const tmp = h('div', {});
      tmp.append(...renderPage(keys[cur]));
      if (tmp.innerHTML !== top.innerHTML) top.replaceChildren(...tmp.childNodes);
    },
  };
}
