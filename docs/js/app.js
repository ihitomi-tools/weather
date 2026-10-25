import { DEMO } from './demo-boot.js';
import { CITIES, SEQUENCE_LENGTH } from './cities.js';
import { loadWeather, isRainy } from './weather.js';
import { isEmojiOnly } from './emoji.js';
import { predict, runsOf, dayNum, keyOf } from './cycle.js';
import { daysSince, nextMilestone, nextJoint, normalizeShared, buildSharedPayload, evType, EV_TYPES } from './card.js';
import { unseenPats } from './share.js';
import { answerKey, nextAction, cardStatus, availableStock, pickStock, WHISPER, describeAnswer, guessOf, otherGuessOf, guessPhase, partnerGuessView, isRate } from './qa.js';
import { nextBirthday, nextGiftBirthday, isBirthdayOn, midnightMs, POP_DAYS } from './dates.js';
import { buildExport } from './export.js';
import { sectionKeys, newFlags } from './news.js';
import { moonScene, VARIANTS, phaseName, gesturesFor } from './moon.js';
import { dayKey4, analyzeMoon, fullStats, rolesOf, seasonOf, specialOf, workOn, WINDOW_MS as MOON_WIN } from './moonlogic.js';
import * as C from './crypto.js';
import * as Ch from './chara.js';
import { SHELF_DEFS, shelfSvg, tankSvg, persOf, MAX as SHELF_MAX } from './shelf.js';
import { roomSvg, pickScene } from './room.js';
import { diaryKeys, diaryPages, dayOfPage, monthTabs, createBook } from './diary.js';
import { parseTrip, ticketsOn, ticketCard, ticketRoute } from './ticket.js';
import { pickLine, pickGreeting, isMorning, bumpOpens, pickOpenLine } from './hitorigoto.js';
import { findSimilar } from './similar.js';
import { firebaseConfig, isConfigured } from './config.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// 端末の中に残す設定(使えない環境でも動くように、すべて try/catch で包む)
const DEMO_MEM = DEMO ? new Map(Object.entries(DEMO.host.ls[DEMO.role])) : null; // デモ中は、端末の保存を使わない
const LS = DEMO ? {
  get(k) { return DEMO_MEM.has(k) ? DEMO_MEM.get(k) : null; },
  set(k, v) { DEMO_MEM.set(k, String(v)); },
  del(k) { DEMO_MEM.delete(k); },
} : {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 保存できなくても続ける */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* 同上 */ } },
};
const K = {
  key: 'app.key', name: 'app.name', seq: 'app.seq', salt: 'app.salt',
  auto: 'app.auto', expire: 'app.expire', city: 'app.city', card: 'app.card', theme: 'app.theme', patSeen: 'app.patSeen', patShown: 'app.patShown', bd: 'app.bd', talk: 'app.talk', rcpt: 'app.rcpt', seen: 'app.seen', role: 'app.role', moonSeen: 'app.moonSeen', moodAsk: 'app.moodAsk', sayLast: 'app.sayLast', sayMorning: 'app.sayMorning', fullSeen: 'app.fullSeen', roomLast: 'app.roomLast', diaryAt: 'app.diaryAt', opens: 'app.opens', tagHide: 'app.tagHide',
};
const VERSION = '2026.10.25-85';

// 調子(新月 → 満月)と気分のタグ
const LEVELS = [['しんどい', 1], ['いまいち', 2], ['ふつう', 3], ['まあまあ', 4], ['元気', 5]];
// 気分のタグ。気持ち・からだ・(生理のスイッチを入れた日だけ)生理まわり。ほかに、自分で足せる
const TAG_GROUPS = [
  ['気持ち', ['うれしい', 'たのしい', 'おだやか', 'わくわく', '元気', 'さみしい', 'イライラ', '不安', '落ち込み', '疲れた']],
  ['からだ', ['眠い', 'だるい', '頭が痛い', 'おなかが痛い', '肩こり', '食欲がない', 'よく眠れた']],
];
const PERIOD_TAGS = ['生理痛', '量が多い', '量が少ない', '腰が痛い', '胸が張る', 'むくみ'];
const PRESET_TAGS = new Set([...TAG_GROUPS.flatMap((g) => g[1]), ...PERIOD_TAGS]);
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
// お題のカテゴリ(足す人が選ぶ。コードに書いてあるのは名前だけで、言葉の判定はしない)
const CATS = [['fav', '好きな○○'], ['mem', '思い出'], ['dream', '将来・夢'], ['daily', '日常'], ['us', 'ふたりのこと'], ['if', 'もしも'], ['work', '仕事・学び'], ['whisper', '🩷 おやすみ前']];
const catLabel = (id) => { const c = CATS.find((x) => x[0] === id); return c ? c[1] : ''; };
const catSelect = (label = 'カテゴリ') => h('select', { 'aria-label': label }, h('option', { value: '' }, 'カテゴリなし'), ...CATS.map(([id, nm]) => h('option', { value: id }, nm)));
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
  profiles: {}, messages: [], events: [], daysBy: new Map(), dayDocs: new Map(), moodChecked: false, moodMore: false, rain: false, rainAt: 0, pats: new Map(), stock: [], qcards: [], answers: new Map(), guesses: new Map(), say: null, sayDone: false, sayTimer: 0, hiddenAt: 0, boxes: [], marks: new Map(), items: new Map(), itemsDone: new Set(), needInput: null, moon: [], moonCheerUntil: 0, moonPop: { w: null, until: 0 }, moonPanel: false, moonVisit: 0, moonVariant: 'hug', moonDay: '', delId: null, readAt: 0, readSent: 0, talk: 'q', cfilter: 'all', loaded: {}, sheetRender: null, ann: [{ l: '', d: '' }, { l: '', d: '' }], nl: '', card: 0, pastRender: null,
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
  closePatOverlay();
  $('#tk-pop').hidden = true;
  state.otoPop = false; $('#oto-pop').hidden = true; // お祝いは、閉じずに離れたら、次に開いたときにまた出る
  state.sheetClose = null;
  settingsMore = false;
  state.moodChecked = false;
  if (DEMO) { closeSheet(); return; } // デモ中は、天気の画面に戻さない
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
    state.store = await import(DEMO ? './demo-store.js' : './store.js');
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
  if (!isConfigured && !DEMO) { gate('unconfigured'); return; }
  if (!(await ensureStore())) { gate('offline'); return; }
  await Promise.race([state.authReady, new Promise((r) => setTimeout(r, 8000))]);
  if (!state.user) { gate('login'); return; }
  if (!state.key && !(await loadKey())) { gate('key'); return; }
  if (!LS.get(K.name)) { gate('name'); return; }
  if (!LS.get(K.seq)) { startRecording('home'); return; }
  startWatching();
  screen('app');
  countOpen();
  setView(state.view);
  if (state.view === 'home') moonEnterHome();
  moodAskMaybe();
  refreshRain();
  patOverlayMaybe();
}

async function useKey(bytes) {
  LS.set(K.key, C.toB64(bytes));
  state.keyBytes = bytes;
  state.key = await C.importKey(bytes);
  await enter();
}

function buildGate() {
  ['offline', 'unconfigured'].forEach((p) => { const s = $(`[data-panel="${p}"]`); if (s) s.prepend(h('div', { class: 'gate-pose' }, svgEl(Ch.pair('think')))); });
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
  const seq = { msg: 0, ev: 0, dy: 0, pt: 0, st: 0, qc: 0, an: 0, gs: 0, bx: 0, mk: 0, mn: 0 };

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

  state.unsubs.push(s.watchDays(async (rows) => {
    const my = ++seq.dy;
    const by = new Map();
    const ids = new Map();
    const legacy = [];
    for (const d of rows) {
      const ck = `d:${d.id}:${d.iv}`;
      if (!cache.has(ck)) cache.set(ck, await decrypt('days', d));
      const p = cache.get(ck);
      const owner = d.owner || (p && p.by);
      if (p && p.d && owner) {
        if (!by.has(owner)) by.set(owner, new Map());
        by.get(owner).set(p.d, p);
        ids.set(`${owner}|${p.d}`, d.id);
        if (!d.owner && p.by === myUid()) legacy.push(d.id); // 古い版で作った自分の記録
      }
    }
    if (my !== seq.dy) return;
    state.daysBy = by;
    state.dayDocs = ids;
    state.loaded.dy = true;
    renderAll();
    if (legacy.length) s.claimDays(legacy).catch(() => {});
    moodAskMaybe();
  }));

  state.unsubs.push(s.watchStock(async (docs) => {
    const my = ++seq.st;
    const out = [];
    for (const d of docs) {
      const ck = `s:${d.id}:${d.iv}`;
      if (!cache.has(ck)) cache.set(ck, await decrypt('stock', d));
      const p = cache.get(ck);
      if (p && p.text) out.push({ id: d.id, text: p.text, from: d.from, at: p.at || 0, cat: p.cat || null });
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
      if (p && p.text) out.push({ id: d.id, n: d.n, text: p.text, stockId: p.stockId || null, date: p.date, by: p.by || d.from, cat: p.cat || null });
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

  state.unsubs.push(s.watchGuesses(async (docs) => {
    const my = ++seq.gs;
    const next = new Map();
    for (const d of docs) {
      const ck = `g:${d.id}:${d.iv}`;
      if (!cache.has(ck)) cache.set(ck, await decrypt('guesses', d));
      const p = cache.get(ck);
      if (p && typeof p.n === 'number' && d.owner) next.set(answerKey(p.n, d.owner), { ...p, owner: d.owner });
    }
    if (my !== seq.gs) return;
    state.guesses = next;
    renderAll();
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
    state.loaded.bx = true;
    renderAll();
    refreshItems();
  }));

  state.unsubs.push(s.watchMoon(async (docs) => {
    const my = ++seq.mn;
    const out = [];
    for (const d of docs) {
      const ck = `mn:${d.id}:${d.iv}`;
      if (!cache.has(ck)) cache.set(ck, await decrypt('moon', d));
      const p = cache.get(ck);
      if (p && typeof p.at === 'number' && d.from) out.push({ id: d.id, from: d.from, at: p.at });
    }
    if (my !== seq.mn) return;
    const before = moonAnalysis().A.today;
    const firstLoad = !state.loaded.moon;
    state.moon = out;
    state.loaded.moon = true;
    const after = moonAnalysis();
    ['h', 'y'].forEach((r) => { if (!firstLoad && after.A.today[r] != null && before[r] == null) moonObs[r] = Date.now(); });
    if (!firstLoad && !before.resolved && after.A.today.resolved) { state.moonCheerUntil = Date.now() + 6600; setTimeout(renderMoon, 6700); }
    renderMoon();
  }));

  state.unsubs.push(s.watchMarks((docs) => {
    const next = new Map();
    docs.forEach((d) => { if (!next.has(d.box)) next.set(d.box, []); next.get(d.box).push({ id: d.id, from: d.from }); });
    state.marks = next;
    state.loaded.mk = true;
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
    state.loaded.pt = true;
    renderAll();
    patOverlayMaybe();
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
    state.loaded.ev = true;
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
      const isImg = p && p.t === 'img' && typeof p.img === 'string' && /^data:image\/(png|webp|jpeg);base64,/.test(p.img); // 写真から作ったスタンプなどの絵
      out.push({ ...m, body: p && !isStamp && !isImg ? p.body : null, stamp: isStamp && STAMPS.includes(p.s) ? p.s : null, img: isImg ? p.img : null });
    }
    if (my !== seq.msg) return;
    state.messages = out;
    state.loaded.msg = true;
    renderChat();
  }));
}

/* ================= 画面 ================= */
let settingsMore = false; // 注意が必要な設定は、ふだんは隠しておく
function setView(v, keep = false) {
  const prev = state.view;
  if (v === 'set' && !keep) { settingsMore = false; state.more = 'menu'; } // その他のタブは、押すたびに最初の一覧に戻る
  if (v === 'cal' && prev !== 'cal') { state.cal.bar = false; state.cal.end = null; state.cal.range = false; }
  state.view = v;
  $$('#app .view').forEach((el) => el.classList.toggle('on', el.id === `v-${v}`));
  $$('.tab').forEach((t) => t.setAttribute('aria-selected', t.dataset.v === v));
  renderAll();
  if (v === 'chat') { const c = $('#chat'); c.scrollTop = c.scrollHeight; refreshItems(); }
  markRead();
  if (v === 'home' && prev !== 'home') moonEnterHome();
  moonPause();
}

function renderAll() {
  if ($('#app').hidden) return;
  renderHome();
  renderChat();
  renderTalk();
  renderCalendar();
  renderMore();
  if (state.pastRender && !$('#sheet').hidden) state.pastRender();
  if (state.sheetRender && !$('#sheet').hidden) state.sheetRender();
  renderBadges();
}

// 連続する予定(お泊まりなど)は、終わりの日(end)まで続く
const evEnd = (e) => (e.end && e.end > e.date ? e.end : e.date);
const evOn = (e, key) => e.date <= key && key <= evEnd(e);
const kindOf = (ev) => (ev.who === 'both' ? 'both' : ((ev.who === 'me') === (ev.by === myUid()) ? 'me' : 'you'));
const byDate = (a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''));

// 予定の持ち主の色: ピンク=ひとみの役(飛ぶ人)、ミント=もうひとりの役
const evColor = (kind) => (kind === 'both' ? 'both' : ((kind === 'me') === (myRole() === 'h') ? 'me' : 'you'));
// 予定の種類の絵(線のアイコン)。デートは、ふたりの絵のまま
const TYPE_ICON = {
  date: '<path d="M12 20s-7-4.500-7-10a4 4 0 0 1 7-2.500A4 4 0 0 1 19 10c0 5.500-7 10-7 10z"/>',
  meal: '<path d="M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M17 21V3c-2.500 1.500-3 4.500-3 8h3"/>',
  work: '<rect x="3" y="8.500" width="18" height="10.500" rx="2.500"/><path d="M9 8.500V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.500M3 13h18M11 13v2h2v-2"/>',
  train: '<rect x="6" y="3.500" width="12" height="13" rx="3"/><path d="M6 11h12M9 20l1.500-3.500M15 20l-1.500-3.500M9.500 14h.01M14.500 14h.01"/>',
  car: '<path d="M4 16v-3.500l2-5h12l2 5V16zM4 16v2.500M20 16v2.500M4 12.500h16M7.500 14.500h.01M16.500 14.500h.01"/>',
  trip: '<path d="M3 13l18-8-5 15-4-6zM12 14l4-5"/>',
  clinic: '<path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z"/>',
  drink: '<path d="M7 4h10l-1 7a4 4 0 0 1-8 0zM12 15v5M9 20h6"/>',
  shop: '<path d="M6 8h12l1 12H5zM9 8a3 3 0 0 1 6 0"/>',
  study: '<path d="M5 5h6a2 2 0 0 1 1 1.500V19a2 2 0 0 0-1-1.500H5zM19 5h-6a2 2 0 0 0-1 1.500V19a2 2 0 0 1 1-1.500h6z"/>',
  star: '<path d="M12 4l2.400 5 5.400.7-4 3.800 1 5.400-4.800-2.700-4.800 2.700 1-5.400-4-3.800 5.400-.7z"/>',
  other: '<circle cx="12" cy="12" r="7"/>',
};
const TYPE_LABEL = { date: 'デート', meal: 'ごはん', work: 'いっしょの仕事', train: '出張(電車)', car: '出張(車)', trip: '旅行', clinic: '通院', drink: '飲み会', shop: '買い物', study: '勉強', star: '特別な日', other: 'なし' };
const typeIcon = (type, cls = 'tk') => svgOf(TYPE_ICON[type] || TYPE_ICON.other, `${cls} ${type}`);
// アイコンの選択(名前は出さず、絵だけ。読み上げ用の名前は付ける)
function iconPicker(selected) {
  const wrap = h('div', { class: 'kpick', role: 'radiogroup', 'aria-label': 'アイコン' });
  [...EV_TYPES, 'other'].forEach((t) => {
    const input = h('input', { type: 'radio', name: 'evicon', value: t, 'aria-label': TYPE_LABEL[t] });
    input.checked = t === selected;
    wrap.append(h('label', { title: TYPE_LABEL[t] }, input, h('span', {}, typeIcon(t, 'tk'))));
  });
  return { node: wrap, value: () => (wrap.querySelector('input:checked') || {}).value || 'other' };
}
function eventMark(ev) {
  const type = evType(ev);
  if (type !== 'date' && type !== 'other') return h('span', { class: `ev-mark tkmark ${type}` }, typeIcon(type));
  const kind = kindOf(ev);
  return h('span', { class: 'ev-mark' }, svgEl(kind === 'both' ? Ch.pair('heart') : Ch.bust(kind === 'me' ? myRole() : (myRole() === 'h' ? 'y' : 'h'), 30)));
}
// 電車の予定の詳細に、乗換案内が貼ってあれば、旅券にする(往路・復路のラベルは、日付の順)
const tripOf = (ev) => (ev.kind === 'train' && ev.note ? parseTrip(ev.note) : []);
const tripLabel = (routes, r) => (routes.length < 2 ? '乗車券' : routes.indexOf(r) === 0 ? '往路 乗車券' : routes.indexOf(r) === routes.length - 1 ? '復路 乗車券' : '乗車券');
function eventItem(ev, withDelete) {
  const trip = tripOf(ev);
  const li = h('li', { class: `item${trip.length ? ' has-ticket' : ''}` },
    eventMark(ev),
    h('div', { class: 't' }, ev.title, trip.length ? h('span', { class: 'tk-badge' }, '旅券') : null, h('small', {}, `${ev.date.slice(5).replace('-', '/')}${evEnd(ev) !== ev.date ? `〜${evEnd(ev).slice(5).replace('-', '/')}(${nightsLabel(ev.date, evEnd(ev))})` : ''}${ev.time ? ` ${ev.time}` : ''}`),
      trip.length ? h('span', { class: 'evnote' }, trip.map((r) => `${r.from}→${r.to} ${r.dep}→${r.arr}`).join('\n')) : ev.note ? h('span', { class: 'evnote' }, ev.note) : null));
  if (trip.length) li.addEventListener('click', (e) => { if (!e.target.closest('button')) openTicket(ev); });
  if (withDelete) {
    const more = h('button', { class: 'x more', type: 'button' }, '詳細');
    more.addEventListener('click', () => openEventNote(ev.id));
    li.append(more);
    const x = h('button', { class: 'x', type: 'button' }, '削除');
    x.addEventListener('click', async () => {
      if (!x.classList.contains('sure')) { x.classList.add('sure'); x.textContent = '本当に削除'; return; }
      state.store.removeEvent(ev.id);
    });
    li.append(x);
  }
  return li;
}

// 調子・気分の記録は、人ごと。生理は、ひとみ(飛ぶ人の役)の分だけを数える。
const recsOf = (uid) => state.daysBy.get(uid) || new Map();
const myRecs = () => recsOf(myUid());
const allDays = () => new Map([...state.daysBy.entries()].flatMap(([u, m]) => [...m.entries()].map(([d, r]) => [`${u}|${d}`, r])));
const periodDays = () => [...state.daysBy.values()].flatMap((m) => [...m.values()]).filter((r) => r.p).map((r) => r.d);
const myRole = () => moonRoles()[myUid()] || 'h';
const roleOf = (uid) => (uid === myUid() ? myRole() : (myRole() === 'h' ? 'y' : 'h')); // ふたりだけのアプリ
const isHer = () => myRole() === 'h';
// 何もないときの一言に、ふたりの絵を添える
const emptyWith = (text, pose, tag = 'li') => h(tag, { class: 'empty-pose' }, svgEl(Ch.pair(pose)), h('span', {}, text));
const svgEl = (str) => { const t = document.createElement('template'); t.innerHTML = str.trim(); return t.content.firstElementChild; };
const hasMoodRec = (r) => !!r && !!(r.l || (r.t && r.t.length) || r.m);
// 記録のある人(ひとみ→ゆうきの順)
function peopleOf() {
  const ids = new Set([myUid(), partnerUid(), ...state.daysBy.keys()].filter(Boolean));
  return [...ids].sort((a, b) => (roleOf(a) === 'h' ? 0 : 1) - (roleOf(b) === 'h' ? 0 : 1));
}
const nameOfUid = (uid) => (uid === myUid() ? myName() : partnerName());
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

// 「00:35に記録 ・ 08:10に更新」。＋は、あとから足した症状
function recTimeLine(rec) {
  if (!rec.up && !rec.at) return null;
  const parts = [];
  if (rec.at) parts.push(`${clockOf(rec.at)}に記録`);
  if (rec.up && (!rec.at || clockOf(rec.up) !== clockOf(rec.at))) parts.push(`${clockOf(rec.up)}に更新`);
  if (rec.tt && Object.keys(rec.tt).length) parts.push('＋は、あとから足した症状');
  return h('div', { class: 'dd-time' }, parts.join(' ・ '));
}

// ホームの「最近の気分」: 調子は丸い枠、気分(タグ)は色つきの丸。ひとことメモは、その下の行に分ける
function moodItem(r) {
  const d = parseYmd(r.d);
  const role = roleOf(r.u);
  const lv = r.l ? h('span', { class: 'lv', style: `--lc:var(--m${r.l})` }, moonIcon(r.l), `調子 ${r.l}/5`) : h('span', { class: 'lv none' }, '記録');
  return h('li', { class: 'item mood-item' },
    h('span', { class: 'mi-av' }, svgEl(Ch.bust(role, 34))),
    h('div', { class: 'mi-body' },
      h('div', { class: 'mi-top' }, nameOfUid(r.u), lv, h('time', {}, `${d.getMonth() + 1}/${d.getDate()}`)),
      r.t && r.t.length ? h('div', { class: 'chips2' }, r.t.map((t) => h('span', { class: `chip2 ${role}` }, t, r.tt && r.tt[t] ? h('small', {}, ` ＋${clockOf(r.tt[t])}`) : null))) : null,
      r.m ? h('div', { class: 'mi-memo' }, r.m) : null));
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
      const diff = dayNum(ev.date < today ? today : ev.date) - dayNum(today); // 連続する予定の最中は「今日」
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

function openTicket(ev) {
  const trip = tripOf(ev);
  if (!trip.length) return;
  const pop = $('#tk-pop');
  const close = () => { pop.hidden = true; pop.replaceChildren(); };
  const x = h('button', { class: 'ghost', type: 'button' }, 'もどる');
  x.addEventListener('click', close);
  const edit = h('button', { class: 'ghost', type: 'button' }, '詳細を見る・直す');
  edit.addEventListener('click', () => { close(); openEventNote(ev.id); });
  pop.replaceChildren(h('div', { class: 'tkbar' }, h('b', {}, ev.title), x), ...trip.map((r) => ticketRoute(h, r, tripLabel(trip, r).replace(' 乗車券', ''))), edit);
  pop.hidden = false;
  pop.scrollTop = 0;
}

// ホームに、今日の旅券(ふたりで乗る電車の分だけ)
function renderHomeTickets() {
  const box = $('#home-tickets');
  const list = ticketsOn(state.events, ymd(new Date()));
  box.hidden = !list.length;
  box.replaceChildren(...list.map(({ ev, route }) => {
    const card = ticketCard(h, { route, label: tripLabel(parseTrip(ev.note), route) });
    card.setAttribute('role', 'button'); card.tabIndex = 0;
    card.addEventListener('click', () => openTicket(ev));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTicket(ev); } });
    return card;
  }));
}

