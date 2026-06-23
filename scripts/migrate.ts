/**
 * Database Migration Runner
 * Digital Heroes — Phase 2/4 Setup
 *
 * Applies SQL migrations in order against the Supabase PostgreSQL database.
 * Tries multiple connection endpoints with correct username formats.
 *
 * Usage: npm run migrate
 */

import * as fs from "fs";
import * as path from "path";

import { Client } from "pg";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

const info = (m: string): void => console.log(`  ${CYAN}ℹ${RESET}  ${m}`);
const ok = (m: string): void => console.log(`  ${GREEN}✅${RESET} ${m}`);
const warn = (m: string): void => console.warn(`  ${YELLOW}⚠️${RESET}  ${m}`);
const fail = (m: string): void => console.error(`  ${RED}❌${RESET} ${m}`);

function loadEnv(): void {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

const MIGRATIONS = [
  "supabase/migrations/001_schema.sql",
  "supabase/migrations/002_rls.sql",
  "supabase/migrations/003_seed.sql",
];

async function tryConnect(
  host: string,
  port: number,
  user: string,
  password: string,
  database: string,
  desc: string
): Promise<Client | null> {
  info(`Trying ${desc} — ${user}@${host}:${port}`);
  const c = new Client({
    host,
    port,
    database,
    user,
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
    statement_timeout: 120000,
  });
  try {
    await c.connect();
    ok(`Connected via: ${desc}`);
    return c;
  } catch (e) {
    warn(`Failed: ${e instanceof Error ? e.message : String(e)}`);
    try {
      await c.end();
    } catch {}
    return null;
  }
}

async function main(): Promise<void> {
  console.log(
    `\n${BOLD}${CYAN}══════════════════════════════════════════════${RESET}`
  );
  console.log(
    `${BOLD}${CYAN}  Digital Heroes — Database Migration Runner  ${RESET}`
  );
  console.log(
    `${BOLD}${CYAN}══════════════════════════════════════════════${RESET}\n`
  );

  loadEnv();

  const directHost = process.env.SUPABASE_DB_HOST ?? "";
  const dbPort = parseInt(process.env.SUPABASE_DB_PORT ?? "5432", 10);
  const database = process.env.SUPABASE_DB_NAME ?? "postgres";
  const password = process.env.SUPABASE_DB_PASSWORD ?? "";
  // Project ref = directHost with "db." prefix and ".supabase.co" suffix removed
  const ref = directHost.replace(/^db\./, "").replace(/\.supabase\.co$/, "");

  if (!password || !ref) {
    fail("Missing SUPABASE_DB_HOST or SUPABASE_DB_PASSWORD in .env.local");
    process.exit(1);
  }

  const pgUser = "postgres"; // direct connection username
  const poolerUser = `postgres.${ref}`; // pooler requires tenant identifier

  // Supabase session pooler regions — try common ones
  const poolerRegions = [
    "ap-south-1",    // India (most likely for this project)
    "ap-southeast-1", // Singapore
    "us-east-1",     // US East
    "eu-west-1",     // EU West
    "ap-northeast-1", // Japan
  ];

  const attempts: Array<() => Promise<Client | null>> = [
    // 1. Direct connection (standard port 5432)
    () =>
      tryConnect(directHost, dbPort, pgUser, password, database, "Direct connection"),

    // 2. Supabase session pooler — each region with tenant username
    ...poolerRegions.map(
      (region) => () =>
        tryConnect(
          `aws-0-${region}.pooler.supabase.com`,
          5432,
          poolerUser,
          password,
          database,
          `Session pooler (${region})`
        )
    ),

    // 3. Transaction pooler port 6543 (fallback — DDL may not work but worth trying)
    () =>
      tryConnect(
        `aws-0-ap-south-1.pooler.supabase.com`,
        6543,
        poolerUser,
        password,
        database,
        "Transaction pooler (ap-south-1, port 6543)"
      ),
  ];

  let client: Client | null = null;
  for (const attempt of attempts) {
    client = await attempt();
    if (client) break;
  }

  if (!client) {
    fail("All connection attempts exhausted.");
    console.log(`
${YELLOW}${BOLD}━━━ Manual Migration (Supabase SQL Editor) ━━━${RESET}

  Direct DB access is blocked from this network.
  Apply migrations manually in ~3 minutes:

  ${BOLD}Step 1:${RESET} Open the SQL Editor:
  ${CYAN}https://supabase.com/dashboard/project/${ref}/sql/new${RESET}

  ${BOLD}Step 2:${RESET} Run each file in order (paste → click Run):
    • Copy contents of: ${BOLD}supabase/migrations/001_schema.sql${RESET}  → Run
    • Copy contents of: ${BOLD}supabase/migrations/002_rls.sql${RESET}     → Run
    • Copy contents of: ${BOLD}supabase/migrations/003_seed.sql${RESET}    → Run

  ${BOLD}Step 3:${RESET} Run the admin seed:
    ${BOLD}npm run seed:admin${RESET}
`);
    process.exit(1);
  }

  // ── Apply migrations ──────────────────────────────────────────────────────
  let errors = 0;

  for (const f of MIGRATIONS) {
    const fp = path.join(process.cwd(), f);
    console.log(`\n${BOLD}── ${path.basename(f)}${RESET}`);

    if (!fs.existsSync(fp)) {
      fail(`Not found: ${fp}`);
      errors++;
      continue;
    }

    const sql = fs.readFileSync(fp, "utf-8");
    info(`${(sql.length / 1024).toFixed(1)} KB`);

    try {
      await client.query(sql);
      ok(`Applied: ${path.basename(f)}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already exists") || msg.includes("duplicate key")) {
        warn(`Idempotent (already applied): ${msg.slice(0, 120)}`);
      } else {
        fail(`Error: ${msg}`);
        errors++;
        break;
      }
    }
  }

  await client.end();

  console.log(`\n${"─".repeat(50)}`);
  if (errors === 0) {
    console.log(`\n${BOLD}${GREEN}✅ All migrations applied!${RESET}`);
    console.log(`\n  Run: ${BOLD}npm run seed:admin${RESET}\n`);
  } else {
    console.error(`\n${BOLD}${RED}❌ ${errors} migration(s) failed.${RESET}\n`);
    process.exit(1);
  }
}

main().catch((e: unknown) => {
  fail(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
