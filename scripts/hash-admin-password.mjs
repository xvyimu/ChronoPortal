#!/usr/bin/env node
/**
 * 生成 ADMIN_PASSWORD_HASH（scrypt）
 *
 * 用法：
 *   node scripts/hash-admin-password.mjs
 *   node scripts/hash-admin-password.mjs "your-password"
 *   echo secret | node scripts/hash-admin-password.mjs --stdin
 *
 * 输出仅一行哈希，可写入 Vercel/本地 env：
 *   ADMIN_PASSWORD_HASH=scrypt$16384$8$1$...
 *
 * 配置哈希后可删除 ADMIN_PASSWORD 明文。
 */

import { createInterface } from "node:readline";
import { scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEYLEN = 64;
const N = 16384;
const r = 8;
const p = 1;

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, KEYLEN, { N, r, p });
  return [
    "scrypt",
    String(N),
    String(r),
    String(p),
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

async function readPassword() {
  const args = process.argv.slice(2);
  if (args.includes("--stdin") || args.includes("-")) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
  }
  if (args[0] && !args[0].startsWith("-")) {
    return args[0];
  }
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const password = await new Promise((resolve) => {
    rl.question("Admin password: ", (ans) => {
      rl.close();
      resolve(ans);
    });
  });
  return password;
}

const password = await readPassword();
if (!password) {
  console.error("empty password");
  process.exit(1);
}
const hash = await hashPassword(password);
process.stdout.write(`${hash}\n`);
