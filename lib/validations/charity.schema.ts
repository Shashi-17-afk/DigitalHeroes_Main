/**
 * Charity Validation Schemas — Zod
 *
 * PRD §08 constraints:
 *   - Admin: Add, edit, delete charities
 *   - User: Select charity + set percentage (min 10%, max 100%)
 *   - Slug: URL-safe, lowercase, unique
 */
import { z } from "zod";

export const CHARITY_PERCENTAGE_MIN = 10;
export const CHARITY_PERCENTAGE_MAX = 100;

// ─── Slug validation ──────────────────────────────────────────────────────────

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ─── Admin: Create Charity ────────────────────────────────────────────────────

export const createCharitySchema = z.object({
  name: z.string().min(1, { error: "Charity name is required" }).max(200),
  slug: z
    .string()
    .min(1, { error: "Slug is required" })
    .max(100)
    .regex(slugRegex, { error: "Slug must be lowercase with hyphens only (e.g. my-charity)" }),
  description: z.string().max(5000).optional(),
  short_description: z.string().max(300).optional(),
  logo_url: z.string().url({ error: "Invalid logo URL" }).optional().or(z.literal("")),
  banner_url: z.string().url({ error: "Invalid banner URL" }).optional().or(z.literal("")),
  website_url: z.string().url({ error: "Invalid website URL" }).optional().or(z.literal("")),
  is_featured: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export type CreateCharityInput = z.infer<typeof createCharitySchema>;

// ─── Admin: Update Charity ────────────────────────────────────────────────────

export const updateCharitySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(slugRegex, { error: "Slug must be lowercase with hyphens only" })
    .optional(),
  description: z.string().max(5000).optional().nullable(),
  short_description: z.string().max(300).optional().nullable(),
  logo_url: z.string().url().optional().nullable().or(z.literal("")),
  banner_url: z.string().url().optional().nullable().or(z.literal("")),
  website_url: z.string().url().optional().nullable().or(z.literal("")),
  is_featured: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export type UpdateCharityInput = z.infer<typeof updateCharitySchema>;

// ─── User: Select Charity + Percentage ────────────────────────────────────────

export const selectCharitySchema = z.object({
  charity_id: z.string().uuid({ error: "Invalid charity ID" }),
  charity_percentage: z
    .number({ error: "Percentage must be a number" })
    .min(CHARITY_PERCENTAGE_MIN, {
      error: `Minimum charity contribution is ${CHARITY_PERCENTAGE_MIN}%`,
    })
    .max(CHARITY_PERCENTAGE_MAX, {
      error: `Maximum charity contribution is ${CHARITY_PERCENTAGE_MAX}%`,
    }),
});

export type SelectCharityInput = z.infer<typeof selectCharitySchema>;
