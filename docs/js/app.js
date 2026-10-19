import { CITIES, SEQUENCE_LENGTH } from './cities.js';
import { loadWeather } from './weather.js';
import { isEmojiOnly } from './emoji.js';
import { predict, runsOf, dayNum, keyOf } from './cycle.js';
import { daysSince, nextMilestone, nextJoint, normalizeShared, buildSharedPayload } from './card.js';
import { canRecord as canRecordNow, unseenPats } from './share.js';
import { answerKey, nextAction, cardStatus, availableStock, pickStock, describeAnswer } from './qa.js';
import { nextBirthday, nextGiftBirthday, isBirthdayOn, midnightMs, POP_DAYS } from './dates.js';
import { buildExport } from './export.js';
import * as C from './crypto.js';
import { firebaseConfig, isConfigured } from './config.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// 端末の中に残す設定(使えない環境でも動くように、すべて try/catch で包む)
const LS = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 保存できなくても続ける */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* 同上 */ } },
};
const K = {
  key: 'app.key', name: 'app.name', seq: 'app.seq', salt: 'app.salt',
  auto: 'app.auto', expire: 'app.expire', city: 'app.city', card: 'app.card', theme: 'app.theme', patSeen: 'app.patSeen', bd: 'app.bd', talk: 'app.talk', rcpt: 'app.rcpt',
};
const VERSION = '2026.10.20-17';

// 調子(新月 → 満月)と気分のタグ
const LEVELS = [['しんどい', 1], ['いまいち', 2], ['ふつう', 3], ['まあまあ', 4], ['元気', 5]];
const MOOD_TAGS = ['元気', '眠い', 'イライラ', '不安', '落ち込み', 'おなかが痛い', '頭が痛い', 'だるい', 'うれしい'];
const LIT = ['', 'M12 3A9 9 0 0 0 12 21A4 9 0 0 1 12 3Z', 'M12 3A9 9 0 0 0 12 21Z', 'M12 3A9 9 0 0 0 12 21A4 9 0 0 0 12 3Z', 'M12 3A9 9 0 1 0 12 21A9 9 0 1 0 12 3Z'];

function moonIcon(level) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.color = `var(--m${level})`;
  const lit = LIT[level - 1];
  svg.innerHTML = `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".75"/>${lit ? `<path d="${lit}" fill="currentColor"/>` : ''}`;
  return svg;
}

// スタンプ(絵文字)。送るのはこの一覧にあるものだけで、受け取った側も一覧にあるものだけを表示する
const STAMPS = [
  '😊', '😂', '🥹', '😭', '😍', '🥰', '😘', '😋',
  '😴', '🤔', '😳', '😅', '🥺', '😎', '🤗', '🙄',
  '❤️', '💕', '💗', '✨', '🎉', '🎁', '💐', '🌸',
  '👍', '🙏', '👏', '🙌', '💪', '✌️', '👋', '🤝',
  '🍝', '🍣', '🍙', '🍜', '🍰', '☕', '🍺', '🍓',
  '☀️', '☁️', '☔', '🌈', '⛄', '🌙', '⭐', '🔥',
  '🐱', '🐶', '🐰', '🐻', '🚃', '🏠', '🛏️', '📞',
];
const EXPIRE_MS = { '24h': 24 * 3600e3, '7d': 7 * 24 * 3600e3, off: 0 };

// 子要素は textContent で入れる(相手が送った文字をHTMLとして解釈しない)
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
  });
  kids.flat().forEach((c) => { if (c != null) el.append(c.nodeType ? c : document.createTextNode(c)); });
  return el;
}

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const WEEK = '日月火水木金土';

const state = {
  store: null, authReady: null, user: null, key: null, keyBytes: null,
  profiles: {}, messages: [], events: [], days: new Map(), dayOwners: new Set(), pats: new Map(), stock: [], qcards: [], answers: new Map(), boxes: [], marks: new Map(), items: new Map(), itemsDone: new Set(), needInput: null, delId: null, readAt: 0, readSent: 0, talk: 'q', cfilter: 'all', loaded: {}, sheetRender: null, ann: [{ l: '', d: '' }, { l: '', d: '' }], nl: '', card: 0, pastRender: null,
  unsubs: [], view: 'home', pendingKey: null,
  cal: { y: new Date().getFullYear(), m: new Date().getMonth(), sel: ymd(new Date()) },
};

function screen(name) {
  $('#cover').hidden = name !== 'cover';
  $('#gate').hidden = name !== 'gate';
  $('#app').hidden = name !== 'app';
  window.scrollTo(0, 0);
}

function gate(panel) {
  $$('[data-panel]').forEach((p) => p.classList.toggle('on', p.dataset.panel === panel));
  screen('gate');
}

/* ================= 天気(表の顔) ================= */
let picked = [];
let recording = null;
let returnView = 'home';
let weatherToken = 0;
const icon = (kind) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('class', 'g'); s.innerHTML = `<use href="#i-${kind}"/>`; return s; };

function renderWeather(data, stale) {
  $('#stale').hidden = !stale || !data;
  if (!data) {
    $('#temp').textContent = '--';
    $('#cond').textContent = '更新できませんでした';
    $('#hl').textContent = '';
    $('#hours').replaceChildren();
    $('#week').replaceChildren();
    return;
  }
  $('#temp').textContent = data.now.temp;
  $('#cond').textContent = data.now.text;
  $('#hl').textContent = `最高 ${data.todayMax}° / 最低 ${data.todayMin}°`;
  $('#hours').replaceChildren(...data.hours.map((x) => h('div', {}, h('span', {}, x.label), icon(x.kind), h('span', {}, `${x.temp}°`))));
  const lo = Math.min(...data.days.map((d) => d.min));
  const hi = Math.max(...data.days.map((d) => d.max));
  const span = Math.max(hi - lo, 1);
  $('#week').replaceChildren(...data.days.map((d) => {
    const bar = h('div', { class: 'bar' }, h('i', { style: `left:${((d.min - lo) / span) * 100}%;right:${100 - ((d.max - lo) / span) * 100}%` }));
    return h('li', {}, h('span', {}, d.label), icon(d.kind), bar, h('span', {}, `${d.min}°/${d.max}°`));
  }));
}

async function showCity(city) {
  const token = ++weatherToken;
  $('#city').textContent = city.name;
  $$('#cities button').forEach((b) => b.setAttribute('aria-pressed', b.textContent === city.name));
  LS.set(K.city, city.name);
  const { data, stale } = await loadWeather(city);
  if (token === weatherToken) renderWeather(data, stale);
}

async function matchesSequence(names) {
  const salt = LS.get(K.salt);
  const stored = LS.get(K.seq);
  if (salt && stored) return (await C.hashSequence(salt, names)) === stored;
  // パターンが未登録の端末では、どの6つでも入口(ログイン)まで進む。この先はログインとキーが担う。
  return true;
}

async function onCityTap(city) {
  showCity(city);
  if (recording) {
    recording.push(city.name);
    const rec = $('#rec');
    rec.textContent = `パターンを登録中 (${recording.length}/${SEQUENCE_LENGTH})`;
    if (recording.length === SEQUENCE_LENGTH) {
      const salt = C.toB64(crypto.getRandomValues(new Uint8Array(16)));
      LS.set(K.salt, salt);
      LS.set(K.seq, await C.hashSequence(salt, recording));
      recording = null;
      rec.hidden = true;
      picked = [];
      await enter();
      setView(returnView);
    }
    return;
  }
  picked = [...picked, city.name].slice(-SEQUENCE_LENGTH);
  if (picked.length === SEQUENCE_LENGTH && await matchesSequence(picked)) {
    picked = [];
    await enter();
  }
}

function buildCover() {
  const box = $('#cities');
  CITIES.forEach((c) => box.append(h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => onCityTap(c) }, c.name)));
  const saved = CITIES.find((c) => c.name === LS.get(K.city)) || CITIES.find((c) => c.name === '東京');
  showCity(saved);
}

function startRecording(view) {
  recording = [];
  picked = [];
  returnView = view;
  const rec = $('#rec');
  rec.hidden = false;
  rec.textContent = `パターンを登録します。都市を決めた順に${SEQUENCE_LENGTH}つタップしてください (0/${SEQUENCE_LENGTH})`;
  screen('cover');
}

function lock() {
  picked = [];
  recording = null;
  $('#rec').hidden = true;
  closeSheet();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  screen('cover');
}

/* ================= 入口 ================= */
async function ensureStore() {
  if (state.store) return true;
  try {
    state.store = await import('./store.js');
    state.store.init(firebaseConfig);
  } catch (e) {
    state.store = null;
    return false;
  }
  state.authReady = new Promise((resolve) => {
    let first = true;
    state.store.onUser((u) => {
      state.user = u;
      if (first) { first = false; resolve(); } else if (!u) { stopWatching(); gate('login'); }
    });
  });
  return true;
}

async function loadKey() {
  const saved = LS.get(K.key);
  if (!saved) return false;
  try {
    state.keyBytes = C.fromB64(saved);
    state.key = await C.importKey(state.keyBytes);
    return true;
  } catch (e) {
    return false;
  }
}

async function enter() {
  if (!isConfigured) { gate('unconfigured'); return; }
  if (!(await ensureStore())) { gate('offline'); return; }
  await Promise.race([state.authReady, new Promise((r) => setTimeout(r, 8000))]);
  if (!state.user) { gate('login'); return; }
  if (!state.key && !(await loadKey())) { gate('key'); return; }
  if (!LS.get(K.name)) { gate('name'); return; }
  if (!LS.get(K.seq)) { startRecording('home'); return; }
  startWatching();
  screen('app');
  setView(state.view);
}

