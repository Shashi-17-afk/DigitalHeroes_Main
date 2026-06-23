"use client";

/**
 * ScoreEntryForm — Add a new golf score
 *
 * PRD §05:
 *   - Score range: 1–45 (Stableford format)
 *   - Each score must include a date
 *   - Only one score per date (server rejects with 409)
 *
 * Validates client-side with Zod, submits to POST /api/scores.
 * On success, calls onScoreAdded() to refresh the score list.
 */
import React, { useState } from "react";

import { SCORE_MIN, SCORE_MAX, MAX_SCORES_PER_USER } from "@/lib/validations/score.schema";

interface ScoreEntryFormProps {
  currentScoreCount: number;
  onScoreAdded: () => void;
}

export function ScoreEntryForm({
  currentScoreCount,
  onScoreAdded,
}: ScoreEntryFormProps): React.JSX.Element {
  const [scoreValue, setScoreValue] = useState("");
  const [scoreDate, setScoreDate] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Today in YYYY-MM-DD format for the max attribute
  const today = new Date().toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Client-side validation
    const value = parseInt(scoreValue, 10);
    if (isNaN(value) || value < SCORE_MIN || value > SCORE_MAX) {
      setError(`Score must be between ${SCORE_MIN} and ${SCORE_MAX}`);
      return;
    }
    if (!scoreDate) {
      setError("Please select a date for this score");
      return;
    }

    setIsPending(true);

    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score_value: value,
          score_date: scoreDate,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to save score");
      }

      // Success
      const willReplace = currentScoreCount >= MAX_SCORES_PER_USER;
      setSuccess(
        willReplace
          ? "Score saved! Your oldest score was automatically removed."
          : "Score saved successfully!"
      );
      setScoreValue("");
      setScoreDate("");
      onScoreAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="score-form" onSubmit={(e) => void handleSubmit(e)}>
      <h3 className="score-form__title">⛳ Enter New Score</h3>

      {currentScoreCount >= MAX_SCORES_PER_USER && (
        <div className="score-form__warning">
          You have {MAX_SCORES_PER_USER} scores. Adding a new one will replace
          your oldest score.
        </div>
      )}

      <div className="score-form__fields">
        <div className="score-form__field">
          <label htmlFor="score-value" className="score-form__label">
            Stableford Score ({SCORE_MIN}–{SCORE_MAX})
          </label>
          <input
            id="score-value"
            type="number"
            min={SCORE_MIN}
            max={SCORE_MAX}
            step={1}
            value={scoreValue}
            onChange={(e) => setScoreValue(e.target.value)}
            placeholder="e.g. 36"
            className="score-form__input"
            required
            disabled={isPending}
          />
        </div>

        <div className="score-form__field">
          <label htmlFor="score-date" className="score-form__label">
            Date Played
          </label>
          <input
            id="score-date"
            type="date"
            value={scoreDate}
            onChange={(e) => setScoreDate(e.target.value)}
            max={today}
            className="score-form__input"
            required
            disabled={isPending}
          />
        </div>

        <button
          type="submit"
          className="score-form__submit"
          disabled={isPending}
        >
          {isPending ? "Saving…" : "Add Score"}
        </button>
      </div>

      {error && (
        <p className="score-form__error" role="alert">
          ❌ {error}
        </p>
      )}
      {success && (
        <p className="score-form__success" role="status">
          ✅ {success}
        </p>
      )}
    </form>
  );
}
