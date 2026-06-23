/**
 * Admin Seed Script
 * Digital Heroes — Phase 3
 *
 * Creates the initial admin user via the Supabase Admin API (service role key).
 * This is an architectural choice: admin accounts are seeded, not self-registered.
 *
 * Prerequisites:
 *   1. Supabase project is running
 *   2. Database migrations (001, 002, 003) have been applied
 *   3. .env.local contains:
 *        NEXT_PUBLIC_SUPABASE_URL
 *        SUPABASE_SERVICE_ROLE_KEY
 *        ADMIN_SEED_EMAIL
 *        ADMIN_SEED_PASSWORD
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/seed-admin.ts
 *
 * Security: NEVER commit real credentials. Use .env.local (gitignored).
 * Run this script ONCE per environment. Running it again will fail with
 * "User already registered" — that is the expected and safe behaviour.
 */

// Load .env.local — dotenv/config only reads .env, but Next.js uses .env.local
import * as fs from "fs";
import * as path from "path";

function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvLocal();

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Validate environment
// ---------------------------------------------------------------------------
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
        `Add it to your .env.local file and try again.`
    );
  }
  return value;
}

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const adminEmail = requireEnv("ADMIN_SEED_EMAIL");
const adminPassword = requireEnv("ADMIN_SEED_PASSWORD");

// ---------------------------------------------------------------------------
// Admin client — uses service role key, bypasses RLS
// ---------------------------------------------------------------------------
const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ---------------------------------------------------------------------------
// Seed admin
// ---------------------------------------------------------------------------
async function seedAdmin(): Promise<void> {
  console.log(`\n🌱 Seeding admin user: ${adminEmail}`);
  console.log("─".repeat(50));

  // Step 1: Create the auth user (email_confirm = true skips confirmation email)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true, // Bypass email confirmation for admin accounts
    user_metadata: {
      full_name: "Platform Admin",
    },
  });

  if (authError) {
    if (authError.message.includes("already been registered") || authError.status === 422) {
      console.log(`⚠️  Admin user already exists: ${adminEmail}`);
      console.log(
        "   If you need to reset the admin, delete the user in Supabase Dashboard first."
      );
      return;
    }
    throw new Error(`Failed to create auth user: ${authError.message}`);
  }

  const userId = authData.user.id;
  console.log(`✅ Auth user created: ${userId}`);

  // Step 2: Update the profile role to 'admin'
  // The handle_new_user() trigger already created the profile with role = 'subscriber'
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", userId);

  if (profileError) {
    // Attempt to clean up the auth user to avoid orphaned records
    console.error(`❌ Failed to set admin role: ${profileError.message}`);
    console.log("   Rolling back: deleting auth user...");
    await supabase.auth.admin.deleteUser(userId);
    throw new Error(`Profile update failed: ${profileError.message}`);
  }

  console.log(`✅ Admin role set for profile: ${userId}`);

  // Step 3: Verify
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", userId)
    .single();

  if (profile?.role === "admin") {
    console.log("\n✅ Admin seeded successfully:");
    console.log(`   ID:    ${profile.id}`);
    console.log(`   Email: ${profile.email}`);
    console.log(`   Role:  ${profile.role}`);
    console.log("\n   Sign in at: /login");
    console.log("   Admin panel: /admin\n");
  } else {
    throw new Error("Admin seed verification failed — role was not set correctly.");
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
seedAdmin().catch((err: unknown) => {
  console.error("\n❌ Admin seed failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
