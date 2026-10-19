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
const data = { msg: [], ev: [], pr: [], sh: [] };
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
export const saveEvent = async (id, payload) => { data.ev.push({ id: 'e' + n++, ...payload }); notify(); };
export const removeEvent = async (id) => { data.ev = data.ev.filter((e) => e.id !== id); notify(); };
export const watchProfiles = watch('pr');
export const saveProfile = async (uid, payload) => { data.pr = data.pr.filter((p) => p.id !== uid); data.pr.push({ id: uid, ...payload }); notify(); };
export const watchShared = watch('sh');
export const saveShared = async (payload) => { data.sh = [{ id: 'main', ...payload }]; notify(); };
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

let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${ok ? '' : extra}`); if (!ok) failed++; };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }).catch(async () => chromium.launch({ args: ['--no-sandbox'] }));
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await ctx.route('https://api.open-meteo.com/**', (r) => r.fulfill({ json: wx }));
await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await ctx.route(`${base}/js/store.js`, (r) => r.fulfill({ body: fakeStore, contentType: 'text/javascript' }));

const tap = async (names) => { for (const n of names) await page.locator('#cities button', { hasText: n }).click(); };

// --- 設定なし: パターンで開くと「設定がまだ」
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

// チャット
await page.click('.tab[data-v="chat"]');
await page.fill('#msg', '土曜はパスタがいいな <b>テスト</b>');
await page.click('#chat-form .send');
await page.waitForSelector('.row.mine .bub');
check('メッセージが表示される(HTMLは解釈されない)', (await page.textContent('.row.mine .bub')) === '土曜はパスタがいいな <b>テスト</b>' && (await page.locator('.row.mine .bub b').count()) === 0);
const stored = await page.evaluate(() => window.__fake.msg[0]);
check('サーバーに渡るのは暗号文だけ', !JSON.stringify(stored).includes('パスタ') && stored.v === 1 && stored.ct.length > 10);

// 予定
await page.click('.tab[data-v="cal"]');
await page.fill('#ev-title', '映画');
await page.fill('#ev-time', '18:30');
await page.check('input[name="who"][value="both"]');
await page.click('#ev-form button[type=submit]');
await page.waitForSelector('#cal-events .item');
check('予定が追加される', (await page.textContent('#cal-events .item')).includes('映画'));
check('予定は暗号化されて保存', !JSON.stringify(await page.evaluate(() => window.__fake.ev[0])).includes('映画'));
await page.click('#cal-events .x');
await page.click('#cal-events .x');
await page.waitForFunction(() => document.querySelectorAll('#cal-events .item').length === 0);
check('予定を削除できる(2回タップ)', true);

// ホームと設定
await page.fill('#ev-title', '歯医者');
await page.click('#ev-form button[type=submit]');
await page.click('.tab[data-v="home"]');
check('ホームに予定が出る', (await page.textContent('#home-events')).includes('歯医者'));
await page.click('.tab[data-v="set"]');
await page.fill('#settings input[type=date]', '2025-06-20');
await page.dispatchEvent('#settings input[type=date]', 'change');
await page.click('.tab[data-v="home"]');
await page.waitForFunction(() => /\d+日/.test(document.querySelector('#days b')?.textContent || ''));
check('開始日から日数を数える', true);

// バックアップコード・確認番号
await page.click('.tab[data-v="set"]');
await page.locator('#settings li', { hasText: '機種変更' }).locator('button').click();
check('設定から同じバックアップコードを再表示できる', (await page.textContent('#sheet .code')) === code);
await page.click('#sheet-close');
await page.locator('#settings li', { hasText: 'キーの確認番号' }).locator('button').click();
check('確認番号が出る', /\d{3} \d{3}/.test(await page.textContent('#sheet-body')));
await page.click('#sheet-close');

// 自動で天気へ戻る
await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
check('離れると最初の画面に戻る', await page.locator('#cover').isVisible() && !(await page.locator('#app').isVisible()));
await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); });

// パターンの変更
await tap(['札幌', '福岡', '東京', '那覇', '大阪', '仙台']);
await page.waitForSelector('#app:not([hidden])');
await page.click('.tab[data-v="set"]');
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

check('ブラウザのエラーなし', errors.length === 0, errors.join(' | '));
await page.screenshot({ path: '/tmp/claude-0/-home-user-chat/47a10d62-f426-5480-9ae3-ef67e0150520/scratchpad/shot-app.png' });
await browser.close();
server.close();
console.log(failed ? `\n${failed}件失敗` : '\n全部OK');
process.exit(failed ? 1 : 0);
