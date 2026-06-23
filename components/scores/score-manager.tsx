"use client";

/**
 * ScoreManager — Client-side orchestrator for score CRUD
 *
 * This component:
 *   1. Fetches scores from GET /api/scores on mount
 *   2. Renders ScoreEntryForm (add) + ScoreList (view/edit/delete)
 *   3. Refreshes the list after any mutation
 *
 * Used by the /dashboard/scores page (Server Component)
 * which just renders <ScoreManager /> — all interactivity lives here.
 */
import React, { useCallback, useEffect, useState } from "react";

import { ScoreEntryForm } from "@/components/scores/score-entry-form";
import { ScoreList } from "@/components/scores/score-list";
import type { Database } from "@/types/database.types";

type ScoreRow = Database["public"]["Tables"]["scores"]["Row"];

export function ScoreManager(): React.JSX.Element {
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch("/api/scores");
      if (!res.ok) throw new Error("Failed to load scores");
      const data = (await res.json()) as { scores: ScoreRow[] };
      setScores(data.scores);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scores");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchScores();
  }, [fetchScores]);

  function handleRefresh(): void {
    void fetchScores();
  }

  if (isLoading) {
    return (
      <div className="score-manager__loading">
        <div className="score-manager__spinner" />
        <p>Loading your scores…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="score-manager__error" role="alert">
        <p>❌ {error}</p>
        <button
          onClick={handleRefresh}
          className="score-form__submit"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="score-manager">
      <ScoreEntryForm
        currentScoreCount={scores.length}
        onScoreAdded={handleRefresh}
      />
      <ScoreList scores={scores} onScoreChanged={handleRefresh} />
    </div>
  );
}
