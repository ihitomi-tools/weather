import { CITIES, SEQUENCE_LENGTH } from './cities.js';
import { loadWeather } from './weather.js';
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
  auto: 'app.auto', expire: 'app.expire', city: 'app.city',
};
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
  profiles: {}, messages: [], events: [], since: null,
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
}

function startWatching() {
  if (state.unsubs.length) return;
  const s = state.store;
  const cache = new Map();
  const seq = { msg: 0, ev: 0 };

  state.unsubs.push(s.watchProfiles(async (docs) => {
    const next = {};
    for (const d of docs) {
      const p = await decrypt('profiles', d);
      if (p) next[d.id] = p;
    }
    state.profiles = next;
    if (!next[myUid()]) s.saveProfile(myUid(), await C.encryptJson(state.key, 'profiles', { name: myName() }));
    renderAll();
  }));

  state.unsubs.push(s.watchShared(async (docs) => {
    const d = docs.find((x) => x.id === 'main');
    const p = d && await decrypt('shared', d);
    state.since = p ? p.since : null;
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
      out.push({ ...m, body: p ? p.body : null });
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
  if (v === 'chat') { const c = $('#chat'); c.scrollTop = c.scrollHeight; }
}

function renderAll() {
  if ($('#app').hidden) return;
  renderHome();
  renderChat();
  renderCalendar();
  renderSettings();
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

function renderHome() {
  $('#home-title').textContent = `${myName()} & ${partnerName()}`;
  const days = $('#days');
  if (state.since) {
    const n = Math.floor((new Date().setHours(0, 0, 0, 0) - parseYmd(state.since)) / 864e5);
    const next = Math.ceil((n + 1) / 100) * 100;
    days.replaceChildren(h('small', {}, '開始日から'), h('b', {}, String(n), h('span', {}, '日')), h('small', {}, `次の節目(${next}日)まであと${next - n}日`));
  } else {
    days.replaceChildren(h('small', {}, '開始日を登録すると、日数を数えます'), h('button', { type: 'button', onclick: () => setView('set') }, '設定で登録'));
  }
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
  state.messages.forEach((m) => {
    const d = new Date(m.ts);
    const key = ymd(d);
    if (key !== lastDay) {
      lastDay = key;
      nodes.push(h('span', { class: 'dayline' }, key === todayKey ? '今日' : key === yesterdayKey ? '昨日' : `${d.getMonth() + 1}月${d.getDate()}日`));
    }
    const mine = m.from === myUid();
    nodes.push(h('div', { class: `row ${mine ? 'mine' : 'theirs'}` },
      h('div', { class: `bub${m.body == null ? ' bad' : ''}` }, m.body == null ? '(読めないメッセージ)' : m.body),
      h('div', { class: 'meta' }, `${pad(d.getHours())}:${pad(d.getMinutes())}`)));
  });
  if (!nodes.length) nodes.push(h('span', { class: 'dayline' }, 'メッセージはまだありません'));
  chat.replaceChildren(...nodes);
  if (nearBottom || state.view === 'chat') chat.scrollTop = chat.scrollHeight;
}

function renderCalendar() {
  const { y, m, sel } = state.cal;
  $('#cal-title').textContent = `${y}年${m + 1}月`;
  const first = new Date(y, m, 1).getDay();
  const count = new Date(y, m + 1, 0).getDate();
  const todayKey = ymd(new Date());
  const cells = [...WEEK].map((w) => h('div', { class: 'w' }, w));
  for (let i = 0; i < first; i++) cells.push(h('div'));
  for (let d = 1; d <= count; d++) {
    const key = `${y}-${pad(m + 1)}-${pad(d)}`;
    const kinds = new Set(state.events.filter((e) => e.date === key).flatMap((e) => (kindOf(e) === 'both' ? ['me', 'you'] : [kindOf(e)])));
    const dots = [...kinds].map((k) => h('b', { class: k }));
    cells.push(h('button', {
      type: 'button',
      class: `${key === todayKey ? 'today ' : ''}${key === sel ? 'sel' : ''}`,
      onclick: () => { state.cal.sel = key; $('#ev-date').value = key; renderCalendar(); },
    }, String(d), dots.length ? h('i', {}, dots) : null));
  }
  $('#month').replaceChildren(...cells);
  const dt = parseYmd(sel);
  $('#cal-day').textContent = `${dt.getMonth() + 1}/${dt.getDate()}(${WEEK[dt.getDay()]})`;
  const list = state.events.filter((e) => e.date === sel).sort(byDate);
  $('#cal-events').replaceChildren(...(list.length ? list.map((e) => eventItem(e, true)) : [h('li', { class: 'empty' }, 'この日の予定はありません')]));
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

function buildChat() {
  $('#chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('#msg');
    const body = input.value.trim();
    if (!body) return;
    input.value = '';
    const expire = EXPIRE_MS[LS.get(K.expire) || '7d'];
    await state.store.sendMessage(await C.encryptJson(state.key, 'messages', { body }), expire);
  });
}

/* ================= 設定 ================= */
function openSheet(...nodes) {
  $('#sheet-body').replaceChildren(...nodes);
  $('#sheet').hidden = false;
}
function closeSheet() {
  $('#sheet').hidden = true;
  $('#sheet-body').replaceChildren();
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
    await state.store.saveProfile(myUid(), await C.encryptJson(state.key, 'profiles', { name: v }));
    saveName.textContent = '保存しました';
  });

  const since = h('input', { type: 'date', value: state.since || '', 'aria-label': '開始日' });
  since.addEventListener('change', async () => {
    if (!since.value) return;
    await state.store.saveShared(await C.encryptJson(state.key, 'shared', { since: since.value }));
  });

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
    row('名前', '相手に表示されます', h('span', { style: 'display:flex;gap:6px' }, name, saveName)),
    row('開始日', 'ホームの日数に使います', since),
    row('離れたら最初の画面に戻る', '開き直すと最初の画面から始まります', auto),
    row('メッセージを自動で消す', '自分が送る分に適用されます', expire),
    row('起動パターン', '最初の画面で、都市を決めた順に6つタップします', reseq),
    row('バックアップコード', '機種変更やデータが消えたときに使います', showCode),
    row('キーの確認番号', '同じ番号か見比べます', showFp),
    row('ログアウト', null, out),
    row('この端末からキーを消す', 'バックアップコードがないと、過去の会話は読めなくなります', wipe),
  );
}

/* ================= 起動 ================= */
function init() {
  buildCover();
  buildGate();
  buildCalendar();
  buildChat();
  $$('[data-hide]').forEach((b) => b.addEventListener('click', lock));
  $$('.tab').forEach((t) => t.addEventListener('click', () => setView(t.dataset.v)));
  $('#sheet-close').addEventListener('click', closeSheet);

  // アプリを離れたら最初の画面に戻す
  const away = () => { if (LS.get(K.auto) !== '0' && $('#cover').hidden) lock(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) away(); });
  window.addEventListener('pagehide', away);

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