async function useKey(bytes) {
  LS.set(K.key, C.toB64(bytes));
  state.keyBytes = bytes;
  state.key = await C.importKey(bytes);
  await enter();
}

function buildGate() {
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#login-error');
    err.textContent = '';
    try {
      await state.store.login($('#email').value.trim(), $('#password').value);
      $('#password').value = '';
      await enter();
    } catch (ex) {
      err.textContent = 'メールアドレスかパスワードが違います';
    }
  });

  $('#key-new').addEventListener('click', async () => {
    state.pendingKey = C.newSecret();
    $('#new-code').textContent = C.toCode(state.pendingKey);
    $('#new-fp').textContent = await C.fingerprint(state.pendingKey);
    $('#saved').checked = false;
    $('#key-new-ok').disabled = true;
    gate('key-new');
  });
  $('#saved').addEventListener('change', (e) => { $('#key-new-ok').disabled = !e.target.checked; });
  $('#copy-code').addEventListener('click', () => copyText($('#new-code').textContent, $('#copy-code')));
  $('#key-new-ok').addEventListener('click', () => useKey(state.pendingKey));

  $('#key-have').addEventListener('click', () => { $('#enter-fp').hidden = true; $('#code-error').textContent = ''; gate('key-enter'); });
  $('#key-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      state.pendingKey = C.fromCode($('#code-input').value);
      $('#code-error').textContent = '';
      $('#enter-fp-num').textContent = await C.fingerprint(state.pendingKey);
      $('#enter-fp').hidden = false;
    } catch (ex) {
      $('#enter-fp').hidden = true;
      $('#code-error').textContent = ex.message;
    }
  });
  $('#key-enter-ok').addEventListener('click', () => { $('#code-input').value = ''; useKey(state.pendingKey); });

  $('#name-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    LS.set(K.name, $('#name-input').value.trim());
    await enter();
  });
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = 'コピーしました';
  } catch (e) {
    btn.textContent = 'コードを長押しして選択してください';
  }
}

/* ================= データの読み書き ================= */
const myUid = () => state.user && state.user.uid;
const partnerUid = () => Object.keys(state.profiles).find((u) => u !== myUid());
const myName = () => LS.get(K.name) || '自分';
const partnerName = () => (state.profiles[partnerUid()] && state.profiles[partnerUid()].name) || '相手';

async function decrypt(kind, doc) {
  try { return await C.decryptJson(state.key, kind, doc); } catch (e) { return null; }
}

function stopWatching() {
  state.unsubs.forEach((u) => u());
  state.unsubs = [];
  state.loaded = {};
}

function startWatching() {
  if (state.unsubs.length) return;
  const s = state.store;
  const cache = new Map();
  const seq = { msg: 0, ev: 0, dy: 0, pt: 0, st: 0, qc: 0, an: 0, bx: 0, mk: 0 };

  state.unsubs.push(s.watchProfiles(async (docs) => {
    const next = {};
    for (const d of docs) {
      const p = await decrypt('profiles', d);
      if (p) next[d.id] = p;
    }
    state.profiles = next;
    if (next[myUid()] && next[myUid()].bd && !LS.get(K.bd)) LS.set(K.bd, JSON.stringify(next[myUid()].bd));
    if (!next[myUid()]) s.saveProfile(myUid(), await C.encryptJson(state.key, 'profiles', profilePayload()));
    renderAll();
  }));

  state.unsubs.push(s.watchShared(async (docs) => {
    const d = docs.find((x) => x.id === 'main');
    const p = d && await decrypt('shared', d);
    const shared = normalizeShared(p);
    state.ann = shared.ann;
    state.nl = shared.nl;
    renderAll();
  }));

  state.unsubs.push(s.watchDays(async (docs) => {
    const my = ++seq.dy;
    const next = new Map();
    const owners = new Set();
    const legacy = [];
    for (const d of docs) {
      const ck = `d:${d.id}:${d.iv}`;
      if (!cache.has(ck)) cache.set(ck, await decrypt('days', d));
      const p = cache.get(ck);
      if (d.owner) owners.add(d.owner);
      if (p && p.d) {
        next.set(p.d, p);
        if (!d.owner && p.by === myUid()) legacy.push(d.id); // 古い版で作った自分の記録
      }
    }
    if (my !== seq.dy) return;
    state.days = next;
    state.dayOwners = owners;
    renderAll();
    if (legacy.length && canRecord()) s.claimDays(legacy).catch(() => {});
  }));

  state.unsubs.push(s.watchStock(async (docs) => {
    const my = ++seq.st;
    const out = [];
    for (const d of docs) {
      const ck = `s:${d.id}:${d.iv}`;
      if (!cache.has(ck)) cache.set(ck, await decrypt('stock', d));
      const p = cache.get(ck);
      if (p && p.text) out.push({ id: d.id, text: p.text, from: d.from, at: p.at || 0 });
    }
    if (my !== seq.st) return;
    state.stock = out.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
    state.loaded.stock = true;
    renderAll();
    maybeAdvance();
  }));

  state.unsubs.push(s.watchQCards(async (docs) => {
    const my = ++seq.qc;
    const out = [];
    for (const d of docs) {
      const ck = `q:${d.id}:${d.iv}`;
      if (!cache.has(ck)) cache.set(ck, await decrypt('qcards', d));
      const p = cache.get(ck);
      if (p && p.text) out.push({ id: d.id, n: d.n, text: p.text, stockId: p.stockId || null, date: p.date, by: p.by || d.from });
    }
    if (my !== seq.qc) return;
    state.qcards = out.sort((a, b) => a.n - b.n);
    if (state.needInput && state.qcards.some((c) => c.n >= state.needInput)) state.needInput = null;
    state.loaded.qcards = true;
    renderAll();
    maybeAdvance();
  }));

  state.unsubs.push(s.watchAnswers(async (docs) => {
    const my = ++seq.an;
    const next = new Map();
    for (const d of docs) {
      const ck = `a:${d.id}:${d.iv}`;
      if (!cache.has(ck)) cache.set(ck, await decrypt('answers', d));
      const p = cache.get(ck);
      if (p && typeof p.n === 'number' && d.owner) next.set(answerKey(p.n, d.owner), { ...p, owner: d.owner });
    }
    if (my !== seq.an) return;
    state.answers = next;
    state.loaded.answers = true;
    renderAll();
    maybeAdvance();
  }));

  state.unsubs.push(s.watchBoxes(async (docs) => {
    const my = ++seq.bx;
    const out = [];
    for (const d of docs) {
      const ck = `b:${d.id}:${d.iv}`;
      if (!cache.has(ck)) cache.set(ck, await decrypt('boxes', d));
      const p = cache.get(ck);
      if (p && d.openAt) out.push({ id: d.id, kind: p.kind, title: p.title || '', forUid: p.forUid || null, y: p.y || null, openAt: d.openAt.toMillis ? d.openAt.toMillis() : Number(d.openAt), from: d.from });
    }
    if (my !== seq.bx) return;
    state.boxes = out;
    renderAll();
    refreshItems();
  }));

  state.unsubs.push(s.watchMarks((docs) => {
    const next = new Map();
    docs.forEach((d) => { if (!next.has(d.box)) next.set(d.box, []); next.get(d.box).push({ id: d.id, from: d.from }); });
    state.marks = next;
    renderAll();
  }));

  state.unsubs.push(s.watchReads((docs) => {
    const d = docs.find((x) => x.id !== myUid());
    state.readAt = d ? Number(d.at) || 0 : 0;
    const mine = docs.find((x) => x.id === myUid());
    if (mine) state.readSent = Math.max(state.readSent, Number(mine.at) || 0);
    renderChat();
  }));

  state.unsubs.push(s.watchPats(async (docs) => {
    const my = ++seq.pt;
    const next = new Map();
    for (const d of docs) {
      const ck = `p:${d.id}:${d.iv}`;
      if (!cache.has(ck)) cache.set(ck, await decrypt('pats', d));
      const p = cache.get(ck);
      if (!p || !p.d || p.by !== d.from) continue;
      if (!next.has(p.d)) next.set(p.d, []);
      next.get(p.d).push({ id: d.id, by: p.by, at: p.at || 0 });
    }
    if (my !== seq.pt) return;
    state.pats = next;
    renderAll();
  }));

  state.unsubs.push(s.watchEvents(async (docs) => {
    const my = ++seq.ev;
    const out = [];
    for (const d of docs) {
      const ck = `${d.id}:${d.iv}`;
      if (!cache.has(ck)) cache.set(ck, await decrypt('events', d));
      const p = cache.get(ck);
      if (p) out.push({ id: d.id, ...p });
    }
    if (my !== seq.ev) return;
    state.events = out;
    renderAll();
  }));

  state.unsubs.push(s.watchMessages(async (list) => {
    const my = ++seq.msg;
    const now = Date.now();
    const out = [];
    for (const m of list) {
      if (m.expireAt && m.expireAt < now) { s.removeMessage(m.id).catch(() => {}); continue; }
      const ck = `m:${m.id}`;
      if (!cache.has(ck)) cache.set(ck, await decrypt('messages', m));
      const p = cache.get(ck);
      const isStamp = p && p.t === 'stamp';
      out.push({ ...m, body: p && !isStamp ? p.body : null, stamp: isStamp && STAMPS.includes(p.s) ? p.s : null });
    }
    if (my !== seq.msg) return;
    state.messages = out;
    renderChat();
  }));
}

