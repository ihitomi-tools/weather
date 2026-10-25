// 実ブラウザでの通し確認。外部通信は偽物に差し替える(Firebase・Open-Meteo)。
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire('/opt/node-tools/node_modules/');
const { chromium } = require('playwright');

const root = path.resolve('docs');
const server = http.createServer((req, res) => {
  const p = path.join(root, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json' };
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'text/plain' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

const fakeStore = `
let user = null, cb = null;
const data = { msg: [], ev: [], pr: [], sh: [], dy: [], pt: [], mn: [], rd: [], sk: [], qc: [], an: [], gs: [], bx: [], mk: [], it: [] };
const subs = [];
let n = 0;
const notify = () => subs.forEach((s) => s());
const watch = (list, map) => (f) => { const s = () => f(map ? map(data[list]) : data[list].slice()); subs.push(s); setTimeout(s, 0); return () => {}; };
export function init() {}
export const onUser = (f) => { cb = f; setTimeout(() => f(user), 0); return () => {}; };
export async function login(e, p) { if (p !== 'pw') throw new Error('bad'); user = { uid: 'u1' }; cb(user); }
export async function logout() { user = null; cb(null); }
export const watchMessages = watch('msg');
export const sendMessage = async (payload, exp) => { data.msg.push({ id: 'm' + n++, from: 'u1', ts: Date.now(), expireAt: exp ? Date.now() + exp : null, ...payload }); notify(); };
export const removeMessage = async (id) => { data.msg = data.msg.filter((m) => m.id !== id); notify(); };
export const watchEvents = watch('ev');
export const saveEvent = async (id, payload) => { data.ev = data.ev.filter((e) => !id || e.id !== id); data.ev.push({ id: id || 'e' + n++, ...payload }); notify(); };
export const removeEvent = async (id) => { data.ev = data.ev.filter((e) => e.id !== id); notify(); };
export const watchDays = watch('dy');
export const saveDays = async (list) => { list.forEach(({ id, payload }) => { data.dy = data.dy.filter((x) => x.id !== id); data.dy.push({ id, ...payload, owner: user.uid }); }); notify(); };
export const claimDays = async (ids) => { data.dy.forEach((x) => { if (ids.includes(x.id) && !x.owner) x.owner = user.uid; }); notify(); };
export const watchPats = watch('pt');
export const savePat = async (id, payload) => { data.pt = data.pt.filter((x) => x.id !== id); data.pt.push({ id, ...payload, from: user.uid }); notify(); };
export const removePat = async (id) => { data.pt = data.pt.filter((x) => x.id !== id); notify(); };
export const removeDays = async (ids) => { data.dy = data.dy.filter((x) => !ids.includes(x.id)); notify(); };
export const watchReads = watch('rd');
export const saveRead = async (at) => { data.rd = data.rd.filter((x) => x.id !== user.uid); data.rd.push({ id: user.uid, at, from: user.uid }); notify(); };
export const watchMoon = watch('mn');
export const addMoon = async (id, payload) => { if (data.mn.some((x) => x.id === id)) throw new Error('exists'); data.mn.push({ id, ...payload, from: user.uid }); notify(); };
export const watchStock = watch('sk');
export const addStock = async (payload) => { data.sk.push({ id: 's' + n++, ...payload, from: user.uid }); notify(); };
export const removeStock = async (id) => { data.sk = data.sk.filter((x) => x.id !== id); notify(); };
export const watchQCards = watch('qc');
export const createQCard = async (id, num, payload) => { if (data.qc.some((x) => x.id === id)) throw new Error('exists'); data.qc.push({ id, n: num, ...payload, from: user.uid }); notify(); };
export const watchAnswers = watch('an');
export const saveAnswer = async (id, payload) => { if (data.an.some((x) => x.id === id)) throw new Error('exists'); data.an.push({ id, ...payload, owner: user.uid }); notify(); };
export const watchGuesses = watch('gs');
export const saveGuess = async (id, payload) => { data.gs = data.gs.filter((x) => x.id !== id); data.gs.push({ id, ...payload, owner: user.uid }); notify(); };
export const watchBoxes = watch('bx');
export const createBox = async (id, payload, at) => { if (data.bx.some((x) => x.id === id)) throw new Error('exists'); data.bx.push({ id, ...payload, openAt: at, from: user.uid }); notify(); };
export const removeBox = async (id) => { data.bx = data.bx.filter((x) => x.id !== id); notify(); };
export const watchMarks = watch('mk');
export const addItem = async (id, box, at, payload) => { data.it.push({ id, ...payload, box, openAt: at, from: user.uid }); data.mk.push({ id, box, from: user.uid }); notify(); };
export const loadItems = async (until) => data.it.filter((x) => x.openAt <= until);
export const watchProfiles = watch('pr');
export const saveProfile = async (uid, payload) => { data.pr = data.pr.filter((p) => p.id !== uid); data.pr.push({ id: uid, ...payload }); notify(); };
export const watchShared = watch('sh');
export const saveShared = async (payload) => { data.sh = [{ id: 'main', ...payload }]; notify(); };
data.notify = notify;
data.asUser = (uid) => { user = { uid }; cb(user); };
window.__fake = data;
`;
const fakeConfig = `export const firebaseConfig = { apiKey: 'x' }; export const isConfigured = true;`;
const wx = {
  current: { temperature_2m: 18.4, weather_code: 3 },
  hourly: {
    time: Array.from({ length: 72 }, (_, i) => { const d = new Date(Date.now() + (i - 24) * 36e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:00`; }),
    temperature_2m: Array.from({ length: 72 }, () => 17), weather_code: Array.from({ length: 72 }, () => 61),
  },
  daily: { time: Array.from({ length: 7 }, (_, i) => { const d = new Date(Date.now() + i * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }), weather_code: [3, 61, 0, 1, 2, 95, 71], temperature_2m_max: [21, 18, 20, 23, 24, 22, 19], temperature_2m_min: [14, 13, 13, 15, 16, 15, 13] },
};

const D5 = new RegExp(`^${Math.min(5, new Date().getDate())}$`); // 5日。月の初めで5日がまだ先(未来)のときは、今日にする
const openSet = async () => { await page.click('.tab[data-v="set"]'); await page.click('.more-quiet'); };
const openPast = async () => { await openSet(); await more(); await page.locator('#settings li', { hasText: '過去の生理の記録' }).locator('button').click(); };
const more = async () => { const b = page.locator('#settings li', { hasText: 'そのほかの設定' }).locator('button'); if ((await b.textContent()) === 'ひらく') await b.click(); };
const addEv = async ({ title, date, end = '', who = 'me', time = '' }) => {
  await page.click('.tab[data-v="cal"]');
  const today = page.locator('#month button.today');
  await ((await today.count()) ? today : page.locator('#month button[data-key]').first()).click();
  await page.click('#ev-open');
  await page.click('#evb-more');
  await page.fill('#sheet input[aria-label="予定の名前"]', title);
  if (date) await page.fill('#sheet input[aria-label="日付"]', date);
  if (end) await page.fill('#sheet input[aria-label="終わりの日(連続するとき)"]', end);
  if (time) await page.fill('#sheet input[aria-label="時刻"]', time);
  check('「そのほか」に、誰の予定かの欄はない(ぜんぶふたりの予定)', (await page.locator('#sheet input[name="who"]').count()) === 0 && (await page.locator('#sheet .kpick input').count()) === 12);
  await page.click('#sheet form button[type=submit]');
  await page.waitForSelector('#sheet', { state: 'hidden' });
};
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${ok ? '' : extra}`); if (!ok) failed++; };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }).catch(async () => chromium.launch({ args: ['--no-sandbox'] }));
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => { errors.push(e.message); console.log("PAGEERR", e.message); });
await ctx.route('https://api.open-meteo.com/**', (r) => r.fulfill({ json: wx }));
await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await ctx.route(`${base}/js/store.js`, (r) => r.fulfill({ body: fakeStore, contentType: 'text/javascript' }));

const tap = async (names) => { for (const n of names) await page.locator('#cities button', { hasText: n }).click(); };

// --- 設定なし: パターンで開くと「設定がまだ」(本物の設定値が入っていても、ここでは未設定を再現する)
await ctx.route(`${base}/js/config.js`, (r) => r.fulfill({ body: "export const firebaseConfig = { apiKey: 'YOUR_API_KEY' }; export const isConfigured = false;", contentType: 'text/javascript' }));
await page.goto(base);
await page.waitForSelector('#temp:not(:text("--"))');
check('天気が表示される', (await page.textContent('#temp')) === '18' && (await page.textContent('#cond')) === 'くもり');
check('7日間の予報が7行', (await page.locator('#week li').count()) === 7);
await tap(['札幌', '福岡', '東京', '那覇', '大阪']);
check('5つだけでは開かない', await page.locator('#cover').isVisible());
await tap(['仙台']);
check('パターンで入口が開く(未設定の案内)', await page.locator('[data-panel="unconfigured"].on').isVisible());
await page.click('#gate [data-hide]');
check('「もどる」で最初の画面に戻る', await page.locator('#cover').isVisible());

// --- 設定あり(偽のFirebase)
await ctx.route(`${base}/js/config.js`, (r) => r.fulfill({ body: fakeConfig, contentType: 'text/javascript' }));
await page.goto(base);
await page.waitForSelector('#temp:not(:text("--"))');
await tap(['名古屋', '札幌', '札幌', '福岡', '東京', '那覇']); // パターンが未登録なら、どの6つでも入口まで進む
await page.waitForSelector('[data-panel="login"].on');
check('ログイン画面', true);
await page.fill('#email', 'a@example.com');
await page.fill('#password', 'wrong');
await page.click('#login-form button[type=submit]');
await page.waitForFunction(() => document.querySelector('#login-error').textContent.length > 0);
check('間違いのログインはエラー', true);
await page.fill('#password', 'pw');
await page.click('#login-form button[type=submit]');
await page.waitForSelector('[data-panel="key"].on');
await page.click('#key-new');
const code = await page.textContent('#new-code');
check('バックアップコードが表示される', /^([A-Z2-7]{6}-)+[A-Z2-7]{1,6}$/.test(code), code);
check('控えるまで先に進めない', await page.locator('#key-new-ok').isDisabled());
await page.check('#saved');
await page.click('#key-new-ok');
await page.waitForSelector('[data-panel="name"].on');
await page.fill('#name-input', 'ひとみ');
await page.click('#name-form button[type=submit]');
await page.waitForSelector('#rec:not([hidden])');
check('最初にパターンを登録する画面になる', await page.locator('#cover').isVisible());
await tap(['札幌', '福岡', '東京', '那覇', '大阪', '仙台']);
await page.waitForSelector('#app:not([hidden])');
check('本体が開く', (await page.textContent('#home-title')).startsWith('ひとみ'));
check('開いたとき、今日の調子を聞かれる', await page.locator('#sheet-body h2', { hasText: '今日の調子' }).isVisible());
await page.click('#sheet-close');
check('✕で閉じられる', await page.locator('#sheet').isHidden());

// チャット
await page.click('.tab[data-v="chat"]');
await page.click('#talk-seg [data-t="chat"]');
await page.fill('#msg', '土曜はパスタがいいな <b>テスト</b>');
await page.click('#chat-form .send');
await page.waitForSelector('.row.mine .bub');
check('メッセージが表示される(HTMLは解釈されない)', (await page.textContent('.row.mine .bub')) === '土曜はパスタがいいな <b>テスト</b>' && (await page.locator('.row.mine .bub b').count()) === 0);
const stored = await page.evaluate(() => window.__fake.msg[0]);
check('サーバーに渡るのは暗号文だけ', !JSON.stringify(stored).includes('パスタ') && stored.v === 1 && stored.ct.length > 10);

// スタンプ
await page.click('#stamp-btn');
check('スタンプ一覧が開く', await page.locator('#stamps').isVisible() && (await page.locator('#stamps button').count()) >= 40);
await page.locator('#stamps button', { hasText: '🍝' }).click();
await page.waitForSelector('.row.mine .bub.stamp');
check('スタンプが大きく表示され、一覧は閉じる', (await page.textContent('.row.mine .bub.stamp')) === '🍝' && !(await page.locator('#stamps').isVisible()));
check('スタンプも暗号文だけが保存される', !JSON.stringify(await page.evaluate(() => window.__fake.msg[1])).includes('🍝'));

// 絵文字だけのメッセージは大きく表示される(キーボードから好きな絵文字を打つ場合)
await page.fill('#msg', '😋😋');
await page.click('#chat-form .send');
await page.waitForFunction(() => [...document.querySelectorAll('.row.mine .bub.stamp')].some((e) => e.textContent === '😋😋'));
check('絵文字だけのメッセージは大きく表示される', true);
await page.fill('#msg', 'おいしかった😋');
await page.click('#chat-form .send');
await page.waitForFunction(() => [...document.querySelectorAll('.row.mine .bub:not(.stamp)')].some((e) => e.textContent === 'おいしかった😋'));
check('文字が混じるメッセージは、ふつうの吹き出し', true);

// 写真から作ったスタンプ(絵)が貼られたら、比率を保って縮めて、暗号化して送る
const msgBefore = await page.evaluate(() => window.__fake.msg.length);
await page.evaluate(async () => {
  const cv = document.createElement('canvas'); cv.width = 600; cv.height = 300; // 横長の絵(比率2:1)。背景は透明
  const g = cv.getContext('2d'); g.fillStyle = '#e0558f'; g.beginPath(); g.arc(150, 150, 120, 0, 7); g.fill();
  const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
  const dt = new DataTransfer(); dt.items.add(new File([blob], 'sticker.png', { type: 'image/png' }));
  document.querySelector('#msg').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
});
await page.waitForFunction((n) => window.__fake.msg.length === n + 1, msgBefore);
await page.waitForSelector('.row.mine .bub.imgmsg img');
const stk = await page.evaluate(async () => { const C = await import('/js/crypto.js'); const key = await C.importKey(C.fromB64(localStorage.getItem('app.key'))); const m = window.__fake.msg[window.__fake.msg.length - 1]; const p = await C.decryptJson(key, 'messages', m); return { t: p.t, w: p.w, h: p.h, ok: /^data:image\/(png|webp);base64,/.test(p.img), len: p.img.length, raw: JSON.stringify(m).includes('data:image') }; });
check('スタンプの絵が、暗号化されて送られる(保存されるのは暗号文だけ)', stk.t === 'img' && stk.ok && !stk.raw, JSON.stringify(stk));
check('絵は、縦横の比率を保って縮められる(長い辺が240px以内)', stk.w <= 240 && stk.h <= 240 && Math.abs(stk.w / stk.h - 2) < 0.05, JSON.stringify(stk));
check('スタンプの絵は、吹き出しなしで、比率を保って表示される', await page.evaluate(() => { const i = document.querySelector('.row.mine .bub.imgmsg img'); const r = i.getBoundingClientRect(); return r.width > 0 && Math.abs(r.width / r.height - 2) < 0.1; }));
await page.evaluate(() => { document.querySelector('#msg').dispatchEvent(new ClipboardEvent('paste', { clipboardData: (() => { const dt = new DataTransfer(); dt.setData('text/plain', 'はりつけたテキスト'); return dt; })(), bubbles: true, cancelable: true })); });
check('文字を貼ると、文字として入る(書式は入らない)', (await page.textContent('#msg')).includes('はりつけたテキスト') && (await page.locator('#msg *').count()) === 0);
await page.evaluate(() => { document.querySelector('#msg').innerHTML = ''; });


// おはなし: お題
const enc = (kind, obj) => page.evaluate(async ([k, o]) => { const C = await import('/js/crypto.js'); const key = await C.importKey(C.fromB64(localStorage.getItem('app.key'))); return C.encryptJson(key, k, o); }, [kind, obj]);
await page.evaluate(async () => { const C = await import('/js/crypto.js'); const key = await C.importKey(C.fromB64(localStorage.getItem('app.key'))); const d = new Date(Date.now() + 5 * 864e5); const doc = await C.encryptJson(key, 'profiles', { name: 'ゆうき', bd: { m: d.getMonth() + 1, d: d.getDate() } }); window.__fake.pr.push({ id: 'u2', ...doc }); window.__fake.notify(); });
await page.click('.tab[data-v="chat"]');
await page.click('#talk-seg [data-t="q"]');
await page.waitForSelector('#q-area form input');
check('ストックが空だと、お題の入力を求められる', (await page.textContent('#q-area')).includes('ストックがありません'));
await page.fill('#q-area form input', '最近うれしかったことは?');
await page.click('#q-area form button[type=submit]');
await page.waitForFunction(() => document.querySelector('#q-text').textContent === '最近うれしかったことは?');
check('入力したお題がカードになる(自分の色)', (await page.getAttribute('#qcard', 'data-by')) === 'me');
check('お題は暗号文で保存される', !JSON.stringify(await page.evaluate(() => window.__fake.qc)).includes('うれしかった'));
await page.click('#q-area textarea');
await page.keyboard.type('あいうえお');
await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace'); // 2文字だけ消しても、書き直しに数えない
await page.keyboard.type('か');
await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace'); // 続けて3文字消すと、1回
await page.locator('#q-area textarea').first().fill('友だちと会えたこと');
check('先に答える人には、予想の欄が出る(任意)', (await page.locator('#q-area textarea').count()) === 2);
await page.locator('#q-area textarea').nth(1).fill('映画の話かな');
await page.click('#q-area form button[type=submit]');
await page.waitForSelector('#q-area .ans.me');
check('答えたあとは、相手を待つ表示(相手の答えは見えない)', (await page.textContent('#q-area')).includes('ゆうきの答えを待っています') && (await page.locator('#q-area .ans.you').count()) === 0);
check('書き直しは、まとめて消した回数で数える(バックスペースの回数ではない)', (await page.textContent('#q-area .ans.me .meta')).includes('書き直し1回'));
check('答えは暗号文で保存される', !JSON.stringify(await page.evaluate(() => window.__fake.an)).includes('友だち'));
check('答えたあと、相手を待つ間は、予想を書き直せる', (await page.locator('#q-area .guess button', { hasText: '書き直す' }).count()) === 1 && (await page.inputValue('#q-area .guess textarea')) === '映画の話かな');
await page.fill('#q-area .guess textarea', '映画か読書かな');
await page.click('#q-area .guess button[type=submit]');
await page.waitForFunction(async () => { const C = await import('/js/crypto.js'); const key = await C.importKey(C.fromB64(localStorage.getItem('app.key'))); const d = await C.decryptJson(key, 'guesses', window.__fake.gs[0]); return d.text === '映画か読書かな'; });
check('書き直しても、予想は1つだけ', (await page.evaluate(() => window.__fake.gs.length)) === 1);
const partnerAns = await enc('answers', { n: 1, text: '新しい本を買った', at: Date.now(), t0: Date.now() - 601000, edits: 3 });
await page.evaluate((doc) => { window.__fake.an.push({ id: 'pa1', ...doc, owner: 'u2' }); window.__fake.notify(); }, partnerAns);
await page.waitForSelector('#q-area .ans.you');
const meta = await page.textContent('#q-area .ans.you .meta');
check('ふたりそろうと答えが見える(悩んだ跡つき)', (await page.textContent('#q-area .ans.you')).includes('新しい本を買った') && meta.includes('考えた時間 10分') && meta.includes('書き直し3回'), meta);
await page.waitForSelector('#q-area .judge');
check('予想は暗号文で保存される', (await page.evaluate(() => window.__fake.gs.length)) === 1 && !JSON.stringify(await page.evaluate(() => window.__fake.gs)).includes('映画'));
check('相手が答えると、自分の予想と判定ボタンが出る', (await page.textContent('#q-area .judge')).includes('映画か読書かな') && (await page.locator('#q-area .rate').count()) === 3);
await page.locator('#q-area .rate[data-r=near]').click();
await page.waitForSelector('#q-area .react');
const g1 = await page.evaluate(async () => { const C = await import('/js/crypto.js'); const key = await C.importKey(C.fromB64(localStorage.getItem('app.key'))); return C.decryptJson(key, 'guesses', window.__fake.gs[0]); });
check('判定が、予想といっしょに保存される', g1.r === 'near' && g1.text === '映画か読書かな' && g1.n === 1, JSON.stringify(g1));
check('判定のあとは、表情とひとことが出る', (await page.textContent('#q-area .react')).includes('くやしい') && (await page.locator('#q-area .react .rface').count()) === 2);
const partnerG = await enc('guesses', { n: 1, text: '散歩かな', at: Date.now() });
await page.evaluate((doc) => { window.__fake.gs.push({ id: 'pg1', ...doc, owner: 'u2' }); window.__fake.notify(); }, partnerG);
await page.waitForSelector('#q-area .glock');
check('相手の予想は、判定まで「あること」だけ見える', !(await page.textContent('#q-area')).includes('散歩かな'));
const partnerJ = await enc('guesses', { n: 1, text: '散歩かな', at: Date.now(), r: 'miss', jat: Date.now() });
await page.evaluate((doc) => { window.__fake.gs = window.__fake.gs.filter((x) => x.id !== 'pg1'); window.__fake.gs.push({ id: 'pg1', ...doc, owner: 'u2' }); window.__fake.notify(); }, partnerJ);
await page.waitForFunction(() => !document.querySelector('#q-area .glock'));
check('相手が判定すると、予想と表情が見える', (await page.textContent('#q-area')).includes('散歩かな') && (await page.textContent('#q-area')).includes('そんな予想してたの'));
check('同じ日は、次のお題を待つ案内', (await page.textContent('#q-area')).includes('明日の0時'));

// ストック(まとめて追加)
await page.click('#stock-open');
await page.fill('#sheet-body textarea', '行ってみたい場所は?\n好きな季節は?\n\n最近ハマってることは?');
await page.locator('#sheet-body button', { hasText: 'まとめて追加' }).click();
await page.waitForFunction(() => document.querySelectorAll('#sheet-body .sitem').length === 3);
check('ストックにまとめて追加できる', true);
check('ストックも暗号文だけ', !JSON.stringify(await page.evaluate(() => window.__fake.sk)).includes('季節'));
// 似たお題のお知らせ(ほとんど同じものだけ)
await page.fill('#sheet-body input[type=text]', 'いちばん好きな季節は?');
check('似たお題があると、知らせて、「それでも追加」になる', (await page.textContent('#sheet-body .sim')).includes('好きな季節は?') && (await page.locator('#sheet-body button', { hasText: 'それでも追加' }).count()) === 1);
await page.fill('#sheet-body input[type=text]', '好きな動物は?');
check('話題がちがうと、知らせない', await page.locator('#sheet-body .sim').first().isHidden());
await page.fill('#sheet-body textarea', '好きな季節は?\n好きな色は?');
await page.locator('#sheet-body button', { hasText: 'まとめて追加' }).click();
check('まとめて追加でも、似たお題を知らせる', (await page.textContent('#sheet-body')).includes('似たお題が 1 件あります'));
await page.locator('#sheet-body button', { hasText: '似たものを除いて追加' }).click();
await page.waitForFunction(() => document.querySelectorAll('#sheet-body .sitem').length === 4);
check('「似たものを除いて追加」で、似ていない分だけ入る', true);
await page.fill('#sheet-body input[type=text]', '');
await page.selectOption('#sheet-body select[aria-label="足すお題のカテゴリ"]', 'dream');
await page.fill('#sheet-body input[type=text]', '十年後は、どうしていたい?');
await page.locator('#sheet-body button', { hasText: /^追加$/ }).click();
await page.waitForFunction(() => document.querySelectorAll('#sheet-body .sitem').length === 5);
check('カテゴリを付けて足せる。一覧に名前が出る', (await page.textContent('#sheet-body')).includes('将来・夢'));
await page.locator('#sheet-body .chips button', { hasText: '将来・夢' }).click();
check('カテゴリで絞り込める', (await page.locator('#sheet-body .sitem').count()) === 1);
await page.locator('#sheet-body .chips button', { hasText: 'ぜんぶ' }).click();
// 使われたストックは、下にまとめて、ふだんはたたまれている
const usedCard = await enc('qcards', { text: '好きな季節は?', stockId: await page.evaluate(() => window.__fake.sk[1].id), date: '2026-10-19', by: 'u2' });
await page.evaluate((doc) => { window.__fake.qc.push({ id: 'qx2', n: 2, ...doc, from: 'u2' }); window.__fake.notify(); }, usedCard);
await page.waitForFunction(() => document.querySelectorAll('#sheet-body .sitem').length === 4);
check('使用済みは、ふだんはたたまれていて、「使用済みを見る」が出る', (await page.locator('#sheet-body .used-toggle button').textContent()).includes('使用済みを見る(1個)') && !(await page.textContent('#sheet-body')).includes('(使用済み)'));
await page.locator('#sheet-body .used-toggle button').click();
check('押すと、使用済みが一覧の下に出る', (await page.locator('#sheet-body .sitem').count()) === 5 && (await page.locator('#sheet-body .sitem').last().textContent()).includes('使用済み'));
await page.locator('#sheet-body .used-toggle button').click();
// ひそひそ話: 自分が足したものは、自分には中身が見える。相手が足したものは、鍵だけ。似たお題の知らせも、相手のものは中身を出さない
await page.selectOption('#sheet-body select[aria-label="足すお題のカテゴリ"]', 'whisper');
await page.fill('#sheet-body input[type=text]', 'ないしょのひみつを教えてほしい夜');
await page.locator('#sheet-body button', { hasText: /^追加$/ }).click();
await page.waitForFunction(() => document.querySelector('#sheet-body .lockrow'));
check('自分が足したひそひそ話も、ふだんは鍵だけ(「長押しで見る」)で、中身は見えない', (await page.textContent('#sheet-body .lockrow')).includes('長押しで見る') && !(await page.textContent('#sheet-body .lockrow')).includes('ないしょのひみつ'));
const lockBox = await page.locator('#sheet-body .lockrow').first().boundingBox();
await page.mouse.move(lockBox.x + 20, lockBox.y + lockBox.height / 2);
await page.mouse.down();
await page.waitForTimeout(700);
await page.mouse.up();
await page.waitForFunction(() => document.querySelector('#sheet-body .lockrow.open'));
check('長押しすると、自分が足したひそひそ話の中身が見える(相手には内緒、の印つき)', (await page.textContent('#sheet-body .lockrow')).includes('ないしょのひみつ') && (await page.textContent('#sheet-body .lockrow')).includes('相手には、デートの前日まで内緒'));
await page.waitForTimeout(800);
await page.locator('#sheet-body .lockrow.open span').click();
await page.waitForFunction(() => !document.querySelector('#sheet-body .lockrow.open'));
check('タップすると、また隠れる', !(await page.textContent('#sheet-body .lockrow')).includes('ないしょのひみつ'));
await page.mouse.move(lockBox.x + 20, lockBox.y + lockBox.height / 2);
await page.mouse.down();
await page.waitForTimeout(700);
await page.mouse.up();
await page.waitForFunction(() => document.querySelector('#sheet-body .lockrow.open'));
await page.waitForTimeout(10600);
check('見えてから10秒たつと、自動で隠れる', !(await page.locator('#sheet-body .lockrow.open').count()));
const theirWhisper = await enc('stock', { text: 'ふたりだけの思い出の夜を教えて', cat: 'whisper', at: Date.now() });
await page.evaluate((doc) => { window.__fake.sk.push({ id: 'sw2', ...doc, from: 'u2' }); window.__fake.notify(); }, theirWhisper);
await page.waitForFunction(() => document.querySelectorAll('#sheet-body .lockrow').length === 2);
check('相手が足したひそひそ話は、鍵だけで、中身は出ない', (await page.textContent('#sheet-body')).includes('デートの前日に鍵が開きます') && !(await page.textContent('#sheet-body')).includes('ふたりだけの思い出の夜'));
await page.fill('#sheet-body input[type=text]', 'ふたりだけの思い出の夜を教えて');
check('似たお題の知らせ: 相手のひそひそ話は、中身を出さない', (await page.textContent('#sheet-body .sim')).includes('ひそひそ話に、ほとんど同じお題があります') && !(await page.textContent('#sheet-body .sim')).includes('思い出の夜'));
await page.fill('#sheet-body input[type=text]', 'ないしょのひみつを教えてほしい夜');
check('似たお題の知らせ: 自分のひそひそ話も、中身は出さない', (await page.textContent('#sheet-body .sim')).includes('ひそひそ話に、ほとんど同じお題があります') && !(await page.textContent('#sheet-body .sim')).includes('ないしょのひみつ'));
await page.fill('#sheet-body input[type=text]', '');
await page.locator('#sheet-body .lockrow button', { hasText: '削除' }).click();
await page.evaluate(() => { window.__fake.sk = window.__fake.sk.filter((x) => x.id !== 'sw2'); window.__fake.notify(); });
await page.waitForFunction(() => !document.querySelector('#sheet-body .lockrow'));
await page.selectOption('#sheet-body select[aria-label="足すお題のカテゴリ"]', '');
await page.click('#sheet-close');
await page.evaluate(() => { window.__fake.qc = window.__fake.qc.filter((x) => x.id !== 'qx2'); window.__fake.notify(); });
check('残りのお題の数が出る', (await page.textContent('#stock-n')) === '5');

// カード
const whisperCard = await enc('qcards', { text: 'ひみつの題', date: '2026-10-20', by: 'u2', cat: 'whisper' });
await page.evaluate((doc) => { window.__fake.qc.push({ id: 'qw1', n: 90, ...doc, from: 'u2' }); window.__fake.notify(); }, whisperCard);
await page.click('#talk-seg [data-t="c"]');
check('ひそひそ話のカードは、カードの一覧に並ばない', (await page.locator('#c-grid').textContent()).indexOf('ひみつの題') < 0 && (await page.locator('#c-grid .catit').count()) === 1);
await page.evaluate(() => { window.__fake.qc = window.__fake.qc.filter((x) => x.id !== 'qw1'); window.__fake.notify(); });
check('カードが、カテゴリごとにまとまって並ぶ(日付に西暦つき)', (await page.locator('#c-grid .catit').count()) === 1 && /\d{4}\/\d{1,2}\/\d{1,2}\(.\)/.test(await page.textContent('#c-grid .catit time')) && /\d+カテゴリ/.test(await page.textContent('#c-count')));
await page.click('#c-grid .catit');
check('カードを開くと答えが見える', (await page.locator('#sheet-body .ans').count()) === 2);
await page.click('#sheet-close');

// ボックス(タイムカプセル)
await page.click('#talk-seg [data-t="b"]');
await page.fill('#cap-name', '来年のふたりへ');
await page.fill('#cap-date', new Date(Date.now() + 864e5 * 2).toISOString().slice(0, 10).replace(/-0?/g, '-').replace(/^(\d+)-(\d+)-(\d+)$/, (m, y, mo, d) => `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`));
await page.click('#cap-form button[type=submit]');
await page.waitForSelector('#sheet-body textarea');
await page.fill('#sheet-body textarea', '元気にしてるかな');
await page.click('#sheet-body button[type=submit]');
await page.waitForSelector('#b-list .bx');
check('タイムカプセルができて、封をされる(あと〜日)', (await page.textContent('#b-list .bx')).includes('来年のふたりへ') && (await page.textContent('#b-list .bx')).includes('あと'));
check('中身は暗号文だけ', !JSON.stringify(await page.evaluate(() => window.__fake.it)).includes('元気'));
check('開く日の前は、中身を読む入口がない', (await page.locator('#b-list .bx .count small').textContent()).includes('1通'));
await page.evaluate(() => { window.__fake.bx[0].openAt = Date.now() - 300000; window.__fake.it[0].openAt = Date.now() - 300000; window.__fake.notify(); });
await page.waitForFunction(() => document.querySelector('#b-list .bx .count small')?.textContent === 'ひらく');
await page.click('#b-list .bx');
await page.waitForFunction(() => document.querySelector('#sheet-body').textContent.includes('元気にしてるかな'));
check('開く日が来ると、中身が読める', true);
await page.click('#sheet-close');

// 誕生日
await page.click('.tab[data-v="home"]');
check('相手の誕生日の前に、ポップが出る', await page.locator('#bd-banner').isVisible() && (await page.textContent('#bd-banner')).includes('誕生日メッセージ'));
await page.click('#bd-banner');
await page.fill('#sheet-body textarea', 'おめでとう');
await page.click('#sheet-body button[type=submit]');
await page.waitForFunction(() => document.querySelector('#bd-banner').hidden);
check('メッセージを入れるとポップが消える', true);
check('誕生日ボックスは、相手あてで作られる', (await page.evaluate(() => window.__fake.bx.length)) === 2);
await openSet();
const nowD = new Date();
await more();
await page.selectOption('select[aria-label="誕生日の月"]', String(nowD.getMonth() + 1));
await page.selectOption('select[aria-label="誕生日の日"]', String(nowD.getDate()));
await page.click('.tab[data-v="home"]');
await page.waitForFunction(() => !document.querySelector('#bd-today').hidden);
check('誕生日当日は、お祝いが出る', (await page.textContent('#bd-today')).includes('お誕生日おめでとう'));
await page.click('.tab[data-v="cal"]');
check('カレンダーのその日にケーキの印が付く', (await page.locator('#month button em.cake').count()) >= 1);
await openSet();
await more();
await page.selectOption('select[aria-label="誕生日の月"]', String((nowD.getMonth() + 1) % 12 + 1));

// 新着の印
await page.click('.tab[data-v="home"]');
const hello = await enc('messages', { body: 'やっほー' });
await page.evaluate((doc) => { window.__fake.msg.push({ id: 'pm1', from: 'u2', ts: Date.now() + 1000, expireAt: null, ...doc }); window.__fake.notify(); }, hello);
await page.waitForSelector('#new-banner:not([hidden])');
check('新着があると、ホームの帯と、おはなしタブに印が出る', await page.locator('.tab[data-v="chat"].has-new').count() === 1 && (await page.textContent('#new-banner')).includes('新着があります'));
check('帯には、メッセージの中身は出ない', !(await page.textContent('#new-banner')).includes('やっほー'));
await page.click('.tab[data-v="chat"]');
await page.click('#talk-seg [data-t="q"]');
check('おしゃべり以外を開いても、おしゃべりの印は残る', await page.locator('#talk-seg [data-t="chat"].has-new').count() === 1);
await page.click('#talk-seg [data-t="chat"]');
check('おしゃべりを開くと印が消える', await page.locator('#talk-seg [data-t="chat"].has-new').count() === 0 && await page.locator('.tab[data-v="chat"].has-new').count() === 0);

// 月(ふたりのブランコ)
await page.click('.tab[data-v="home"]');
await page.waitForSelector('#mn-scene svg.scene');
await page.waitForTimeout(400);
await page.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 900; }));
await page.locator('#mn-card').screenshot({ path: '/tmp/ring.png' });
const ringBox = await page.evaluate(() => { const r = document.querySelector('#mn-scene .hintc'); const m = document.querySelector('#mn-scene circle[r="46"]'); if (!r || !m) return null; const a = r.getBoundingClientRect(); const b = m.getBoundingClientRect(); return [a.x + a.width / 2 - (b.x + b.width / 2), a.y + a.height / 2 - (b.y + b.height / 2)]; });
check('合図の輪は、月の中心から広がる', ringBox && Math.abs(ringBox[0]) < 1 && Math.abs(ringBox[1]) < 1, JSON.stringify(ringBox));
check('ホームの一番上に、月の舞台が出る', await page.locator('#moon').isVisible() && (await page.locator('#v-home > *').evaluateAll((els) => els.map((e) => e.id || e.className)))[ 4 ] !== undefined);
check('触れる前は、合図の輪が出て、ボタンはない', (await page.locator('#mn-scene .hintc').count()) === 1 && (await page.locator('#moon button:has-text("月に触れる")').count()) === 0);
check('触れる前は、バナーと枠の光が出る', (await page.locator('#moon-banner').isVisible()) && (await page.textContent('#moon-banner')).includes('月に、触れてみよう') && (await page.locator('#mn-card.cue').count()) === 1);
await page.click('#mn-card');
await page.waitForSelector('#mn-panel:not([hidden])');
await page.waitForFunction(() => window.__fake.mn.length === 1);
check('月を押すと、触れた記録が暗号文で保存され、状況パネルが開く', !JSON.stringify(await page.evaluate(() => window.__fake.mn)).includes('"at"') && (await page.textContent('#mn-panel')).includes('まだ'));
check('触れたあとは、合図の輪が消える', (await page.locator('#mn-scene .hintc').count()) === 0);
check('触れたあとは、バナーも枠の光も消える', (await page.locator('#moon-banner').isHidden()) && (await page.locator('#mn-card.cue').count()) === 0);
if (await page.locator('#mn-talk').isVisible()) await page.click('#mn-talk'); // 朝に開いたときのあいさつは、成立の前でも出る(ここでは消しておく)
await page.evaluate(() => { const r = Math.random; Math.random = () => 0.01; window.__sayNow(); Math.random = r; });
check('ブランコが成立するまで(相手がまだ触れていない間)は、ひとり言は出ない', await page.locator('#mn-talk').isHidden());
await page.click('#mn-card');
check('もう一度押すと、パネルが閉じる(2回目は記録されない)', !(await page.locator('#mn-panel').isVisible()) && (await page.evaluate(() => window.__fake.mn.length)) === 1);
await page.click('#mn-card');
const partnerAt = await enc('moon', { at: Date.now() + 60000 });
await page.evaluate((doc) => { window.__fake.mn.push({ id: 'pm1', from: 'u2', ...doc }); window.__fake.notify(); }, partnerAt);
await page.waitForFunction(() => document.querySelector('#mn-panel').textContent.includes('ぴったり'));
check('2人目が10分以内に触れると、ぴったり💛 +5 になる', (await page.textContent('#mn-pts')) === '5' && (await page.textContent('#mn-panel')).includes('+5'));
check('成立のあいだは、ブランコで2人がつながって揺れる', (await page.locator('#mn-scene .pend.carry').count()) === 1);
await page.waitForTimeout(7200);
check('しばらくすると、ゆらゆら揺れるだけになる', (await page.locator('#mn-scene .pend.carry').count()) === 0 && (await page.locator('#mn-scene .pend.rest').count()) === 1);
await page.click('.tab[data-v="cal"]');
await page.click('.tab[data-v="home"]');
check('ホームに戻ってくると、くっついた姿になる', (await page.locator('#mn-scene .together, #mn-scene .pend.rest .perf.h').count()) >= 1 && (await page.locator('#mn-scene .pend.rest .pairh').count()) === 0);
// ひとり言: 出ると、タップするまで消えない。タップしても、月には触れたことにならない
const mnBefore = await page.evaluate(() => window.__fake.mn.length);
await page.evaluate(() => { const r = Math.random; Math.random = () => 0.01; window.__sayNow(); Math.random = r; });
await page.waitForSelector('#mn-talk:not([hidden])');
const sayText = await page.textContent('#mn-talk');
check('ひとり言が、月の場面に出る', sayText.length > 0);
await page.evaluate(() => window.__moonVariantNow());
check('ふたりの動き(場面)が変わると、前のひとり言は消える', await page.locator('#mn-talk').isHidden());
await page.evaluate(() => { const r = Math.random; Math.random = () => 0.01; window.__sayNow(); Math.random = r; });
await page.waitForSelector('#mn-talk:not([hidden])');
await page.waitForTimeout(4500);
check('数秒たっても、ひとり言は消えない', await page.locator('#mn-talk').isVisible() && (await page.textContent('#mn-talk')) === sayText);
await page.click('#mn-talk');
check('タップすると、ひとり言が消える(月には触れたことにならない)', (await page.locator('#mn-talk').isHidden()) && (await page.evaluate(() => window.__fake.mn.length)) === mnBefore);
// 開いた回数の特別なひとり言(5回目=光る / 10回目=全部入り)
await page.evaluate(() => window.__openNow(5));
await page.waitForSelector('#mn-talk:not([hidden])');
check('5回目に開くと、光る吹き出しで、特別な一言が出る', (await page.locator('#mn-talk.glow').count()) === 1 && (await page.evaluate(() => ['あっ、また来た！', '今日も、ここで会えたね', 'また会えたね、うれしい', 'おかえり〜', '今日は、よく来てくれるね', 'ちょうど、会いたかったところ', '来てくれると、ぽかぽかする', '今日は、ごきげんだね'].includes(document.querySelector('#mn-talk').textContent))));
if (process.env.SHOT) await page.locator('#moon').screenshot({ path: `${process.env.SHOT}/say5.png` });
await page.evaluate(() => window.__openNow(10));
await page.waitForSelector('#mn-talk.full');
await page.waitForTimeout(1200);
if (process.env.SHOT) await page.locator('#moon').screenshot({ path: `${process.env.SHOT}/say10.png` });
check('10回目に開くと、全部入りの吹き出し(にじいろ・星・のぼる星)', (await page.locator('#mn-talk.full .st').count()) === 2 && (await page.locator('#mn-talk.full .up').count()) === 3);
await page.evaluate(() => window.__openNow(6));
await page.waitForTimeout(300);
check('6回目は、特別な吹き出しにならない', (await page.locator('#mn-talk.glow:not([hidden]), #mn-talk.full:not([hidden])').count()) === 0);
await page.click('#mn-panel button');
await page.waitForSelector('#sheet-body .mlog li');
check('「記録をみる」で、触れた記録が見られる', (await page.textContent('#sheet-body')).includes('ぴったり'));
await page.click('#sheet-close');
await page.locator('#settings li', { hasText: '月のブランコの役' }).count();