function renderHome() {
  $('#home-title').textContent = `${myName()} & ${partnerName()}`;
  renderCard();
  renderHomeTickets();
  renderPatBanner();
  renderGuessBanner();
  renderBirthdayHome();
  renderMoon();
  renderNextMoon();
  // 最近の気分: ひとりずつの、いちばん新しい記録だけを出す。それ以前は、たたんでおいて、押すと出る
  const mine = peopleOf().flatMap((u) => [...recsOf(u).values()].filter(hasMoodRec).map((r) => ({ ...r, u }))).sort((x, y) => y.d.localeCompare(x.d));
  const latest = [];
  const seenUid = new Set();
  const older = [];
  mine.forEach((r) => { if (!seenUid.has(r.u)) { seenUid.add(r.u); latest.push(r); } else older.push(r); });
  const olderShown = older.slice(0, 10);
  const items = latest.map(moodItem);
  if (olderShown.length) {
    const more = h('button', { class: 'more-btn', type: 'button', 'aria-expanded': String(state.moodMore) }, state.moodMore ? 'たたむ' : `これまでの気分を見る(${olderShown.length}件)`);
    more.addEventListener('click', () => { state.moodMore = !state.moodMore; renderHome(); });
    items.push(h('li', { class: 'more' }, more));
    if (state.moodMore) items.push(...olderShown.map(moodItem));
  }
  $('#home-mood').replaceChildren(...(latest.length ? items : [h('li', { class: 'empty' }, 'まだ記録がありません')]));
  const today = ymd(new Date());
  const upcoming = state.events.filter((e) => evEnd(e) >= today).sort(byDate).slice(0, 5);
  $('#home-events').replaceChildren(...(upcoming.length ? upcoming.map((e) => eventItem(e, false)) : [emptyWith('予定はまだありません', 'think')]));
}

function renderChat() {
  const chat = $('#chat');
  $('#chat-title').textContent = partnerName();
  $('#chat-av').replaceChildren(svgEl(Ch.bust(myRole() === 'h' ? 'y' : 'h', 34)));
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
    const bub = m.img
      ? h('div', { class: 'bub imgmsg' }, h('img', { src: m.img, alt: 'スタンプ', draggable: 'false' }))
      : big
      ? h('div', { class: 'bub stamp' }, big)
      : h('div', { class: `bub${m.body == null ? ' bad' : ''}` }, m.body == null ? '(読めないメッセージ)' : m.body);
    if (mine) holdToDelete(bub, m.id);
    const del = mine && state.delId === m.id ? h('button', { class: 'del', type: 'button' }, '削除') : null;
    if (del) del.addEventListener('click', (e) => { e.stopPropagation(); state.delId = null; state.store.removeMessage(m.id).catch(() => {}); });
    nodes.push(h('div', { class: `row ${mine ? 'mine' : 'theirs'} c-${roleOf(m.from)}` }, // 色は、送った人の役で決まる(ピンク=飛ぶ人、ミント=もうひとり)
      bub,
      del,
      h('div', { class: 'meta' }, mine && lastRead === m ? h('span', {}, '既読', h('br')) : null, `${pad(d.getHours())}:${pad(d.getMinutes())}`)));
  });
  if (!nodes.length) nodes.push(h('div', { class: 'chat-empty' }, svgEl(Ch.pair('wave')), h('span', {}, 'メッセージはまだありません')));
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