/* ================= 画面 ================= */
function setView(v) {
  state.view = v;
  $$('#app .view').forEach((el) => el.classList.toggle('on', el.id === `v-${v}`));
  $$('.tab').forEach((t) => t.setAttribute('aria-selected', t.dataset.v === v));
  renderAll();
  if (v === 'chat') { const c = $('#chat'); c.scrollTop = c.scrollHeight; refreshItems(); }
  markRead();
}

function renderAll() {
  if ($('#app').hidden) return;
  renderHome();
  renderChat();
  renderTalk();
  renderCalendar();
  renderSettings();
  if (state.pastRender && !$('#sheet').hidden) state.pastRender();
  if (state.sheetRender && !$('#sheet').hidden) state.sheetRender();
}

const kindOf = (ev) => (ev.who === 'both' ? 'both' : ((ev.who === 'me') === (ev.by === myUid()) ? 'me' : 'you'));
const byDate = (a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''));

function eventItem(ev, withDelete) {
  const li = h('li', { class: 'item' },
    h('span', { class: `dot ${kindOf(ev)}` }),
    h('div', { class: 't' }, ev.title, h('small', {}, `${ev.date.slice(5).replace('-', '/')}${ev.time ? ` ${ev.time}` : ''}`)));
  if (withDelete) {
    const x = h('button', { class: 'x', type: 'button' }, '削除');
    x.addEventListener('click', async () => {
      if (!x.classList.contains('sure')) { x.classList.add('sure'); x.textContent = '本当に削除'; return; }
      state.store.removeEvent(ev.id);
    });
    li.append(x);
  }
  return li;
}

const periodDays = () => [...state.days.values()].filter((r) => r.p).map((r) => r.d);
const mdLabel = (key) => { const d = parseYmd(key); return `${d.getMonth() + 1}/${d.getDate()}(${WEEK[d.getDay()]})`; };

function renderNextMoon() {
  const box = $('#next-moon');
  const cyc = predict(periodDays(), ymd(new Date()));
  if (!cyc.next) {
    box.replaceChildren(h('small', {}, '次の生理'), h('p', { class: 'msg' }, '記録が2回分たまると、予想が出ます'), h('small', { class: 'fine' }, '予定タブの「過去の記録」から入力できます'));
    return;
  }
  const { start, diff } = cyc.next;
  const tail = diff > 0 ? `あと${diff}日` : diff === 0 ? '今日の予定' : `${-diff}日過ぎ`;
  box.replaceChildren(h('small', {}, '次の生理(予想)'), h('b', {}, mdLabel(start), h('span', {}, tail)));
}

function moodItem(r) {
  const detail = [...(r.t || []), r.m].filter(Boolean).join('、');
  const d = parseYmd(r.d);
  return h('li', { class: 'item' },
    h('span', { style: 'display:flex;flex:none;width:26px;height:26px' }, r.l ? moonIcon(r.l) : h('span', { class: 'dot both' })),
    h('div', { class: 't' }, r.l ? `調子 ${r.l}/5` : '記録', h('small', {}, detail)),
    h('time', {}, `${d.getMonth() + 1}/${d.getDate()}`));
}

// ホームのカード: 3つの面(記念日1・記念日2・次の「両方」の予定)。名前は設定で決める。
const CARD_DEFAULTS = ['記念日1', '記念日2'];
const NEXT_DEFAULT = '次の予定';

function renderCard() {
  const box = $('#days');
  const today = ymd(new Date());
  const face = state.card % 3;
  let nodes;
  if (face < 2) {
    const a = state.ann[face];
    const label = a.l || CARD_DEFAULTS[face];
    if (a.d) {
      const n = daysSince(a.d, today);
      const next = nextMilestone(n);
      nodes = [h('small', {}, `${label}から`), h('b', {}, String(n), h('span', {}, '日')), h('small', {}, n > 0 && next === n ? '今日は節目の日です' : `次の節目(${next}日)まであと${next - n}日`)];
    } else {
      nodes = [h('small', {}, label), h('p', { class: 'hint' }, '設定の「ホームのカード」で日付を入れると、日数を数えます')];
    }
  } else {
    const label = state.nl || NEXT_DEFAULT;
    const ev = nextJoint(state.events, today);
    if (ev) {
      const diff = dayNum(ev.date) - dayNum(today);
      nodes = [h('small', {}, label), h('b', {}, diff === 0 ? '今日' : `あと${diff}`, diff === 0 ? null : h('span', {}, '日')), h('small', {}, `${ev.title}・${mdLabel(ev.date)}${ev.time ? ` ${ev.time}` : ''}`)];
    } else {
      nodes = [h('small', {}, label), h('p', { class: 'hint' }, 'カレンダーで「両方」を選んだ予定が、ここに出ます')];
    }
  }
  box.replaceChildren(...nodes, h('div', { class: 'dots' }, [0, 1, 2].map((i) => h('i', { class: i === face ? 'on' : '' }))));
}

function flipCard(dir) {
  state.card = (state.card + dir + 3) % 3;
  LS.set(K.card, String(state.card));
  const box = $('#days');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { renderCard(); return; }
  box.classList.add('flipping');
  setTimeout(() => { renderCard(); box.classList.remove('flipping'); }, 180);
}

function buildCard() {
  state.card = Number(LS.get(K.card)) || 0;
  const box = $('#days');
  box.setAttribute('role', 'button');
  box.setAttribute('aria-label', 'カードを切り替える');
  box.tabIndex = 0;
  let x0 = null;
  let y0 = 0;
  box.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; });
  box.addEventListener('pointercancel', () => { x0 = null; });
  box.addEventListener('pointerup', (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0;
    const dy = e.clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) flipCard(dx < 0 ? 1 : -1); // 左へスライドで次へ
    else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) flipCard(1); // タップで次へ
  });
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); flipCard(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); flipCard(-1); }
  });
}

function renderHome() {
  $('#home-title').textContent = `${myName()} & ${partnerName()}`;
  renderCard();
  renderPatBanner();
  renderBirthdayHome();
  renderNextMoon();
  const recent = [...state.days.values()].filter((r) => r.l || (r.t && r.t.length) || r.m).sort((a, b) => b.d.localeCompare(a.d)).slice(0, 3);
  $('#home-mood').replaceChildren(...(recent.length ? recent.map(moodItem) : [h('li', { class: 'empty' }, 'まだ記録がありません')]));
  const today = ymd(new Date());
  const upcoming = state.events.filter((e) => e.date >= today).sort(byDate).slice(0, 5);
  $('#home-events').replaceChildren(...(upcoming.length ? upcoming.map((e) => eventItem(e, false)) : [h('li', { class: 'empty' }, '予定はまだありません')]));
}

function renderChat() {
  const chat = $('#chat');
  $('#chat-title').textContent = partnerName();
  $('#chat-av').textContent = partnerName().slice(0, 1);
  const nearBottom = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 80;
  const nodes = [];
  let lastDay = '';
  const todayKey = ymd(new Date());
  const yesterdayKey = ymd(new Date(Date.now() - 864e5));
  const lastRead = [...state.messages].reverse().find((m) => m.from === myUid() && m.ts <= state.readAt);
  state.messages.forEach((m) => {
    const d = new Date(m.ts);
    const key = ymd(d);
    if (key !== lastDay) {
      lastDay = key;
      nodes.push(h('span', { class: 'dayline' }, key === todayKey ? '今日' : key === yesterdayKey ? '昨日' : `${d.getMonth() + 1}月${d.getDate()}日`));
    }
    const mine = m.from === myUid();
    const big = m.stamp || (m.body != null && isEmojiOnly(m.body) ? m.body.trim() : null);
    const bub = big
      ? h('div', { class: 'bub stamp' }, big)
      : h('div', { class: `bub${m.body == null ? ' bad' : ''}` }, m.body == null ? '(読めないメッセージ)' : m.body);
    if (mine) holdToDelete(bub, m.id);
    const del = mine && state.delId === m.id ? h('button', { class: 'del', type: 'button' }, '削除') : null;
    if (del) del.addEventListener('click', (e) => { e.stopPropagation(); state.delId = null; state.store.removeMessage(m.id).catch(() => {}); });
    nodes.push(h('div', { class: `row ${mine ? 'mine' : 'theirs'}` },
      bub,
      del,
      h('div', { class: 'meta' }, mine && lastRead === m ? h('span', {}, '既読', h('br')) : null, `${pad(d.getHours())}:${pad(d.getMinutes())}`)));
  });
  if (!nodes.length) nodes.push(h('span', { class: 'dayline' }, 'メッセージはまだありません'));
  chat.replaceChildren(...nodes);
  if (nearBottom || state.view === 'chat') chat.scrollTop = chat.scrollHeight;
  markRead();
}