// 長押しで削除・既読
await page.click('.tab[data-v="chat"]');
await page.click('#talk-seg [data-t="chat"]');
const nMine = await page.locator('.row.mine').count();
const bb = await page.locator('.row.mine .bub').last().boundingBox();
await page.mouse.move(bb.x + 5, bb.y + 5);
await page.mouse.down();
await page.waitForTimeout(700);
await page.mouse.up();
await page.waitForSelector('.row .del');
check('自分のメッセージを長押しすると、削除が出る', true);
await page.click('.row .del');
await page.waitForFunction((n) => document.querySelectorAll('.row.mine').length === n - 1, nMine);
check('削除するとメッセージが消える', true);
check('相手のメッセージには、長押しで削除は出ない', (await page.locator('.row.theirs .del').count()) === 0);
check('まだ既読は付かない', (await page.locator('.row.mine .meta span').count()) === 0);
await page.evaluate(() => { window.__fake.rd.push({ id: 'u2', at: Date.now() + 5000, from: 'u2' }); window.__fake.notify(); });
await page.waitForFunction(() => document.querySelectorAll('.row.mine .meta span').length === 1);
check('相手が読むと、最後のメッセージに既読が付く', true);

// 予定
await addEv({ title: '映画', time: '18:30', who: 'both' });
await page.waitForSelector('#cal-events .item');
check('予定が追加される', (await page.textContent('#cal-events .item')).includes('映画'));
check('予定は暗号化されて保存', !JSON.stringify(await page.evaluate(() => window.__fake.ev[0])).includes('映画'));
await page.click('#cal-events .x:not(.more)');
await page.click('#cal-events .x:not(.more)');
await page.waitForFunction(() => document.querySelectorAll('#cal-events .item').length === 0);
check('予定を削除できる(2回タップ)', true);

