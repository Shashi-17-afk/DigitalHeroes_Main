/**
 * POST /api/charities/select — User selects a charity and sets contribution %
 *
 * PRD §08:
 *   - Users select a charity at signup
 *   - Minimum contribution: 10% of subscription fee
 *   - Users may voluntarily increase their charity percentage
 */
import { type NextRequest, NextResponse } from "next/server";

import { selectCharitySchema } from "@/lib/validations/charity.schema";
import { getServerUser } from "@/lib/supabase/get-server-user";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const result = selectCharitySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: result.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { charity_id, charity_percentage } = result.data;
  const supabase = await createClient();

  // Verify charity exists and is active
  const { data: charity } = await supabase
    .from("charities")
    .select("id, name, is_active")
    .eq("id", charity_id)
    .single();

  if (!charity || !charity.is_active) {
    return NextResponse.json(
      { error: "Charity not found or is no longer active" },
      { status: 404 }
    );
  }

  // Update the user's profile
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      selected_charity_id: charity_id,
      charity_percentage,
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("[POST /api/charities/select]", updateError.message);
    return NextResponse.json(
      { error: "Failed to update charity selection" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    selected_charity: charity.name,
    charity_percentage,
  });
}