const heartIcon = () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = '<path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z"/>';
  return svg;
};
const timeLabel = (ms) => { const d = new Date(ms); return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

// 「よしよし」を送る。同じ日の同じ人には、1回だけ(取り消しはできない。押し間違いで消えないように)
async function sendPat(date) {
  if ((state.pats.get(date) || []).some((p) => p.by === myUid())) return;
  const id = await C.dayId(state.keyBytes, `pat|${date}|${myUid()}`);
  try {
    state.justPat = date;
    await withTimeout(state.store.savePat(id, await C.encryptJson(state.key, 'pats', { d: date, by: myUid(), at: Date.now() })), 5000);
  } catch (e) { /* 送れなかったときは、押す前の表示のまま */ }
}

// 調子のポーズ: 1 しんどい=雨雲の下 / 2 いまいち=ため息 / 3 ふつう=立つ / 4 まあまあ=手を振る / 5 元気=ジャンプ
const MOOD_POSE = [null, 'rain', 'sigh', 'stand', 'wave', 'jump'];

// 選んだ日の、ふたりの記録を、同じ大きさで並べる(ひとみ → ゆうきの順)
function renderDayDetail(date) {
  const box = $('#day-detail');
  const d = parseYmd(date);
  const blocks = peopleOf().map((u) => ({ u, rec: recsOf(u).get(date) })).filter((x) => hasMoodRec(x.rec));
  if (!blocks.length) { box.hidden = true; box.replaceChildren(); return; }
  const pats = state.pats.get(date) || [];
  const nodes = [h('div', { class: 'dd-date' }, `${d.getMonth() + 1}月${d.getDate()}日(${WEEK[d.getDay()]})`)];
  blocks.forEach(({ u, rec }) => {
    const mine = u === myUid();
    const role = roleOf(u);
    const level = LEVELS.find((x) => x[1] === rec.l);
    let edit = null;
    if (mine) { edit = h('button', { class: 'ghost sm', type: 'button' }, '編集'); edit.addEventListener('click', () => openDaySheet(date)); }
    let patArea = null;
    // ひとみ→ゆうきは、ひざまくら。ゆうき→ひとみは、あたまをなでる
    const patPic = (from) => svgEl(from === 'h' ? Ch.lapPat() : Ch.pair('pat'));
    if (!mine) {
      const sent = pats.find((p) => p.by === myUid());
      // 送ったあとは、押せないただの表示にする(誤って取り消したり、二重に送ったりしないように)
      let tail;
      if (sent) tail = h('div', { class: `pat-done${state.justPat === date ? ' pop' : ''}` }, heartIcon(), h('span', {}, 'よしよし済み'), h('small', {}, timeLabel(sent.at)));
      else {
        tail = h('button', { class: 'pat', type: 'button' }, heartIcon(), 'よしよし');
        tail.addEventListener('click', () => { tail.disabled = true; sendPat(date); });
      }
      patArea = h('div', { class: 'dd-patrow' }, h('span', { class: `dd-patpic${roleOf(myUid()) === 'h' ? ' lap' : ''}` }, patPic(roleOf(myUid()))), tail);
      state.justPat = null;
    } else {
      const got = pats.filter((p) => p.by !== myUid()).sort((a, b) => b.at - a.at);
      if (got.length) patArea = h('div', { class: 'stack' }, got.map((p) => h('div', { class: 'dd-pat' }, h('span', { class: `dd-patpic${roleOf(p.by) === 'h' ? ' lap' : ''}` }, patPic(roleOf(p.by))), `${partnerName()}から よしよし`, h('small', {}, timeLabel(p.at)))));
    }
    nodes.push(h('div', { class: 'dd-p' },
      h('div', { class: 'dd-head' }, h('span', { class: 'dd-who' }, svgEl(Ch.bust(role, 28)), nameOfUid(u)), rec.p ? h('span', { class: 'dd-badge' }, '生理') : null, edit),
      level ? h('div', { class: 'dd-level', style: `color:var(--m${level[1]})` }, h('span', { class: 'pose' }, svgEl(Ch.figure(role, MOOD_POSE[level[1]]))), h('div', { class: 'lvtxt' }, h('b', {}, `調子 ${level[1]}/5`), h('span', {}, level[0]))) : null,
      rec.t && rec.t.length ? h('div', { class: 'dd-tags' }, rec.t.map((t) => h('span', { class: role }, t, rec.tt && rec.tt[t] ? h('small', {}, ` ＋${clockOf(rec.tt[t])}`) : null))) : null,
      recTimeLine(rec),
      rec.m ? h('p', { class: 'dd-memo' }, rec.m) : null,
      patArea));
  });
  box.replaceChildren(...nodes);
  box.hidden = false;
}

// 今日の調子が、まだのとき、アプリを開いたタイミングで聞く。✕で閉じたら、その日はもう出さない。
function moodAskMaybe() {
  if (state.moodChecked || !state.loaded.dy || !state.user || !state.key || $('#app').hidden || !$('#sheet').hidden) return;
  state.moodChecked = true; // 開いたときに1回だけ確かめる(途中で相手の記録が届いても、急に出さない)
  const today = ymd(new Date());
  if (LS.get(K.moodAsk) === today) return;
  const mine = myRecs().get(today);
  if (mine && mine.l) return;
  openMoodAsk(today);
}

function openMoodAsk(date) {
  const role = myRole();
  const pic = h('div', { class: 'ask-pic' }, svgEl(Ch.figure(role, 'stand')));
  const note = h('p', { class: 'ask-note' }, '');
  const err = h('p', { class: 'error', role: 'alert' });
  const scale = h('div', { class: 'scale' });
  LEVELS.forEach(([label, lv]) => {
    const b = h('button', { type: 'button' }, moonIcon(lv), label);
    b.style.setProperty('--c', `var(--m${lv})`);
    b.addEventListener('click', async () => {
      pic.replaceChildren(svgEl(Ch.figure(role, MOOD_POSE[lv])));
      $$('button', scale).forEach((x) => { x.disabled = true; });
      try {
        const cur = myRecs().get(date) || { p: false, l: 0, t: [], m: '' };
        const had = myRecs().get(date);
        await writeDays([{ date, rec: stampRec(had, { p: !!cur.p, l: lv, t: cur.t || [], m: cur.m || '' }) }]);
        state.sheetClose = null;
        note.textContent = 'カレンダーに入れたよ';
        setTimeout(closeSheet, 1300);
      } catch (e) {
        err.textContent = SAVE_ERROR;
        $$('button', scale).forEach((x) => { x.disabled = false; });
      }
    });
    scale.append(b);
  });
  state.sheetClose = () => LS.set(K.moodAsk, date);
  openSheet(h('h2', {}, '今日の調子は?'), pic, scale, note, err,
    h('p', { class: 'lock' }, '体調や気分のタグ・ひとことメモは、カレンダーから入れられます。「とじる」と、今日はもう聞きません。'));
}

// よしよしが届いたとき、イラストを大きく映す(数秒の動きつき。タップで閉じる)
let patTimer = 0;
function closePatOverlay() {
  clearTimeout(patTimer);
  const el = $('#yoshi');
  if (el) el.remove();
  moonPause();
}
function patOverlayMaybe() {
  if (!state.loaded.pt || !state.user || $('#app').hidden || $('#yoshi')) return;
  const all = [...state.pats.values()].flat().filter((p) => p.by !== myUid());
  const shown = LS.get(K.patShown);
  if (shown == null) { // はじめて: これまでの分は、出さない
    LS.set(K.patShown, String(Math.max(0, Number(LS.get(K.patSeen)) || 0, ...all.map((p) => p.at))));
    return;
  }
  const fresh = all.filter((p) => p.at > Number(shown)).sort((x, y) => y.at - x.at);
  if (!fresh.length) return;
  LS.set(K.patShown, String(fresh[0].at));
  const from = fresh[0].by;
  const box = h('div', { class: 'yoshi-box' },
    h('div', { class: 'yoshi-pic' }, svgEl(roleOf(from) === 'h' ? Ch.lapPat() : Ch.pair('pat'))),
    h('div', { class: 'yoshi-hearts' }, [0, 1, 2, 3, 4].map((i) => h('i', { style: `--i:${i}` }, heartIcon()))),
    h('b', {}, `${nameOfUid(from)}から よしよし`),
    h('small', {}, 'タップでとじる'));
  const el = h('div', { id: 'yoshi', class: 'yoshi', role: 'dialog', 'aria-label': 'よしよしが届きました' }, box);
  el.addEventListener('click', closePatOverlay);
  document.body.append(el);
  moonPause();
  patTimer = setTimeout(closePatOverlay, 6500);
}

// 他の人から届いた「よしよし」を、ホームに知らせる
// ひとり言: 開いたとき(30分以上あけて戻ってきたときも)、場面に合う言葉を、確率で1つ出す。出たら、タップするまで消えない
function sayContext({ A, t, today }) {
  const key = ymd(today);
  const tiredRoles = peopleOf().filter((u) => { const r = recsOf(u).get(key); return r && r.l === 1; }).map((u) => roleOf(u));
  const j = nextJoint(state.events, key);
  const soon = !!j && dayNum(j.date < key ? key : j.date) - dayNum(key) <= 3;
  return { resolved: !!t.resolved, hour: today.getHours(), rain: rainNow(), pts: A.pts, lateToday: !!(t.resolved && t.kind === 'late'), soon, tiredRoles };
}
// {name} を、呼ばれる側(話すキャラの、もう一方)の名前に置きかえる
const nameOfRole = (r) => (roleOf(myUid()) === r ? myName() : partnerName());
const sayText = (pick) => pick.text.replace('{name}', nameOfRole(pick.role === 'h' ? 'y' : 'h'));
// 1日に5回目・10回目に開いたときの、特別なひとり言(数は、この端末の中だけ)
function countOpen() {
  let prev = null;
  try { prev = JSON.parse(LS.get(K.opens) || 'null'); } catch (e) { prev = null; }
  const now = Date.now();
  const r = bumpOpens(prev, dayKey4(now), now);
  LS.set(K.opens, JSON.stringify(r.state));
  state.openTier = r.tier;
}
function rollOpenSay({ A, t, today }) {
  if (!state.openTier || !state.loaded.moon || !state.loaded.dy) return;
  const tier = state.openTier;
  state.openTier = null;
  const ctx = sayContext({ A, t, today });
  const last = LS.get(K.sayLast) || '';
  const pick = ctx.tiredRoles.length ? pickLine({ ...ctx, resolved: true }, { rand: () => 0, last }) : pickOpenLine(tier, { last }); // しんどい日は、回数に関係なく、やさしい言葉を優先
  if (!pick) return;
  state.say = { ...pick, shown: sayText(pick), variant: state.moonVariant, early: true };
  LS.set(K.sayLast, pick.text);
  state.sayDone = true; // この訪問では、ふだんのひとり言は、重ねない
}
function rollSay({ A, t, today, force, wait }) {
  rollOpenSay({ A, t, today });
  if (!force && (state.sayDone || !state.loaded.moon || !state.loaded.dy)) return;
  // 午前中に開いたら、あいさつを、その日の1回だけ必ず出す(ブランコの成立は待たない)
  if (!force && isMorning(today.getHours()) && LS.get(K.sayMorning) !== ymd(today)) {
    LS.set(K.sayMorning, ymd(today));
    const g = pickGreeting({ last: LS.get(K.sayLast) || '' });
    state.say = { ...g, shown: g.text, variant: state.moonVariant, early: true };
    LS.set(K.sayLast, g.text);
  }
  if (state.say && state.say.early) return; // 特別なひとり言を出している間は、そのまま
  if (!t.resolved) return; // ブランコが成立するまでは、まだ話さない(成立したら、そのときに決める)
  if (wait) { // 成立してふたりがつながって揺れている間は、終わるまで待つ
    if (!state.sayTimer) state.sayTimer = setTimeout(() => { state.sayTimer = 0; renderMoon(); }, wait);
    return;
  }
  state.sayDone = true;
  const pick = pickLine(sayContext({ A, t, today }), { last: LS.get(K.sayLast) || '' });
  if (pick) { state.say = { ...pick, shown: sayText(pick), variant: state.moonVariant }; LS.set(K.sayLast, pick.text); } else if (state.say && !state.say.early) state.say = null;
}
function renderSay({ t, today }) {
  const b = $('#mn-talk');
  if (!b) return;
  const quiet = workOn({ todayKey: ymd(today), events: state.events }); // 「今日は、いっしょだね」の日は、そちらを優先
  // ふたりの動き(場面)が変わったら、前の場面のセリフは消す
  if (state.say && state.say.variant !== state.moonVariant) { state.say = null; b.dataset.text = ''; }
  const s = state.say;
  b.hidden = !s || quiet || (!t.resolved && !s.early); // あいさつと、特別なひとり言は、成立の前でも出る
  if (b.hidden) return;
  if (b.dataset.text !== s.shown) {
    b.dataset.text = s.shown;
    const look = s.group === 'tired' ? 'care' : s.group === 'open5' ? 'glow' : s.group === 'open10' ? 'full' : '';
    b.className = `mn-talk ${s.role}${look ? ` ${look}` : ''}`;
    const deco = (cls, ch) => h('span', { class: cls, 'aria-hidden': 'true' }, ch);
    b.replaceChildren(s.shown, ...(look === 'full' ? [deco('st s1', '★'), deco('st s2', '✦'), deco('up u1', '★'), deco('up u2', '✦'), deco('up u3', '★')] : look === 'care' ? [deco('st s1', '★'), deco('st s2', '✦')] : []));
    b.onclick = () => { state.say = null; b.hidden = true; b.dataset.text = ''; };
  }
}
window.__moonVariantNow = () => { state.moonVariant = state.moonVariant === 'hug' ? 'kiss' : 'hug'; renderMoon(); }; // 確認用: 場面を切りかえる
window.__openNow = (n) => { LS.set(K.opens, JSON.stringify({ day: dayKey4(Date.now()), n: n - 1, last: 0 })); countOpen(); state.say = null; state.sayDone = false; moonSigReset(); renderMoon(); }; // 確認用: その日のn回目に開いたことにする
window.__sayNow = () => { const A = moonAnalysis().A; rollSay({ A, t: A.today, today: new Date(), force: true }); renderSay({ t: A.today, today: new Date() }); };

// 月に触れる合図: 自分がまだ触れていない間は、バナーと、月のカードの枠の光を出す(触れたら消える)
function renderMoonBanner({ hint, t, roles, now }) {
  const b = $('#moon-banner');
  const card = $('#mn-card');
  if (card) card.classList.toggle('cue', !!hint);
  if (!b) return;
  b.hidden = !hint;
  if (!hint) return;
  const other = t[roles[myUid()] === 'h' ? 'y' : 'h'];
  const near = other != null && now - other <= MOON_WIN; // 相手が触れてから10分以内なら、いま触れると「ぴったり」
  const text = other != null ? `${partnerName()}が月に触れたよ` : '今日の月に、触れてみよう';
  const kids = [heartIcon(), near ? h('span', {}, text, h('small', {}, 'いま触れると、「ぴったり」になるかも')) : text];
  b.replaceChildren(...kids);
  b.onclick = () => { const m = $('#moon'); if (m && m.scrollIntoView) m.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
}

// ホームの合図: 予想できるとき・答え合わせができるとき
function renderGuessBanner() {
  const b = $('#guess-banner');
  const last = state.qcards[state.qcards.length - 1];
  const phase = last && myUid() ? guessPhase(last.n, myUid(), state.answers, state.guesses) : 'none';
  const hasGuess = last && !!guessOf(last.n, myUid(), state.guesses);
  const text = phase === 'judge' ? '予想の答え合わせができるよ' : phase === 'open' && !hasGuess ? '予想できるよ' : '';
  b.hidden = !text;
  if (!text) return;
  b.replaceChildren(heartIcon(), text);
  b.onclick = () => { setView('chat'); const t = $('#talk-seg button[data-t="q"]'); if (t) t.click(); };
}

function renderPatBanner() {
  const b = $('#pat-banner');
  const all = [...state.pats.entries()].flatMap(([d, list]) => list.map((p) => ({ ...p, d })));
  const unseen = unseenPats(all, myUid(), Number(LS.get(K.patSeen)) || 0);
  if (!unseen.length) { b.hidden = true; return; }
  b.replaceChildren(heartIcon(), `${partnerName()}から よしよしが届いています(${unseen.length}件)`);
  b.hidden = false;
  b.onclick = () => {
    LS.set(K.patSeen, String(Math.max(...unseen.map((p) => p.at))));
    const dt = parseYmd(unseen[0].d);
    state.cal = { y: dt.getFullYear(), m: dt.getMonth(), sel: unseen[0].d, end: null, bar: false, range: false };
    setView('cal');
  };
}

function renderCalendar() {
  const { y, m, sel } = state.cal;
  $('#cal-title').textContent = `${y}年${m + 1}月`;
  { const t = new Date(); $('#cal-today').hidden = y === t.getFullYear() && m === t.getMonth() && sel === ymd(t); } // 今日から離れているときだけ、「今日」で戻れる
  const first = new Date(y, m, 1).getDay();
  const count = new Date(y, m + 1, 0).getDate();
  const todayKey = ymd(new Date());
  const cyc = predict(periodDays(), todayKey);
  const people = peopleOf();
  const cells = [...WEEK].map((w) => h('div', { class: 'w' }, w));
  for (let i = 0; i < first; i++) cells.push(h('div'));
  for (let d = 1; d <= count; d++) {
    const key = `${y}-${pad(m + 1)}-${pad(d)}`;
    const kinds = new Set(state.events.filter((e) => evOn(e, key)).flatMap((e) => (kindOf(e) === 'both' ? ['me', 'you'] : [evColor(kindOf(e))])));
    const dots = [...kinds].map((k) => h('b', { class: k }));
    const onTypes = new Set(state.events.filter((e) => evOn(e, key)).map(evType));
    const recs = people.map((u) => ({ u, rec: recsOf(u).get(key) }));
    const isPeriod = recs.some((x) => x.rec && x.rec.p);
    const inRange = !!state.cal.end && key > sel && key <= state.cal.end;
    const classes = [key === todayKey ? 'today' : '', key === sel ? 'sel' : '', key === sel && state.cal.end ? 'rstart' : '', inRange ? 'inrange' : '', isPeriod ? 'period' : cyc.starts.includes(key) && cyc.days.has(key) ? 'future' : ''].filter(Boolean).join(' ');
    const moods = recs.filter((x) => hasMoodRec(x.rec));
    const hasPat = state.pats.has(key);
    const hasCake = birthdayOn(parseYmd(key));
    cells.push(h('button', {
      type: 'button',
      class: classes,
      'data-key': key,
      onclick: () => {
        if (calDrag.suppress) return; // なぞって選んだあとの、おまけのタップは無視する
        if (state.cal.range && key > sel) { state.cal.end = key; state.cal.range = false; state.cal.bar = true; renderCalendar(); return; } // 連続の、終わりの日を選ぶ
        state.cal.sel = key; state.cal.end = null; state.cal.range = false; renderCalendar(); // 日付をタップしただけでは、予定を入れるバーは出さない(入っている予定を、すぐ見られるように)
      },
    }, String(d), moods.length ? h('span', { class: 'mdots' }, moods.map((x) => h('em', { class: `mood ${roleOf(x.u)}`, style: x.rec.l ? `background:var(--m${x.rec.l})` : null }))) : null, hasPat ? h('em', { class: 'pat-mark' }, '♥') : null, hasCake ? h('em', { class: 'cake' }, cakeIcon()) : null, ...EV_TYPES.filter((t) => t !== 'date' && onTypes.has(t)).slice(0, 2).map((t, i) => h('em', { class: `evtk ${i ? 'r' : 'l'}` }, typeIcon(t, 'tk'))), dots.length ? h('i', {}, dots) : null));
  }
  $('#month').replaceChildren(...cells);
  renderDayDetail(sel);
  renderEvBar();
  $('#day-record').hidden = sel > todayKey; // 未来の日の調子は、入れられない
  $('#cyc-sum').replaceChildren(...(cyc.cycle ? ['平均の周期は ', h('b', {}, `${cyc.cycle}日`), '、生理の期間は ', h('b', {}, `${cyc.len}日`), 'くらいです。'] : ['記録が2回分たまると、予想が出ます。']));
  const dt = parseYmd(sel);
  $('#cal-day').textContent = `${dt.getMonth() + 1}/${dt.getDate()}(${WEEK[dt.getDay()]})`;
  const list = state.events.filter((e) => evOn(e, sel)).sort(byDate);
  const bdItems = birthdayNames(parseYmd(sel)).map((nm) => h('li', { class: 'item' }, h('span', { style: 'display:flex;width:20px;color:var(--pink-deep)' }, cakeIcon()), h('div', { class: 't' }, `${nm}の誕生日`)));
  $('#cal-events').replaceChildren(...bdItems, ...(list.length ? list.map((e) => eventItem(e, true)) : bdItems.length ? [] : [h('li', { class: 'empty' }, 'この日の予定はありません')]));
}

function buildCalendar() {
  const move = (delta, dir) => {
    const d = new Date(state.cal.y, state.cal.m + delta, 1);
    state.cal.y = d.getFullYear();
    state.cal.m = d.getMonth();
    renderCalendar();
    if (dir) { const mo = $('#month'); mo.classList.remove('from-l', 'from-r'); void mo.offsetWidth; mo.classList.add(dir === 'next' ? 'from-r' : 'from-l'); } // 指の動きに合わせて、月がすべり込む
  };
  $('#cal-today').addEventListener('click', () => {
    const t = new Date();
    const dir = t.getFullYear() * 12 + t.getMonth() > state.cal.y * 12 + state.cal.m ? 'next' : t.getFullYear() * 12 + t.getMonth() < state.cal.y * 12 + state.cal.m ? 'prev' : '';
    state.cal.y = t.getFullYear(); state.cal.m = t.getMonth(); state.cal.sel = ymd(t); state.cal.end = null; state.cal.range = false;
    renderCalendar();
    if (dir) { const mo = $('#month'); mo.classList.remove('from-l', 'from-r'); void mo.offsetWidth; mo.classList.add(dir === 'next' ? 'from-r' : 'from-l'); }
  });
  $('#cal-prev').addEventListener('click', () => move(-1));
  $('#cal-next').addEventListener('click', () => move(1));
  $('#ev-open').addEventListener('click', () => { state.cal.bar = true; renderCalendar(); });
  $('#day-record').addEventListener('click', () => openDaySheet(state.cal.sel));

  // 予定の入れかた: 日付をタップすると、下に「デート」のバーが出る。期間は、日付を「長押ししてから」なぞって選ぶ
  // (すぐなぞると、横にスワイプして、前の月・次の月に動く。勝手に複数日が選ばれてしまうのを防ぐ)
  const month = $('#month');
  let start = null;
  const HOLD_MS = 380;
  const stopHold = () => { if (start) { clearTimeout(start.timer); } };
  month.addEventListener('pointerdown', (e) => {
    const c = e.target.closest('button[data-key]');
    calDrag.suppress = false;
    if (!c) { start = null; return; }
    start = { key: c.dataset.key, x: e.clientX, y: e.clientY, moved: false, armed: false, done: false, el: c };
    start.timer = setTimeout(() => { if (start && !start.done) { start.armed = true; c.classList.add('arm'); } }, HOLD_MS);
  });
  month.addEventListener('pointermove', (e) => {
    if (!start || start.done) return;
    if (!start.armed) { // 長押しの前に動いたら、スワイプかどうかを見る(期間の選択にはしない)
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      stopHold();
      if (Math.abs(dx) >= 44 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        start.done = true;
        calDrag.suppress = true; setTimeout(() => { calDrag.suppress = false; }, 80);
        move(dx < 0 ? 1 : -1, dx < 0 ? 'next' : 'prev');
      } else if (Math.abs(dy) > 10) start.done = true; // たての動きは、画面のスクロール
      return;
    }
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const c = el && el.closest && el.closest('#month button[data-key]');
    if (!c) return;
    if (c.dataset.key === start.key && !start.moved) return;
    start.moved = true;
    const [lo, hi] = [start.key, c.dataset.key].sort();
    state.cal.sel = lo;
    state.cal.end = hi > lo ? hi : null;
    state.cal.bar = true;
    state.cal.range = false;
    paintRange();
  });
  const finish = () => {
    if (start) stopHold();
    if (start && start.moved) { calDrag.suppress = true; setTimeout(() => { calDrag.suppress = false; }, 50); renderCalendar(); }
    else if (start && start.armed && start.el) { start.el.classList.remove('arm'); calDrag.suppress = true; setTimeout(() => { calDrag.suppress = false; }, 50); } // 長押しだけで終わったときは、選ばない
    start = null;
  };
  month.addEventListener('pointerup', finish);
  month.addEventListener('pointercancel', finish);
  $('#evb-close').addEventListener('click', () => { state.cal.bar = false; state.cal.end = null; state.cal.range = false; renderCalendar(); });
  $('#evb-range').addEventListener('click', () => { state.cal.range = !state.cal.range; renderCalendar(); });
  $('#evb-more').addEventListener('click', openEventSheet);
  // ワンタップの予定。デート・ごはん・いっしょの仕事(ふたりの予定として入る)
  const quick = (id, title, kind) => $(id).addEventListener('click', async () => {
    const btn = $(id);
    btn.disabled = true;
    try {
      const { sel, end } = state.cal;
      await addEvent({ title: typeof title === 'function' ? title(end) : title, kind, date: sel, end, who: 'both', time: '' });
      state.cal.bar = false; state.cal.end = null; state.cal.range = false;
      renderCalendar();
    } finally { btn.disabled = false; }
  });
  quick('#evb-date', (end) => (end ? 'お泊まりデート' : 'デート'), 'date');
  quick('#evb-meal', 'ごはん', 'meal');
  quick('#evb-work', 'いっしょの仕事', 'work');
}

const calDrag = { suppress: false };
// なぞっている間は、全部を描き直さず、色だけ付け替える
function paintRange() {
  const { sel, end } = state.cal;
  $$('#month button[data-key]').forEach((b) => {
    const k = b.dataset.key;
    b.classList.toggle('sel', k === sel);
    b.classList.toggle('rstart', k === sel && !!end);
    b.classList.toggle('inrange', !!end && k > sel && k <= end);
  });
  renderEvBar();
}

const nightsLabel = (a, b) => { const n = dayNum(b) - dayNum(a); return `${n}泊${n + 1}日`; };
const mdOf = (k) => { const d = parseYmd(k); return `${d.getMonth() + 1}/${d.getDate()}(${WEEK[d.getDay()]})`; };

// 画面の下の、予定を入れるバー。連続して選ぶと、自動で「お泊まりデート」になる
function renderEvBar() {
  const bar = $('#ev-bar');
  const { sel, end, range } = state.cal;
  bar.hidden = !(state.cal.bar && state.view === 'cal');
  $('#ev-open').hidden = state.view !== 'cal' || !bar.hidden; // 右下の「＋」は、カレンダーを見ていて、入れるバーが出ていないときだけ
  if (bar.hidden) return;
  $('#evb-label').textContent = end ? `${mdOf(sel)}〜${mdOf(end)}` : mdOf(sel);
  $('#evb-sub').textContent = range ? '終わりの日を、カレンダーでタップしてください' : end ? `連続で選んだので、お泊まり(${nightsLabel(sel, end)})` : 'この日に、ふたりの予定を入れる';
  $('#evb-date').textContent = end ? '♥ お泊まりデート' : '♥ デート';
  $('#evb-date').classList.toggle('stay', !!end);
  $('#evb-range').textContent = range ? 'やめる' : end ? '日を選び直す' : '連続にする';
  $('#evb-range').setAttribute('aria-pressed', String(!!range));
}

async function addEvent({ title, date, end, who, time, note, kind }) {
  const payload = { title, date, time: time || '', who, by: myUid() };
  if (kind) payload.kind = kind;
  if (note) payload.note = note;
  if (end && end > date) payload.end = end;
  state.cal.sel = date;
  const d = parseYmd(date);
  state.cal.y = d.getFullYear();
  state.cal.m = d.getMonth();
  await state.store.saveEvent(null, await C.encryptJson(state.key, 'events', payload));
}

// 予定の詳細(思い出や内容)。ふたりに見える。あとから書き足し・直しができる
const NOTE_MAX = 1000;
function openEventNote(id) {
  const ev = state.events.find((x) => x.id === id);
  if (!ev) return;
  const title = h('input', { type: 'text', maxlength: '40', value: ev.title, required: true, 'aria-label': '予定の名前' });
  const date = h('input', { type: 'date', required: true, value: ev.date, 'aria-label': '日付' });
  const time = h('input', { type: 'time', value: ev.time || '', 'aria-label': '時刻' });
  const endIn = h('input', { type: 'date', value: ev.end || '', 'aria-label': '終わりの日(連続するとき)' });
  const curType = evType(ev);
  const picker = iconPicker(curType);
  const note = h('textarea', { rows: '8', maxlength: String(NOTE_MAX), placeholder: '詳細(行った場所、食べたもの、思い出など)', 'aria-label': '詳細' });
  note.value = ev.note || '';
  const count = h('small', { class: 'lead' }, '');
  const upd = () => { count.textContent = `${note.value.length} / ${NOTE_MAX}`; };
  note.addEventListener('input', upd);
  upd();
  const err = h('p', { class: 'error', role: 'alert' });
  const save = h('button', { class: 'primary', type: 'submit' }, '保存');
  const form = h('form', { class: 'stack' }, title, h('div', { class: 'evrow' }, date, time),
    h('div', { class: 'evrow end' }, h('label', {}, '連続するときの、終わりの日'), endIn), picker.node, note, count, err, save);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const t = title.value.trim();
    if (!t || !date.value) return;
    save.disabled = true;
    try {
      const { id: _id, ...rest } = ev;
      const payload = { ...rest, title: t, date: date.value, time: time.value || '' };
      if (endIn.value && endIn.value > date.value) payload.end = endIn.value; else delete payload.end;
      const picked = picker.value();
      if (picked !== curType) { if (picked === 'other') delete payload.kind; else payload.kind = picked; }
      const n = note.value.trim();
      if (n) payload.note = n; else delete payload.note;
      await state.store.saveEvent(ev.id, await C.encryptJson(state.key, 'events', payload));
      closeSheet();
    } catch (x) { err.textContent = '保存できませんでした。通信を確認してください。'; save.disabled = false; }
  });
  openSheet(h('h2', {}, `${mdOf(ev.date)}の予定`), form);
}

