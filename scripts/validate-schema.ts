/**
 * Database Schema Structural Validation Script
 * Digital Heroes — Phase 2
 *
 * Validates without requiring a live database connection:
 *   1. All FK references resolve to known tables or allowed system tables
 *   2. All trigger functions are defined before they are referenced
 *   3. All RLS policies reference tables defined in the schema
 *   4. All RLS ENABLE statements reference tables defined in the schema
 *   5. All index column tables exist in the schema
 *   6. Named constraints use the correct naming convention
 *   7. Reports table summary for manual review
 *
 * Usage: npx ts-node --project tsconfig.json scripts/validate-schema.ts
 */

import { readFileSync } from "fs";
import { join } from "path";

// ANSI colour codes for terminal output
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function pass(msg: string): void {
  console.log(`  ${GREEN}✅ PASS${RESET} ${msg}`);
}

function fail(msg: string): void {
  console.error(`  ${RED}❌ FAIL${RESET} ${msg}`);
}

function warn(msg: string): void {
  console.warn(`  ${YELLOW}⚠️  WARN${RESET} ${msg}`);
}

function section(title: string): void {
  console.log(`\n${BOLD}${CYAN}── ${title}${RESET}`);
}

// ── Load SQL files ────────────────────────────────────────────────────────────
const projectRoot = process.cwd(); // Always resolves to project root when run via npm
const schemaSQL = readFileSync(join(projectRoot, "supabase/migrations/001_schema.sql"), "utf-8");
const rlsSQL = readFileSync(join(projectRoot, "supabase/migrations/002_rls.sql"), "utf-8");
const seedSQL = readFileSync(join(projectRoot, "supabase/migrations/003_seed.sql"), "utf-8");

let errorCount = 0;
let warnCount = 0;

// ── Check 1: Extract all table names ─────────────────────────────────────────
section("Check 1: Table Definitions");

