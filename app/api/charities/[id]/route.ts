/**
 * PUT    /api/charities/[id] — Admin: update a charity
 * DELETE /api/charities/[id] — Admin: soft-delete (deactivate) a charity
 *
 * PRD §08 + §11: Admin manages charity listings
 */
import { type NextRequest, NextResponse } from "next/server";

import { updateCharitySchema } from "@/lib/validations/charity.schema";
import { getServerUser } from "@/lib/supabase/get-server-user";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ─── Admin check helper ───────────────────────────────────────────────────────

async function verifyAdmin(): Promise<{ userId: string } | NextResponse> {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { userId: user.id };
}

// ─── PUT /api/charities/[id] ──────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await verifyAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const result = updateCharitySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: result.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const serviceClient = createServiceClient();

  // Clean empty strings to null for URL fields
  const updates = { ...result.data };
  if (updates.logo_url === "") updates.logo_url = null;
  if (updates.banner_url === "") updates.banner_url = null;
  if (updates.website_url === "") updates.website_url = null;

  const { data, error } = await serviceClient
    .from("charities")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A charity with this slug already exists." },
        { status: 409 }
      );
    }
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Charity not found" },
        { status: 404 }
      );
    }
    console.error("[PUT /api/charities/[id]]", error.message);
    return NextResponse.json(
      { error: "Failed to update charity" },
      { status: 500 }
    );
  }

  return NextResponse.json({ charity: data });
}

// ─── DELETE /api/charities/[id] — Soft delete ─────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await verifyAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const serviceClient = createServiceClient();

  // Soft-delete: set is_active = false (preserves historical contribution records)
  const { data, error } = await serviceClient
    .from("charities")
    .update({ is_active: false })
    .eq("id", id)
    .select("id, name, is_active")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Charity not found" },
        { status: 404 }
      );
    }
    console.error("[DELETE /api/charities/[id]]", error.message);
    return NextResponse.json(
      { error: "Failed to deactivate charity" },
      { status: 500 }
    );
  }

  return NextResponse.json({ charity: data, deactivated: true });
}
