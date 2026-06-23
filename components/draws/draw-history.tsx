"use client";

/**
 * DrawHistory — User's draw participation history
 * Displays published draws, user's match results, and winnings
 */
import React, { useCallback, useEffect, useState } from "react";

import type {
  Database,
  MatchType,
  PaymentStatus,
} from "@/types/database.types";

type DrawRow = Database["public"]["Tables"]["draws"]["Row"];
type DrawResultRow = Database["public"]["Tables"]["draw_results"]["Row"];
type WinnerRow = Database["public"]["Tables"]["winners"]["Row"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function matchLabel(matchType: MatchType): string {
  return matchType.replace("_", " ").replace("match", "Match");
}

function paymentBadge(status: PaymentStatus): React.JSX.Element {
  const map: Record<PaymentStatus, { label: string; cls: string }> = {
    pending: { label: "Awaiting Payment", cls: "draw-winner-badge--pending" },
    paid: { label: "Paid ✓", cls: "draw-winner-badge--paid" },
    rejected: { label: "Rejected", cls: "draw-winner-badge--rejected" },
  };
  const { label, cls } = map[status];
  return <span className={`draw-winner-badge ${cls}`}>{label}</span>;
}

interface VerifyFormProps {
  winnerId: string;
  onDone: () => void;
}

function VerifyForm({ winnerId, onDone }: VerifyFormProps): React.JSX.Element {
  const [url, setUrl] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!url) { setError("Please enter a screenshot URL"); return; }
    setIsPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/winners/${winnerId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenshot_url: url }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        throw new Error(d.error ?? "Failed to submit");
      }
      setSuccess(true);
      setTimeout(onDone, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setIsPending(false);
    }
  }

  if (success) return <p className="score-form__success">✅ Verification submitted!</p>;

  return (
    <form className="draw-verify-form" onSubmit={(e) => void handleSubmit(e)}>
      <p className="draw-verify-form__label">
        Paste the URL of your golf score screenshot to claim your prize:
      </p>
      <div className="draw-verify-form__row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="score-form__input"
          disabled={isPending}
        />
        <button
          type="submit"
          className="score-form__submit"
          disabled={isPending}
        >
          {isPending ? "Submitting…" : "Submit"}
        </button>
      </div>
      {error && <p className="score-form__error">{error}</p>}
    </form>
  );
}

export function DrawHistory(): React.JSX.Element {
  const [draws, setDraws] = useState<DrawRow[]>([]);
  const [results, setResults] = useState<DrawResultRow[]>([]);
  const [winners, setWinners] = useState<WinnerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/draws");
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as {
        draws: DrawRow[];
        results: DrawResultRow[];
        winners: WinnerRow[];
      };
      setDraws(data.draws);
      setResults(data.results);
      setWinners(data.winners);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  if (isLoading) {
    return (
      <div className="score-manager__loading">
        <div className="score-manager__spinner" />
        <p>Loading your draw history…</p>
      </div>
    );
  }

  if (draws.length === 0) {
    return (
      <div className="score-list__empty">
        <div className="score-list__empty-icon">🎰</div>
        <h3>No Draws Yet</h3>
        <p>
          The first monthly draw hasn&apos;t been held yet. Keep your scores
          updated — your Stableford scores are your draw entry numbers!
        </p>
      </div>
    );
  }

  return (
    <div className="draw-history">
      {draws.map((draw) => {
        const result = results.find((r) => r.draw_id === draw.id);
        const winner = winners.find((w) => w.draw_id === draw.id);
        const monthName = MONTH_NAMES[(draw.draw_month ?? 1) - 1];

        return (
          <div key={draw.id} className="draw-card">
            <div className="draw-card__header">
              <h3 className="draw-card__title">
                {monthName} {draw.draw_year} Draw
              </h3>
              <span className="draw-card__status draw-card__status--published">
                Published
              </span>
            </div>

            {/* Drawn numbers */}
            {draw.drawn_numbers && (
              <div className="draw-card__numbers">
                <p className="draw-card__numbers-label">Drawn Numbers</p>
                <div className="draw-card__balls">
                  {draw.drawn_numbers.map((n) => (
                    <span
                      key={n}
                      className={`draw-ball ${
                        result?.matched_numbers?.includes(n)
                          ? "draw-ball--matched"
                          : ""
                      }`}
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* User result */}
            {result ? (
              <div className="draw-card__result">
                <div className="draw-card__entry">
                  <span className="draw-card__entry-label">Your numbers:</span>
                  <div className="draw-card__balls draw-card__balls--small">
                    {(result.entry_data as { scores?: number[] })?.scores?.map(
                      (n, i) => (
                        <span
                          key={i}
                          className={`draw-ball draw-ball--sm ${
                            result.matched_numbers?.includes(n)
                              ? "draw-ball--matched"
                              : ""
                          }`}
                        >
                          {n}
                        </span>
                      )
                    )}
                  </div>
                </div>
                <div className="draw-card__matches">
                  {result.match_count} match{result.match_count !== 1 ? "es" : ""}
                  {result.match_count >= 3 ? " 🎉" : ""}
                </div>
              </div>
            ) : (
              <p className="draw-card__no-entry">
                You were not entered in this draw (no scores at draw time)
              </p>
            )}

            {/* Winner section */}
            {winner && (
              <div className="draw-card__winner">
                <div className="draw-card__winner-title">
                  🏆 {matchLabel(winner.match_type)} —{" "}
                  ₹{(winner.prize_amount_pence / 100).toFixed(0)}
                </div>
                {paymentBadge(winner.payment_status)}

                {winner.payment_status === "pending" &&
                  verifyingId !== winner.id && (
                    <button
                      onClick={() => setVerifyingId(winner.id)}
                      className="score-form__submit"
                      style={{ marginTop: "0.75rem", padding: "0.5rem 1rem" }}
                    >
                      Claim Prize →
                    </button>
                  )}

                {verifyingId === winner.id && (
                  <VerifyForm
                    winnerId={winner.id}
                    onDone={() => {
                      setVerifyingId(null);
                      void fetchData();
                    }}
                  />
                )}
              </div>
            )}

            {/* Prize pool info */}
            <div className="draw-card__pool">
              <span>
                Prize pool: ₹
                {(draw.total_prize_pool_pence / 100).toFixed(0)}
              </span>
              {draw.jackpot_rolled_over && (
                <span className="draw-card__rollover">
                  🔄 Jackpot rolled over
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