// 自分のメッセージを長押しすると「削除」が出る(押すと、相手の画面からも消える)
function holdToDelete(el, id) {
  let t = null;
  const stop = () => { clearTimeout(t); t = null; };
  el.addEventListener('pointerdown', () => { stop(); t = setTimeout(() => { state.delId = id; state.delAt = Date.now(); renderChat(); }, 500); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => el.addEventListener(ev, stop));
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

// 相手のメッセージを読める画面にいるとき、「ここまで読んだ」を伝える
function markRead() {
  if (LS.get(K.rcpt) === '0' || state.view !== 'chat' || state.talk !== 'chat' || document.hidden || !state.store) return;
  const latest = Math.max(0, ...state.messages.filter((m) => m.from !== myUid()).map((m) => m.ts));
  if (latest <= state.readSent) return;
  state.readSent = latest;
  state.store.saveRead(latest).catch(() => { state.readSent = 0; });
}

// 選んだ日に気分の記録があれば、内容を大きく見せる
const canRecord = () => canRecordNow(state.dayOwners, myUid());

const heartIcon = () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = '<path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z"/>';
  return svg;
};
const timeLabel = (ms) => { const d = new Date(ms); return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

// 「よしよし」を送る(もう一度押すと取り消す)。送れるのは、記録を見る側だけ。
async function togglePat(date, mine) {
  const id = await C.dayId(state.keyBytes, `pat|${date}|${myUid()}`);
  try {
    if (mine) await withTimeout(state.store.removePat(id), 5000);
    else {
      state.justPat = date;
      await withTimeout(state.store.savePat(id, await C.encryptJson(state.key, 'pats', { d: date, by: myUid(), at: Date.now() })), 5000);
    }
  } catch (e) { /* 送れなかったときは、押す前の表示のまま */ }
}

// 選んだ日に気分の記録があれば、内容を大きく見せる
function renderDayDetail(date) {
  const box = $('#day-detail');
  const rec = state.days.get(date);
  const hasMood = rec && (rec.l || (rec.t && rec.t.length) || rec.m);
  if (!hasMood) { box.hidden = true; box.replaceChildren(); return; }
  const d = parseYmd(date);
  const level = LEVELS.find((x) => x[1] === rec.l);
  const mineRecord = canRecord();
  const pats = state.pats.get(date) || [];
  let edit = null;
  if (mineRecord) {
    edit = h('button', { class: 'ghost sm', type: 'button' }, '編集');
    edit.addEventListener('click', () => openDaySheet(date));
  }
  let patArea = null;
  if (!mineRecord) {
    const mine = pats.find((p) => p.by === myUid());
    const btn = h('button', { class: `pat${mine ? ' on' : ''}${state.justPat === date ? ' pop' : ''}`, type: 'button', 'aria-pressed': String(!!mine) }, heartIcon(), mine ? 'よしよししたよ' : 'よしよし');
    btn.addEventListener('click', () => togglePat(date, mine));
    patArea = btn;
    state.justPat = null;
  } else if (pats.length) {
    patArea = h('div', { class: 'stack' }, pats.sort((a, b) => b.at - a.at).map((p) => h('div', { class: 'dd-pat' }, heartIcon(), `${partnerName()}から よしよし`, h('small', {}, timeLabel(p.at)))));
  }
  box.replaceChildren(...[
    h('div', { class: 'dd-head' }, h('span', {}, `${d.getMonth() + 1}月${d.getDate()}日(${WEEK[d.getDay()]})${mineRecord ? '' : `  ・ ${partnerName()}の記録`}`), rec.p ? h('span', { class: 'dd-badge' }, '生理') : null, edit),
    level ? h('div', { class: 'dd-level', style: `color:var(--m${level[1]})` }, moonIcon(level[1]), h('b', {}, `調子 ${level[1]}/5`), h('span', {}, level[0])) : null,
    rec.t && rec.t.length ? h('div', { class: 'dd-tags' }, rec.t.map((t) => h('span', {}, t))) : null,
    rec.m ? h('p', { class: 'dd-memo' }, rec.m) : null,
    patArea,
  ].filter(Boolean));
  box.hidden = false;
}

// 他の人から届いた「よしよし」を、ホームに知らせる
function renderPatBanner() {
  const b = $('#pat-banner');
  const all = [...state.pats.entries()].flatMap(([d, list]) => list.map((p) => ({ ...p, d })));
  const unseen = unseenPats(all, myUid(), Number(LS.get(K.patSeen)) || 0);
  if (!unseen.length || !canRecord()) { b.hidden = true; return; }
  b.replaceChildren(heartIcon(), `${partnerName()}から よしよしが届いています(${unseen.length}件)`);
  b.hidden = false;
  b.onclick = () => {
    LS.set(K.patSeen, String(Math.max(...unseen.map((p) => p.at))));
    const dt = parseYmd(unseen[0].d);
    state.cal = { y: dt.getFullYear(), m: dt.getMonth(), sel: unseen[0].d };
    $('#ev-date').value = unseen[0].d;
    setView('cal');
  };
}

function renderCalendar() {
  const { y, m, sel } = state.cal;
  $('#cal-title').textContent = `${y}年${m + 1}月`;
  const first = new Date(y, m, 1).getDay();
  const count = new Date(y, m + 1, 0).getDate();
  const todayKey = ymd(new Date());
  const cyc = predict(periodDays(), todayKey);
  const cells = [...WEEK].map((w) => h('div', { class: 'w' }, w));
  for (let i = 0; i < first; i++) cells.push(h('div'));
  for (let d = 1; d <= count; d++) {
    const key = `${y}-${pad(m + 1)}-${pad(d)}`;
    const kinds = new Set(state.events.filter((e) => e.date === key).flatMap((e) => (kindOf(e) === 'both' ? ['me', 'you'] : [kindOf(e)])));
    const dots = [...kinds].map((k) => h('b', { class: k }));
    const rec = state.days.get(key);
    const classes = [key === todayKey ? 'today' : '', key === sel ? 'sel' : '', rec && rec.p ? 'period' : cyc.days.has(key) ? 'future' : ''].filter(Boolean).join(' ');
    const hasMood = rec && (rec.l || (rec.t && rec.t.length) || rec.m);
    const hasPat = state.pats.has(key);
    const hasCake = birthdayOn(parseYmd(key));
    cells.push(h('button', {
      type: 'button',
      class: classes,
      onclick: () => { state.cal.sel = key; $('#ev-date').value = key; renderCalendar(); },
    }, String(d), hasMood ? h('em', { class: 'mood', style: rec.l ? `background:var(--m${rec.l})` : null }) : null, hasPat ? h('em', { class: 'pat-mark' }, '♥') : null, hasCake ? h('em', { class: 'cake' }, cakeIcon()) : null, dots.length ? h('i', {}, dots) : null));
  }
  $('#month').replaceChildren(...cells);
  renderDayDetail(sel);
  $('.actions').hidden = !canRecord();
  $('#cyc-sum').replaceChildren(...(cyc.cycle ? ['平均の周期は ', h('b', {}, `${cyc.cycle}日`), '、生理の期間は ', h('b', {}, `${cyc.len}日`), 'くらいです。'] : ['記録が2回分たまると、予想が出ます。']));
  const dt = parseYmd(sel);
  $('#cal-day').textContent = `${dt.getMonth() + 1}/${dt.getDate()}(${WEEK[dt.getDay()]})`;
  const list = state.events.filter((e) => e.date === sel).sort(byDate);
  const bdItems = birthdayNames(parseYmd(sel)).map((nm) => h('li', { class: 'item' }, h('span', { style: 'display:flex;width:20px;color:var(--pink-deep)' }, cakeIcon()), h('div', { class: 't' }, `${nm}の誕生日`)));
  $('#cal-events').replaceChildren(...bdItems, ...(list.length ? list.map((e) => eventItem(e, true)) : bdItems.length ? [] : [h('li', { class: 'empty' }, 'この日の予定はありません')]));
}

function buildCalendar() {
  const move = (delta) => {
    const d = new Date(state.cal.y, state.cal.m + delta, 1);
    state.cal.y = d.getFullYear();
    state.cal.m = d.getMonth();
    renderCalendar();
  };
  $('#cal-prev').addEventListener('click', () => move(-1));
  $('#cal-next').addEventListener('click', () => move(1));
  $('#ev-date').value = state.cal.sel;
  $('#day-record').addEventListener('click', () => openDaySheet(state.cal.sel));
  $('#past-record').addEventListener('click', openPastSheet);
  $('#ev-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const who = $('input[name="who"]:checked').value;
    const payload = { title: $('#ev-title').value.trim(), date: $('#ev-date').value, time: $('#ev-time').value, who, by: myUid() };
    $('#ev-title').value = '';
    $('#ev-time').value = '';
    state.cal.sel = payload.date;
    const d = parseYmd(payload.date);
    state.cal.y = d.getFullYear();
    state.cal.m = d.getMonth();
    await state.store.saveEvent(null, await C.encryptJson(state.key, 'events', payload));
  });
}

async function sendPayload(payload) {
  const expire = EXPIRE_MS[LS.get(K.expire) || '7d'];
  await state.store.sendMessage(await C.encryptJson(state.key, 'messages', payload), expire);
}

function buildChat() {
  $('#chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('#msg');
    const body = input.value.trim();
    if (!body) return;
    input.value = '';
    await sendPayload({ body });
  });

  const tray = $('#stamps');
  const btn = $('#stamp-btn');
  const setTray = (open) => {
    tray.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  };
  STAMPS.forEach((s) => tray.append(h('button', {
    type: 'button',
    'aria-label': `スタンプ ${s}`,
    onclick: async () => { setTray(false); await sendPayload({ t: 'stamp', s }); },
  }, s)));
  btn.addEventListener('click', () => setTray(tray.hidden));
}

/* ================= 設定 ================= */
function openSheet(...nodes) {
  $('#sheet-body').replaceChildren(...nodes);
  $('#sheet').hidden = false;
}
function closeSheet() {
  state.pastRender = null;
  state.sheetRender = null;
  $('#sheet').hidden = true;
  $('#sheet-body').replaceChildren();
}

/* ================= 生理・気分の記録 ================= */
const emptyRec = (r) => !r.p && !r.l && !(r.t && r.t.length) && !r.m;
const withTimeout = (promise, ms) => Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))]);

// changes: [{ date, rec }]。rec が空なら、その日の記録を消す。
async function writeDays(changes) {
  const saves = [];
  const removes = [];
  for (const { date, rec } of changes) {
    const id = await C.dayId(state.keyBytes, date);
    if (!rec || emptyRec(rec)) removes.push(id);
    else saves.push({ id, payload: await C.encryptJson(state.key, 'days', { ...rec, d: date, by: myUid() }) });
  }
  // 通信できないときは、端末に保存して先に進む(つながったら送られる)。拒否されたときは例外になる。
  if (saves.length) await withTimeout(state.store.saveDays(saves), 5000);
  if (removes.length) await withTimeout(state.store.removeDays(removes), 5000);
}

