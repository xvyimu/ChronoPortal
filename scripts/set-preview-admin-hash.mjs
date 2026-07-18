#!/usr/bin/env node
/**
 * One-shot: hash ADMIN_PASSWORD from .env.local and set Vercel Preview ADMIN_PASSWORD_HASH.
 * Does not print the password or full hash.
 */
import { readFileSync } from "node:fs";
import { scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scryptAsync = promisify(scrypt);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(path) {
  const m = {};
  for (const line of readFileSync(path, "utf8").split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    m[t.slice(0, i).trim()] = v;
  }
  return m;
}

const env = loadEnv(join(root, ".env.local"));
const password = env.ADMIN_PASSWORD;
if (!password) {
  console.error("ADMIN_PASSWORD missing in .env.local");
  process.exit(1);
}

const salt = randomBytes(16);
const derived = await scryptAsync(password, salt, 64, { N: 16384, r: 8, p: 1 });
const hash = [
  "scrypt",
  "16384",
  "8",
  "1",
  salt.toString("base64url"),
  derived.toString("base64url"),
].join("$");

console.log("ADMIN_PASSWORD_HASH generated, length=", hash.length);

const result = spawnSync(
  "vercel",
  [
    "env",
    "add",
    "ADMIN_PASSWORD_HASH",
    "preview",
    "--scope",
    "aijiai520",
    "--yes",
    "--force",
    "--sensitive",
    "--value",
    hash,
  ],
  { encoding: "utf8", shell: true, cwd: root }
);

const out = `${result.stdout || ""}\n${result.stderr || ""}`;
for (const line of out.split(/\n/)) {
  if (/Overrode|Error|error|✓|Saving|ADMIN_PASSWORD/.test(line) && !/scrypt\$/.test(line)) {
    console.log(line);
  }
}
process.exit(result.status ?? 1);
