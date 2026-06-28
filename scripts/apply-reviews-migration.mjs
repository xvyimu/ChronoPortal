import { spawnSync } from "node:child_process";
import fs from "node:fs";

function loadEnv(path) {
  if (!fs.existsSync(path)) return;

  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || match[1].startsWith("#")) continue;
    process.env[match[1]] ??= match[2].replace(/^['"]|['"]$/g, "");
  }
}

loadEnv(".env.local");
loadEnv(".env");

const dbUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
const migrationFile = "scripts/migration-reviews.sql";
const dryRun = process.argv.includes("--dry-run");

function redactArg(arg, index, args) {
  if (args[index - 1] === "--db-url") return "[REDACTED_DB_URL]";
  if (/^postgres(?:ql)?:\/\//i.test(arg)) return "[REDACTED_DB_URL]";
  return arg;
}

function run(command, args, options = {}) {
  if (dryRun) {
    console.log(`[dry-run] ${command} ${args.map(redactArg).join(" ")}`);
    return { status: 0 };
  }

  return spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });
}

function succeeded(result) {
  return result.status === 0;
}

function commandExists(command) {
  const checker = process.platform === "win32" ? "where" : "command";
  const args = process.platform === "win32" ? [command] : ["-v", command];
  return spawnSync(checker, args, {
    stdio: "ignore",
    shell: process.platform !== "win32",
  }).status === 0;
}

if (dbUrl) {
  if (dryRun || commandExists("supabase")) {
    const supabaseResult = run("supabase", ["db", "query", "--db-url", dbUrl, "--file", migrationFile]);
    if (succeeded(supabaseResult)) process.exit(0);
    console.warn("supabase db query failed; trying psql fallback.");
  }

  if (dryRun || commandExists("psql")) {
    const psqlResult = run("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", migrationFile]);
    process.exit(psqlResult.status ?? 1);
  }

  console.error("Neither supabase CLI nor psql is available to apply the migration.");
  process.exit(2);
}

if (dryRun || commandExists("supabase")) {
  const linkedResult = run("supabase", ["db", "query", "--linked", "--file", migrationFile]);
  if (succeeded(linkedResult)) process.exit(0);
  console.error("supabase db query --linked failed. Login/link the project or provide DATABASE_URL/SUPABASE_DB_URL.");
  process.exit(linkedResult.status ?? 1);
}

console.error("Missing DATABASE_URL or SUPABASE_DB_URL, and supabase CLI is not available for --linked fallback.");
console.error("Refusing to run a database write without an explicit Postgres connection string or linked Supabase project.");
process.exit(2);