// 「そのほか」: 名前・日付・時刻・アイコンを入れる(予定はぜんぶ、ふたりのもの)
function openEventSheet() {
  const { sel, end } = state.cal;
  const title = h('input', { id: 'evs-title', placeholder: '予定の名前', maxlength: '40', required: true, 'aria-label': '予定の名前' });
  const date = h('input', { type: 'date', required: true, value: sel, 'aria-label': '日付' });
  const time = h('input', { type: 'time', 'aria-label': '時刻' });
  const endIn = h('input', { type: 'date', value: end || '', 'aria-label': '終わりの日(連続するとき)' });
  const picker = iconPicker('other');
  const noteIn = h('textarea', { rows: '3', maxlength: String(NOTE_MAX), placeholder: '詳細(任意)', 'aria-label': '詳細' });
  const err = h('p', { class: 'error', role: 'alert' });
  const form = h('form', { class: 'stack' },
    title, h('div', { class: 'evrow' }, date, time),
    h('div', { class: 'evrow end' }, h('label', {}, '連続するときの、終わりの日'), endIn),
    picker.node, noteIn, err, h('button', { class: 'primary', type: 'submit' }, '予定を追加'));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const t = title.value.trim();
    if (!t || !date.value) return;
    try {
      const kind = picker.value();
      await addEvent({ title: t, date: date.value, end: endIn.value, who: 'both', time: time.value, note: noteIn.value.trim(), kind: kind === 'other' ? '' : kind });
      state.cal.bar = false; state.cal.end = null;
      closeSheet();
      renderCalendar();
    } catch (x) { err.textContent = '保存できませんでした。通信を確認してください。'; }
  });
  openSheet(h('h2', {}, '予定を入れる'), form);
  title.focus();
}

async function sendPayload(payload) {
  const expire = EXPIRE_MS[LS.get(K.expire) || '7d'];
  await state.store.sendMessage(await C.encryptJson(state.key, 'messages', payload), expire);
}

// 写真から作ったスタンプ(iPhoneのキーボードから貼れる絵)を、比率を保って縮めて、送れる形にする
const IMG_MAX = 240; // 長い辺の大きさ(px)
const IMG_LIMIT = 360 * 1024; // 送る絵のデータの上限(文字数)
async function prepareImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    let scale = Math.min(1, IMG_MAX / Math.max(img.naturalWidth, img.naturalHeight));
    for (let k = 0; k < 3; k++) {
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const hgt = Math.max(1, Math.round(img.naturalHeight * scale));
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = hgt;
      cv.getContext('2d').drawImage(img, 0, 0, w, hgt);
      let data = cv.toDataURL('image/webp', 0.85);
      if (!data.startsWith('data:image/webp')) data = cv.toDataURL('image/png'); // webpを作れない端末は、pngで(背景の透明は、どちらも残る)
      if (data.length <= IMG_LIMIT) return { img: data, w, h: hgt };
      scale *= 0.75; // 大きすぎたら、もう少し小さくして、やり直す
    }
    return null;
  } finally { URL.revokeObjectURL(url); }
}

function buildChat() {
  const msg = $('#msg');
  const getText = () => msg.textContent.replace(/\u00a0/g, ' ').trim();
  const clearBox = () => { msg.innerHTML = ''; };
  const send = async () => {
    const body = getText();
    if (!body) return;
    clearBox();
    await sendPayload({ body });
  };
  $('#chat-form').addEventListener('submit', (e) => { e.preventDefault(); send(); });
  // 入力欄(contenteditable)は、文字だけを入れる。絵(スタンプ)が貼られたら、送る。それ以外の書式は、受け取らない
  msg.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); send(); } });
  msg.addEventListener('input', () => { if (!msg.textContent) clearBox(); else if (msg.querySelector('img,div,p,span,font,b,i')) { const t = msg.textContent; msg.textContent = t; const r = document.createRange(); r.selectNodeContents(msg); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } });
  msg.addEventListener('paste', async (e) => {
    const cd = e.clipboardData;
    const file = cd && cd.files && [...cd.files].find((f) => f.type.startsWith('image/'));
    e.preventDefault();
    if (file) {
      try {
        const p = await prepareImage(file);
        if (!p) { $('#chat-err').textContent = '大きすぎて、送れませんでした'; return; }
        $('#chat-err').textContent = '';
        await sendPayload({ t: 'img', img: p.img, w: p.w, h: p.h });
      } catch (x) { $('#chat-err').textContent = '送れませんでした。もう一度ためしてください。'; }
      return;
    }
    const text = cd ? cd.getData('text/plain') : '';
    if (text) document.execCommand('insertText', false, text);
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
  $('#sheet-body').replaceChildren(...nodes.filter(Boolean));
  $('#sheet').hidden = false;
  moonPause();
}
function closeSheet() {
  const onClose = state.sheetClose;
  state.sheetClose = null;
  if (onClose) onClose();
  state.pastRender = null;
  state.sheetRender = null;
  $('#sheet').hidden = true;
  $('#sheet-body').replaceChildren();
  moonPause();
}

/* ================= 生理・気分の記録 ================= */
// 記録の時刻: at=はじめて入れた時刻 / up=最後に直した時刻 / tt={タグ: あとから足した時刻}(はじめから入れていたタグは、載せない)
const clockOf = (ms) => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
function stampRec(prev, rec, now = Date.now()) {
  const out = { ...rec, at: prev ? prev.at : now, up: now, tt: {} };
  if (prev) (rec.t || []).forEach((t) => { if (!(prev.t || []).includes(t)) out.tt[t] = now; else if (prev.tt && prev.tt[t]) out.tt[t] = prev.tt[t]; });
  if (!out.at) delete out.at; // 時刻のない古い記録は、そのまま
  if (!Object.keys(out.tt).length) delete out.tt;
  return out;
}
const sameRec = (x, y) => !!x && !!y && !!x.p === !!y.p && (x.l || 0) === (y.l || 0) && (x.m || '') === (y.m || '') && JSON.stringify([...(x.t || [])].sort()) === JSON.stringify([...(y.t || [])].sort());
const emptyRec = (r) => !r.p && !r.l && !(r.t && r.t.length) && !r.m;
const withTimeout = (promise, ms) => Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))]);

// changes: [{ date, rec }]。rec が空なら、その日の記録を消す。
async function writeDays(changes) {
  const saves = [];
  const removes = [];
  for (const { date, rec } of changes) {
    const old = state.dayDocs.get(`${myUid()}|${date}`); // 古い版で作った記録は、同じ書類に上書きする
    if (!rec || emptyRec(rec)) { if (old) removes.push(old); continue; }
    const id = old || await C.dayId(state.keyBytes, `${date}|${myUid()}`);
    saves.push({ id, payload: await C.encryptJson(state.key, 'days', { ...rec, d: date, by: myUid() }) });
  }
  // 通信できないときは、端末に保存して先に進む(つながったら送られる)。拒否されたときは例外になる。
  if (saves.length) await withTimeout(state.store.saveDays(saves), 5000);
  if (removes.length) await withTimeout(state.store.removeDays(removes), 5000);
}

const SAVE_ERROR = '保存できませんでした。通信を確認してください。';

