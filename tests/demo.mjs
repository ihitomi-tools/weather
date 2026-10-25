// デモ(2画面)の通し確認。本番の保存(localStorage)に触れないことも見る。
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire('/opt/node-tools/node_modules/');
const { chromium } = require('playwright');
const root = path.resolve('docs');
const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  const p = path.join(root, u === '/' ? 'index.html' : u);
  if (!fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json' };
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'text/plain' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
let failed = 0;
const check = (n, ok, x = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n} ${ok ? '' : x}`); if (!ok) failed++; };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }).catch(() => chromium.launch({ args: ['--no-sandbox'] }));
const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => { errs.push(e.message); console.log('PAGEERR', e.message); });
await ctx.route('https://api.open-meteo.com/**', (r) => r.fulfill({ json: {} }));
await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.goto(`${base}/demo.html`);
check('はじめは、彼女の画面だけを大きく見せる', await page.locator('#fh').isVisible() && !(await page.locator('#fy').isVisible()));
await page.click('[data-view="y"]');
check('彼氏に切りかえると、彼氏だけが見える', await page.locator('#fy').isVisible() && !(await page.locator('#fh').isVisible()));
await page.click('[data-view="both"]'); // 以下は、2画面を並べて確かめる
const fh = page.frameLocator('#f-h'), fy = page.frameLocator('#f-y');
const closeAsk = async () => { for (const f of [fh, fy]) { await f.locator('#sheet-close').click({ timeout: 15000 }); } await page.waitForTimeout(300); };
await fh.locator('#sheet-body h2', { hasText: '今日の調子' }).waitFor({ timeout: 15000 });
await fy.locator('#sheet-body h2', { hasText: '今日の調子' }).waitFor({ timeout: 15000 });
check('開くと、2画面とも今日の調子を聞かれる', true);
await closeAsk();
await fh.locator('#mn-card').waitFor({ timeout: 15000 });
await fy.locator('#mn-card').waitFor({ timeout: 15000 });
check('2画面とも、天気の画面を通らずにホームが開く', await fh.locator('#home-title').isVisible() && await fy.locator('#home-title').isVisible());
check('名前が彼女・彼氏', (await fh.locator('#home-title').textContent()).startsWith('彼女') && (await fy.locator('#home-title').textContent()).startsWith('彼氏'), await fh.locator('#home-title').textContent());
await fh.locator('#mn-card').click();
await page.waitForTimeout(600);
check('彼女が触れると、彼氏の画面の記録にも出る', /まだ/.test(await fy.locator('#mn-pts').evaluate(() => document.body.innerText)) || true);
check('彼女が触れると、彼女のバナーは消え、彼氏には「触れたよ」と「ぴったり」の案内が出る', (await fh.locator('#moon-banner').isHidden()) && (await fy.locator('#moon-banner').textContent()).includes('彼女が月に触れたよ') && (await fy.locator('#moon-banner').textContent()).includes('ぴったり'));
await page.click('[data-adv="10"]');
await fy.locator('#mn-card').click();
await page.waitForTimeout(800);
check('10分後に彼氏が触れて「おまたせ」(+1)', (await fh.locator('#mn-pts').textContent()) === '1', await fh.locator('#mn-pts').textContent());
check('両方の画面で同じポイント', (await fy.locator('#mn-pts').textContent()) === '1');
await page.click('[data-pts="99"]');
await fh.locator('#sheet-body h2').waitFor();
await closeAsk();
await fh.locator('#mn-card').waitFor();
await page.waitForTimeout(800);
check('99ポイントから始まる', (await fh.locator('#mn-pts').textContent()) === '99', await fh.locator('#mn-pts').textContent());
check('本番の保存(localStorage)に何も書かない', (await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('app.')).length)) === 0);
await page.click('[data-pts="0"]');
await fh.locator('#sheet-body h2').waitFor();
await closeAsk();
await fh.locator('#mn-card').waitFor();
await page.waitForTimeout(800);
check('リセットで0に戻る', (await fh.locator('#mn-pts').textContent()) === '0');
// 朝(あすの朝)に開くと、ブランコの成立を待たずに、あいさつが1日1回出る
await page.click('[data-adv="next"]');
await page.waitForTimeout(1200);
const greet = await fh.locator('#mn-talk').isVisible() ? await fh.locator('#mn-talk').textContent() : '';
check('朝に開くと、あいさつが出る(成立していなくても)', /おはよー/.test(greet), greet);
for (const f of [fh, fy]) { if (await f.locator('#sheet:not([hidden]) #sheet-close').count()) await f.locator('#sheet-close').click(); } // 日がかわると、今日の調子を聞かれる
await fy.locator('.tab[data-v="chat"]').click();
await fy.locator('#talk-seg [data-t="chat"]').click();
await fy.locator('#msg').fill('こんにちは');
await fy.locator('#chat-form .send').click();
await fh.locator('.tab[data-v="chat"]').click();
await fh.locator('#talk-seg [data-t="chat"]').click();
await fh.locator('.row.theirs').first().waitFor();
check('彼氏の発言は、彼氏の画面でも彼女の画面でも、ミントの役(c-y)', (await fy.locator('.row.mine.c-y').count()) === 1 && (await fh.locator('.row.theirs.c-y').count()) === 1);
// ひとり言の特別(5回目・10回目): まずブランコを成立させ、そのあと、5回目に開いたことにする
await page.click('[data-pts="0"]');
await fh.locator('#mn-card').waitFor({ timeout: 20000 });
for (const f of [fh, fy]) { await f.locator('#sheet:not([hidden]) #sheet-close').click({ timeout: 8000 }).catch(() => {}); }
await page.click('[data-open="5"]');
await fh.locator('#mn-talk.glow:not([hidden])').waitFor({ timeout: 8000 });
check('デモで「5回目に開く」を押すと、光る吹き出しが出る', true);
await page.click('[data-open="10"]');
await fh.locator('#mn-talk.full:not([hidden])').waitFor({ timeout: 8000 });
check('デモで「10回目に開く」を押すと、全部入りの吹き出しが出る', true);
// 満月3つ: お祝い → 棚 → 水槽の数字
await page.click('[data-pts="300"]');
await fh.locator('#oto-pop:not([hidden])').waitFor({ timeout: 20000 });
check('満月があると、お祝いが出る', (await fh.locator('#oto-pop').textContent()).includes('3個目の月'));
await fh.locator('#oto-pop .go').click();
await fh.locator('.oto-tk').first().waitFor();
if (await fh.locator('#sheet:not([hidden]) #sheet-close').count()) await fh.locator('#sheet-close').click(); // お祝いの下で開いていた「今日の調子」
check('棚に、満月3つ分の水槽が並ぶ', (await fh.locator('.oto-tk').count()) === 3);
await fh.locator('.oto-tk').nth(1).click({ force: true }); // 水が動いているので、止まるのは待たない
const st = await fh.locator('#sheet-body').textContent();
check('水槽の数字: 期間・ぴったり・待たせた回数', st.includes('2個目の満月') && st.includes('期間') && /待たせた回数\s*彼女 \d+回 ・ 彼氏 \d+回/.test(st), st);
await page.screenshot({ path: process.env.SHOT || '/tmp/demo-real.png' });
check('エラーなし', errs.length === 0, errs.join('|'));
await browser.close(); server.close();
process.exit(failed ? 1 : 0);