const SAVE_ERROR = '保存できませんでした。通信と、アクセスルールの更新(days の許可)を確認してください。';

function openDaySheet(date) {
  if (!canRecord()) return;
  const rec = state.days.get(date) || { p: false, l: 0, t: [], m: '' };
  const draft = { p: !!rec.p, l: rec.l || 0, t: [...(rec.t || [])] };
  const d = parseYmd(date);

  const period = h('input', { type: 'checkbox', class: 'sw', 'aria-label': 'この日は生理' });
  period.checked = draft.p;
  period.addEventListener('change', () => { draft.p = period.checked; });

  const scale = h('div', { class: 'scale' });
  LEVELS.forEach(([label, lv]) => {
    const b = h('button', { type: 'button', 'aria-pressed': String(draft.l === lv) }, moonIcon(lv), label);
    b.style.setProperty('--c', `var(--m${lv})`);
    b.addEventListener('click', () => {
      draft.l = draft.l === lv ? 0 : lv;
      $$('button', scale).forEach((x, i) => x.setAttribute('aria-pressed', String(draft.l === LEVELS[i][1])));
    });
    scale.append(b);
  });

  const tags = h('div', { class: 'tags' });
  MOOD_TAGS.forEach((t) => {
    const b = h('button', { type: 'button', 'aria-pressed': String(draft.t.includes(t)) }, t);
    b.addEventListener('click', () => {
      const i = draft.t.indexOf(t);
      if (i >= 0) draft.t.splice(i, 1); else draft.t.push(t);
      b.setAttribute('aria-pressed', String(i < 0));
    });
    tags.append(b);
  });

  const memo = h('textarea', { maxlength: '200', placeholder: 'ひとことメモ', 'aria-label': 'ひとことメモ' });
  memo.value = rec.m || '';
  const err = h('p', { class: 'error', role: 'alert' });
  const save = h('button', { class: 'primary', type: 'button' }, '保存');
  save.addEventListener('click', async () => {
    err.textContent = '';
    save.disabled = true;
    try {
      await writeDays([{ date, rec: { p: draft.p, l: draft.l, t: draft.t, m: memo.value.trim().slice(0, 200) } }]);
      closeSheet();
    } catch (e) {
      err.textContent = SAVE_ERROR;
      save.disabled = false;
    }
  });

  openSheet(
    h('h2', {}, `${d.getMonth() + 1}月${d.getDate()}日(${WEEK[d.getDay()]})`),
    h('div', { class: 'srow' }, h('div', { class: 't' }, 'この日は生理', h('small', {}, '連続した日が、ひとまとまりになります')), period),
    h('div', {}, h('p', { class: 'lab' }, '今日の調子(新月 → 満月)'), scale),
    h('div', {}, h('p', { class: 'lab' }, '気分(いくつでも)'), tags),
    memo,
    h('p', { class: 'lock' }, '調子・気分・メモは、ふたりに共有されます。'),
    err,
    save,
  );
}

function openPastSheet() {
  if (!canRecord()) return;
  const start = h('input', { type: 'date', 'aria-label': 'はじまった日' });
  const end = h('input', { type: 'date', 'aria-label': 'おわった日' });
  const err = h('p', { class: 'error', role: 'alert' });
  const list = h('ul', { class: 'mini-list' });
  const add = h('button', { class: 'primary', type: 'button' }, '追加する');

  const render = () => {
    const runs = runsOf(periodDays()).reverse();
    list.replaceChildren(...(runs.length ? runs.map((r) => {
      const x = h('button', { class: 'x', type: 'button' }, '削除');
      x.addEventListener('click', async () => {
        if (!x.classList.contains('sure')) { x.classList.add('sure'); x.textContent = '本当に削除'; return; }
        const changes = [];
        for (let n = dayNum(r.start); n <= dayNum(r.end); n++) {
          const k = keyOf(n);
          changes.push({ date: k, rec: { ...(state.days.get(k) || {}), p: false } });
        }
        try { await writeDays(changes); } catch (e) { err.textContent = SAVE_ERROR; }
      });
      return h('li', { class: 'item' }, h('span', { class: 'dot p' }),
        h('div', { class: 't' }, `${mdLabel(r.start)} 〜 ${mdLabel(r.end)}`, h('small', {}, `${r.len}日間`)), x);
    }) : [h('li', { class: 'empty' }, 'まだ記録がありません')]));
  };
  state.pastRender = render;

  add.addEventListener('click', async () => {
    err.textContent = '';
    if (!start.value || !end.value) { err.textContent = '日付を入れてください'; return; }
    const a = dayNum(start.value);
    const b = dayNum(end.value);
    if (b < a || b - a > 13) { err.textContent = 'おわった日は、はじまった日から14日以内にしてください'; return; }
    const changes = [];
    for (let n = a; n <= b; n++) {
      const k = keyOf(n);
      changes.push({ date: k, rec: { ...(state.days.get(k) || { l: 0, t: [], m: '' }), p: true } });
    }
    try { await writeDays(changes); start.value = ''; end.value = ''; } catch (e) { err.textContent = SAVE_ERROR; }
  });

  openSheet(
    h('h2', {}, '生理の記録'),
    h('p', { class: 'lock' }, '入力した日付は、この端末で暗号化されてから保存されます。ふたり以外には読めません。チャットなどには書かないでください。'),
    h('div', { class: 'pair' }, h('label', {}, 'はじまった日', start), h('label', {}, 'おわった日', end)),
    err,
    add,
    h('p', { class: 'lab' }, 'いまの記録'),
    list,
  );
  render();
}

function openCardSheet() {
  const field = (i) => {
    const l = h('input', { type: 'text', maxlength: '14', placeholder: CARD_DEFAULTS[i], 'aria-label': `カード${i + 1}の名前` });
    l.value = state.ann[i].l;
    const d = h('input', { type: 'date', 'aria-label': `カード${i + 1}の日付` });
    d.value = state.ann[i].d;
    return { l, d };
  };
  const a = field(0);
  const b = field(1);
  const n = h('input', { type: 'text', maxlength: '14', placeholder: NEXT_DEFAULT, 'aria-label': 'カード3の名前' });
  n.value = state.nl;
  const err = h('p', { class: 'error', role: 'alert' });
  const save = h('button', { class: 'primary', type: 'button' }, '保存');
  save.addEventListener('click', async () => {
    err.textContent = '';
    save.disabled = true;
    const payload = buildSharedPayload({
      ann: [{ l: a.l.value.trim(), d: a.d.value }, { l: b.l.value.trim(), d: b.d.value }],
      nl: n.value.trim(),
    });
    try {
      await withTimeout(state.store.saveShared(await C.encryptJson(state.key, 'shared', payload)), 5000);
      closeSheet();
    } catch (e) {
      err.textContent = '保存できませんでした。通信を確認してください。';
      save.disabled = false;
    }
  });
  openSheet(
    h('h2', {}, 'ホームのカード'),
    h('p', { class: 'lock' }, '名前と日付は暗号化されて保存され、相手の画面にも同じものが出ます。カードは、タップかスライドで切り替わります。'),
    h('p', { class: 'lab' }, 'カード1(名前と日付)'), h('div', { class: 'stack' }, a.l, a.d),
    h('p', { class: 'lab' }, 'カード2(名前と日付)'), h('div', { class: 'stack' }, b.l, b.d),
    h('p', { class: 'lab' }, 'カード3(カレンダーで「両方」を選んだ、次の予定まで)'), n,
    err,
    save,
  );
}

// アプリのファイルをサーバーから取り直して、再読み込みする(ブラウザの一時保存を飛ばす)
const SHELL_FILES = [
  'index.html', 'css/style.css', 'manifest.webmanifest',
  'js/app.js', 'js/crypto.js', 'js/cities.js', 'js/weather.js', 'js/config.js', 'js/store.js', 'js/emoji.js', 'js/cycle.js', 'js/card.js', 'js/share.js', 'js/qa.js', 'js/dates.js', 'js/export.js',
];

async function refreshApp(btn) {
  btn.disabled = true;
  btn.textContent = '更新中…';
  try {
    await Promise.all(SHELL_FILES.map((f) => fetch(f, { cache: 'reload' })));
    if (window.caches) { const keys = await caches.keys(); await Promise.all(keys.map((k) => caches.delete(k))); }
  } catch (e) { /* 取れなくても、再読み込みはする */ }
  location.reload();
}

function applyTheme(v) {
  if (v === 'light' || v === 'dark') document.documentElement.dataset.theme = v;
  else delete document.documentElement.dataset.theme;
}

function row(title, note, control) {
  return h('li', {}, h('div', { class: 't' }, title, note ? h('small', {}, note) : null), control);
}

