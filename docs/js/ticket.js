// 旅券: 予定の詳細に貼られた乗換案内の文章を読み取って、きっぷ(ホーム)と路線図(全画面)にする。
// 読み取れないときは何も返さない(いつもどおり、文章のまま見せる)。文章そのものは変えない。

const NUM = (s) => s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));

// 乗換案内の形(区間ごとに「[出発] 駅 / │ 時刻発 / │ 列車名 / │ 時刻着 / [乗換] 駅 …」)を読み取る
export function parseTrip(text) {
  if (!text || typeof text !== 'string') return [];
  const routes = [];
  let cur = null;
  text.split(/\r?\n/).forEach((raw) => {
    const L = NUM(raw.trim());
    let m;
    if (!L) return;
    if (!/^[│|\[]/.test(L) && (m = L.match(/^(.{1,20}?)\s*(?:→|->|⇒)\s*(.{1,20})$/))) { cur = { from: m[1].trim(), to: m[2].trim(), date: '', dep: '', meta: {}, stops: [], legs: [], arr: '' }; routes.push(cur); return; }
    if (!cur) return;
    if ((m = L.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日\(([^)]+)\)\s*(\d{1,2}:\d{2})\s*(?:出発|発)/))) { cur.date = `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`; cur.dep = m[5]; return; }
    if ((m = L.match(/^(乗換回数|所要時間|営業km|運賃|きっぷ)\s*[:：]\s*(.+)$/))) { cur.meta[m[1]] = m[2]; return; }
    if ((m = L.match(/^\[(出発|乗換|到着)\]\s*(.+)$/))) { cur.stops.push({ kind: m[1], name: m[2].trim(), lines: [] }); return; }
    if (/^[│|]/.test(L) && cur.stops.length) {
      const t = L.replace(/^[│|]\s*/, '');
      const s = cur.stops[cur.stops.length - 1];
      if ((m = t.match(/^(\d{1,2}:\d{2})発(?:\((.+?)\))?$/))) { s.dep = m[1]; s.depTr = m[2] || ''; } else if ((m = t.match(/^(\d{1,2}:\d{2})着(?:\((.+?)\))?$/))) { s.arrNext = m[1]; s.arrTr = m[2] || ''; } else s.lines.push(t);
    }
  });
  const ok = [];
  routes.forEach((r) => {
    for (let i = 0; i < r.stops.length - 1; i += 1) {
      const a = r.stops[i];
      const b = r.stops[i + 1];
      if (!a.dep || !a.arrNext) return;
      r.legs.push({ from: a.name, to: b.name, dep: a.dep, depTr: a.depTr || '', arr: a.arrNext, arrTr: a.arrTr || '', lines: a.lines });
    }
    if (!r.legs.length || !r.date || r.stops[r.stops.length - 1].kind !== '到着') return;
    r.dep = r.legs[0].dep;
    r.arr = r.legs[r.legs.length - 1].arr;
    ok.push(r);
  });
  return ok;
}

// 列車の種類(色と呼び名)
export function typeOf(lines) {
  const t = (lines || []).join(' ');
  if (/(のぞみ|ひかり|こだま|なすの|やまびこ|はやぶさ|はやて|つばさ|かがやき|はくたか|あさま|みずほ|さくら|新幹線)/.test(t)) return { label: '新幹線', cls: 'shin', color: '#2f6fe0' };
  if (/(あずさ|かいじ|ふじさん|特急|エクスプレス|サンダーバード|しなの|ひたち|ときわ|踊り子|スーパー)/.test(t)) return { label: '特急', cls: 'ltd', color: '#d9534f' };
  return { label: '普通・快速', cls: 'local', color: '#2d8f77' };
}

export const dateLabel = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return `${m}/${d}(${'日月火水木金土'[new Date(y, m - 1, d).getDay()]})`;
};

// 予定の一覧から、その日(key)に出す旅券。電車のアイコンで、ふたりの予定のものだけ
export function ticketsOn(events, key) {
  const out = [];
  events.filter((e) => e.kind === 'train' && e.who === 'both' && e.note).forEach((e) => {
    parseTrip(e.note).filter((r) => r.date === key).forEach((r) => out.push({ ev: e, route: r }));
  });
  return out.sort((a, b) => a.route.dep.localeCompare(b.route.dep));
}

const TRAIN = '<path d="M7 3h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3l2 3h-2.500l-1.500-2.200h-6L7.500 21H5l2-3a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zm0 3v5h10V6z"/>';
const svg = (h, inner) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = inner; return s; };

// ホームに出す、きっぷ(往路・復路など、その日の分)
export function ticketCard(h, { route: r, label }) {
  return h('div', { class: 'tkA' },
    h('div', { class: 'tktop' }, h('span', {}, `${label || '乗車券'}`), h('span', {}, dateLabel(r.date))),
    h('div', { class: 'tkrt' }, h('span', {}, r.from), h('i', {}), svg(h, TRAIN), h('i', {}), h('span', {}, r.to)),
    h('div', { class: 'tkmeta' }, h('span', {}, h('b', {}, r.dep), ' 発'), h('span', {}, h('b', {}, r.arr), ' 着'), r.meta['所要時間'] ? h('span', {}, r.meta['所要時間']) : null, r.meta['乗換回数'] ? h('span', {}, `乗換 ${r.meta['乗換回数']}`) : null),
    h('div', { class: 'tkcut' }),
    h('div', { class: 'tklegs' }, r.legs.map((l) => h('div', { class: 'tklg' }, h('span', { class: 'tkt' }, `${l.dep}→${l.arr}`), h('span', { class: 'tkn' }, `${l.from}→${l.to}`, h('small', {}, l.lines.join(' ')))))));
}

// 全画面で見せる、路線図(縦のタイムライン)
export function ticketRoute(h, r, title) {
  const rows = [];
  r.stops.forEach((s, k) => {
    const first = k === 0;
    const last = k === r.stops.length - 1;
    const prev = r.legs[k - 1];
    const next = r.legs[k];
    const times = last ? [r.arr] : first ? [r.dep] : [prev ? prev.arr : '', next ? next.dep : ''];
    rows.push(h('div', { class: 'tkst' }, h('div', { class: 'tktm' }, times.filter(Boolean).map((t) => h('div', {}, t))), h('div', { class: 'tkdot' }, h('i', { class: first || last ? 'tkend' : '' })),
      h('div', { class: 'tknm' }, s.name, h('small', {}, `${first ? '出発' : last ? '到着' : '乗換'}${next && next.depTr ? ` ${next.depTr}` : ''}`))));
    if (!last && next) {
      const ty = typeOf(next.lines);
      rows.push(h('div', { class: 'tkseg', style: `--lc:${ty.color}` }, h('div', {}), h('div', { class: 'tkdot' }, h('div', { class: 'tkln' })), h('div', { class: 'tktr' }, h('span', { class: `tkchip ${ty.cls}` }, ty.label), next.lines.join(' '))));
    }
  });
  return h('div', { class: 'tkC' }, h('div', { class: 'tkhd' }, h('b', {}, `${r.from} → ${r.to}`), h('small', {}, `${title ? `${title} ・ ` : ''}${dateLabel(r.date)}`)),
    h('div', { class: 'tksub' }, [r.meta['所要時間'], r.meta['乗換回数'] ? `乗換 ${r.meta['乗換回数']}` : '', r.meta['営業km']].filter(Boolean).join(' ・ ')), ...rows);
}
