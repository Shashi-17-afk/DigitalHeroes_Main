"use client";

/**
 * ScoreList — Displays user's scores with edit and delete functionality
 *
 * PRD §05:
 *   - Scores displayed in reverse chronological order (most recent first)
 *   - Max 5 scores at any time
 *
 * PRD §10:
 *   - An existing score entry for a date may only be edited or deleted
 */
import React, { useState } from "react";

import { SCORE_MIN, SCORE_MAX } from "@/lib/validations/score.schema";
import type { Database } from "@/types/database.types";

type ScoreRow = Database["public"]["Tables"]["scores"]["Row"];

interface ScoreListProps {
  scores: ScoreRow[];
  onScoreChanged: () => void;
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getScoreColor(score: number): string {
  if (score >= 36) return "score-item__value--excellent";
  if (score >= 28) return "score-item__value--good";
  if (score >= 18) return "score-item__value--average";
  return "score-item__value--low";
}

// ─── Inline Edit Row ──────────────────────────────────────────────────────────

function EditableScoreRow({
  score,
  onSave,
  onCancel,
}: {
  score: ScoreRow;
  onSave: () => void;
  onCancel: () => void;
}): React.JSX.Element {
  const [value, setValue] = useState(String(score.score_value));
  const [date, setDate] = useState(score.score_date);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().split("T")[0];

  async function handleSave(): Promise<void> {
    setError(null);
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < SCORE_MIN || numValue > SCORE_MAX) {
      setError(`Score must be between ${SCORE_MIN} and ${SCORE_MAX}`);
      return;
    }

    setIsPending(true);
    try {
      const res = await fetch(`/api/scores/${score.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score_value: numValue,
          score_date: date,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to update score");
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="score-item score-item--editing">
      <div className="score-item__edit-fields">
        <input
          type="number"
          min={SCORE_MIN}
          max={SCORE_MAX}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="score-form__input score-item__edit-input"
          disabled={isPending}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={today}
          className="score-form__input score-item__edit-input"
          disabled={isPending}
        />
      </div>
      <div className="score-item__edit-actions">
        <button
          onClick={() => void handleSave()}
          disabled={isPending}
          className="score-item__btn score-item__btn--save"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          onClick={onCancel}
          disabled={isPending}
          className="score-item__btn score-item__btn--cancel"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="score-form__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ScoreList({
  scores,
  onScoreChanged,
}: ScoreListProps): React.JSX.Element {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string): Promise<void> {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/scores/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to delete score");
      }
      onScoreChanged();
    } catch (err) {
      console.error("Delete failed:", err);
      // Could add toast here
    } finally {
      setDeletingId(null);
    }
  }

  if (scores.length === 0) {
    return (
      <div className="score-list__empty">
        <div className="score-list__empty-icon">⛳</div>
        <h3>No Scores Yet</h3>
        <p>
          Enter your first Stableford score above to start tracking your golf
          performance and earn draw entries.
        </p>
      </div>
    );
  }

  return (
    <div className="score-list">
      <div className="score-list__header">
        <h3 className="score-list__title">
          Your Scores ({scores.length}/5)
        </h3>
        <p className="score-list__subtitle">
          Most recent first · These scores are your draw entry numbers
        </p>
      </div>

      <div className="score-list__items">
        {scores.map((score, index) => {
          if (editingId === score.id) {
            return (
              <EditableScoreRow
                key={score.id}
                score={score}
                onSave={() => {
                  setEditingId(null);
                  onScoreChanged();
                }}
                onCancel={() => setEditingId(null)}
              />
            );
          }

          return (
            <div key={score.id} className="score-item">
              <div className="score-item__rank">#{index + 1}</div>
              <div
                className={`score-item__value ${getScoreColor(score.score_value)}`}
              >
                {score.score_value}
              </div>
              <div className="score-item__details">
                <div className="score-item__date">
                  {formatDate(score.score_date)}
                </div>
                <div className="score-item__format">Stableford</div>
              </div>
              <div className="score-item__actions">
                <button
                  onClick={() => setEditingId(score.id)}
                  className="score-item__btn score-item__btn--edit"
                  title="Edit score"
                >
                  ✏️
                </button>
                <button
                  onClick={() => void handleDelete(score.id)}
                  disabled={deletingId === score.id}
                  className="score-item__btn score-item__btn--delete"
                  title="Delete score"
                >
                  {deletingId === score.id ? "…" : "🗑️"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