function renderSettings() {
  const auto = h('input', { type: 'checkbox', class: 'sw', 'aria-label': '自動で最初の画面に戻る' });
  auto.checked = LS.get(K.auto) !== '0';
  auto.addEventListener('change', () => LS.set(K.auto, auto.checked ? '1' : '0'));

  const expire = h('select', { 'aria-label': '自動で消す期間' },
    h('option', { value: '24h' }, '24時間'), h('option', { value: '7d' }, '7日'), h('option', { value: 'off' }, '消さない'));
  expire.value = LS.get(K.expire) || '7d';
  expire.addEventListener('change', () => LS.set(K.expire, expire.value));

  const name = h('input', { type: 'text', maxlength: '12', value: myName(), 'aria-label': '名前' });
  const saveName = h('button', { class: 'act', type: 'button' }, '保存');
  saveName.addEventListener('click', async () => {
    const v = name.value.trim();
    if (!v) return;
    LS.set(K.name, v);
    await state.store.saveProfile(myUid(), await C.encryptJson(state.key, 'profiles', profilePayload()));
    saveName.textContent = '保存しました';
  });

  const bd0 = myBd() || {};
  const bdM = h('select', { 'aria-label': '誕生日の月' }, h('option', { value: '' }, '--'), ...Array.from({ length: 12 }, (_, i) => h('option', { value: String(i + 1) }, `${i + 1}月`)));
  const bdD = h('select', { 'aria-label': '誕生日の日' }, h('option', { value: '' }, '--'), ...Array.from({ length: 31 }, (_, i) => h('option', { value: String(i + 1) }, `${i + 1}日`)));
  bdM.value = bd0.m ? String(bd0.m) : '';
  bdD.value = bd0.d ? String(bd0.d) : '';
  const saveBd = async () => {
    if (!bdM.value || !bdD.value) return;
    LS.set(K.bd, JSON.stringify({ m: Number(bdM.value), d: Number(bdD.value) }));
    await state.store.saveProfile(myUid(), await C.encryptJson(state.key, 'profiles', profilePayload()));
    renderAll();
  };
  bdM.addEventListener('change', saveBd);
  bdD.addEventListener('change', saveBd);

  const rcpt = h('input', { type: 'checkbox', class: 'sw', 'aria-label': '既読を相手に伝える' });
  rcpt.checked = LS.get(K.rcpt) !== '0';
  rcpt.addEventListener('change', () => { LS.set(K.rcpt, rcpt.checked ? '1' : '0'); markRead(); });

  const exportBtn = h('button', { class: 'act', type: 'button' }, '書き出す');
  exportBtn.addEventListener('click', () => {
    if (!confirm('暗号化されていない、読める形のファイルが端末に保存されます。人に見られない場所で保管してください。')) return;
    const text = buildExport({ me: myName(), partner: partnerName(), myUid: myUid(), messages: state.messages.map((m) => ({ ...m, ts: m.ts && m.ts.toMillis ? m.ts.toMillis() : m.ts })), events: state.events, days: state.days, qcards: state.qcards, answers: state.answers, boxes: state.boxes, items: state.items });
    const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })), download: `記録の書き出し-${ymd(new Date())}.txt` });
    document.body.append(a);
    a.click();
    a.remove();
  });

  const cardBtn = h('button', { class: 'act', type: 'button' }, '設定');
  cardBtn.addEventListener('click', openCardSheet);

  const theme = h('select', { 'aria-label': '画面の色' },
    h('option', { value: 'auto' }, '自動'), h('option', { value: 'light' }, 'ライト'), h('option', { value: 'dark' }, 'ダーク'));
  theme.value = LS.get(K.theme) || 'auto';
  theme.addEventListener('change', () => { LS.set(K.theme, theme.value); applyTheme(theme.value); });

  const refreshBtn = h('button', { class: 'act', type: 'button' }, '最新版にする');
  refreshBtn.addEventListener('click', () => refreshApp(refreshBtn));

  const reseq = h('button', { class: 'act', type: 'button' }, '変更');
  reseq.addEventListener('click', () => startRecording('set'));

  const showCode = h('button', { class: 'act', type: 'button' }, '表示');
  showCode.addEventListener('click', () => {
    const copy = h('button', { class: 'ghost', type: 'button' }, 'コードをコピー');
    const code = h('div', { class: 'code' }, C.toCode(state.keyBytes));
    copy.addEventListener('click', () => copyText(code.textContent, copy));
    openSheet(h('h2', {}, 'バックアップコード'), h('p', { class: 'lead' }, 'これがキーそのものです。人に見られない場所で、紙に控えてください。写真やメモアプリには残さないでください。'), code, copy);
  });

  const showFp = h('button', { class: 'act', type: 'button' }, '表示');
  showFp.addEventListener('click', async () => {
    openSheet(h('h2', {}, 'キーの確認番号'), h('p', { class: 'fp' }, h('b', {}, await C.fingerprint(state.keyBytes))), h('p', { class: 'lead' }, '相手の画面の番号と同じなら、同じキーを使えています。違うときは、キーを作り直してください。'));
  });

  const out = h('button', { class: 'act warn', type: 'button' }, 'ログアウト');
  out.addEventListener('click', async () => { stopWatching(); await state.store.logout(); lock(); });

  const wipe = h('button', { class: 'act warn', type: 'button' }, '消す');
  wipe.addEventListener('click', () => {
    if (wipe.textContent !== '消す') {
      stopWatching();
      LS.del(K.key);
      state.key = null;
      state.keyBytes = null;
      lock();
      return;
    }
    wipe.textContent = '本当に消す';
  });

  const active = document.activeElement;
  if (active && $('#settings').contains(active)) return; // 入力中に作り直さない
  $('#settings').replaceChildren(
    row('あなたの名前', '相手の画面に表示されます', h('span', { style: 'display:flex;gap:6px' }, name, saveName)),
    row('誕生日', '月と日だけ。相手にも見えます', h('span', { style: 'display:flex;gap:6px' }, bdM, bdD)),
    row('画面の色', '自動は、端末の設定に合わせます', theme),
    row('ホームのカード', '名前と日付を、自分で決められます', cardBtn),
    row('離れたら最初の画面に戻る', '開き直すと最初の画面から始まります', auto),
    row('既読を相手に伝える', 'オフにすると、あなたが読んだ印は出ません', rcpt),
    row('メッセージを自動で消す', '自分が送る分に適用されます', expire),
    row('起動パターン', '最初の画面で、都市を決めた順に6つタップします', reseq),
    row('データの書き出し', '読める文章のファイルで保存します(暗号化されません)', exportBtn),
    row('バックアップコード', '機種変更やデータが消えたときに使います', showCode),
    row('キーの確認番号', '同じ番号か見比べます', showFp),
    row('ログアウト', null, out),
    row('バージョン', VERSION, refreshBtn),
    row('この端末からキーを消す', 'バックアップコードがないと、過去の会話は読めなくなります', wipe),
  );
}