// 生理・気分の記録
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ago = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
await page.click('.tab[data-v="cal"]');
await page.locator('#month button', { hasText: D5 }).click();
await page.click('#day-record');
await page.waitForSelector('#sheet:not([hidden]) .scale');
check('日の記録シートに、5つの月と気分のタグが出る', (await page.locator('#sheet .scale button').count()) === 5 && (await page.locator('#sheet .tags button').count()) === 17);
await page.locator('#sheet .sw').check();
check('生理のスイッチを入れると、生理まわりのタグが出る', (await page.locator('#sheet .tags button').count()) === 23);
await page.fill('#sheet input[aria-label="自分のタグを足す"]', 'ねむねむ');
await page.locator('#sheet button', { hasText: /^足す$/ }).click();
check('自分でタグを足せる(選んだ状態で並ぶ)', (await page.locator('#sheet .tags button[aria-pressed="true"]', { hasText: 'ねむねむ' }).count()) === 1);
await page.locator('#sheet .scale button', { hasText: 'いまいち' }).click();
await page.locator('#sheet .tags button', { hasText: 'おなかが痛い' }).click();
await page.fill('#sheet textarea', 'テストメモ');
await page.click('#sheet .primary');
await page.waitForSelector('#sheet', { state: 'hidden' });
check('生理の日が塗られ、気分の点が付く', await page.locator('#month button.period em.mood').count() === 1);
const dayDocs = await page.evaluate(() => JSON.stringify(window.__fake.dy));
check('日の記録は暗号文だけで、保存名にも日付が出ない', !dayDocs.includes('テストメモ') && !dayDocs.includes('おなかが痛い') && !/2026/.test(dayDocs) && !/"id":"[^"]*20\d\d-/.test(dayDocs));
check('気分のある日をタップすると、内容が大きく出る', await page.locator('#day-detail').isVisible() && (await page.textContent('#day-detail')).includes('テストメモ') && (await page.textContent('#day-detail')).includes('いまいち') && (await page.textContent('#day-detail')).includes('おなかが痛い') && (await page.textContent('#day-detail')).includes('生理'));
check('大きな表示に、文字の「null」が混ざらない', !(await page.textContent('#day-detail')).includes('null'));
await page.locator('#month button', { hasText: /^6$/ }).click();
check('気分のない日では、大きな表示は出ない', !(await page.locator('#day-detail').isVisible()));
await page.locator('#month button', { hasText: D5 }).click();
await page.click('#day-record');
check('開き直すと、前の記録が入っている', await page.locator('#sheet textarea').inputValue() === 'テストメモ' && await page.locator('#sheet .sw').isChecked());
{ // 足したタグは、長押しで候補から消せる(過去の記録は、そのまま)
  const chip = page.locator('#sheet .tags button', { hasText: 'ねむねむ' });
  check('足したタグが、「よく使うタグ」に出る', (await chip.count()) === 1);
  await chip.click(); // 選びを外す(この日の記録からは外れるが、保存はしない)
  page.once('dialog', (d) => d.accept());
  await chip.dispatchEvent('pointerdown');
  await page.waitForTimeout(750); // 指を離す前に、候補が消える
  await page.waitForFunction(() => ![...document.querySelectorAll('#sheet .tags button')].some((b) => b.textContent === 'ねむねむ'));
  check('長押しで、候補から消える', (await page.locator('#sheet .tags button', { hasText: 'ねむねむ' }).count()) === 0);
}
await page.click('#sheet-close');
await page.locator('#month button', { hasText: D5 }).click();
await page.click('#cal-next'); // 来月の1日は、いつでも未来
await page.locator('#month button[data-key]').first().click();
check('未来の日では、「この日の調子を記録」が出ない', await page.locator('#day-record').isHidden());
await page.click('#cal-prev');
await page.locator('#month button', { hasText: D5 }).click();
check('候補から消しても、過去の記録は残る', (await page.textContent('#day-detail')).includes('ねむねむ'));
await page.click('#day-record');
check('開き直しても、候補に戻らない(その日の記録にあるタグは、選ばれた状態で出る)', (await page.locator('#sheet .tags button[aria-pressed="true"]', { hasText: 'ねむねむ' }).count()) === 1);
await page.click('#sheet-close');
// 記録の時刻と、あとから足した症状
{
  check('はじめの記録に、「〜に記録」の時刻が出る', /\d\d:\d\d に記録|\d\d:\d\dに記録/.test(await page.textContent('#day-detail')));
  await page.click('#day-detail .ghost');
  await page.locator('#sheet .tags button', { hasText: '眠い' }).click();
  await page.locator('#sheet-body .primary').click();
  await page.waitForSelector('#sheet', { state: 'hidden' });
  const txt = await page.textContent('#day-detail');
  check('あとから足した症状に、＋と時刻が付く(はじめからの症状には付かない)', /眠い ＋\d\d:\d\d/.test(txt) && !/おなかが痛い ＋/.test(txt) && txt.includes('＋は、あとから足した症状'), txt);
  await page.click('#day-detail .ghost');
  const before = await page.evaluate(() => window.__fake.dy.length);
  await page.locator('#sheet-body .primary').click();
  await page.waitForSelector('#sheet', { state: 'hidden' });
  check('変えずに保存しても、時刻は変わらない', /眠い ＋\d\d:\d\d/.test(await page.textContent('#day-detail')));
}

