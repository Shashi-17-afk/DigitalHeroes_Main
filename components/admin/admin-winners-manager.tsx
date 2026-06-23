"use client";

/**
 * AdminWinnersManager — View all winners, payment status, manage verifications
 * Tabs: All Winners | Pending Verifications
 */
import { useCallback, useEffect, useState } from "react";

import type { MatchType, PaymentStatus, VerificationStatus } from "@/types/database.types";

interface WinnerRow {
  id: string;
  draw_id: string;
  user_id: string;
  match_type: MatchType;
  prize_amount_pence: number;
  payment_status: PaymentStatus;
  paid_at: string | null;
  created_at: string;
  draws?: { draw_month: number; draw_year: number };
  profiles?: { email?: string; full_name?: string | null };
}

interface VerificationRow {
  id: string;
  winner_id: string;
  user_id: string;
  screenshot_url: string;
  verification_status: VerificationStatus;
  admin_notes: string | null;
  created_at: string;
  profiles?: { email?: string; full_name?: string | null };
  winners?: { match_type?: string; prize_amount_pence?: number; draw_id?: string };
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function paymentBadge(status: PaymentStatus): React.JSX.Element {
  const map: Record<PaymentStatus, { cls: string; label: string }> = {
    pending: { cls: "admin-user-badge--inactive", label: "Pending" },
    paid: { cls: "admin-user-badge--active", label: "Paid ✓" },
    rejected: { cls: "admin-user-badge--rejected", label: "Rejected" },
  };
  const { cls, label } = map[status];
  return <span className={`admin-user-badge ${cls}`}>{label}</span>;
}

export function AdminWinnersManager(): React.JSX.Element {
  const [tab, setTab] = useState<"winners" | "verifications">("verifications");
  const [winners, setWinners] = useState<WinnerRow[]>([]);
  const [verifications, setVerifications] = useState<VerificationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState<"pending" | "approved" | "rejected">("pending");

  const fetchWinners = useCallback(async () => {
    const res = await fetch("/api/admin/winners");
    if (!res.ok) return;
    const data = (await res.json()) as { winners: WinnerRow[] };
    setWinners(data.winners);
  }, []);

  const fetchVerifications = useCallback(async () => {
    const res = await fetch(`/api/admin/verifications?status=${filterStatus}`);
    if (!res.ok) return;
    const data = (await res.json()) as { verifications: VerificationRow[] };
    setVerifications(data.verifications);
  }, [filterStatus]);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchWinners(), fetchVerifications()]);
    setIsLoading(false);
  }, [fetchWinners, fetchVerifications]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  async function handleReview(
    verificationId: string,
    decision: "approved" | "rejected"
  ): Promise<void> {
    setReviewingId(verificationId);
    try {
      const res = await fetch(`/api/admin/verifications/${verificationId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, admin_notes: reviewNotes || undefined }),
      });
      if (!res.ok) { alert("Review action failed"); return; }
      setReviewNotes("");
      await fetchVerifications();
    } finally {
      setReviewingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="score-manager__loading">
        <div className="score-manager__spinner" />
        <p>Loading winners data…</p>
      </div>
    );
  }

  return (
    <div className="admin-winners-manager">
      {/* Tabs */}
      <div className="admin-draw-tabs">
        <button
          className={`admin-draw-tab ${tab === "verifications" ? "admin-draw-tab--active" : ""}`}
          onClick={() => setTab("verifications")}
        >
          🔍 Verifications
          {verifications.length > 0 && filterStatus === "pending" && (
            <span className="admin-tab-badge">{verifications.length}</span>
          )}
        </button>
        <button
          className={`admin-draw-tab ${tab === "winners" ? "admin-draw-tab--active" : ""}`}
          onClick={() => setTab("winners")}
        >
          🏆 All Winners
        </button>
      </div>

      {/* ── VERIFICATIONS TAB ─────────────────────────────────────────────── */}
      {tab === "verifications" && (
        <>
          {/* Status filter */}
          <div className="admin-draw-tabs" style={{ marginBottom: "1rem" }}>
            {(["pending", "approved", "rejected"] as const).map((s) => (
              <button
                key={s}
                className={`admin-draw-tab ${filterStatus === s ? "admin-draw-tab--active" : ""}`}
                onClick={() => setFilterStatus(s)}
                style={{ fontSize: "0.8rem" }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {verifications.length === 0 ? (
            <div className="score-list__empty">
              <div className="score-list__empty-icon">✅</div>
              <h3>No {filterStatus} verifications</h3>
              <p>All caught up!</p>
            </div>
          ) : (
            <div className="admin-draw-list">
              {verifications.map((v) => (
                <div key={v.id} className="admin-verification-item">
                  <div className="admin-verification-item__info">
                    <div className="admin-verification-item__user">
                      {v.profiles?.email ?? v.user_id}
                      {v.profiles?.full_name && ` (${v.profiles.full_name})`}
                    </div>
                    <div className="admin-verification-item__prize">
                      {v.winners?.match_type?.replace("_", " ")} —{" "}
                      ₹{((v.winners?.prize_amount_pence ?? 0) / 100).toFixed(0)}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>
                      Submitted: {new Date(v.created_at).toLocaleDateString("en-GB")}
                    </div>
                    <a
                      href={v.screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-verification-item__screenshot"
                    >
                      📸 View Screenshot ↗
                    </a>
                    {v.admin_notes && (
                      <div style={{ fontSize: "0.75rem", color: "#fbbf24", marginTop: "0.35rem" }}>
                        Note: {v.admin_notes}
                      </div>
                    )}
                    {filterStatus === "pending" && (
                      <input
                        type="text"
                        placeholder="Admin notes (optional)"
                        value={reviewingId === v.id ? reviewNotes : ""}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        onFocus={() => setReviewingId(v.id)}
                        className="score-form__input"
                        style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}
                      />
                    )}
                  </div>
                  {filterStatus === "pending" && (
                    <div className="admin-verification-item__actions">
                      <button
                        onClick={() => void handleReview(v.id, "approved")}
                        disabled={reviewingId === v.id && reviewNotes !== reviewNotes}
                        className="score-form__submit"
                        style={{
                          background: "linear-gradient(135deg, #4ade80, #22d3ee)",
                          color: "#0a0f1e",
                          padding: "0.5rem 1rem",
                          fontSize: "0.8rem",
                        }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => void handleReview(v.id, "rejected")}
                        className="score-item__btn score-item__btn--delete"
                        style={{ fontSize: "0.8rem" }}
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}
                  {filterStatus !== "pending" && (
                    <span
                      className={`admin-user-badge ${
                        v.verification_status === "approved"
                          ? "admin-user-badge--active"
                          : "admin-user-badge--rejected"
                      }`}
                    >
                      {v.verification_status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── WINNERS TAB ───────────────────────────────────────────────────── */}
      {tab === "winners" && (
        <>
          {winners.length === 0 ? (
            <div className="score-list__empty">
              <div className="score-list__empty-icon">🏆</div>
              <h3>No winners yet</h3>
              <p>Run and publish a draw to generate winners.</p>
            </div>
          ) : (
            <div className="admin-user-table-wrap">
              <table className="admin-user-table">
                <thead>
                  <tr>
                    <th>Winner</th>
                    <th>Draw</th>
                    <th>Tier</th>
                    <th>Prize</th>
                    <th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {winners.map((w) => (
                    <tr key={w.id} className="admin-user-row">
                      <td className="admin-user-row__email-cell">
                        <div className="admin-user-row__name">
                          {w.profiles?.full_name ?? "—"}
                        </div>
                        <div className="admin-user-row__email">
                          {w.profiles?.email ?? w.user_id}
                        </div>
                      </td>
                      <td className="admin-user-row__date">
                        {w.draws
                          ? `${MONTH_NAMES[(w.draws.draw_month ?? 1) - 1]} ${w.draws.draw_year}`
                          : "—"}
                      </td>
                      <td>
                        <span className="admin-user-badge admin-user-badge--admin">
                          {w.match_type.replace("_", " ")}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>
                        ₹{(w.prize_amount_pence / 100).toFixed(0)}
                      </td>
                      <td>{paymentBadge(w.payment_status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
