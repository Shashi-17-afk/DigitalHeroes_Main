/**
 * PUT    /api/scores/[id] — Update a score
 * DELETE /api/scores/[id] — Delete a score
 *
 * PRD §10: "An existing score entry for a date may only be edited or deleted."
 *
 * Security:
 *   - Auth guard: rejects unauthenticated requests
 *   - RLS: Supabase enforces user can only update/delete own scores
 *   - Zod validation on PUT
 */
import { type NextRequest, NextResponse } from "next/server";

import { updateScoreSchema } from "@/lib/validations/score.schema";
import { getServerUser } from "@/lib/supabase/get-server-user";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ─── PUT /api/scores/[id] ─────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

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

  const result = updateScoreSchema.safeParse({ ...body as object, id });
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: result.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { score_value, score_date } = result.data;
  const supabase = await createClient();

  // Build typed update object
  type ScoreUpdate = Database["public"]["Tables"]["scores"]["Update"];
  const updates: ScoreUpdate = {};
  if (score_value !== undefined) updates.score_value = score_value;
  if (score_date !== undefined) updates.score_date = score_date;

  if (!updates.score_value && !updates.score_date) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("scores")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id) // Extra safety — RLS also enforces this
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "You already have a score entry for this date." },
        { status: 409 }
      );
    }
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Score not found" },
        { status: 404 }
      );
    }
    console.error("[PUT /api/scores/[id]]", error.message);
    return NextResponse.json(
      { error: "Failed to update score" },
      { status: 500 }
    );
  }

  return NextResponse.json({ score: data });
}

// ─── DELETE /api/scores/[id] ──────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  // UUID format check
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: "Invalid score ID" }, { status: 400 });
  }

  const supabase = await createClient();

  const { error, count } = await supabase
    .from("scores")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id); // Extra safety — RLS also enforces this

  if (error) {
    console.error("[DELETE /api/scores/[id]]", error.message);
    return NextResponse.json(
      { error: "Failed to delete score" },
      { status: 500 }
    );
  }

  if (count === 0) {
    return NextResponse.json({ error: "Score not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
