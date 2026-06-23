/**
 * GET  /api/charities       — Public: list active charities (with search/filter)
 * POST /api/charities       — Admin: create a new charity
 *
 * PRD §08:
 *   - Charity listing page with search and filter
 *   - Admin: Add charities
 *   - Featured / spotlight charity section on homepage
 */
import { type NextRequest, NextResponse } from "next/server";

import { createCharitySchema } from "@/lib/validations/charity.schema";
import { getServerUser } from "@/lib/supabase/get-server-user";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// ─── GET /api/charities ───────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const search = searchParams.get("search");
  const featured = searchParams.get("featured");

  let query = supabase
    .from("charities")
    .select("*")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("name", { ascending: true });

  // Text search on name and description
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,short_description.ilike.%${search}%`);
  }

  // Filter featured only
  if (featured === "true") {
    query = query.eq("is_featured", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[GET /api/charities]", error.message);
    return NextResponse.json(
      { error: "Failed to fetch charities" },
      { status: 500 }
    );
  }

  return NextResponse.json({ charities: data });
}

// ─── POST /api/charities (Admin only) ─────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin role
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse & validate
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const result = createCharitySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: result.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  // Use service client to insert (bypasses RLS)
  const serviceClient = createServiceClient();
  const insertData = {
    ...result.data,
    logo_url: result.data.logo_url || null,
    banner_url: result.data.banner_url || null,
    website_url: result.data.website_url || null,
  };

  const { data, error } = await serviceClient
    .from("charities")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A charity with this slug already exists." },
        { status: 409 }
      );
    }
    console.error("[POST /api/charities]", error.message);
    return NextResponse.json(
      { error: "Failed to create charity" },
      { status: 500 }
    );
  }

  return NextResponse.json({ charity: data }, { status: 201 });
}
