#!/usr/bin/env node
// Locks and unlocks the review kit inside index.html.
//
//   KIT_PASSWORD='…' node tools/kit.mjs unpack   writes kit/kit.css, kit/kit.html and kit/kit.js
//   KIT_PASSWORD='…' node tools/kit.mjs pack     locks kit/* back into index.html
//
// kit/ is in .gitignore. Never commit the unlocked files: this repo is public.
// Set KIT_SRC to use a folder other than kit/.
//
// The page, the shared review log and the saved GitHub token are all locked with the same key
// (PBKDF2-SHA-256 from the team password, then AES-256-GCM). pack keeps the existing salt so
// saved logins and the shared log keep working. It refuses a password that doesn't match the
// current page, because changing the password also means re-locking the shared log.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { subtle } = webcrypto;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagePath = path.join(root, 'index.html');
const srcDir = path.resolve(root, process.env.KIT_SRC || 'kit');
const PAYLOAD_RE = /(<script type="application\/json" id="kit-payload">)([\s\S]*?)(<\/script>)/;
const ITERATIONS = 600000;
const FILES = ['kit.css', 'kit.html', 'kit.js'];

const b64 = (u8) => Buffer.from(u8).toString('base64');
const unb64 = (s) => new Uint8Array(Buffer.from(s, 'base64'));

function password() {
  const p = process.env.KIT_PASSWORD;
  if (!p) throw new Error('Set KIT_PASSWORD to the team password.');
  return p;
}

async function deriveKey(salt, iterations) {
  const base = await subtle.importKey('raw', new TextEncoder().encode(password()), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function decrypt(key, env) {
  const plain = await subtle.decrypt({ name: 'AES-GCM', iv: unb64(env.iv) }, key, unb64(env.ct));
  return JSON.parse(new TextDecoder().decode(plain));
}

async function readPage() {
  const html = await readFile(pagePath, 'utf8');
  const match = html.match(PAYLOAD_RE);
  if (!match) throw new Error('index.html has no kit-payload block.');
  return { html, payload: JSON.parse(match[2]) };
}

async function unpack() {
  const { payload } = await readPage();
  if (!payload.ct) throw new Error('index.html has no locked kit yet.');
  const key = await deriveKey(unb64(payload.kdf.salt), payload.kdf.iter);
  let kit;
  try { kit = await decrypt(key, payload); } catch { throw new Error('Wrong password for this index.html.'); }
  await mkdir(srcDir, { recursive: true });
  await Promise.all(FILES.map((file, i) => writeFile(path.join(srcDir, file), [kit.css, kit.html, kit.js][i])));
  console.log(`Unlocked into ${path.relative(root, srcDir) || '.'}/ (${FILES.join(', ')}).`);
}

async function pack() {
  const { html, payload } = await readPage();
  const [css, body, js] = await Promise.all(FILES.map((file) => readFile(path.join(srcDir, file), 'utf8')));
  const kdf = payload.kdf && payload.kdf.salt
    ? payload.kdf
    : { name: 'PBKDF2', hash: 'SHA-256', iter: ITERATIONS, salt: b64(webcrypto.getRandomValues(new Uint8Array(16))) };
  const key = await deriveKey(unb64(kdf.salt), kdf.iter);
  if (payload.ct) {
    try { await decrypt(key, payload); } catch {
      throw new Error('KIT_PASSWORD does not match the current page. Changing the password also needs the shared log re-locked.');
    }
  }
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify({ css, html: body, js }))));
  const next = JSON.stringify({ v: 1, kdf, iv: b64(iv), ct: b64(ct) });
  await writeFile(pagePath, html.replace(PAYLOAD_RE, (_, open, __, close) => open + next + close));
  console.log(`Locked the kit into index.html (${Math.round(next.length / 1024)} KB).`);
}

const command = process.argv[2];
const run = command === 'pack' ? pack : command === 'unpack' ? unpack : null;
if (!run) {
  console.error('Usage: KIT_PASSWORD=… node tools/kit.mjs pack|unpack');
  process.exit(1);
}
run().catch((e) => { console.error(e.message); process.exit(1); });