function openDaySheet(date) {
  if (date > ymd(new Date())) return; // 未来の日は、入れない
  const rec = myRecs().get(date) || { p: false, l: 0, t: [], m: '' };
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

  // 気分のタグ: 気持ち・からだ・(生理の日だけ)生理まわり・よく使うタグ・自分で足す
  const tags = h('div', { class: 'stack' });
  const MAX_TAGS = 12;
  const freq = new Map();
  [...myRecs().values()].forEach((r) => (r.t || []).forEach((t) => { if (!PRESET_TAGS.has(t)) freq.set(t, (freq.get(t) || 0) + 1); }));
  const hiddenTags = () => { try { return new Set(JSON.parse(LS.get(K.tagHide) || '[]')); } catch (e) { return new Set(); } };
  const chip = (t, removable = false) => {
    const b = h('button', { type: 'button', 'aria-pressed': String(draft.t.includes(t)) }, t);
    let hold = null;
    let held = false;
    if (removable) { // 長押しで、「よく使うタグ」の候補から外す(過去の記録は、そのまま)
      const stop = () => { clearTimeout(hold); hold = null; };
      b.addEventListener('pointerdown', () => {
        held = false; stop();
        hold = setTimeout(() => {
          held = true;
          if (confirm(`「${t}」を、候補から消しますか？\n過去の記録は、そのまま残ります。`)) {
            const set = hiddenTags(); set.add(t);
            LS.set(K.tagHide, JSON.stringify([...set]));
            renderTags();
          }
        }, 600);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, stop));
      b.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    b.addEventListener('click', () => {
      if (held) { held = false; return; }
      const k = draft.t.indexOf(t);
      if (k >= 0) draft.t.splice(k, 1);
      else if (draft.t.length < MAX_TAGS) draft.t.push(t);
      b.setAttribute('aria-pressed', String(draft.t.includes(t)));
    });
    return b;
  };
  const group = (title, list, removable = false) => h('div', {}, h('p', { class: 'lab' }, title, removable ? h('small', { class: 'tag-hint' }, '  長押しで、候補から消せます') : null), h('div', { class: 'tags' }, list.map((t) => chip(t, removable))));
  const customInput = h('input', { type: 'text', maxlength: '10', placeholder: '自分のタグを足す(10文字まで)', 'aria-label': '自分のタグを足す' });
  const customAdd = h('button', { class: 'ghost sm', type: 'button' }, '足す');
  const addCustom = () => {
    const t = customInput.value.trim().slice(0, 10);
    if (!t) return;
    customInput.value = '';
    if (!draft.t.includes(t) && draft.t.length < MAX_TAGS) draft.t.push(t);
    const hs = hiddenTags();
    if (hs.delete(t)) LS.set(K.tagHide, JSON.stringify([...hs])); // 消した言葉を、また足したら、候補に戻る
    renderTags();
  };
  customAdd.addEventListener('click', addCustom);
  customInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } });
  function renderTags() {
    const hid = hiddenTags();
    const usedCustom = [...new Set([...[...freq.entries()].filter((x) => !hid.has(x[0])).sort((x, y) => y[1] - x[1]).map((x) => x[0]).slice(0, 12), ...draft.t.filter((t) => !PRESET_TAGS.has(t))])];
    const showPeriod = isHer() && (draft.p || draft.t.some((t) => PERIOD_TAGS.includes(t)));
    tags.replaceChildren(...[
      ...TAG_GROUPS.map(([title, list]) => group(title, list)),
      showPeriod ? group('生理まわり', PERIOD_TAGS) : null,
      usedCustom.length ? group('よく使うタグ', usedCustom, true) : null,
      h('div', { class: 'tagadd' }, customInput, customAdd),
    ].filter(Boolean));
  }
  period.addEventListener('change', renderTags);
  renderTags();

  const memo = h('textarea', { maxlength: '200', placeholder: 'ひとことメモ', 'aria-label': 'ひとことメモ' });
  memo.value = rec.m || '';
  const err = h('p', { class: 'error', role: 'alert' });
  const save = h('button', { class: 'primary', type: 'button' }, '保存');
  save.addEventListener('click', async () => {
    err.textContent = '';
    save.disabled = true;
    try {
      const next = { p: draft.p, l: draft.l, t: draft.t, m: memo.value.trim().slice(0, 200) };
      const prev = myRecs().get(date);
      if (!(prev && sameRec(prev, next))) await writeDays([{ date, rec: stampRec(prev, next) }]); // 変えていなければ、時刻は更新しない
      closeSheet();
    } catch (e) {
      err.textContent = SAVE_ERROR;
      save.disabled = false;
    }
  });

  openSheet(
    h('h2', {}, `${d.getMonth() + 1}月${d.getDate()}日(${WEEK[d.getDay()]})`),
    isHer() ? h('div', { class: 'srow' }, h('div', { class: 't' }, 'この日は生理', h('small', {}, '連続した日が、ひとまとまりになります')), period) : null,
    h('div', {}, h('p', { class: 'lab' }, '今日の調子(新月 → 満月)'), scale),
    h('div', {}, h('p', { class: 'lab' }, '気分(いくつでも・12個まで)'), tags),
    memo,
    h('p', { class: 'lock' }, '調子・気分・メモは、ふたりに共有されます。'),
    err,
    save,
  );
}

function openPastSheet() {
  if (!isHer()) return;
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
          changes.push({ date: k, rec: { ...(myRecs().get(k) || {}), p: false } });
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
      changes.push({ date: k, rec: { ...(myRecs().get(k) || { l: 0, t: [], m: '' }), p: true } });
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
  'js/app.js', 'js/crypto.js', 'js/cities.js', 'js/weather.js', 'js/config.js', 'js/store.js', 'js/emoji.js', 'js/cycle.js', 'js/card.js', 'js/share.js', 'js/qa.js', 'js/dates.js', 'js/export.js', 'js/news.js', 'js/moon.js', 'js/moonlogic.js', 'js/demo-boot.js', 'js/chara.js', 'js/similar.js', 'js/hitorigoto.js', 'js/shelf.js', 'js/ticket.js', 'js/diary.js', 'js/room.js', 'css/moon.css', 'css/shelf.css', 'css/ticket.css', 'css/diary.css',
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

/* ================= その他(最新版にする・おたのしみ・設定) ================= */
const mdKey = (k) => `${Number(k.slice(5, 7))}/${Number(k.slice(8))}`;
let otoSig = '';
function renderMore() {
  const sub = state.more || 'menu';
  const { A } = moonAnalysis();
  const nFull = A.fulls.length;
  const menu = $('#more-menu');
  const oto = $('#more-oto');
  const set = $('#settings');
  $('#more-h').textContent = sub === 'oto' ? 'おたのしみ' : sub === 'settings' ? '設定' : 'その他';
  oto.hidden = sub !== 'oto';
  $('#v-set').classList.toggle('dfull', sub === 'oto' && state.oto === 'diary'); // 日記帳は、画面いっぱいに
  set.hidden = sub !== 'settings';
  if (sub !== 'oto') otoSig = '';
  if (sub !== 'menu') {
    const inOto = sub === 'oto' && state.oto && state.oto !== 'menu'; // 棚・日記帳の中では、おたのしみの入口に戻る
    const tag = `back:${inOto ? 'oto' : 'more'}`;
    if (menu.dataset.sub !== tag) {
      menu.dataset.sub = tag;
      const back = h('button', { class: 'ghost', type: 'button', style: 'margin:0 18px 12px' }, inOto ? '‹ おたのしみ' : '‹ その他');
      back.addEventListener('click', () => { if (inOto) state.oto = 'menu'; else state.more = 'menu'; renderMore(); });
      menu.replaceChildren(back);
    }
  } else if (menu.dataset.sub !== 'menu' || menu.dataset.n !== String(nFull)) {
    menu.dataset.sub = 'menu';
    menu.dataset.n = String(nFull);
    const upd = h('button', { class: 'more-upd', type: 'button' }, h('span', {}, '最新版にする', h('small', {}, `いまの版: ${VERSION}`)), '›');
    upd.addEventListener('click', () => refreshApp(upd));
    const oto0 = h('button', { class: 'more-oto', type: 'button' }, h('b', {}, 'おたのしみ'), h('small', {}, nFull ? `日記帳・満月の棚(${nFull}個)` : '日記帳・満月の棚'));
    oto0.addEventListener('click', () => { state.more = 'oto'; state.oto = 'menu'; state.roomScene = null; renderMore(); });
    const setBtn = h('button', { class: 'more-quiet', type: 'button' }, h('span', {}, '設定'), h('span', { 'aria-hidden': 'true' }, '›'));
    setBtn.addEventListener('click', () => { state.more = 'settings'; settingsMore = false; renderMore(); renderSettings(true); });
    const ul = h('div', { class: 'more-menu' }, upd, oto0, setBtn);
    menu.replaceChildren(ul);
  }
  if (sub === 'settings') renderSettings();
  if (sub === 'oto') renderOto(A);
}

function renderOto(A) {
  const mode = state.oto || 'menu';
  if (mode !== 'diary') diaryBook = null;
  if (mode !== 'menu') delete $('#more-oto').dataset.room;
  if (mode === 'menu') state.diaryOpened = false; // 部屋に戻ったら、次は、また閉じた表紙から
  if (mode === 'shelf') return renderShelf(A);
  otoSig = '';
  if (mode === 'diary') return renderDiary();
  // 部屋の絵(ファンタジー)。棚→月の棚(満月が1つ以上になるまでは、案内だけ)、デスクの日記帳→日記帳。ふたりの場所は、まだタップできない
  const hour = new Date().getHours();
  if (!state.roomScene || state.roomHour !== (hour >= 21 || hour < 5)) {
    state.roomHour = hour >= 21 || hour < 5;
    state.roomScene = pickScene({ hour, last: LS.get(K.roomLast) || '' });
    LS.set(K.roomLast, state.roomScene);
  }
  const box = $('#more-oto');
  const sig = JSON.stringify([state.roomScene, A.pts, A.fulls.length]);
  if (box.dataset.room === sig && box.querySelector('.rm-wrap')) return; // 変わらないときは、描き直さない(星のまたたきを止めない)
  box.dataset.room = sig;
  const room = h('div', { class: 'rm-wrap' });
  room.innerHTML = roomSvg(state.roomScene, { pts: A.pts, full: A.fulls.length });
  const note = h('div', { class: 'rm-note', hidden: true, role: 'status' }, 'ふたりの月が満月になったら、あらたな機能が解放されます');
  let noteTimer = 0;
  const go = (el) => {
    const to = el && el.dataset.go;
    if (to === 'shelf' && !A.fulls.length) { note.hidden = false; clearTimeout(noteTimer); noteTimer = setTimeout(() => { note.hidden = true; }, 3500); return; }
    if (to === 'shelf' || to === 'diary') { state.oto = to; renderMore(); }
  };
  room.addEventListener('click', (e) => go(e.target.closest('[data-go]')));
  room.addEventListener('keydown', (e) => { if (e.key !== 'Enter' && e.key !== ' ') return; const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); go(g); } });
  room.append(note);
  box.replaceChildren(room);
}

function renderShelf(A) {
  const sig = JSON.stringify(A.fulls.map((f) => [f.n, f.at]));
  if (sig === otoSig) return;
  otoSig = sig;
  const start = Math.floor((Math.max(A.fulls.length, 1) - 1) / SHELF_MAX) * SHELF_MAX;
  const wrap = h('div', { class: 'oto-wrap' });
  wrap.innerHTML = shelfSvg(A.fulls.slice(start, start + SHELF_MAX), start);
  const open = (el) => { const n = Number(el.dataset.n); if (n) openTank(n); };
  wrap.addEventListener('click', (e) => { const g = e.target.closest('.oto-tk'); if (g) open(g); });
  wrap.addEventListener('keydown', (e) => { if (e.key !== 'Enter' && e.key !== ' ') return; const g = e.target.closest('.oto-tk'); if (g) { e.preventDefault(); open(g); } });
  $('#more-oto').replaceChildren(
    h('div', { class: 'oto-top' }, h('h2', {}, '満月の棚'), h('small', {}, `${A.fulls.length} 個`)),
    wrap,
    h('p', { class: 'oto-credit' }, '月の写真: NASA'),
  );
}

/* ---- 日記帳(1日が1ページ。何かが入っている日だけ) ---- */
let diaryBook = null;
let diarySig = '';
function diaryKeyList() {
  const recKeys = peopleOf().flatMap((u) => [...recsOf(u).entries()].filter(([, r]) => hasMoodRec(r)).map(([k]) => k));
  const from = state.qcards.map((c) => c.date).filter(Boolean).sort()[0] || ''; // 日記帳は、いちばん最初のお題の日から
  return diaryKeys({ cards: state.qcards.filter((c) => c.cat !== WHISPER), recKeys, events: state.events, todayKey: ymd(new Date()), from });
}
const diaryCards = (day) => state.qcards.filter((c) => c.date === day && c.cat !== WHISPER).sort((a, b) => a.n - b.n); // おやすみ前は、日記には書かない(見返す場所は、別に考える)
function diaryHead(day, small) {
  const d = parseYmd(day);
  const wd = d.getDay();
  return h('div', { class: `ddate${wd === 6 ? ' sat' : wd === 0 ? ' sun' : ''}${small ? ' small' : ''}` }, h('span', { class: 'd' }, String(d.getDate())), h('span', { class: 'w' }, `${WEEK[wd]}曜日`), h('span', { class: 'ym' }, `${d.getFullYear()}年${d.getMonth() + 1}月`));
}
// 左のページ: できごと(予定・ふたりの調子とタグ・書き込み欄)
function diaryEvents(day) {
  const nodes = [diaryHead(day), h('div', { class: 'dsec' }, 'できごと')];
  state.events.filter((e) => evOn(e, day)).sort(byDate).forEach((e) => {
    const b = h('button', { class: 'dev', type: 'button' }, h('i', {}), `${e.title}${e.time ? ` ${e.time}` : ''}`);
    b.addEventListener('click', () => (tripOf(e).length ? openTicket(e) : openEventNote(e.id)));
    nodes.push(b);
  });
  const mine = myRecs().get(day);
  const recs = peopleOf().map((u) => ({ u, rec: recsOf(u).get(day) })).filter((x) => hasMoodRec(x.rec));
  recs.forEach(({ u, rec }) => {
    const lv = LEVELS.find(([, v]) => v === rec.l);
    const tags = [...(lv ? [`調子: ${lv[0]}`] : []), ...(rec.t || [])];
    if (tags.length) nodes.push(h('div', { class: 'dtags' }, h('b', { style: 'font-size:14px' }, `${nameOfUid(u)} `), tags.map((t) => h('span', { class: whoClass(u) }, t))));
  });
  // 書き込み欄(罫線の上に、手書き風の文字で。自分の分は、その場で書ける。相手の分は、読むだけ)
  const writeArea = h('div', { class: 'dwritebox' });
  const showMine = () => {
    const cur = myRecs().get(day);
    const text = h('div', { class: `dnote${cur && cur.m ? '' : ' empty'}`, role: 'button', tabindex: '0', 'aria-label': 'ここに書く' }, cur && cur.m ? cur.m : 'ここに、書く');
    const edit = () => {
      const ta = h('textarea', { class: 'dnote-in', maxlength: '200', rows: '4', 'aria-label': 'この日のメモ', placeholder: 'ここに、書く' });
      ta.value = (cur && cur.m) || '';
      const save = h('button', { class: 'dsave', type: 'button' }, '書いた');
      const done = async () => {
        save.disabled = true;
        const prev = myRecs().get(day);
        const next = { p: !!(prev && prev.p), l: (prev && prev.l) || 0, t: (prev && prev.t) || [], m: ta.value.trim() };
        try { await writeDays([{ date: day, rec: stampRec(prev, next) }]); } catch (e) { save.disabled = false; return; }
        showMine();
      };
      save.addEventListener('click', done);
      writeArea.replaceChildren(ta, save, ...others());
      ta.focus();
    };
    text.addEventListener('click', edit);
    text.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); edit(); } });
    writeArea.replaceChildren(text, ...others());
  };
  const others = () => recs.filter(({ u, rec }) => u !== myUid() && rec.m).map(({ u, rec }) => h('div', { class: `dnote theirs ${whoClass(u)}` }, h('b', {}, `${nameOfUid(u)} `), rec.m));
  showMine();
  nodes.push(writeArea);
  if (mine && (mine.l || (mine.t && mine.t.length))) { const fix = h('button', { class: 'dwrite fix', type: 'button' }, '調子を直す'); fix.addEventListener('click', () => openDaySheet(day)); nodes.push(fix); }
  else { const add = h('button', { class: 'dwrite', type: 'button' }, '＋ 調子・気分'); add.addEventListener('click', () => openDaySheet(day)); nodes.push(add); }
  return nodes;
}
// 右のページ: その日のお題(おまけ)。付せんにお題、答えはふきだし
// 答えは、名前を書かず、答えごと、その人の色の蛍光ペンで線を引く(ひとみ=ピンク、かずゆき=ミント)
function markAnswers(nodes) {
  nodes.forEach((el) => {
    if (!el.classList || !el.classList.contains('ans') || el.classList.contains('wait')) return;
    const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('');
    el.replaceChildren(h('span', { class: 'mk' }, text));
  });
  return nodes;
}
function diaryCardPage(day) {
  const nodes = [diaryHead(day, true)];
  diaryCards(day).forEach((c) => {
    const st = cardStatus(c, state.qcards, state.answers);
    const q = h('button', { class: `dsticky c-${c.cat || 'none'}`, type: 'button' }, h('i', { class: 'tape' }), h('span', {}, c.text), h('small', {}, `第${c.n}問${c.cat ? ` ・ ${catLabel(c.cat)}` : ''}${st === 'rest' ? ' ・ お休み' : ''}`));
    q.addEventListener('click', () => openQCardSheet(c.n));
    nodes.push(q, ...markAnswers(answersBlock(c.n)));
  });
  return nodes;
}
let diarySpread = false;
function diaryPageNodes(key) {
  const day = dayOfPage(key);
  if (diarySpread) return [h('div', { class: 'dspread' }, h('div', { class: 'dsheet' }, ...diaryEvents(day)), h('div', { class: 'dsheet right' }, ...diaryCardPage(day)))];
  return String(key).endsWith('#c') ? diaryCardPage(day) : diaryEvents(day);
}
// 閉じた革の日記帳の表紙(無題。年だけ)。タップで、左のとじ目で開く
function diaryCover(onOpen, months = [], onPick = () => {}) {
  const orn = (c) => `<svg class="dorn ${c}" viewBox="0 0 30 30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M3 27V9q0-6 6-6h18M8 22V12q0-4 4-4h10M13 17q0-3 3-3h4"/><circle cx="6" cy="6" r="1.6" fill="currentColor"/></svg>`;
  const el = h('div', { class: 'dcover', role: 'button', tabindex: '0', 'aria-label': '日記帳を開く' });
  el.innerHTML = `<div class="dlite"></div><div class="dwear"></div><div class="dspine"><i style="top:14%"></i><i style="top:28%"></i><i style="top:70%"></i><i style="top:84%"></i></div><div class="dstitch"></div><div class="dframe"></div>${orn('tl')}${orn('tr')}${orn('bl')}${orn('br')}
<div class="dplate"><div><svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true"><defs><linearGradient id="dgg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe7a0"/><stop offset=".55" stop-color="#c79a3a"/><stop offset="1" stop-color="#f4d98a"/></linearGradient></defs><path d="M27 6a15 15 0 1 0 7 23A12 12 0 0 1 27 6z" fill="url(#dgg)"/></svg><b>${new Date().getFullYear()}</b></div></div><div class="dcribbon"></div>`;
  const open = () => {
    if (el.classList.contains('open')) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { onOpen(); return; }
    el.classList.add('open');
    setTimeout(onOpen, 1050);
  };
  if (months.length) {
    el.classList.add('hasmj');
    const mj = h('div', { class: 'dmj' }, h('div', { class: 'cap' }, '月をえらんで、ひらく'));
    const grid = h('div', { class: 'grid' });
    months.forEach(({ ym, index }, i) => {
      const yr = ym.slice(0, 4);
      const b = h('button', { type: 'button' }, ...(i === 0 || yr !== months[i - 1].ym.slice(0, 4) ? [h('small', {}, yr)] : []), h('b', {}, String(Number(ym.slice(5)))), h('i', {}, '月'));
      b.addEventListener('click', (e) => { e.stopPropagation(); onPick(index); open(); });
      b.addEventListener('keydown', (e) => e.stopPropagation());
      grid.append(b);
    });
    mj.append(grid);
    el.append(mj);
  }
  el.addEventListener('click', open);
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  return el;
}
function renderDiary() {
  const days = diaryKeyList();
  const box = $('#more-oto');
  if (!days.length) { diaryBook = null; box.replaceChildren(h('p', { class: 'dempty' }, 'まだ、日記に書かれた日がありません')); return; }
  const wide = !!(window.matchMedia && window.matchMedia('(min-width: 720px)').matches); // 広い画面では見開き(左: できごと / 右: お題)
  diarySpread = wide;
  const keys = wide ? days : diaryPages(days, (d) => diaryCards(d).length > 0);
  const sig = JSON.stringify([wide, keys]);
  if (!diaryBook || sig !== diarySig) {
    diarySig = sig;
    const bm = LS.get(K.diaryAt);
    const at = bm ? keys.indexOf(wide ? dayOfPage(bm) : (bm.includes('#') ? bm : `${bm}#e`)) : -1;
    const home = wide ? keys.length - 1 : Math.max(0, keys.length - (keys[keys.length - 1].endsWith('#c') ? 2 : 1)); // いちばん新しい日の、できごとのページ(しおりのひもで戻る先)
    const start = at >= 0 ? at : home;
    diaryBook = createBook({ h, keys, start, home, renderPage: diaryPageNodes, onTurn: (k) => LS.set(K.diaryAt, k), reduce: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches });
    box.replaceChildren(h('div', { class: 'oto-top' }, h('h2', {}, '日記帳'), h('small', {}, `${keys.length} ${wide ? '見開き' : 'ページ'}`)), diaryBook.root, h('p', { class: 'dhint' }, '左右にスワイプしても、めくれます'));
    const bk = diaryBook;
    function mountCover() {
      const bookEl = bk.root.querySelector('.dbook');
      if (bookEl.querySelector('.dcover')) return;
      bookEl.classList.add('closed');
      const cover = diaryCover(() => { state.diaryOpened = true; cover.remove(); bookEl.classList.remove('closed'); }, monthTabs(keys), (i) => bk.jump(i));
      bookEl.append(cover);
    }
    if (!state.diaryOpened) mountCover();
    // 左下の「もどる」: ページ → 表紙(月をえらぶ) / 表紙 → おたのしみの入口
    const fab = h('button', { class: 'dfab', type: 'button', 'aria-label': 'もどる' }, h('span', { 'aria-hidden': 'true' }, '‹'));
    fab.addEventListener('click', () => {
      if (bk.root.querySelector('.dcover')) { state.oto = 'menu'; renderMore(); return; }
      state.diaryOpened = false;
      mountCover();
    });
    box.append(fab);
    return;
  }
  diaryBook.refreshPage();
}

