// 起動できないほどの書き間違い(同じ名前の二重宣言・かっこの閉じ忘れなど)を、ページを開く前に見つける。
// モジュールとして読めるかだけを見る(動かしはしない)。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const files = [...readdirSync('docs/js').filter((f) => f.endsWith('.js')).map((f) => `docs/js/${f}`), 'docs/sw.js'];

for (const f of files) {
  test(`${f} は、モジュールとして読める`, () => {
    const r = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: readFileSync(f), encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr.split('\n').slice(0, 4).join('\n'));
  });
}