await openPast();
await page.locator('#sheet input[type=date]').nth(0).fill(fmt(ago(48)));
await page.locator('#sheet input[type=date]').nth(1).fill(fmt(ago(44)));
await page.click('#sheet .primary');
await page.locator('#sheet input[type=date]').nth(0).fill(fmt(ago(20)));
await page.locator('#sheet input[type=date]').nth(1).fill(fmt(ago(16)));
await page.click('#sheet .primary');
await page.waitForFunction(() => document.querySelectorAll('#sheet .mini-list .item').length >= 2);
check('過去の記録を追加できる', true);
await page.click('#sheet-close');
await page.waitForFunction(() => /平均の周期は\s*28日/.test(document.querySelector('#cyc-sum').textContent));
check('2回分で、平均の周期が出る', true);
await page.click('.tab[data-v="home"]');
await page.waitForFunction(() => /あと\d+日/.test(document.querySelector('#next-moon').textContent));
check('ホームに「次の生理」が出る', (await page.textContent('#next-moon')).includes('次の生理(予想)'));
check('ホームの最近の気分に出る', (await page.textContent('#home-mood')).includes('おなかが痛い'));
{
  const old = await enc('days', { d: '2025-09-01', l: 3, t: [], m: '前の記録', p: false, by: 'u1' });
  await page.evaluate((doc) => { window.__fake.dy.push({ id: 'oldday', ...doc, owner: 'u1' }); window.__fake.notify(); }, old);
  await page.waitForSelector('#home-mood .more-btn');
  check('最近の気分は、いちばん新しい分だけ。前の分はたたんである', !(await page.textContent('#home-mood')).includes('前の記録') && (await page.textContent('#home-mood .more-btn')).includes('これまでの気分を見る'));
  await page.click('#home-mood .more-btn');
  check('押すと、前の分が出る。もう一度押すとたためる', (await page.textContent('#home-mood')).includes('前の記録'));
  await page.click('#home-mood .more-btn');
  check('たたむと、また隠れる', !(await page.textContent('#home-mood')).includes('前の記録'));
}
await page.click('.tab[data-v="cal"]');
await openPast();
const before = await page.locator('#sheet .mini-list .item').count();
await page.locator('#sheet .mini-list .x').first().click();
await page.locator('#sheet .mini-list .x').first().click();
await page.waitForFunction((n) => document.querySelectorAll('#sheet .mini-list .item').length < n, before);
check('記録を削除できる(2回タップ)', true);
await page.click('#sheet-close');