function openTank(n) {
  const { A, roles } = moonAnalysis();
  const f = A.fulls.find((x) => x.n === n);
  const st = fullStats(A, n);
  if (!f) return;
  const P = persOf(n);
  const art = h('div', {});
  art.innerHTML = tankSvg(n, { label: '', num: false });
  const dl = h('dl', { class: 'oto-stats' });
  const add = (k, v) => dl.append(h('dt', {}, k), h('dd', {}, v));
  add('満月の日', mdText(f.at));
  if (st) {
    add('期間', `${mdKey(st.from)} 〜 ${mdKey(st.to)}(${st.span}日間)`);
    add('ぴったり', `${st.sync}回`);
    add('おまたせ', `${st.late}回`);
    add('待たせた回数', `${roleName('h', roles)} ${st.lateBy.h}回 ・ ${roleName('y', roles)} ${st.lateBy.y}回`);
  }
  openSheet(h('h2', {}, `${n}個目の満月`), art, h('p', { class: 'oto-pers' }, h('b', {}, P.name), h('small', {}, P.d)), dl);
}

// 満月になったあと、初めて開いたときのお祝い
function maybeCelebrate(A) {
  if (!state.loaded.moon || state.otoPop || $('#app').hidden) return;
  const seen = Number(LS.get(K.fullSeen) || 0);
  if (A.fulls.length <= seen) return;
  const wait = state.moonCheerUntil - Date.now();
  if (wait > 0) { setTimeout(renderMoon, wait + 400); return; }
  const f = A.fulls[A.fulls.length - 1];
  const P = persOf(f.n);
  const pop = $('#oto-pop');
  const close = () => {
    LS.set(K.fullSeen, String(A.fulls.length));
    state.otoPop = false;
    pop.hidden = true;
    pop.replaceChildren();
  };
  const art = h('div', {});
  art.innerHTML = tankSvg(f.n, { label: '', num: false });
  const go = h('button', { class: 'go', type: 'button' }, '棚を見る');
  go.addEventListener('click', () => { close(); state.more = 'oto'; state.oto = 'shelf'; setView('set', true); });
  const later = h('button', { class: 'later', type: 'button' }, 'あとで');
  later.addEventListener('click', close);
  const stars = Array.from({ length: 14 }, (_, i) => h('i', { class: 'star', style: `left:${(i * 37 + 11) % 96}%;top:${(i * 53 + 7) % 90}%;animation-delay:-${(i % 5) * 0.5}s` }));
  pop.replaceChildren(...stars, art, h('h2', {}, '満月になったよ'), h('p', {}, `${f.n}個目の月が、棚にならびました`, h('br'), `${P.name}月です`), h('div', { class: 'btns' }, go, later));
  state.otoPop = true;
  pop.hidden = false;
}

function renderSettings(force = false) {
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

  const roleSel = h('select', { 'aria-label': '月のブランコでの役' }, h('option', { value: '' }, 'おまかせ'), h('option', { value: 'h' }, '飛ぶ人(ピンク)'), h('option', { value: 'y' }, '受け止める人(ミント)'));
  roleSel.value = LS.get(K.role) || '';
  roleSel.addEventListener('change', async () => {
    if (roleSel.value) LS.set(K.role, roleSel.value); else LS.del(K.role);
    await state.store.saveProfile(myUid(), await C.encryptJson(state.key, 'profiles', profilePayload()));
    moonSigReset();
    renderAll();
  });

  const exportBtn = h('button', { class: 'act', type: 'button' }, '書き出す');
  exportBtn.addEventListener('click', () => {
    if (!confirm('暗号化されていない、読める形のファイルが端末に保存されます。人に見られない場所で保管してください。')) return;
    const text = buildExport({ me: myName(), partner: partnerName(), myUid: myUid(), messages: state.messages.map((m) => ({ ...m, ts: m.ts && m.ts.toMillis ? m.ts.toMillis() : m.ts })), events: state.events, days: allDays(), qcards: state.qcards, answers: state.answers, boxes: state.boxes, items: state.items });
    const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })), download: `記録の書き出し-${ymd(new Date())}.txt` });
    document.body.append(a);
    a.click();
    a.remove();
  });

  const pastBtn = h('button', { class: 'act', type: 'button' }, '開く');
  pastBtn.addEventListener('click', openPastSheet);
  const cardBtn = h('button', { class: 'act', type: 'button' }, '設定');
  cardBtn.addEventListener('click', openCardSheet);

  const theme = h('select', { 'aria-label': '画面の色' },
    h('option', { value: 'auto' }, '自動'), h('option', { value: 'light' }, 'ライト'), h('option', { value: 'dark' }, 'ダーク'));
  theme.value = LS.get(K.theme) || 'auto';
  theme.addEventListener('change', () => { LS.set(K.theme, theme.value); applyTheme(theme.value); });

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

  const moreBtn = h('button', { class: 'act', type: 'button' }, settingsMore ? 'とじる' : 'ひらく');
  moreBtn.addEventListener('click', () => { settingsMore = !settingsMore; renderSettings(true); });
  const active = document.activeElement;
  if (!force && active && $('#settings').contains(active)) return; // 入力中に作り直さない
  $('#settings').replaceChildren(
    row('画面の色', '自動は、端末の設定に合わせます', theme),
    row('離れたら最初の画面に戻る', '開き直すと最初の画面から始まります', auto),
    row('起動パターン', '最初の画面で、都市を決めた順に6つタップします', reseq),
    row('そのほかの設定', '名前・誕生日・カード・役・既読・データ・鍵・ログアウトなど。ふだんは触らない項目です', moreBtn),
    ...(settingsMore ? [
      row('あなたの名前', '相手の画面に表示されます', h('span', { style: 'display:flex;gap:6px' }, name, saveName)),
      row('誕生日', '月と日だけ。相手にも見えます', h('span', { style: 'display:flex;gap:6px' }, bdM, bdD)),
      ...(isHer() ? [row('過去の生理の記録', '過去の分を、まとめて入れたり、消したりします', pastBtn)] : []),
      row('ホームのカード', '名前と日付を、自分で決められます', cardBtn),
      row('月のブランコの役', 'ふたりで別々の役にします。おまかせなら、自動で決まります', roleSel),
      row('既読を相手に伝える', 'オフにすると、あなたが読んだ印は出ません', rcpt),
      row('メッセージを自動で消す', '自分が送る分に適用されます', expire),
      row('データの書き出し', '読める文章のファイルで保存します(暗号化されません)', exportBtn),
      row('バックアップコード', '機種変更やデータが消えたときに使います', showCode),
      row('キーの確認番号', '同じ番号か見比べます', showFp),
      row('ログアウト', null, out),
      row('この端末からキーを消す', 'バックアップコードがないと、過去の会話は読めなくなります', wipe),
    ] : []),
  );
}

/* ================= おはなし(お題・カード・ボックス・誕生日) ================= */
const rid = () => crypto.randomUUID().replaceAll('-', '');
// カードや答えの色: ピンク=ひとみの役(飛ぶ人)、ミント=もうひとりの役。入れた人の役で決まる
const whoClass = (uid) => ((uid === myUid()) === (myRole() === 'h') ? 'me' : 'you');
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
const profilePayload = () => {
  const p = { name: myName() };
  const bd = myBd();
  if (bd) p.bd = bd;
  const role = LS.get(K.role);
  if (role === 'h' || role === 'y') p.role = role;
  return p;
};
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
    banner.replaceChildren(svgEl(Ch.pair('gift')), h('span', {}, 'お相手に誕生日メッセージをしたためておきましょう', h('br'), h('small', {}, '(当日、相手に届きます)')));
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
      nodes.push(h('div', { class: 'bd-today' }, svgEl(Ch.pair('cake')), h('b', {}, `${myName()}、お誕生日おめでとう`), h('span', {}, `${partnerName()}から、${msgs.length ? 'メッセージが届いています' : 'おめでとうのきもちが届いています'}`), ...msgs.map((i) => h('div', { class: 'ans you' }, h('small', {}, partnerName()), i.text))));
    } else {
      nodes.push(h('div', { class: 'bd-today' }, svgEl(Ch.pair('cake')), h('b', {}, `今日は${partnerName()}の誕生日`), h('span', {}, 'おめでとうを伝えよう')));
    }
  });
  today.replaceChildren(...nodes);
  today.hidden = !nodes.length;
}

/* ---- お題 ---- */
async function createCard(n, text, stockId, by, cat) {
  const payload = await C.encryptJson(state.key, 'qcards', { text, stockId: stockId || null, date: ymd(new Date()), by: by || myUid(), ...(cat ? { cat } : {}) });
  await state.store.createQCard(`q${n}`, n, payload);
}

async function makeNextCard(n) {
  const prev = state.qcards.find((c) => c.n === n - 1);
  // 明日がデートの日(=今日がデートの前日)なら、「おやすみ前」を優先して出す。ほかの日は、おやすみ前は出さない
  const tomorrow = keyOf(dayNum(ymd(new Date())) + 1);
  const whisperOk = state.events.some((e) => evType(e) === 'date' && e.date === tomorrow);
  const pick = pickStock(availableStock(state.stock, state.qcards), n, prev && prev.cat, prev && prev.by, whisperOk); // ふたりのお題が交互に出るように(足した人を優先)、同じカテゴリが続かないように
  if (!pick) { state.needInput = n; renderTalk(); return; }
  await createCard(n, pick.text, pick.id, pick.from, pick.cat);
}

async function maybeAdvance() {
  if (advancing || !state.store || !state.key || !state.loaded.stock || !state.loaded.qcards || !state.loaded.answers || !state.loaded.ev) return;
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
  // 「書き直し」は、消した回数ではなく、続けて3文字以上まとめて消した回数(連続して消している間は1回)
  let prevLen = box.value.length;
  let removed = 0;
  let counted = false;
  box.addEventListener('input', (e) => {
    draft.set(card.n, box.value);
    if (e.inputType && e.inputType.startsWith('delete')) {
      removed += Math.max(0, prevLen - box.value.length);
      if (!counted && removed >= 3) { edits += 1; counted = true; }
    } else { removed = 0; counted = false; }
    prevLen = box.value.length;
    send.disabled = !box.value.trim();
  });
  const err = h('p', { class: 'error', role: 'alert' });
  const send = h('button', { class: 'primary', type: 'submit' }, 'こたえる');
  send.disabled = !box.value.trim();
  // 先に答える人だけ、相手の答えを予想できる(任意)
  const canGuess = !otherAnswer(card.n);
  const gbox = canGuess ? h('textarea', { rows: '2', maxlength: '200', placeholder: `${partnerName()}の答えを予想(任意)`, 'aria-label': `${partnerName()}の答えを予想` }) : null;
  const f = h('form', { class: 'stack' }, h('small', { class: 'lead' }, 'こたえると、あとから書き直せません。'), box, ...(gbox ? [gbox] : []), err, send);
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
      const gt = gbox ? gbox.value.trim() : '';
      if (gt) { try { await saveGuessText(card.n, gt); } catch (x) { /* 予想は、あとからも書ける */ } }
    } catch (x) { err.textContent = '送れませんでした。もう一度ためしてください。'; send.disabled = false; }
  });
  return f;
}

