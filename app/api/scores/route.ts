/**
 * GET  /api/scores — List current user's scores (max 5, reverse chronological)
 * POST /api/scores — Create a new score
 *
 * PRD §05:
 *   - Score range: 1–45 (Stableford format)
 *   - Each score must include a date
 *   - Only the latest 5 scores retained (DB trigger)
 *   - No duplicate dates (DB UNIQUE constraint)
 *   - Displayed in reverse chronological order
 *
 * Security:
 *   - Auth guard: rejects unauthenticated requests
 *   - RLS: Supabase enforces user can only read/write own scores
 *   - Zod validation: rejects invalid input before DB query
 */
import { type NextRequest, NextResponse } from "next/server";

import { createScoreSchema } from "@/lib/validations/score.schema";
import { getServerUser } from "@/lib/supabase/get-server-user";
import { createClient } from "@/lib/supabase/server";

// ─── GET /api/scores ──────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("user_id", user.id)
    .order("score_date", { ascending: false });

  if (error) {
    console.error("[GET /api/scores]", error.message);
    return NextResponse.json(
      { error: "Failed to fetch scores" },
      { status: 500 }
    );
  }

  return NextResponse.json({ scores: data });
}

// ─── POST /api/scores ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const result = createScoreSchema.safeParse(body);
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

  // Insert — DB trigger enforce_max_scores() handles the >5 auto-delete
  // DB UNIQUE (user_id, score_date) handles duplicate date rejection
  const { data, error } = await supabase
    .from("scores")
    .insert({
      user_id: user.id,
      score_value,
      score_date,
    })
    .select()
    .single();

  if (error) {
    // Handle specific Postgres errors
    if (error.code === "23505") {
      // UNIQUE violation — duplicate date
      return NextResponse.json(
        { error: "You already have a score entry for this date. Edit or delete it instead." },
        { status: 409 }
      );
    }

    console.error("[POST /api/scores]", error.message);
    return NextResponse.json(
      { error: "Failed to save score" },
      { status: 500 }
    );
  }

  return NextResponse.json({ score: data }, { status: 201 });
}