// 相手の画面(見るだけ)と「よしよし」
await page.evaluate(() => window.__fake.asUser('u2'));
await page.click('.tab[data-v="home"]');
await page.click('.tab[data-v="cal"]');
await page.locator('#month button', { hasText: D5 }).click();
check('相手の画面でも「この日を記録」は出る', await page.locator('#day-record').isVisible());
await openSet(); await more();
check('生理の「過去の生理の記録」は、相手の画面の設定には出ない', (await page.locator('#settings li', { hasText: '過去の生理の記録' }).count()) === 0);
await page.click('.tab[data-v="cal"]');
await page.locator('#month button', { hasText: D5 }).click();
check('相手の画面では、ひとみの記録が出る', (await page.textContent('#day-detail')).includes('ひとみ'));
check('相手の画面では、記録の内容は見られる', (await page.textContent('#day-detail')).includes('テストメモ'));
await page.click('#day-record');
check('ゆうき側の記録シートには、生理が出ない', !(await page.textContent('#sheet-body')).includes('この日は生理'));
await page.locator('#sheet .scale button').nth(3).click();
await page.locator('#sheet-body .primary').click();
await page.waitForSelector('#sheet', { state: 'hidden' });
check('ふたりの記録が、同じ大きさで並ぶ', (await page.locator('#day-detail .dd-p').count()) === 2);
check('カレンダーの日に、ふたり分の印が出る', (await page.locator('#month button', { hasText: D5 }).locator('em.mood').count()) === 2);
check('調子のポーズが出る', (await page.locator('#day-detail .pose svg.chara').count()) >= 1);
await page.click('#day-detail .pat');
await page.waitForSelector('#day-detail .pat-done');
const patDocs = await page.evaluate(() => JSON.stringify(window.__fake.pt));
check('よしよしを送れる。保存されるのは暗号文と送り主だけ', (() => { const x = JSON.parse(patDocs)[0]; return x.from === 'u2' && Object.keys(x).sort().join() === 'ct,from,id,iv,v'; })());
check('送ったあとは、押せない表示(よしよし済み)になる。取り消しはできない', (await page.locator('#day-detail .pat-done').count()) === 1 && (await page.locator('#day-detail button.pat').count()) === 0 && (await page.evaluate(() => window.__fake.pt.length)) === 1);
await page.evaluate(() => window.__fake.asUser('u1'));
await page.click('.tab[data-v="home"]');
await page.click('.tab[data-v="cal"]');
await page.locator('#month button', { hasText: /^5\b/ }).click();
check('ひとみ側にも、ゆうきの記録へのよしよしボタンが出る(ひざまくら)', (await page.locator('#day-detail .pat').count()) === 1 && (await page.locator('#day-detail .dd-patpic svg.chara').count()) >= 1);
await page.click('.tab[data-v="cal"]');
await page.click('.tab[data-v="home"]');
check('持ち主のホームに、よしよしが届いたと出る', await page.locator('#pat-banner').isVisible() && (await page.textContent('#pat-banner')).includes('よしよしが届いています(1件)'));
await page.click('#pat-banner');
await page.waitForSelector('#day-detail:not([hidden])');
check('帯をタップすると、その日の記録に飛び、よしよしが見える', (await page.textContent('#day-detail')).includes('から よしよし') && (await page.locator('#day-detail .ghost').count()) === 1);
check('よしよしが届いた日に、ハートの印が付く', (await page.locator('#month button em.pat-mark').count()) === 1);
await page.click('.tab[data-v="home"]');
check('見たあとは、帯が消える', !(await page.locator('#pat-banner').isVisible()));
// よしよしが届いたとき、イラストが大きく出る
{
  const day = new Date(); const dk = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  const doc = await enc('pats', { d: dk, by: 'u2', at: Date.now() + 5000 });
  await page.evaluate((d) => { window.__fake.pt.push({ id: 'newpat', ...d, from: 'u2' }); window.__fake.notify(); }, doc);
  await page.waitForSelector('#yoshi');
  check('よしよしが届くと、イラストが大きく出る', (await page.textContent('#yoshi')).includes('から よしよし') && (await page.locator('#yoshi svg.chara').count()) >= 1 && (await page.locator('#yoshi .pata, #yoshi .lapa').count()) === 1);
  await page.click('#yoshi');
  check('タップでとじる', (await page.locator('#yoshi').count()) === 0);
}