async function saveGuessText(n, text, prev) {
  const payload = await C.encryptJson(state.key, 'guesses', { n, text, at: (prev && prev.at) || Date.now(), up: Date.now(), ...(prev && isRate(prev.r) ? { r: prev.r, jat: prev.jat } : {}) });
  await state.store.saveGuess(await C.dayId(state.keyBytes, `gs|${n}|${myUid()}`), payload);
}
async function saveJudge(n, g, r) {
  const payload = await C.encryptJson(state.key, 'guesses', { n, text: g.text, at: g.at, up: g.up || g.at, r, jat: Date.now() });
  await state.store.saveGuess(await C.dayId(state.keyBytes, `gs|${n}|${myUid()}`), payload);
}
const RATE_WORD = { hit: 'ぴったり', near: 'おしい', miss: 'ぜんぜん' };
const RATE_SAY = { hit: '当たりー！', near: 'くやしい〜！でも楽しい！', miss: 'わぁお！そんな予想してたの！？' };
// 予想した人(g)と答えた人(a)の顔が並んで、ひとことが出る
function reactScene(r, guesserUid, text) {
  const [gk, ak] = Ch.REACT_FACE[r];
  const gRole = roleOf(guesserUid);
  const aRole = gRole === 'h' ? 'y' : 'h';
  return h('div', { class: `react r-${r}` }, h('div', { class: 'rc' }, svgEl(Ch.reactFace(gRole, gk, 52)), svgEl(Ch.reactFace(aRole, ak, 52))), h('b', {}, RATE_SAY[r]), text ? h('div', { class: 'gtext' }, h('small', {}, `${nameOfUid(guesserUid)}の予想`), text) : null);
}
const lockIcon = () => svgOf('<rect x="5" y="11" width="14" height="9" rx="2.500"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', 'lock');

const guessSig = (n) => [...state.guesses.values()].filter((g) => g.n === n).map((g) => [g.owner, g.text, g.r || '']);

function guessBlock(n) {
  const me = myUid();
  const phase = guessPhase(n, me, state.answers, state.guesses);
  const mine = guessOf(n, me, state.guesses);
  const out = [];
  if (phase === 'open') {
    const box = h('textarea', { rows: '2', maxlength: '200', placeholder: `${partnerName()}の答えを予想(任意)`, 'aria-label': `${partnerName()}の答えを予想` });
    box.value = mine ? mine.text : '';
    const err = h('p', { class: 'error', role: 'alert' });
    const btn = h('button', { class: 'ghost', type: 'submit' }, mine ? '書き直す' : '予想をつける');
    const f = h('form', { class: 'stack guess' }, h('small', { class: 'lead' }, mine ? '答えが来るまで、書き直せます。' : 'いまのうちに、予想をつけられます。'), box, err, btn);
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const t = box.value.trim();
      if (!t) return;
      btn.disabled = true;
      try { await saveGuessText(n, t, mine); } catch (x) { err.textContent = '送れませんでした。もう一度ためしてください。'; btn.disabled = false; }
    });
    out.push(f);
  } else if (phase === 'judge') {
    const err = h('p', { class: 'error', role: 'alert' });
    const trio = h('div', { class: 'rates' }, ['hit', 'near', 'miss'].map((r) => {
      const [gk, ak] = Ch.REACT_FACE[r];
      const b = h('button', { class: 'rate', type: 'button', 'data-r': r }, h('span', { class: 'pr' }, svgEl(Ch.reactFace(roleOf(me), gk, 34)), svgEl(Ch.reactFace(roleOf(me) === 'h' ? 'y' : 'h', ak, 34))), RATE_WORD[r]);
      b.addEventListener('click', async () => { trio.querySelectorAll('button').forEach((x) => { x.disabled = true; }); try { await saveJudge(n, mine, r); } catch (x) { err.textContent = '送れませんでした。もう一度ためしてください。'; trio.querySelectorAll('button').forEach((y) => { y.disabled = false; }); } });
      return b;
    }));
    out.push(h('div', { class: 'judge stack' }, h('div', { class: 'gtext' }, h('small', {}, `${myName()}の予想`), mine.text), h('p', { class: 'lead' }, 'どのくらい近かった？'), trio, err));
  } else if (phase === 'done') {
    out.push(reactScene(mine.r, me, mine.text));
  }
  const pv = partnerGuessView(n, me, state.answers, state.guesses);
  const theirG = otherGuessOf(n, me, state.guesses);
  if (pv === 'locked') out.push(h('div', { class: 'ans wait glock' }, lockIcon(), `${partnerName()}の予想があります。判定のあとで見られます`));
  else if (pv === 'shown') out.push(reactScene(theirG.r, theirG.owner, theirG.text));
  return out;
}

function answersBlock(n) {
  const mine = myAnswer(n);
  const theirs = otherAnswer(n);
  const bubble = (a, cls, who) => h('div', { class: `ans ${cls}` }, h('small', {}, who), a.text, h('span', { class: 'meta' }, describeAnswer(a)));
  if (mine && theirs) return [bubble(mine, `${whoClass(myUid())} flip-in`, myName()), bubble(theirs, `${whoClass(theirs.owner)} flip-in`, partnerName())];
  if (mine) return [bubble(mine, whoClass(myUid()), myName()), h('div', { class: 'ans wait' }, svgEl(Ch.pair('think')), `${partnerName()}の答えを待っています`)];
  if (theirs) return [h('div', { class: 'ans wait' }, `${partnerName()}はもう答えました。あなたが答えると、ふたり同時に見られます`)];
  return [];
}

