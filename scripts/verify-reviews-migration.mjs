import { createClient } from "@supabase/supabase-js";
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY_PROD ??
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const key = serviceKey ?? anonKey;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL and a Supabase key.");
  process.exit(2);
}

const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkTable(name, select) {
  const { error } = await supabase.from(name).select(select).limit(1);
  return {
    group: serviceKey ? "service" : "fallback",
    name,
    ok: !error,
    code: error?.code,
    message: error?.message,
  };
}

const checks = [];

if (serviceKey) {
  checks.push(
    await checkTable("tool_reviews", "id"),
    await checkTable("review_rate_limits", "id"),
    await checkTable("public_tool_reviews", "id, link_id, rating, comment, approved, created_at, updated_at"),
    await checkTable("tool_review_stats", "link_id")
  );
} else {
  console.warn("No SUPABASE_SERVICE_ROLE_KEY[_PROD] set; skipping service-role table/view checks.");
}

if (anonKey) {
  const anon = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  async function checkAnon(name, select, shouldPass) {
    const { error } = await anon.from(name).select(select).limit(1);
    return {
      group: "anon",
      name: `anon:${name}`,
      ok: shouldPass ? !error : Boolean(error),
      code: error?.code,
      message: error?.message,
    };
  }

  checks.push(
    await checkAnon("public_tool_reviews", "id, link_id, rating, comment, approved, created_at, updated_at", true),
    await checkAnon("tool_review_stats", "link_id", true),
    await checkAnon("tool_reviews", "ip", false),
    await checkAnon("public_tool_reviews", "ip", false),
    await checkAnon("review_rate_limits", "ip", false)
  );
} else {
  console.warn("NEXT_PUBLIC_SUPABASE_ANON_KEY not set; skipping anon RLS/view access checks.");
}

let failed = false;
for (const check of checks) {
  if (check.ok) {
    console.log(`${check.name}: ok`);
  } else {
    failed = true;
    console.log(`${check.name}: FAIL ${check.code ?? "unknown"} ${check.message ?? ""}`.trim());
  }
}

if (failed) {
  console.error("Reviews migration is not fully applied.");
  if (checks.some((check) => check.group === "service" && check.code === "42501")) {
    console.error(
      "Service-role access is missing. Apply the current scripts/migration-reviews.sql with DATABASE_URL or SUPABASE_DB_URL, then rerun this verifier."
    );
  }
  process.exit(1);
}

console.log("Reviews migration verified.");