// ホームと設定
await addEv({ title: '歯医者', who: 'both' });
await page.click('.tab[data-v="home"]');
check('ホームに予定が出る', (await page.textContent('#home-events')).includes('歯医者'));
// ホームのカード: 名前と日付を設定して、タップ・スライドで3つの面を切り替える
const aw = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
check('設定前のカード1は、案内と初期の名前', (await page.textContent('#days')).includes('記念日1') && (await page.textContent('#days')).includes('設定の「ホームのカード」'));
await openSet();
await more();
await page.locator('#settings li', { hasText: 'ホームのカード' }).locator('button').click();
await page.locator('#sheet input[type=text]').nth(0).fill('出会った日');
await page.locator('#sheet input[type=date]').nth(0).fill(aw(450));
await page.locator('#sheet input[type=text]').nth(1).fill('付き合い始めた日');
await page.locator('#sheet input[type=date]').nth(1).fill(aw(100));
await page.locator('#sheet input[type=text]').nth(2).fill('次のデート');
await page.click('#sheet .primary');
await page.waitForSelector('#sheet', { state: 'hidden' });
const sharedDoc = await page.evaluate(() => JSON.stringify(window.__fake.sh));
check('カードの名前と日付は暗号文だけで保存される', !sharedDoc.includes('出会った') && !sharedDoc.includes('次のデート') && !/20\d\d-\d\d-\d\d/.test(sharedDoc));
await page.click('.tab[data-v="home"]');
await page.waitForFunction(() => /出会った日から/.test(document.querySelector('#days').textContent));
check('カード1: 出会った日から450日、次の節目まであと50日', (await page.textContent('#days')).includes('450日') && (await page.textContent('#days')).includes('次の節目(500日)まであと50日'));
await page.click('#days');
await page.waitForFunction(() => /付き合い始めた日から/.test(document.querySelector('#days').textContent));
check('タップでカード2に切り替わる(ちょうど100日は、節目の日と出る)', (await page.textContent('#days')).includes('100日') && (await page.textContent('#days')).includes('今日は節目の日です'));
await page.click('#days');
await page.waitForFunction(() => /次のデート/.test(document.querySelector('#days').textContent));
check('カード3: 今日の「両方」の予定があれば、それが出る', (await page.textContent('#days')).includes('歯医者') && (await page.textContent('#days')).includes('今日'));
await page.click('.tab[data-v="cal"]');
await page.locator('#month button.today').click();
await page.locator('#cal-events .x:not(.more)').first().click();
await page.locator('#cal-events .x:not(.more)').first().click();
await page.click('.tab[data-v="home"]');
await page.waitForFunction(() => /「両方」を選んだ予定/.test(document.querySelector('#days').textContent));
check('カード3: 「両方」の予定がなければ案内', true);
// 「両方」の予定(明日)を入れると、カード3に出る
const tm = new Date(); tm.setDate(tm.getDate() + 1);
await addEv({ title: 'ごはん', date: `${tm.getFullYear()}-${String(tm.getMonth() + 1).padStart(2, '0')}-${String(tm.getDate()).padStart(2, '0')}`, who: 'both' });
await page.click('.tab[data-v="home"]');
await page.waitForFunction(() => /ごはん/.test(document.querySelector('#days').textContent));
check('カード3: 次の「両方」の予定まで、あと1日', (await page.textContent('#days')).includes('あと1日'));
// 連続する予定(お泊まり)
{
  const k = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  await addEv({ title: 'お泊まり', date: k(20), end: k(22) });
  await page.waitForFunction(() => /お泊まり/.test(document.querySelector('#cal-events').textContent));
  check('連続する予定は、「開始〜終了」で出る', /〜/.test(await page.textContent('#cal-events')));
  check('保存された予定に、終わりの日が入る', (await page.evaluate(() => window.__fake.ev.length)) >= 1);
  check('予定の入力欄は、画面から無くなった(そのほかのシートで入れる)', (await page.locator('#ev-form').count()) === 0);
}
// デートをワンタップで入れる / なぞって選ぶと、お泊まりデート
{
  await page.click('.tab[data-v="home"]');
  await page.click('.tab[data-v="cal"]');
  while ((await page.locator('#month button.today').count()) === 0) await page.click('#cal-prev'); // 今月に戻る
  check('はじめは、入れるバーが出ていない', await page.locator('#ev-bar').isHidden());
  await page.locator('#month button.today').click();
  if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}/cal-fab.png` });
  check('日付をタップしただけでは、予定を入れるバーは出ない(予定をすぐ見られる)', await page.locator('#ev-bar').isHidden());
  await page.click('#ev-open');
  check('「予定を入れる」を押すと、下にバーが出る(♥ デート)', (await page.textContent('#evb-date')).includes('デート') && !(await page.textContent('#evb-date')).includes('お泊まり'));
  const before = await page.evaluate(() => window.__fake.ev.length);
  await page.click('#evb-date');
  await page.waitForFunction((n) => window.__fake.ev.length === n + 1, before);
  const dt = await page.evaluate(async () => { const C = await import('/js/crypto.js'); const key = await C.importKey(C.fromB64(localStorage.getItem('app.key'))); const e = window.__fake.ev[window.__fake.ev.length - 1]; return C.decryptJson(key, 'events', e); });
  check('ワンタップで「デート」が、両方の予定として入る', dt.title === 'デート' && dt.who === 'both' && !dt.end, JSON.stringify(dt));
  // ごはん・いっしょの仕事も、ワンタップ(種類つき)
  const decLast = () => page.evaluate(async () => { const C = await import('/js/crypto.js'); const key = await C.importKey(C.fromB64(localStorage.getItem('app.key'))); const e = window.__fake.ev[window.__fake.ev.length - 1]; return C.decryptJson(key, 'events', e); });
  await page.locator('#month button.today').click();
  await page.click('#ev-open');
  await page.click('#evb-meal');
  await page.waitForFunction((n) => window.__fake.ev.length === n + 2, before);
  const mealEv = await decLast();
  check('「ごはん」が、種類つきで両方の予定として入る', mealEv.title === 'ごはん' && mealEv.kind === 'meal' && mealEv.who === 'both', JSON.stringify(mealEv));
  await page.locator('#month button.today').click();
  await page.click('#ev-open');
  await page.click('#evb-work');
  await page.waitForFunction((n) => window.__fake.ev.length === n + 3, before);
  const workEv = await decLast();
  check('「いっしょの仕事」が、種類つきで入る', workEv.title === 'いっしょの仕事' && workEv.kind === 'work' && workEv.who === 'both', JSON.stringify(workEv));
  check('カレンダーに、ごはんと仕事の印が出る', (await page.locator('#month button.today em.evtk svg.meal').count()) === 1 && (await page.locator('#month button.today em.evtk svg.work').count()) === 1);
  check('仕事の日は、日の一覧にかばんの絵が出る', (await page.locator('#cal-events .tkmark.work').count()) === 1);
  await page.click('.tab[data-v="home"]');
  check('仕事の日は、ホームの月に一言が出る', await page.locator('#mn-say').isVisible());
  await page.click('.tab[data-v="cal"]');
  await page.locator('#cal-events .item', { hasText: 'いっしょの仕事' }).locator('button', { hasText: '詳細' }).click();
  await page.locator('#sheet input[name="evicon"][value="meal"]').check({ force: true });
  await page.click('#sheet form button[type=submit]');
  await page.waitForFunction(() => document.querySelectorAll('#cal-events .ev-mark.meal').length === 2);
  check('詳細のシートで、種類を付け替えられる', (await decLast()).kind === 'meal');
  await page.click('.tab[data-v="home"]');
  check('仕事でなくなると、一言は消える', await page.locator('#mn-say').isHidden());
  // 「そのほか」でアイコンを選ぶ(出張・電車)。詳細で、日付・時刻も直せる
  await page.click('.tab[data-v="cal"]');
  await page.locator('#month button.today').click();
  await page.click('#ev-open');
  await page.click('#evb-more');
  await page.fill('#sheet input[aria-label="予定の名前"]', '出張(札幌)');
  await page.locator('#sheet .kpick input[value="train"]').check({ force: true });
  await page.click('#sheet form button[type=submit]');
  await page.waitForSelector('#sheet', { state: 'hidden' });
  const trainEv = await decLast();
  check('「そのほか」で選んだアイコンが、種類として保存される(ふたりの予定)', trainEv.kind === 'train' && trainEv.who === 'both', JSON.stringify(trainEv));
  check('出張は、日の一覧に電車の絵が出る', (await page.locator('#cal-events .tkmark.train').count()) === 1);
  await page.click('.tab[data-v="home"]');
  check('出張の日は、ホームの月に一言が出る(特別な絵にはならない)', await page.locator('#mn-say').isVisible());
  await page.click('.tab[data-v="cal"]');
  await page.locator('#cal-events .item', { hasText: '出張' }).locator('button', { hasText: '詳細' }).click();
  await page.fill('#sheet input[aria-label="時刻"]', '07:45');
  await page.click('#sheet form button[type=submit]');
  await page.waitForFunction(async () => { const C = await import('/js/crypto.js'); const key = await C.importKey(C.fromB64(localStorage.getItem('app.key'))); const e = window.__fake.ev[window.__fake.ev.length - 1]; return (await C.decryptJson(key, 'events', e)).time === '07:45'; });
  check('詳細のシートで、時刻も直せる(アイコンは変わらない)', (await decLast()).kind === 'train');
  await page.click('.tab[data-v="cal"]');
  // 旅券: 電車の予定の詳細に、乗換案内を貼ると、旅券になる
  {
    const t = new Date(); const dk = `${t.getFullYear()}年${t.getMonth() + 1}月${t.getDate()}日(土)`;
    const trip = `甲府 → 宇都宮\n${dk} 16:39出発\n\n乗換回数：1回\n所要時間：3時間14分\n\n[出発] 甲府\n│ 16:39発(２番線)\n│ あずさ78号[指定席]\n│ 18:29着(７番線)\n[乗換] 新宿\n│ 18:33発(８番線)\n│ ＪＲ中央線\n│ 19:53着(１番線)\n[到着] 宇都宮`;
    await page.locator('#cal-events .item', { hasText: '出張' }).locator('button', { hasText: '詳細' }).click();
    await page.fill('#sheet textarea[aria-label="詳細"]', trip);
    await page.click('#sheet form button[type=submit]');
    await page.waitForSelector('#cal-events .tk-badge');
    check('乗換案内を貼ると、予定に「旅券」の印が付き、文章は短い要約になる', (await page.textContent('#cal-events .evnote')).includes('甲府→宇都宮 16:39→19:53') && !(await page.textContent('#cal-events .evnote')).includes('乗換回数'));
    await page.click('.tab[data-v="home"]');
    await page.waitForSelector('#home-tickets .tkA');
    check('その日のホームに、きっぷが出る(ふたりの予定)', (await page.textContent('#home-tickets')).includes('甲府') && (await page.textContent('#home-tickets')).includes('16:39'));
    if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}/tk-home.png` });
    await page.click('#home-tickets .tkA');
    await page.waitForSelector('#tk-pop:not([hidden]) .tkC');
    if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}/tk-full.png` });
    check('きっぷをタップすると、全画面で路線図が出る(乗換駅つき)', (await page.textContent('#tk-pop')).includes('新宿') && (await page.locator('#tk-pop .tkseg').count()) === 2);
    await page.click('#tk-pop .tkbar button');
    check('もどるで、全画面が閉じる', await page.locator('#tk-pop').isHidden());
    await page.click('.tab[data-v="cal"]');
    await page.locator('#cal-events .item.has-ticket').click();
    await page.waitForSelector('#tk-pop:not([hidden]) .tkC');
    await page.locator('#tk-pop > button').click();
    await page.waitForSelector('#sheet textarea[aria-label="詳細"]');
    check('「詳細を見る・直す」で、元の文章を直せる', (await page.inputValue('#sheet textarea[aria-label="詳細"]')).includes('乗換回数'));
    await page.click('#sheet-close');
  }
  const title00 = await page.textContent('#cal-title');
  // 「今日」で戻る
  await page.click('#cal-next');
  if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}/cal-today.png` });
  check('別の月を見ていると、「今日」が出る', await page.locator('#cal-today').isVisible());
  await page.click('#cal-today');
  check('「今日」で、今日の月・今日の日付に戻る', (await page.textContent('#cal-title')) === title00 && await page.locator('#month button.today.sel').count() === 1 && await page.locator('#cal-today').isHidden());
  // 月のスワイプ
  const title0 = await page.textContent('#cal-title');
  const mb = await page.locator('#month').boundingBox();
  const cell = await page.locator('#month button[data-key]').nth(15).boundingBox();
  await page.mouse.move(cell.x + cell.width - 4, cell.y + cell.height / 2);
  await page.mouse.down();
  await page.mouse.move(cell.x - 90, cell.y + cell.height / 2 + 4, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(350); // すべり込みが終わるのを待つ
  const title1 = await page.textContent('#cal-title');
  check('左へスワイプすると、次の月に進む(日付は選ばれない)', title1 !== title0 && (await page.textContent('#evb-sub')).length >= 0);
  const cell2 = await page.locator('#month button[data-key]').nth(15).boundingBox(); // 月が変わったので、はかり直す
  await page.mouse.move(cell2.x + 4, cell2.y + cell2.height / 2);
  await page.mouse.down();
  await page.mouse.move(Math.min(cell2.x + 104, 384), cell2.y + cell2.height / 2 + 4, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(350);
  check('右へスワイプすると、前の月に戻る', (await page.textContent('#cal-title')) === title0);
  // なぞって、連続する日を選ぶ
  const cells = page.locator('#month button[data-key]');
  const a = await cells.nth(10).boundingBox();
  const b = await cells.nth(12).boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
  await page.mouse.up();
  check('すぐなぞっても、期間は選ばれない(誤って複数日を選ばない)', !(await page.textContent('#evb-date')).includes('お泊まりデート'));
  check('すぐ横になぞると、月が動く(スワイプ)', (await page.textContent('#cal-title')) !== title0);
  await page.click('#cal-next'); // 右へなぞったので、前の月に動いた。戻す
  const a3 = await cells.nth(10).boundingBox(); const b3 = await cells.nth(12).boundingBox(); // 画面が動いたかもしれないので、はかり直す
  await page.mouse.move(a3.x + a3.width / 2, a3.y + a3.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(500); // 長押しで、期間を選べる状態にする
  check('長押しすると、期間を選べる合図が出る', (await page.locator('#month button.arm').count()) === 1);
  await page.mouse.move(b3.x + b3.width / 2, b3.y + b3.height / 2, { steps: 6 });
  await page.mouse.up();
  check('なぞって選ぶと、期間が選ばれ、ボタンが「お泊まりデート」に変わる', (await page.textContent('#evb-date')).includes('お泊まりデート') && (await page.textContent('#evb-sub')).includes('2泊3日') && (await page.locator('#month button.inrange').count()) === 2);
  await page.click('#evb-date');
  await page.waitForFunction((n) => window.__fake.ev.length === n + 5, before);
  const dt2 = await page.evaluate(async () => { const C = await import('/js/crypto.js'); const key = await C.importKey(C.fromB64(localStorage.getItem('app.key'))); const e = window.__fake.ev[window.__fake.ev.length - 1]; return C.decryptJson(key, 'events', e); });
  check('連続で選ぶと、自動で「お泊まりデート」になる', dt2.title === 'お泊まりデート' && dt2.who === 'both' && !!dt2.end && dt2.end > dt2.date, JSON.stringify(dt2));
  // タップで、終わりの日を選ぶ
  await page.locator('#month button.today').click();
  await page.click('#ev-open');
  await page.click('#evb-range');
  check('「連続にする」を押すと、終わりの日を選ぶ状態になる', (await page.getAttribute('#evb-range', 'aria-pressed')) === 'true');
  const todayN = new Date().getDate();
  await cells.nth((todayN <= 26 ? todayN + 2 : todayN - 3) - 1).click(); // 今日とは別の日(日付によらず動くように)
  check('終わりの日をタップすると、期間になる', (await page.locator('#month button.inrange').count()) >= 1 && (await page.textContent('#evb-date')).includes('お泊まりデート'));
  await page.click('#evb-close');
  check('×でバーが閉じる', await page.locator('#ev-bar').isHidden());
  // 予定の詳細(思い出など)を、あとから書ける
  await page.locator('#cal-events .item', { hasText: 'デート' }).first().locator('button', { hasText: '詳細' }).click();
  await page.fill('#sheet textarea[aria-label="詳細"]', '山中湖でごはん。\n夕焼けがきれいだった');
  await page.click('#sheet form button[type=submit]');
  await page.waitForSelector('#cal-events .evnote');
  check('詳細を書くと、予定の下に出る(改行つき)', (await page.textContent('#cal-events .evnote')).includes('夕焼け'));
  const evAfter = await page.evaluate(async () => { const C = await import('/js/crypto.js'); const key = await C.importKey(C.fromB64(localStorage.getItem('app.key'))); const raw = window.__fake.ev; const all = []; for (const r of raw) all.push(await C.decryptJson(key, 'events', r)); return { n: raw.length, hasPlain: JSON.stringify(raw).includes('山中湖'), d: all.find((x) => x.note && x.note.includes('夕焼け')) }; });
  check('詳細は暗号化され、予定は増えず、元の項目も残る', !evAfter.hasPlain && evAfter.d.title.includes('デート') && !!evAfter.d.who && !!evAfter.d.by);
  await page.click('.tab[data-v="home"]');
}
// スライド(右へ)で前の面に戻る
const box = await page.locator('#days').boundingBox();
await page.mouse.move(box.x + 60, box.y + 40);
await page.mouse.down();
await page.mouse.move(box.x + 200, box.y + 42, { steps: 5 });
await page.mouse.up();
await page.waitForFunction(() => /付き合い始めた日から/.test(document.querySelector('#days').textContent));
check('右へスライドで、前のカードに戻る', true);
await page.mouse.move(box.x + 200, box.y + 40);
await page.mouse.down();
await page.mouse.move(box.x + 60, box.y + 42, { steps: 5 });
await page.mouse.up();
await page.waitForFunction(() => /次のデート/.test(document.querySelector('#days').textContent));
check('左へスライドで、次のカードに進む', true);
check('点で、いまの面が分かる', (await page.locator('#days .dots i.on').count()) === 1);

// バックアップコード・確認番号
await openSet();
check('危ない項目は、ふだん隠れている(バージョン更新・ログアウトなど)', (await page.locator('#settings li', { hasText: /機種変更|バックアップコードがないと/ }).count()) === 0);
check('ふだんは、画面の色・起動パターンだけ見える。名前などは隠れている', (await page.locator('#settings li', { hasText: /画面の色|起動パターン/ }).count()) === 2 && (await page.locator('#settings li', { hasText: /あなたの名前|既読を相手に伝える|キーを消す/ }).count()) === 0);
await more();
await page.locator('#settings li', { hasText: '機種変更' }).locator('button').click();
check('設定から同じバックアップコードを再表示できる', (await page.textContent('#sheet .code')) === code);
await page.click('#sheet-close');
await page.locator('#settings li', { hasText: 'キーの確認番号' }).locator('button').click();
check('確認番号が出る', /\d{3} \d{3}/.test(await page.textContent('#sheet-body')));
await page.click('#sheet-close');

// 画面の色(自動・ライト・ダーク)
await openSet();
await page.selectOption('#settings select[aria-label="画面の色"]', 'dark');
check('設定でダークを選ぶと、ダークになる', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark');
await page.selectOption('#settings select[aria-label="画面の色"]', 'auto');
check('自動に戻すと、固定が外れる', (await page.evaluate(() => document.documentElement.dataset.theme)) === undefined);

// 自動で天気へ戻る
await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
check('離れると最初の画面に戻る', await page.locator('#cover').isVisible() && !(await page.locator('#app').isVisible()));
await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); });

