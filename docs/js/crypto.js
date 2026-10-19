// 共有キーで内容を暗号化する。サーバーには暗号文しか渡さない。
// 方式: 256bitのランダムなキーを1人が作り、コードでもう1人へ渡す。AES-GCMで暗号化する。
const enc = new TextEncoder();
const dec = new TextDecoder();
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const FORMAT_VERSION = 1;

export function toB64(bytes) {
  let s = '';
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s);
}

export function fromB64(str) {
  const s = atob(str);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function newSecret() {
  return crypto.getRandomValues(new Uint8Array(32));
}

function checksum(bytes) {
  let acc = 7;
  bytes.forEach((b) => { acc = (acc * 31 + b) & 0x3ff; });
  return acc;
}

// キー -> バックアップコード(読み間違いを検出できるチェック付き)
export function toCode(bytes) {
  const all = new Uint8Array(bytes.length + 2);
  all.set(bytes);
  const c = checksum(bytes);
  all[bytes.length] = c >> 8;
  all[bytes.length + 1] = c & 0xff;
  let bits = 0;
  let value = 0;
  let out = '';
  all.forEach((b) => {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  });
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out.match(/.{1,6}/g).join('-');
}

// バックアップコード -> キー。入力ミスなら例外を投げる。
export function fromCode(text) {
  const clean = text.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  if (bytes.length < 34) throw new Error('コードが短すぎます');
  const key = Uint8Array.from(bytes.slice(0, 32));
  const c = (bytes[32] << 8) | bytes[33];
  if (c !== checksum(key)) throw new Error('コードが正しくありません。もう一度確認してください');
  return key;
}

export function importKey(bytes) {
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

// 画面に出して見比べるための確認番号(キーそのものは分からない)
export async function fingerprint(bytes) {
  const buf = await crypto.subtle.digest('SHA-256', new Uint8Array([...enc.encode('fp-v1'), ...bytes]));
  const n = new DataView(buf).getUint32(0) % 1000000;
  const s = String(n).padStart(6, '0');
  return `${s.slice(0, 3)} ${s.slice(3)}`;
}

// kind(messages/events など)を認証データに含めて、別の種類への差し替えを防ぐ
export async function encryptJson(key, kind, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: enc.encode(kind) },
    key,
    enc.encode(JSON.stringify(obj)),
  );
  return { v: FORMAT_VERSION, iv: toB64(iv), ct: toB64(new Uint8Array(ct)) };
}

export async function decryptJson(key, kind, doc) {
  if (doc.v !== FORMAT_VERSION) throw new Error('未対応の形式です');
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(doc.iv), additionalData: enc.encode(kind) },
    key,
    fromB64(doc.ct),
  );
  return JSON.parse(dec.decode(pt));
}

// 起動パターン(都市の並び)の保存用ハッシュ
export async function hashSequence(salt, names) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(`${salt}|${names.join(',')}`));
  return toB64(new Uint8Array(buf));
}