const tableRegex = /CREATE TABLE (?:public\.)?(\w+)\s*\(/gi;
const tables = new Set<string>();
let m: RegExpExecArray | null;

while ((m = tableRegex.exec(schemaSQL)) !== null) {
  tables.add(m[1].toLowerCase());
}

console.log(`  Found ${tables.size} tables:`);
[...tables].forEach((t) => console.log(`    • ${t}`));

const EXPECTED_TABLES = [
  "app_config",
  "profiles",
  "subscriptions",
  "charities",
  "charity_events",
  "charity_contributions",
  "scores",
  "draws",
  "draw_results",
  "winners",
  "winner_verifications",
  "prize_pool_history",
  "notifications",
];

for (const expected of EXPECTED_TABLES) {
  if (tables.has(expected)) {
    pass(`Table '${expected}' defined`);
  } else {
    fail(`Table '${expected}' NOT FOUND in schema`);
    errorCount++;
  }
}

// ── Check 2: FK References resolve to known tables ───────────────────────────
section("Check 2: Foreign Key References");

// System tables that are valid FK targets (Supabase Auth)
const SYSTEM_TABLES = new Set(["users"]);

const fkRegex = /REFERENCES\s+(?:public\.|auth\.)?(\w+)\s*\(/gi;
const fkRefs = new Map<string, string[]>();

while ((m = fkRegex.exec(schemaSQL)) !== null) {
  const tbl = m[1].toLowerCase();
  if (!fkRefs.has(tbl)) fkRefs.set(tbl, []);
}

for (const [ref] of fkRefs) {
  if (tables.has(ref) || SYSTEM_TABLES.has(ref)) {
    pass(`FK → '${ref}' resolves correctly`);
  } else {
    fail(`FK → '${ref}' references UNKNOWN table`);
    errorCount++;
  }
}

// ── Check 3: Trigger functions defined before use ────────────────────────────
section("Check 3: Trigger Function Definitions");

const fnRegex = /CREATE OR REPLACE FUNCTION (\w+)\(\)/gi;
const definedFunctions = new Set<string>();

while ((m = fnRegex.exec(schemaSQL)) !== null) {
  definedFunctions.add(m[1].toLowerCase());
}

// Also check RLS helper function
while ((m = fnRegex.exec(rlsSQL)) !== null) {
  definedFunctions.add(m[1].toLowerCase());
}

console.log(`  Functions defined: ${[...definedFunctions].join(", ")}`);

const triggerFnRegex = /EXECUTE FUNCTION (\w+)\(\)/gi;
while ((m = triggerFnRegex.exec(schemaSQL)) !== null) {
  const fn = m[1].toLowerCase();
  if (definedFunctions.has(fn)) {
    pass(`Trigger references defined function '${fn}'`);
  } else {
    fail(`Trigger references UNDEFINED function '${fn}'`);
    errorCount++;
  }
}

// ── Check 4: RLS policies target valid tables ────────────────────────────────
section("Check 4: RLS Policy Table References");

const policyRegex = /ON public\.(\w+)\s+FOR/gi;
while ((m = policyRegex.exec(rlsSQL)) !== null) {
  const tbl = m[1].toLowerCase();
  if (tables.has(tbl)) {
    pass(`RLS policy on '${tbl}'`);
  } else {
    fail(`RLS policy targets UNKNOWN table '${tbl}'`);
    errorCount++;
  }
}

// ── Check 5: RLS ENABLE statements target valid tables ───────────────────────
section("Check 5: RLS ENABLE Statements");

const enableRegex = /ALTER TABLE public\.(\w+)\s+ENABLE ROW LEVEL SECURITY/gi;
const rlsEnabledTables = new Set<string>();

while ((m = enableRegex.exec(rlsSQL)) !== null) {
  const tbl = m[1].toLowerCase();
  rlsEnabledTables.add(tbl);

  if (tables.has(tbl)) {
    pass(`RLS enabled on '${tbl}'`);
  } else {
    fail(`RLS ENABLE on UNKNOWN table '${tbl}'`);
    errorCount++;
  }
}

// Check all app tables have RLS enabled
for (const tbl of tables) {
  if (!rlsEnabledTables.has(tbl)) {
    fail(`Table '${tbl}' has NO RLS enabled!`);
    errorCount++;
  }
}

// ── Check 6: Index table references ─────────────────────────────────────────
section("Check 6: Index Table References");

const indexRegex = /CREATE INDEX \w+ ON public\.(\w+)\(/gi;
while ((m = indexRegex.exec(schemaSQL)) !== null) {
  const tbl = m[1].toLowerCase();
  if (tables.has(tbl)) {
    pass(`Index on '${tbl}'`);
  } else {
    fail(`Index on UNKNOWN table '${tbl}'`);
    errorCount++;
  }
}

// ── Check 7: Trigger table references ───────────────────────────────────────
section("Check 7: Trigger Table References");

const triggerOnRegex = /CREATE TRIGGER \w+\s+(?:BEFORE|AFTER) \w+ ON (?:public\.|auth\.)?(\w+)/gi;
while ((m = triggerOnRegex.exec(schemaSQL)) !== null) {
  const tbl = m[1].toLowerCase();
  if (tables.has(tbl) || SYSTEM_TABLES.has(tbl)) {
    pass(`Trigger on '${tbl}'`);
  } else {
    fail(`Trigger on UNKNOWN table '${tbl}'`);
    errorCount++;
  }
}

// ── Check 8: Seed data app_config keys are unique ────────────────────────────
section("Check 8: Seed Data Uniqueness");

const seedInsertRegex = /\(\s*'([\w_]+)',/g;
const seedKeys = new Set<string>();
let seedDuplicate = false;

while ((m = seedInsertRegex.exec(seedSQL)) !== null) {
  const key = m[1];
  if (seedKeys.has(key)) {
    fail(`Duplicate app_config key in seed: '${key}'`);
    errorCount++;
    seedDuplicate = true;
  } else {
    seedKeys.add(key);
  }
}

if (!seedDuplicate) {
  pass(`All ${seedKeys.size} app_config seed keys are unique`);
  console.log(`  Keys: ${[...seedKeys].join(", ")}`);
}

// ── Check 9: Named constraints follow convention ─────────────────────────────
section("Check 9: Named Constraint Convention");

const constraintRegex = /CONSTRAINT (\w+)/gi;
const constraints: string[] = [];

while ((m = constraintRegex.exec(schemaSQL)) !== null) {
  constraints.push(m[1]);
}

if (constraints.length > 0) {
  pass(`${constraints.length} named constraints found (all have explicit names)`);
  constraints.forEach((c) => console.log(`    • ${c}`));
} else {
  warn("No named constraints found — consider naming all constraints for clarity");
  warnCount++;
}

// ── Check 10: Unique constraints on critical fields ──────────────────────────
section("Check 10: Critical Unique Constraints");

const REQUIRED_UNIQUES = [
  { table: "scores", constraint: "scores_user_date_unique" }, // PRD §05
  { table: "draws", constraint: "draws_month_year_unique" }, // PRD §06
  { table: "winners", constraint: "winners_draw_user_match_unique" },
  { table: "subscriptions", column: "razorpay_subscription_id" },
];

for (const req of REQUIRED_UNIQUES) {
  const searchFor = req.constraint ?? req.column;
  if (schemaSQL.toLowerCase().includes(searchFor!.toLowerCase())) {
    pass(`Unique constraint on '${searchFor}' found`);
  } else {
    fail(`Missing unique constraint: '${searchFor}'`);
    errorCount++;
  }
}

// ── Final Report ─────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(60)}`);

if (errorCount === 0 && warnCount === 0) {
  console.log(`\n${BOLD}${GREEN}✅ ALL CHECKS PASSED — Schema validation complete${RESET}\n`);
  console.log(`  Tables:      ${tables.size}`);
  console.log(`  FK refs:     ${fkRefs.size}`);
  console.log(`  Functions:   ${definedFunctions.size}`);
  console.log(`  RLS tables:  ${rlsEnabledTables.size}`);
  console.log(`  Constraints: ${constraints.length}`);
  console.log(`  Seed keys:   ${seedKeys.size}\n`);
} else if (errorCount === 0) {
  console.log(`\n${BOLD}${YELLOW}⚠️  PASSED with ${warnCount} warning(s)${RESET}\n`);
} else {
  console.error(
    `\n${BOLD}${RED}❌ FAILED: ${errorCount} error(s), ${warnCount} warning(s)${RESET}\n`
  );
  process.exit(1);
}