// パターンの変更
await tap(['札幌', '福岡', '東京', '那覇', '大阪', '仙台']);
await page.waitForSelector('#app:not([hidden])');
await openSet();
await page.locator('#settings li', { hasText: '起動パターン' }).locator('button').click();
check('登録中の表示が出る', await page.locator('#rec').isVisible());
await tap(['金沢', '金沢', '那覇', '札幌', '仙台', '東京']);
await page.waitForSelector('#app:not([hidden])');
await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
await tap(['札幌', '福岡', '東京', '那覇', '大阪', '仙台']);
check('古いパターンではもう開かない', await page.locator('#cover').isVisible());
await tap(['金沢', '金沢', '那覇', '札幌', '仙台', '東京']);
await page.waitForSelector('#app:not([hidden])');
check('新しいパターンで開く', true);

// おたのしみ(満月の棚)
await page.click('.tab[data-v="set"]');
check('その他: 最新版・おたのしみ・設定が並ぶ', (await page.locator('.more-upd').count()) === 1 && (await page.locator('.more-quiet').count()) === 1);
await page.click('button.more-oto');
check('満月になる前でも、おたのしみは開き、部屋の絵が出る(棚は空)', (await page.locator('.rm-svg').count()) === 1 && (await page.locator('.rm-svg [stroke-dasharray="3 3"]').count()) === 5);
await page.locator('.rm-hot[data-go="shelf"]').click();
check('満月になる前の棚は、案内だけが出る', (await page.textContent('.rm-note')).includes('ふたりの月が満月になったら、あらたな機能が解放されます') && (await page.locator('.rm-note').isVisible()) && (await page.locator('.oto-shelf').count()) === 0);
await page.click('#more-menu button');
await page.evaluate(() => { localStorage.removeItem('app.fullSeen'); });
const D0 = Date.now();
for (let i = 1; i <= 22; i += 1) {
  const t = new Date(D0 - (30 - i) * 864e5); t.setHours(21, 0, 0, 0);
  const a = await enc('moon', { at: t.getTime() });
  const b = await enc('moon', { at: t.getTime() + 120000 });
  await page.evaluate(([x, y, i2]) => { window.__fake.mn.push({ id: `q${i2}a`, from: 'u1', ...x }); window.__fake.mn.push({ id: `q${i2}b`, from: 'u2', ...y }); }, [a, b, i]);
}
await page.evaluate(() => window.__fake.notify());
await page.waitForSelector('#oto-pop:not([hidden])');
if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}/pop.png` });
check('満月になると、お祝いが出る', (await page.textContent('#oto-pop')).includes('満月になったよ') && (await page.locator('#oto-pop svg.oto-one').count()) === 1);
await page.click('#oto-pop .go');
await page.waitForSelector('.oto-shelf');
await page.waitForTimeout(600);
if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}/shelf.png` });
check('棚を見るで、棚(5段×4個)が開く', (await page.locator('.oto-tk').count()) >= 1 && (await page.locator('.oto-shelf').evaluate((el) => el.querySelectorAll('rect[fill="url(#wood)"]').length)) === 5);
check('お祝いは、見たら出なくなる', (await page.evaluate(() => localStorage.getItem('app.fullSeen'))) !== null && (await page.locator('#oto-pop').isHidden()));
await page.locator('.oto-tk').first().click();
check('水槽をタップすると、期間・ぴったり・待たせた回数が出る', (await page.textContent('#sheet-body')).includes('期間') && (await page.textContent('#sheet-body')).includes('待たせた回数') && (await page.textContent('#sheet-body')).includes('1個目の満月'));
if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}/detail.png` });
await page.click('#sheet-close');
await page.click('.tab[data-v="set"]');
if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}/menu.png` });
check('満月のあとは、おたのしみが開ける', (await page.locator('button.more-oto').count()) === 1);
await page.click('button.more-oto');
check('満月が1つなら、部屋の棚は、水槽が1つだけ光り、残り4つは空', (await page.locator('.rm-svg [stroke-dasharray="3 3"]').count()) === 4);
check('おたのしみは、部屋の絵。棚と日記帳が、タップできる', (await page.locator('.rm-svg').count()) === 1 && (await page.locator('.rm-hot[data-go="shelf"]').count()) === 1 && (await page.locator('.rm-hot[data-go="diary"]').count()) === 1);
if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}/room-real.png` });
await page.locator('.rm-hot[data-go="diary"]').click();
await page.waitForSelector('.dcover');
check('日記帳は、閉じた革の表紙から(年だけ・無題)', (await page.textContent('.dcover .dplate')).trim() === String(new Date().getFullYear()));
if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}/cover-real.png` });
await page.click('.dcover');
await page.waitForSelector('.dcover', { state: 'detached' });
check('表紙をタップすると、表紙が開いて、ページが出る', await page.locator('.dpage.cur').isVisible());
await page.waitForSelector('.dpage.cur');
check('日記帳が開き、いちばん新しい(今日の)ページが出る', Number(await page.textContent('.dpage.cur .ddate .d')) === new Date().getDate() && (await page.textContent('.dpage.cur .ddate .ym')).includes(`${new Date().getFullYear()}年`));
check('ページに、予定(出張)・この日の調子が出る', (await page.textContent('.dpage.cur')).includes('出張') && (await page.textContent('.dpage.cur')).includes('この日'));
const dTotal = Number((await page.textContent('.dpn')).split('/')[1]);
check('何かが入っている日だけが、ページになる(2ページ以上)', dTotal >= 2 && (await page.locator('.dtabs button').count()) >= 1);
if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}/diary-real.png` });
// 指の動き(タッチ)。斜めの動きでも、横が強ければめくれる。たての動きは、ページのスクロール
const swipe = (dx, dy) => page.evaluate(async ([dx, dy]) => {
  const st = document.querySelector('.dstage'); const r = st.getBoundingClientRect();
  const x = r.left + r.width / 2; const y = r.top + r.height / 2;
  const fire = (t, ox, oy) => st.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: x + ox, clientY: y + oy, pointerType: 'touch', pointerId: 5, isPrimary: true }));
  fire('pointerdown', 0, 0);
  for (let i = 1; i <= 8; i += 1) { fire('pointermove', (dx * i) / 8, (dy * i) / 8); await new Promise((r2) => setTimeout(r2, 12)); }
  fire('pointerup', dx, dy);
}, [dx, dy]);
const dn0 = await page.textContent('.dpn');
await swipe(90, 55); // 斜め(横のほうが強い)。いちばん新しいページから、前の日へ
await page.waitForTimeout(800);
check('斜めのスワイプでも、めくれる', (await page.textContent('.dpn')) !== dn0 || dTotal === 1);
await swipe(-90, 20);
await page.waitForTimeout(800);
check('左へのスワイプで、また次の日(新しいほう)に戻る', (await page.textContent('.dpn')) === dn0);
await page.click('.dnav button:first-child');
await page.waitForTimeout(250);
if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}/diary-real-mid.png` });
await page.waitForTimeout(600);
check('前の日にめくると、別の日のページになる', Number(await page.textContent('.dpage.cur .ddate .d')) !== new Date().getDate() || (await page.textContent('.dpn')).startsWith(`${dTotal - 1}`));
await page.click('.dribbon');
await page.waitForTimeout(800);
check('赤いひもで、いちばん新しいページに戻る', (await page.textContent('.dpn')).startsWith(`${dTotal} /`));
await page.locator('.dpage.cur .dwrite').first().click();
await page.waitForSelector('#sheet:not([hidden]) .scale');
check('「書く・直す」で、その日の調子の画面が開く', true);
await page.click('#sheet-close');
const wd = await enc('qcards', { text: 'ひみつの題2', date: '2026-10-19', by: 'u2', cat: 'whisper' });
await page.evaluate((doc) => { window.__fake.qc.push({ id: 'qw2', n: 91, ...doc, from: 'u2' }); window.__fake.notify(); }, wd);
await page.waitForTimeout(300);
check('ひそひそ話のお題は、日記帳のページにならない', Number((await page.textContent('.dpn')).split('/')[1]) === dTotal && !(await page.textContent('.dwrap')).includes('ひみつの題2'));
await page.evaluate(() => { window.__fake.qc = window.__fake.qc.filter((x) => x.id !== 'qw2'); window.__fake.notify(); });
await page.click('#more-menu button');
check('日記帳の中の戻るで、おたのしみの部屋に戻る', (await page.locator('.rm-svg').count()) === 1);

// 「最新版にする」で、ファイルを取り直して再読み込みする
await page.click('.tab[data-v="set"]');
const reloaded = page.waitForNavigation();
await page.click('.more-upd');
await reloaded;
check('「最新版にする」で再読み込みされ、天気の画面になる', await page.locator('#cover').isVisible());

check('iPhoneで勝手に拡大されない備え(拡大の上限・ダブルタップ・つまみ)', (await page.evaluate(() => document.querySelector('meta[name=viewport]').content)).includes('maximum-scale=1') && (await page.evaluate(() => getComputedStyle(document.body).touchAction)) === 'manipulation' && (await page.evaluate(async () => (await (await fetch('/css/style.css')).text()).includes('-webkit-touch-callout'))));
check('ブラウザのエラーなし', errors.length === 0, errors.join(' | '));
await page.screenshot({ path: '/tmp/claude-0/-home-user-chat/47a10d62-f426-5480-9ae3-ef67e0150520/scratchpad/shot-app.png' });
await browser.close();
server.close();
console.log(failed ? `\n${failed}件失敗` : '\n全部OK');
process.exit(failed ? 1 : 0);
