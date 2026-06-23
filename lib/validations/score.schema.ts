/**
 * Score Validation Schemas — Zod
 *
 * PRD §05 constraints:
 *   - Score range: 1–45 (Stableford format)
 *   - Each score must include a date
 *   - Only one score per date per user (DB UNIQUE constraint)
 *   - Max 5 scores per user (DB trigger enforce_max_scores)
 *
 * PRD §10:
 *   - Only one score entry is permitted per date
 *   - An existing score entry for a date may only be edited or deleted
 */
import { z } from "zod";

// ─── Shared constants ─────────────────────────────────────────────────────────

export const SCORE_MIN = 1;
export const SCORE_MAX = 45;
export const MAX_SCORES_PER_USER = 5;

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Returns true if the string is a valid YYYY-MM-DD date */
function isValidDateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d.getTime());
}

/** Returns true if the date is not in the future */
function isNotFutureDate(s: string): boolean {
  const today = new Date();
  today.setHours(23, 59, 59, 999); // allow same-day entry
  return new Date(s + "T00:00:00Z") <= today;
}

// ─── Create Score ─────────────────────────────────────────────────────────────

export const createScoreSchema = z.object({
  score_value: z
    .number({ error: "Score must be a number" })
    .int({ error: "Score must be a whole number" })
    .min(SCORE_MIN, { error: `Score must be at least ${SCORE_MIN}` })
    .max(SCORE_MAX, { error: `Score must be at most ${SCORE_MAX}` }),

  score_date: z
    .string({ error: "Date is required" })
    .refine(isValidDateString, { message: "Date must be in YYYY-MM-DD format" })
    .refine(isNotFutureDate, { message: "Score date cannot be in the future" }),
});

export type CreateScoreInput = z.infer<typeof createScoreSchema>;

// ─── Update Score ─────────────────────────────────────────────────────────────

export const updateScoreSchema = z.object({
  id: z.string().uuid({ error: "Invalid score ID" }),

  score_value: z
    .number({ error: "Score must be a number" })
    .int({ error: "Score must be a whole number" })
    .min(SCORE_MIN, { error: `Score must be at least ${SCORE_MIN}` })
    .max(SCORE_MAX, { error: `Score must be at most ${SCORE_MAX}` })
    .optional(),

  score_date: z
    .string()
    .refine(isValidDateString, { message: "Date must be in YYYY-MM-DD format" })
    .refine(isNotFutureDate, { message: "Score date cannot be in the future" })
    .optional(),
});

export type UpdateScoreInput = z.infer<typeof updateScoreSchema>;

// ─── Delete Score ─────────────────────────────────────────────────────────────

export const deleteScoreSchema = z.object({
  id: z.string().uuid({ error: "Invalid score ID" }),
});

export type DeleteScoreInput = z.infer<typeof deleteScoreSchema>;