function forcedForm(n) {
  const input = h('input', { type: 'text', maxlength: '80', placeholder: '今日のお題を入力', 'aria-label': '今日のお題' });
  const err = h('p', { class: 'error', role: 'alert' });
  const btn = h('button', { class: 'primary', type: 'submit' }, 'このお題にする');
  const cat = catSelect();
  const f = h('form', { class: 'stack' }, h('p', { class: 'lead' }, 'お題のストックがありません。今日のお題を入力してください。'), input, cat, err, btn);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    btn.disabled = true;
    try { await createCard(n, text, null, myUid(), cat.value); state.needInput = null; } catch (x) { state.needInput = null; err.textContent = 'すでに次のお題が出ていました'; renderTalk(); }
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
  const sig = JSON.stringify([ready, last && last.id, last && [!!myAnswer(last.n), !!otherAnswer(last.n), guessSig(last.n)], act && act.type, state.needInput, partnerName()]);
  if (sig === qSig) return;
  qSig = sig;
  const area = $('#q-area');
  const q = $('#qcard');
  if (last) {
    q.dataset.by = whoClass(last.by);
    $('#q-meta').textContent = `第${last.n}問 ・ ${last.date.slice(5).replace('-', '/')}${last.cat ? ` ・ ${catLabel(last.cat)}` : ''}`;
    $('#q-text').textContent = last.text;
  } else {
    q.dataset.by = '';
    $('#q-meta').textContent = 'お題';
    $('#q-text').textContent = ready ? 'まだお題がありません' : '読み込み中…';
  }
  const nodes = [];
  if (last) {
    nodes.push(...answersBlock(last.n), ...guessBlock(last.n));
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
const fullDate = (key) => { const d = parseYmd(key); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}(${WEEK[d.getDay()]})`; }; // 2026/10/24(土)
function renderCards() {
  $$('#c-chips button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === state.cfilter)));
  const cards = [...state.qcards].reverse().filter((c) => c.cat !== WHISPER).filter((c) => { // おやすみ前は、ここには並べない(見返す場所は、別に考える)
    const st = cardStatus(c, state.qcards, state.answers);
    return state.cfilter === 'all' || st === state.cfilter || (state.cfilter === 'rest' && st === 'rest');
  });
  // カテゴリごとにまとめる(カテゴリの並びは、決まった順。カテゴリなしは、最後)。中は、日付の新しい順
  const order = [...CATS.map((x) => x[0]), ''];
  const groups = order.map((id) => ({ id, name: id ? catLabel(id) : 'カテゴリなし', list: cards.filter((c) => (c.cat || '') === id) })).filter((g) => g.list.length);
  $('#c-count').textContent = `${cards.length}枚 ・ ${groups.length}カテゴリ`;
  if (!state.catOpen && groups.length) state.catOpen = new Set([groups.find((g) => g.list.includes(cards[0])).id]); // はじめは、いちばん新しいカードのカテゴリだけ開く
  $('#c-grid').replaceChildren(...groups.map((g) => {
    const open = !!state.catOpen && state.catOpen.has(g.id);
    const head = h('button', { class: 'cathd', type: 'button', 'aria-expanded': String(open) }, h('span', {}, g.name), h('small', {}, `${g.list.length}枚 `, h('span', { class: 'chev', 'aria-hidden': 'true' }, '▾')));
    head.addEventListener('click', () => { if (state.catOpen.has(g.id)) state.catOpen.delete(g.id); else state.catOpen.add(g.id); renderCards(); });
    const items = open ? g.list.map((c) => {
      const st = cardStatus(c, state.qcards, state.answers);
      const b = h('button', { class: 'catit', type: 'button' }, h('time', {}, `${fullDate(c.date)} ・ 第${c.n}問`), h('i', { class: `cdot ${st}` }, ''), h('span', {}, c.text));
      b.addEventListener('click', () => openQCardSheet(c.n));
      return b;
    }) : [];
    return h('div', { class: `catbox${open ? '' : ' closed'}` }, head, ...items);
  }));
}

function openQCardSheet(n) {
  const body = h('div', { class: 'stack' });
  let sig = '';
  const fill = () => {
    const c = state.qcards.find((x) => x.n === n);
    if (!c) return;
    const s = JSON.stringify([!!myAnswer(n), !!otherAnswer(n), guessSig(n), partnerName()]);
    if (s === sig) return;
    sig = s;
    const st = cardStatus(c, state.qcards, state.answers);
    const q = h('div', { class: 'qcard', 'data-by': whoClass(c.by) }, h('small', {}, `第${c.n}問 ・ ${fullDate(c.date)}${st === 'rest' ? ' ・ お休み' : ''}`), h('b', {}, c.text));
    const kids = [q, ...answersBlock(n), ...guessBlock(n)];
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
  let catFilter = 'all';
  let showUsed = false;
  let shownId = null; // 長押しで、いま中身を見せている、おやすみ前のid
  let shownAt = 0;
  let hideTimer = 0;
  const filterRow = h('div', { class: 'chips' });
  const fill = () => {
    const used = new Set(state.qcards.map((c) => c.stockId).filter(Boolean));
    const opts = [['all', 'ぜんぶ'], ...CATS, ['none', 'カテゴリなし']];
    filterRow.replaceChildren(...opts.map(([id, nm]) => {
      const b = h('button', { type: 'button', 'aria-pressed': String(catFilter === id) }, nm);
      b.addEventListener('click', () => { catFilter = id; fill(); });
      return b;
    }));
    const shown = state.stock.filter((s) => catFilter === 'all' || (catFilter === 'none' ? !s.cat : s.cat === catFilter));
    const left = shown.filter((s) => !used.has(s.id));
    const done = shown.filter((s) => used.has(s.id));
    // 使用済みは下にまとめて、ふだんはたたんでおく(押すと出る)
    const rowOf = (s) => {
      const isUsed = used.has(s.id);
      const del = s.from === myUid() && !isUsed ? h('button', { type: 'button' }, '削除') : null;
      if (del) del.addEventListener('click', () => state.store.removeStock(s.id).catch(() => {}));
      if (s.cat === WHISPER && !isUsed) { // おやすみ前は、出るまで、相手には中身を出さない(足した本人には、見える)
        if (s.from === myUid()) { // 自分が足したものは、長押しすると、10秒だけ中身が見える(のぞき見されても見えないように)
          const open = shownId === s.id;
          const row = h('li', { class: `sitem lockrow mine${open ? ' open' : ''}`, 'data-by': whoClass(s.from) }, h('span', {}, lockIcon(), open ? s.text : '🩷 おやすみ前', h('small', { class: 'catname' }, open ? ' 相手には、デートの前日まで内緒(タップで隠す)' : ' 長押しで見る')), del);
          let hold = null;
          const stopHold = () => { clearTimeout(hold); hold = null; };
          row.addEventListener('pointerdown', (e) => {
            if (e.target.closest('button') || shownId === s.id) return;
            stopHold();
            hold = setTimeout(() => {
              shownId = s.id; shownAt = Date.now();
              clearTimeout(hideTimer);
              hideTimer = setTimeout(() => { shownId = null; if (list.isConnected) fill(); }, 10000);
              fill();
            }, 500);
          });
          ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => row.addEventListener(ev, stopHold));
          row.addEventListener('contextmenu', (e) => e.preventDefault());
          row.addEventListener('click', (e) => { if (e.target.closest('button') || shownId !== s.id || Date.now() - shownAt < 700) return; shownId = null; clearTimeout(hideTimer); fill(); });
          return row;
        }
        return h('li', { class: 'sitem lockrow', 'data-by': whoClass(s.from) }, h('span', {}, lockIcon(), '🩷 おやすみ前', h('small', { class: 'catname' }, ' デートの前日に鍵が開きます')), del);
      }
      return h('li', { class: 'sitem', 'data-by': whoClass(s.from) }, h('span', {}, s.text, s.cat ? h('small', { class: 'catname' }, ` ${catLabel(s.cat)}`) : null, isUsed ? h('small', { style: 'color:var(--muted)' }, ' (使用済み)') : null), del);
    };
    const rows = left.map(rowOf);
    if (!rows.length) rows.push(h('li', { class: 'empty' }, done.length ? 'つかっていないお題は、ありません' : 'まだありません'));
    if (done.length) {
      const toggle = h('button', { class: 'ghost sm', type: 'button', 'aria-expanded': String(showUsed) }, showUsed ? '使用済みをとじる' : `使用済みを見る(${done.length}個)`);
      toggle.addEventListener('click', () => { showUsed = !showUsed; fill(); });
      rows.push(h('li', { class: 'used-toggle' }, toggle));
      if (showUsed) rows.push(...done.map(rowOf));
    }
    list.replaceChildren(...rows);
  };
  const one = h('input', { type: 'text', maxlength: '80', placeholder: 'お題を1つ追加', 'aria-label': 'お題を1つ追加' });
  const addOne = h('button', { class: 'ghost sm', type: 'button' }, '追加');
  const bulk = h('textarea', { rows: '4', placeholder: 'まとめて追加(1行に1つ)', 'aria-label': 'まとめて追加' });
  const addBulk = h('button', { class: 'ghost sm', type: 'button' }, 'まとめて追加');
  const catSel = catSelect('足すお題のカテゴリ');
  const whisperNote = h('p', { class: 'lead whisper-note', hidden: true }, '🩷 おやすみ前は、特別な夜に出題されます。それまで、相手には中身が見えません。');
  catSel.addEventListener('change', () => { whisperNote.hidden = catSel.value !== WHISPER; }); // おやすみ前を選んだときだけ、説明を出す
  const push = async (texts) => {
    for (const t of texts) {
      await state.store.addStock(await C.encryptJson(state.key, 'stock', { text: t, at: Date.now(), ...(catSel.value ? { cat: catSel.value } : {}) }));
    }
  };
  // 似たお題の見つけかた: ストックと、これまでのお題カードを見比べる(文字の重なり具合だけ。ほとんど同じものだけ)
  const known = () => {
    const used = new Set(state.qcards.map((c) => c.stockId).filter(Boolean));
    return [
      ...state.stock.map((s) => ({ text: s.text, by: s.from, used: used.has(s.id), secret: s.cat === WHISPER && !used.has(s.id) })), // おやすみ前は、使うまで、知らせにも中身を出さない
      ...state.qcards.filter((c) => !c.stockId).map((c) => ({ text: c.text, by: c.by, used: true })),
    ];
  };
  const simList = (items) => h('ul', { class: 'sim-list' }, items.map((m) => h('li', {}, m.secret ? '🩷 おやすみ前に、ほとんど同じお題があります' : `「${m.text}」`, m.secret ? null : h('small', {}, m.batch ? ' (いま入れた中の同じもの)' : ` ${nameOfUid(m.by)}が追加${m.used ? '・使用済み' : ''}`))));
  const oneHint = h('div', { class: 'sim', hidden: true });
  const bulkHint = h('div', { class: 'sim', hidden: true });
  one.addEventListener('input', () => {
    const t = one.value.trim();
    const m = t ? findSimilar(t, known()) : [];
    oneHint.hidden = !m.length;
    oneHint.replaceChildren(...(m.length ? [h('b', {}, '似たお題があります'), simList(m)] : []));
    addOne.textContent = m.length ? 'それでも追加' : '追加';
  });
  addOne.addEventListener('click', async () => {
    const t = one.value.trim();
    if (!t) return;
    one.value = '';
    oneHint.hidden = true;
    addOne.textContent = '追加';
    await push([t]).catch(() => {});
  });
  bulk.addEventListener('input', () => { bulkHint.hidden = true; });
  addBulk.addEventListener('click', async () => {
    const ts = bulk.value.split('\n').map((x) => x.trim().slice(0, 80)).filter(Boolean);
    if (!ts.length) return;
    const flagged = [];
    ts.forEach((t, i) => {
      const m = findSimilar(t, [...known(), ...ts.slice(0, i).map((x) => ({ text: x, batch: true }))]);
      if (m.length) flagged.push({ t, m });
    });
    if (!flagged.length) { bulk.value = ''; await push(ts).catch(() => {}); return; }
    const skip = h('button', { class: 'ghost sm', type: 'button' }, '似たものを除いて追加');
    const all = h('button', { class: 'ghost sm', type: 'button' }, '全部追加');
    skip.addEventListener('click', async () => { const keep = ts.filter((t) => !flagged.some((f) => f.t === t)); bulk.value = ''; bulkHint.hidden = true; await push(keep).catch(() => {}); });
    all.addEventListener('click', async () => { bulk.value = ''; bulkHint.hidden = true; await push(ts).catch(() => {}); });
    bulkHint.replaceChildren(h('b', {}, `似たお題が ${flagged.length} 件あります`), ...flagged.map((f) => h('div', { class: 'sim-row' }, h('span', {}, `「${f.t}」`), simList(f.m))), h('div', { class: 'sim-btns' }, skip, all));
    bulkHint.hidden = false;
  });
  state.sheetRender = fill;
  fill();
  openSheet(h('h2', {}, 'お題ストック'), h('p', { class: 'lead' }, '毎日のお題は、ここから選ばれます。ふたりが足したお題が、できるだけ交互に出ます(前と同じカテゴリも続きません)。ふたりとも足せます。角の色は、足した人です。'), filterRow, list, h('p', { class: 'lab' }, '足すお題のカテゴリ'), catSel, whisperNote, one, oneHint, addOne, bulk, bulkHint, addBulk);
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
  }) : [emptyWith('まだボックスがありません。下からタイムカプセルをつくれます。', 'gift', 'p')]));
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
  renderBadges();
}


/* ================= 新着の印 ================= */
// どこまで見たかは、この端末の中だけに持つ(印だけで、中身は入れない)。
function readSeen() {
  try { const v = JSON.parse(LS.get(K.seen)); return v && typeof v === 'object' ? v : null; } catch (e) { return null; }
}

function renderBadges() {
  const L = state.loaded;
  if (!(L.msg && L.ev && L.qcards && L.answers && L.bx && L.mk && L.dy && L.pt) || !myUid()) return;
  const keys = sectionKeys({ me: myUid(), messages: state.messages, qcards: state.qcards, answers: state.answers, boxes: state.boxes, marks: state.marks, items: state.items, events: state.events, days: allDays(), pats: state.pats, now: Date.now() });
  let seen = readSeen();
  let dirty = false;
  if (!seen) { seen = keys; dirty = true; } // 初めては、いまあるものを「見た」ことにする
  const on = !document.hidden && !$('#app').hidden;
  const visible = { chat: on && state.view === 'chat' && state.talk === 'chat', q: on && state.view === 'chat' && state.talk === 'q', b: on && state.view === 'chat' && state.talk === 'b', cal: on && state.view === 'cal' };
  Object.keys(visible).forEach((k) => {
    if (visible[k] && JSON.stringify(seen[k]) !== JSON.stringify(keys[k])) { seen[k] = keys[k]; dirty = true; }
  });
  if (dirty) LS.set(K.seen, JSON.stringify(seen));
  const f = newFlags(keys, seen);
  $$('#talk-seg button').forEach((b) => b.classList.toggle('has-new', !!f[b.dataset.t]));
  $('.tab[data-v="chat"]').classList.toggle('has-new', f.chat || f.q || f.b);
  $('.tab[data-v="cal"]').classList.toggle('has-new', f.cal);
  $('#new-banner').hidden = !(f.chat || f.q || f.b || f.cal);
}


/* ================= 月(ふたりのブランコ) ================= */
let moonSig = '';
let moonPanelSig = '';
const moonObs = { h: 0, y: 0 }; // その役の合図を、この画面が受け取った時刻(0 = 開く前からあった)
const moonSigReset = () => { moonSig = ''; moonPanelSig = ''; };

function moonRoles() {
  const me = myUid();
  let other = partnerUid();
  if (!other) { const m = state.moon.find((x) => x.from !== me); other = m && m.from; }
  const prof = (u) => (u && state.profiles[u] && state.profiles[u].role) || null;
  // 役を決めていなくても、生理を記録している人は、ひとみ(飛ぶ人)として扱う
  const her = (u) => (u && recsOf(u).size && [...recsOf(u).values()].some((r) => r.p) ? 'h' : null);
  return rolesOf(me, other, LS.get(K.role) || prof(me) || her(me), prof(other) || her(other));
}
function moonAnalysis(now = Date.now()) {
  const roles = moonRoles();
  const sigs = state.moon.filter((m) => roles[m.from]).map((m) => ({ role: roles[m.from], at: m.at }));
  return { A: analyzeMoon(sigs, now), roles };
}
const roleName = (role, roles) => { const u = Object.keys(roles).find((x) => roles[x] === role); return u ? uidName(u) : (role === 'h' ? 'ひとみ' : 'ゆうき'); };
const clockText = (ms) => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

// 雨の日かどうか。場所は、ふたりにゆかりのある山梨(甲府)で固定。30分ごとに確かめる
const RAIN_PLACE = { name: '山梨', lat: 35.66, lon: 138.57 };
const rainNow = () => (DEMO ? !!DEMO.host.rain : state.rain);
async function refreshRain() {
  if (DEMO || Date.now() - state.rainAt < 30 * 60 * 1000) return;
  state.rainAt = Date.now();
  try {
    const { data } = await loadWeather(RAIN_PLACE);
    state.rain = isRainy(data);
  } catch (e) { state.rain = false; }
}

// 雨の日は、相合傘が出やすい(ほかの場面の3倍)。それ以外の日は、どれも同じ確率
function pickMoonVariant() {
  const pool = VARIANTS.filter((v) => v !== state.moonVariant);
  const weights = pool.map((v) => (v === 'umbrella' && rainNow() ? 3 : 1));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  const i = weights.findIndex((x) => (r -= x) < 0);
  state.moonVariant = pool[i < 0 ? pool.length - 1 : i];
}

// ホームに戻ってきたとき: 今日すでに成立していれば、くっついた姿を見せる
function moonEnterHome() {
  refreshRain();
  if (!state.loaded.moon) return;
  const { A } = moonAnalysis();
  if (!A.today.resolved || Date.now() < state.moonCheerUntil) return;
  if (LS.get(K.moonSeen) !== A.today.key && state.moonVisit === 0) return; // 初めて見るときは、ブランコのままゆれる姿
  state.moonVisit += 1;
  pickMoonVariant();
  moonSigReset();
  renderMoon();
}

// 画面に見えていないときは、動きを止めて、スマホの負担を減らす
function moonPause() {
  const el = $('#moon');
  if (!el) return;
  const off = document.hidden || state.view !== 'home' || !$('#app') || $('#app').hidden || !$('#sheet').hidden;
  el.classList.toggle('paused', off);
}

// 場面の中で、ときどき、ランダムなしぐさをさせる(描き直さず、いっとき、クラスを付けるだけ)
let gestureTimer = 0;
function scheduleGesture() {
  if (gestureTimer || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  gestureTimer = setTimeout(() => {
    gestureTimer = 0;
    const svg = $('#mn-scene .scene');
    const wrap = $('#moon');
    if (svg && svg.querySelector('.gx') && wrap && !wrap.classList.contains('paused')) {
      const list = gesturesFor(state.moonVariant);
      if (list.length) {
        const g = `g-${list[Math.floor(Math.random() * list.length)]}`;
        svg.classList.add(g);
        setTimeout(() => svg.classList.remove(g), 1700);
      }
    }
    scheduleGesture();
  }, 3500 + Math.random() * 6500);
}

function renderMoon() {
  scheduleGesture();
  if ($('#app').hidden || !$('#mn-scene') || !myUid()) return;
  const now = Date.now();
  const { A, roles } = moonAnalysis(now);
  const t = A.today;
  if (state.moonDay !== t.key) {
    state.moonDay = t.key;
    state.say = null; state.sayDone = false; // 新しい日は、また、成立のあとに決める
    state.moonPanel = false;
    state.moonVisit = LS.get(K.moonSeen) === t.key ? 1 : 0;
    if (state.moonVisit) pickMoonVariant();
  }
  const today = new Date();
  const special = specialOf({ todayKey: ymd(today), today, birthdays: [myBd(), partnerBd()], anns: state.ann, events: state.events });
  const season = seasonOf(today);
  const say = $('#mn-say');
  if (say) say.hidden = !workOn({ todayKey: ymd(today), events: state.events });
  const cheerOn = now < state.moonCheerUntil;
  const popOn = now < state.moonPop.until;
  const tired = !!(t.h != null && !t.resolved && t.y == null && now - t.h > MOON_WIN);
  const ready = !!state.loaded.moon;
  const hint = ready && !t.resolved && t[roles[myUid()]] == null;
  renderMoonBanner({ hint, t, roles, now });
  const sayWait = Math.max(state.moonCheerUntil, state.moonPop.until) - now; // ふたりがつながって揺れている間は、まだ話さない
  rollSay({ A, t, today, force: false, wait: sayWait > 0 ? sayWait + 300 : 0 });
  renderSay({ t, today });
  const key = JSON.stringify([ready, t.key, t.h, t.y, t.resolved, t.kind, A.pts, state.moonVisit, state.moonVariant, special, season, cheerOn, popOn, tired, hint]);
  if (key !== moonSig) {
    moonSig = key;
    $('#mn-scene').innerHTML = moonScene({
      pts: A.pts, sig: { h: ready ? t.h : null, y: ready ? t.y : null }, first: t.first, resolved: ready && t.resolved, kind: t.kind,
      cheerUntil: state.moonCheerUntil, revisit: state.moonVisit, variant: state.moonVariant, special, season, now, winMs: MOON_WIN,
      pop: state.moonPop.w, popUntil: state.moonPop.until, sigAt: moonObs, hint,
    });
  }
  $('#mn-pts').textContent = String(A.pts);
  $('#mn-bar-i').style.width = `${A.pts}%`;
  $('#mn-phase').textContent = phaseName(A.pts);
  if (ready && t.resolved && !cheerOn && state.moonVisit === 0) LS.set(K.moonSeen, t.key);
  renderMoonPanel(A, roles);
  maybeCelebrate(A);
  moonPause();
  if (popOn) setTimeout(() => { moonSig = ''; renderMoon(); }, Math.max(0, state.moonPop.until - now) + 50);
}

function renderMoonPanel(A, roles) {
  const p = $('#mn-panel');
  p.hidden = !state.moonPanel;
  if (!state.moonPanel) { moonPanelSig = ''; return; }
  const t = A.today;
  const key = JSON.stringify([t.h, t.y, t.kind, A.pts, roleName('h', roles), roleName('y', roles)]);
  if (key === moonPanelSig) return;
  moonPanelSig = key;
  const row = (role) => h('div', { class: 'mn-row' }, h('i', { class: `mn-dot ${role}` }), h('span', {}, roleName(role, roles)), t[role] != null ? h('b', {}, clockText(t[role])) : h('em', {}, 'まだ'));
  const logBtn = h('button', { type: 'button' }, '記録をみる');
  logBtn.addEventListener('click', openMoonLog);
  p.replaceChildren(...[
    row('h'), row('y'),
    t.resolved ? h('div', { class: 'mn-row' }, h('span', { class: `mn-res ${t.kind}` }, t.kind === 'sync' ? 'ぴったり💛' : 'おまたせ～💦'), h('span', {}, t.kind === 'sync' ? '+5' : '+1')) : null,
    h('div', { class: 'mn-row' }, h('span', {}, `${A.pts}/100`), h('span', { class: 'sub' }, `満月まで あと${100 - A.pts}`)),
    logBtn,
  ].filter(Boolean));
}

async function touchMoon() {
  const { A, roles } = moonAnalysis();
  const role = roles[myUid()];
  if (!role || A.today.resolved || A.today[role] != null || !state.key) return;
  moonObs[role] = Date.now();
  state.moonPop = { w: role, until: Date.now() + 1500 };
  try {
    const id = await C.dayId(state.keyBytes, `moon|${A.today.key}|${myUid()}`);
    await withTimeout(state.store.addMoon(id, await C.encryptJson(state.key, 'moon', { at: Date.now() })), 5000);
  } catch (e) { /* すでに触れていたとき(別の端末など)は、そのまま */ }
}

function openMoonLog() {
  const body = h('div', { class: 'stack' });
  const fill = () => {
    const { A, roles } = moonAnalysis();
    const items = [
      ...A.days.map((d) => ({ at: d.at, kind: d.kind, pts: d.pts, text: `${roleName(d.first, roles)} ${clockText(d[d.first])} → ${roleName(d.first === 'h' ? 'y' : 'h', roles)} ${clockText(d[d.first === 'h' ? 'y' : 'h'])}` })),
      ...A.fulls.map((f) => ({ at: f.at + 1, kind: 'full', pts: 0, text: `${f.n}回目の満月` })),
    ].sort((a, b) => b.at - a.at);
    const stamp = (ms) => { const d = new Date(ms); return `${d.getMonth() + 1}/${d.getDate()} ${clockText(ms)}`; };
    body.replaceChildren(
      h('h2', {}, '月の記録'),
      h('div', { class: 'mstats' }, h('div', {}, h('b', {}, String(A.sync)), h('small', {}, 'ぴったり💛')), h('div', {}, h('b', {}, String(A.late)), h('small', {}, 'おまたせ～💦')), h('div', {}, h('b', {}, String(A.fulls.length)), h('small', {}, '満月の回数'))),
      h('ul', { class: 'mlog' }, ...(items.length ? items.map((i) => h('li', {}, h('span', { class: `tg ${i.kind}` }, i.kind === 'sync' ? 'ぴったり💛' : i.kind === 'late' ? 'おまたせ～💦' : '満月'), i.pts ? `+${i.pts}` : '', h('span', {}, i.text), h('time', {}, stamp(i.at)))) : [h('li', { class: 'empty' }, 'まだ記録がありません')])),
    );
  };
  openSheet(body);
  state.sheetRender = fill;
  fill();
}

function buildMoon() {
  $('#mn-card').addEventListener('click', () => {
    if (!state.loaded.moon || !state.key) return;
    const { A, roles } = moonAnalysis();
    const role = roles[myUid()];
    if (!A.today.resolved && A.today[role] == null) { state.moonPanel = true; touchMoon(); renderMoon(); } else { state.moonPanel = !state.moonPanel; renderMoon(); }
  });
}

/* ================= 起動 ================= */
function init() {
  document.body.insertAdjacentHTML('afterbegin', SHELF_DEFS);
  applyTheme(LS.get(K.theme));
  buildCover();
  buildGate();
  buildCalendar();
  buildCard();
  buildChat();
  buildTalk();
  buildMoon();
  $$('[data-hide]').forEach((b) => b.addEventListener('click', lock));
  $$('.tab').forEach((t) => t.addEventListener('click', () => setView(t.dataset.v)));
  $('#sheet-close').addEventListener('click', closeSheet);

  // iPhone: 2本指のつまみ拡大・縮小で、画面が拡大されてしまうのを止める
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((t) => document.addEventListener(t, (e) => e.preventDefault()));

  // アプリを離れたら最初の画面に戻す
  const away = () => { if (LS.get(K.auto) !== '0' && $('#cover').hidden) lock(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) { state.hiddenAt = Date.now(); away(); } else { markRead(); renderBadges(); if (state.hiddenAt && Date.now() - state.hiddenAt > 30 * 60 * 1000) state.sayDone = false; }
    moonPause();
  });
  window.addEventListener('pagehide', away);
  document.addEventListener('click', () => { if (state.delId && Date.now() - state.delAt > 700) { state.delId = null; renderChat(); } });

  if (DEMO) {
    window.addEventListener('demo-tick', () => { moonSigReset(); renderAll(); state.moodChecked = false; moodAskMaybe(); });
    enter();
  } else if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