/* ================= おはなし(お題・カード・ボックス・誕生日) ================= */
const rid = () => crypto.randomUUID().replaceAll('-', '');
const whoClass = (uid) => (uid === myUid() ? 'me' : 'you');
const uidName = (uid) => (uid === myUid() ? myName() : partnerName());
const mdText = (ms) => { const d = new Date(ms); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`; };
const myAnswer = (n) => state.answers.get(answerKey(n, myUid()));
const otherAnswer = (n) => [...state.answers.values()].find((a) => a.n === n && a.owner !== myUid());
const draft = new Map();
let advancing = false;

function svgOf(inner, cls) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('aria-hidden', 'true');
  if (cls) s.setAttribute('class', cls);
  s.innerHTML = inner;
  return s;
}
const cakeIcon = () => svgOf('<path d="M12 2c.9 1 1.4 1.900 1.400 2.700A1.400 1.400 0 0 1 10.600 4.700C10.600 3.900 11.100 3 12 2ZM4 14a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1.500c-1.100 0-1.700.8-2.700.8s-1.600-.8-2.700-.8-1.600.8-2.600.8-1.600-.8-2.700-.8-1.600.8-2.700.8-1.700-.8-2.600-.8ZM4 17.500c1 0 1.500.8 2.600.8s1.600-.8 2.700-.8 1.600.8 2.700.8 1.600-.8 2.600-.8 1.600.8 2.700.8 1.600-.8 2.700-.8V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2ZM11 8h2v3h-2Z"/>', 'cake-icon');
const capsuleIcon = () => svgOf('<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.600"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.600" stroke-linecap="round"/>');

/* ---- 誕生日 ---- */
function myBd() {
  try { const v = JSON.parse(LS.get(K.bd)); return v && v.m && v.d ? v : null; } catch (e) { return null; }
}
const partnerBd = () => { const p = state.profiles[partnerUid()]; return p && p.bd && p.bd.m && p.bd.d ? p.bd : null; };
const profilePayload = () => { const bd = myBd(); return bd ? { name: myName(), bd } : { name: myName() }; };
const bdList = () => [[myUid(), myBd()], [partnerUid(), partnerBd()]].filter(([u, b]) => u && b);
const birthdayNames = (date) => bdList().filter(([, b]) => isBirthdayOn(b.m, b.d, date)).map(([u]) => uidName(u));
const birthdayOn = (date) => birthdayNames(date).length > 0;
const boxById = (id) => state.boxes.find((b) => b.id === id);

function giftBox() {
  const bd = partnerBd();
  if (!bd || !partnerUid()) return null;
  const nb = nextBirthday(bd.m, bd.d, new Date());
  return { ...nb, id: `b${nb.date.getFullYear()}-${partnerUid()}`, year: nb.date.getFullYear() };
}

function renderBirthdayHome() {
  const banner = $('#bd-banner');
  const today = $('#bd-today');
  const gb = giftBox();
  const written = gb && (state.marks.get(gb.id) || []).some((m) => m.from === myUid());
  if (gb && gb.daysLeft >= 1 && gb.daysLeft <= POP_DAYS && !written) {
    banner.replaceChildren(cakeIcon(), h('span', {}, 'お相手に誕生日メッセージをしたためておきましょう', h('br'), h('small', {}, '(当日、相手に届きます)')));
    banner.onclick = () => openCompose(gb.id, gb);
    banner.hidden = false;
  } else banner.hidden = true;

  const now = new Date();
  const nodes = [];
  bdList().forEach(([uid, b]) => {
    if (!isBirthdayOn(b.m, b.d, now)) return;
    const id = `b${now.getFullYear()}-${uid}`;
    if (uid === myUid()) {
      const msgs = (state.items.get(id) || []).filter((i) => i.from !== myUid());
      nodes.push(h('div', { class: 'bd-today' }, cakeIcon(), h('b', {}, `${myName()}、お誕生日おめでとう`), h('span', {}, `${partnerName()}から、${msgs.length ? 'メッセージが届いています' : 'おめでとうのきもちが届いています'}`), ...msgs.map((i) => h('div', { class: 'ans you' }, h('small', {}, partnerName()), i.text))));
    } else {
      nodes.push(h('div', { class: 'bd-today' }, cakeIcon(), h('b', {}, `今日は${partnerName()}の誕生日`), h('span', {}, 'おめでとうを伝えよう')));
    }
  });
  today.replaceChildren(...nodes);
  today.hidden = !nodes.length;
}

/* ---- お題 ---- */
async function createCard(n, text, stockId, by) {
  const payload = await C.encryptJson(state.key, 'qcards', { text, stockId: stockId || null, date: ymd(new Date()), by: by || myUid() });
  await state.store.createQCard(`q${n}`, n, payload);
}

async function makeNextCard(n) {
  const pick = pickStock(availableStock(state.stock, state.qcards), n);
  if (!pick) { state.needInput = n; renderTalk(); return; }
  await createCard(n, pick.text, pick.id, pick.from);
}

async function maybeAdvance() {
  if (advancing || !state.store || !state.key || !state.loaded.stock || !state.loaded.qcards || !state.loaded.answers) return;
  const act = nextAction(state.qcards, state.answers, ymd(new Date()));
  if (act.type !== 'create' || state.needInput === act.n) return;
  advancing = true;
  try { await makeNextCard(act.n); } catch (e) { /* 相手が先に出したとき。次の更新で表示される */ } finally { advancing = false; }
}

function answerForm(card) {
  const t0Key = `app.t0.${card.n}`;
  if (!LS.get(t0Key)) LS.set(t0Key, String(Date.now()));
  let edits = 0;
  const box = h('textarea', { rows: '4', maxlength: '500', placeholder: 'あなたの答え', 'aria-label': 'あなたの答え' });
  box.value = draft.get(card.n) || '';
  box.addEventListener('input', (e) => {
    draft.set(card.n, box.value);
    if (e.inputType && e.inputType.startsWith('delete')) edits += 1;
    send.disabled = !box.value.trim();
  });
  const err = h('p', { class: 'error', role: 'alert' });
  const send = h('button', { class: 'primary', type: 'submit' }, 'こたえる');
  send.disabled = !box.value.trim();
  const f = h('form', { class: 'stack' }, h('small', { class: 'lead' }, 'こたえると、あとから書き直せません。'), box, err, send);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = box.value.trim();
    if (!text) return;
    send.disabled = true;
    try {
      const payload = await C.encryptJson(state.key, 'answers', { n: card.n, text, at: Date.now(), t0: Number(LS.get(t0Key)) || 0, edits });
      const id = await C.dayId(state.keyBytes, `ans|${card.n}|${myUid()}`);
      await state.store.saveAnswer(id, payload);
      draft.delete(card.n);
      LS.del(t0Key);
    } catch (x) { err.textContent = '送れませんでした。もう一度ためしてください。'; send.disabled = false; }
  });
  return f;
}

function answersBlock(n) {
  const mine = myAnswer(n);
  const theirs = otherAnswer(n);
  const bubble = (a, cls, who) => h('div', { class: `ans ${cls}` }, h('small', {}, who), a.text, h('span', { class: 'meta' }, describeAnswer(a)));
  if (mine && theirs) return [bubble(mine, 'me flip-in', myName()), bubble(theirs, 'you flip-in', partnerName())];
  if (mine) return [bubble(mine, 'me', myName()), h('div', { class: 'ans wait' }, `${partnerName()}の答えを待っています`)];
  if (theirs) return [h('div', { class: 'ans wait' }, `${partnerName()}はもう答えました。あなたが答えると、ふたり同時に見られます`)];
  return [];
}

function forcedForm(n) {
  const input = h('input', { type: 'text', maxlength: '80', placeholder: '今日のお題を入力', 'aria-label': '今日のお題' });
  const err = h('p', { class: 'error', role: 'alert' });
  const btn = h('button', { class: 'primary', type: 'submit' }, 'このお題にする');
  const f = h('form', { class: 'stack' }, h('p', { class: 'lead' }, 'お題のストックがありません。今日のお題を入力してください。'), input, err, btn);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    btn.disabled = true;
    try { await createCard(n, text, null, myUid()); state.needInput = null; } catch (x) { state.needInput = null; err.textContent = 'すでに次のお題が出ていました'; renderTalk(); }
  });
  return f;
}

let qSig = '';
function renderQuestion() {
  const cards = state.qcards;
  const last = cards[cards.length - 1];
  const ready = state.loaded.stock && state.loaded.qcards && state.loaded.answers;
  const avail = availableStock(state.stock, cards).length;
  $('#stock-n').textContent = String(avail);
  const act = ready ? nextAction(cards, state.answers, ymd(new Date())) : null;
  const sig = JSON.stringify([ready, last && last.id, last && [!!myAnswer(last.n), !!otherAnswer(last.n)], act && act.type, state.needInput, partnerName()]);
  if (sig === qSig) return;
  qSig = sig;
  const area = $('#q-area');
  const q = $('#qcard');
  if (last) {
    q.dataset.by = whoClass(last.by);
    $('#q-meta').textContent = `第${last.n}問 ・ ${last.date.slice(5).replace('-', '/')}`;
    $('#q-text').textContent = last.text;
  } else {
    q.dataset.by = '';
    $('#q-meta').textContent = 'お題';
    $('#q-text').textContent = ready ? 'まだお題がありません' : '読み込み中…';
  }
  const nodes = [];
  if (last) {
    nodes.push(...answersBlock(last.n));
    if (!myAnswer(last.n)) nodes.push(answerForm(last));
    if (act && act.type === 'wait' && act.until === 'tomorrow') nodes.push(h('p', { class: 'lead' }, '次のお題は、明日の0時に届きます。'));
    if (act && act.type === 'skip-ok') {
      const next = h('button', { class: 'ghost', type: 'button' }, '次のお題を出す');
      next.addEventListener('click', async () => { next.disabled = true; try { await makeNextCard(act.n); } catch (e) { next.disabled = false; } });
      nodes.push(h('p', { class: 'lead' }, `${partnerName()}がまだ答えていません。このお題は「お休み」にして、あとからいつでも答えられます。`), next);
    }
  }
  if (ready && state.needInput != null && (!last || state.needInput === last.n + 1)) nodes.push(forcedForm(state.needInput));
  area.replaceChildren(...nodes);
}

/* ---- カード ---- */
function renderCards() {
  $$('#c-chips button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === state.cfilter)));
  const cards = [...state.qcards].reverse().filter((c) => {
    const st = cardStatus(c, state.qcards, state.answers);
    return state.cfilter === 'all' || st === state.cfilter || (state.cfilter === 'rest' && st === 'rest');
  });
  $('#c-count').textContent = `${cards.length}枚`;
  $('#c-grid').replaceChildren(...cards.map((c) => {
    const st = cardStatus(c, state.qcards, state.answers);
    const line = st === 'complete' ? 'ふたりの答えがそろった' : st === 'rest' ? 'お休み(あとから答えられる)' : 'いまのお題';
    const cls = st === 'complete' ? 'me' : 'none';
    const b = h('button', { class: 'ccard', type: 'button', 'data-by': whoClass(c.by) }, h('time', {}, `第${c.n}問 ・ ${c.date.slice(5).replace('-', '/')}`), h('b', {}, c.text), h('span', { class: `a ${cls}` }, line));
    b.addEventListener('click', () => openQCardSheet(c.n));
    return b;
  }));
}

function openQCardSheet(n) {
  const body = h('div', { class: 'stack' });
  let sig = '';
  const fill = () => {
    const c = state.qcards.find((x) => x.n === n);
    if (!c) return;
    const s = JSON.stringify([!!myAnswer(n), !!otherAnswer(n), partnerName()]);
    if (s === sig) return;
    sig = s;
    const st = cardStatus(c, state.qcards, state.answers);
    const q = h('div', { class: 'qcard', 'data-by': whoClass(c.by) }, h('small', {}, `第${c.n}問 ・ ${c.date.slice(5).replace('-', '/')}${st === 'rest' ? ' ・ お休み' : ''}`), h('b', {}, c.text));
    const kids = [q, ...answersBlock(n)];
    if (!myAnswer(n)) kids.push(answerForm(c));
    body.replaceChildren(...kids);
  };
  state.sheetRender = fill;
  fill();
  openSheet(body);
  state.sheetRender = fill;
}

/* ---- お題ストック ---- */
function openStockSheet() {
  const list = h('ul', { class: 'stack', style: 'list-style:none;padding:0;margin:0' });
  const fill = () => {
    const used = new Set(state.qcards.map((c) => c.stockId).filter(Boolean));
    list.replaceChildren(...(state.stock.length ? state.stock.map((s) => {
      const isUsed = used.has(s.id);
      const del = s.from === myUid() && !isUsed ? h('button', { type: 'button' }, '削除') : null;
      if (del) del.addEventListener('click', () => state.store.removeStock(s.id).catch(() => {}));
      return h('li', { class: 'sitem', 'data-by': whoClass(s.from) }, h('span', {}, s.text, isUsed ? h('small', { style: 'color:var(--muted)' }, ' (使用済み)') : null), del);
    }) : [h('li', { class: 'empty' }, 'まだありません')]));
  };
  const one = h('input', { type: 'text', maxlength: '80', placeholder: 'お題を1つ追加', 'aria-label': 'お題を1つ追加' });
  const addOne = h('button', { class: 'ghost sm', type: 'button' }, '追加');
  const bulk = h('textarea', { rows: '4', placeholder: 'まとめて追加(1行に1つ)', 'aria-label': 'まとめて追加' });
  const addBulk = h('button', { class: 'ghost sm', type: 'button' }, 'まとめて追加');
  const push = async (texts) => {
    for (const t of texts) {
      await state.store.addStock(await C.encryptJson(state.key, 'stock', { text: t, at: Date.now() }));
    }
  };
  addOne.addEventListener('click', async () => { const t = one.value.trim(); if (!t) return; one.value = ''; await push([t]).catch(() => {}); });
  addBulk.addEventListener('click', async () => {
    const ts = bulk.value.split('\n').map((x) => x.trim().slice(0, 80)).filter(Boolean);
    if (!ts.length) return;
    bulk.value = '';
    await push(ts).catch(() => {});
  });
  state.sheetRender = fill;
  fill();
  openSheet(h('h2', {}, 'お題ストック'), h('p', { class: 'lead' }, '毎日のお題は、ここからランダムに選ばれます。ふたりとも足せます。角の色は、足した人です。'), list, one, addOne, bulk, addBulk);
  state.sheetRender = fill;
}

/* ---- ボックス ---- */
const isOpened = (b) => b.openAt <= Date.now();
const itemsOf = (id) => state.items.get(id) || [];

let itemsBusy = false;
async function refreshItems() {
  if (itemsBusy || !state.store || !state.key) return;
  const lim = Date.now() - 120000;
  const need = state.boxes.some((b) => b.openAt <= lim && (state.marks.get(b.id) || []).length > itemsOf(b.id).length);
  if (!need) return;
  itemsBusy = true;
  try {
    const docs = await state.store.loadItems(lim);
    const next = new Map();
    for (const d of docs) {
      const p = await decrypt('items', d);
      if (!p || !p.text) continue;
      if (!next.has(d.box)) next.set(d.box, []);
      next.get(d.box).push({ id: d.id, from: d.from, text: p.text, at: p.at || 0 });
    }
    next.forEach((v) => v.sort((a, b) => a.at - b.at));
    state.items = next;
    renderAll();
  } catch (e) { /* 読めなかったら、次の機会にもう一度 */ } finally { itemsBusy = false; }
}

function boxTitle(b) {
  if (b.kind === 'bd') return `${uidName(b.forUid)}への誕生日ボックス`;
  return b.title || 'タイムカプセル';
}

function renderBoxes() {
  const now = Date.now();
  const visible = state.boxes.filter((b) => !(b.kind === 'bd' && b.forUid === myUid() && b.openAt > now)).sort((a, b) => a.openAt - b.openAt);
  $('#b-list').replaceChildren(...(visible.length ? visible.map((b) => {
    const opened = b.openAt <= now;
    const count = (state.marks.get(b.id) || []).length;
    const days = Math.max(1, Math.ceil((b.openAt - now) / 864e5));
    const right = h('div', { class: 'count' }, opened ? `${count}通` : `あと${days}日`, h('small', {}, opened ? 'ひらく' : `${count}通 入ってる`));
    const card = h('div', { class: 'bx' }, h('div', { class: 'top' }, b.kind === 'bd' ? cakeIcon() : capsuleIcon(), h('h2', {}, boxTitle(b), h('small', {}, `${opened ? '開いた日' : '開く日'} ${mdText(b.openAt)}`)), right));
    if (opened) {
      card.addEventListener('click', () => openBoxSheet(b.id));
      card.style.cursor = 'pointer';
    } else {
      const acts = h('div', { style: 'display:flex;gap:8px' });
      const add = h('button', { class: 'ghost sm', type: 'button', style: 'flex:1' }, 'メッセージを入れる');
      add.addEventListener('click', () => openCompose(b.id));
      acts.append(add);
      if (b.from === myUid()) {
        const del = h('button', { class: 'ghost sm', type: 'button' }, '削除');
        del.addEventListener('click', () => { if (confirm('このボックスを削除しますか?(入れたメッセージも読めなくなります)')) state.store.removeBox(b.id).catch(() => {}); });
        acts.append(del);
      }
      card.append(acts);
    }
    return card;
  }) : [h('p', { class: 'lead' }, 'まだボックスがありません。下からタイムカプセルをつくれます。')]));
}

function openBoxSheet(id) {
  const body = h('div', { class: 'stack' });
  let sig = '';
  const fill = () => {
    const b = boxById(id);
    if (!b) return;
    const items = itemsOf(id);
    const marks = (state.marks.get(id) || []).length;
    const s = JSON.stringify([items.length, marks]);
    if (s === sig) return;
    sig = s;
    const head = h('h2', {}, boxTitle(b));
    const kids = [head, h('p', { class: 'lead' }, `${mdText(b.openAt)} に開きました`)];
    if (!items.length) kids.push(h('p', { class: 'lead' }, marks ? '読み込み中…' : '何も入っていませんでした'));
    items.forEach((i) => kids.push(h('div', { class: `ans ${whoClass(i.from)}` }, h('small', {}, uidName(i.from)), i.text, h('span', { class: 'meta' }, describeAnswer({ at: i.at })))));
    body.replaceChildren(...kids);
    if (marks > items.length) refreshItems();
  };
  openSheet(body);
  state.sheetRender = fill;
  fill();
}

// メッセージを入れる。誕生日ボックスは、まだ無ければここで作る(gb がそのとき渡される)
function openCompose(boxId, gb) {
  const ta = h('textarea', { rows: '5', maxlength: '800', placeholder: 'メッセージ', 'aria-label': 'メッセージ' });
  const err = h('p', { class: 'error', role: 'alert' });
  const send = h('button', { class: 'primary', type: 'submit' }, '封をして入れる');
  const f = h('form', { class: 'stack' }, h('h2', {}, 'メッセージを入れる'), h('p', { class: 'lead' }, '封をすると、開く日まで、あなたにも読めません。'), ta, err, send);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = ta.value.trim();
    if (!text) return;
    send.disabled = true;
    try {
      let box = boxById(boxId);
      const openAt = box ? box.openAt : midnightMs(ymd(gb.date));
      if (!box) {
        const payload = await C.encryptJson(state.key, 'boxes', { kind: 'bd', title: '', forUid: partnerUid(), y: gb.year });
        try { await state.store.createBox(boxId, payload, openAt); } catch (x) { /* すでにある */ }
      }
      await state.store.addItem(rid(), boxId, openAt, await C.encryptJson(state.key, 'items', { text, at: Date.now() }));
      closeSheet();
    } catch (x) { err.textContent = '入れられませんでした。開く日をすぎていないか確認してください。'; send.disabled = false; }
  });
  openSheet(f);
}

function buildTalk() {
  const set = (t) => {
    state.talk = t;
    LS.set(K.talk, t);
    $$('#talk-seg button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.t === t)));
    ['chat', 'q', 'c', 'b'].forEach((k) => $(`#t-${k}`).classList.toggle('on', k === t));
    if (t === 'chat') { const c = $('#chat'); c.scrollTop = c.scrollHeight; }
    renderTalk();
    markRead();
  };
  $$('#talk-seg button').forEach((b) => b.addEventListener('click', () => set(b.dataset.t)));
  const saved = LS.get(K.talk);
  set(['chat', 'q', 'c', 'b'].includes(saved) ? saved : 'q');
  $('#stock-open').addEventListener('click', openStockSheet);
  $$('#c-chips button').forEach((b) => b.addEventListener('click', () => { state.cfilter = b.dataset.f; renderCards(); }));
  $('#cap-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#cap-error');
    err.textContent = '';
    const date = $('#cap-date').value;
    if (!date || date <= ymd(new Date())) { err.textContent = '開く日は、明日以降を選んでください。'; return; }
    try {
      const id = rid();
      const payload = await C.encryptJson(state.key, 'boxes', { kind: 'cap', title: $('#cap-name').value.trim() });
      await state.store.createBox(id, payload, midnightMs(date));
      $('#cap-name').value = '';
      $('#cap-date').value = '';
      openCompose(id, null);
    } catch (x) { err.textContent = 'つくれませんでした。もう一度ためしてください。'; }
  });
  setInterval(() => { if ($('#app').hidden) return; maybeAdvance(); refreshItems(); renderHome(); renderTalk(); }, 60000);
}

function renderTalk() {
  if ($('#app').hidden) return;
  renderQuestion();
  renderCards();
  renderBoxes();
}

/* ================= 起動 ================= */
function init() {
  applyTheme(LS.get(K.theme));
  buildCover();
  buildGate();
  buildCalendar();
  buildCard();
  buildChat();
  buildTalk();
  $$('[data-hide]').forEach((b) => b.addEventListener('click', lock));
  $$('.tab').forEach((t) => t.addEventListener('click', () => setView(t.dataset.v)));
  $('#sheet-close').addEventListener('click', closeSheet);

  // アプリを離れたら最初の画面に戻す
  const away = () => { if (LS.get(K.auto) !== '0' && $('#cover').hidden) lock(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) away(); else markRead(); });
  window.addEventListener('pagehide', away);
  document.addEventListener('click', () => { if (state.delId && Date.now() - state.delAt > 700) { state.delId = null; renderChat(); } });

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
