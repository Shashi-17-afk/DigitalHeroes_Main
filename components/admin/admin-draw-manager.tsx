"use client";

/**
 * AdminDrawManager — Full draw lifecycle management
 * Create → Run → Simulate → Publish
 * Also shows winner verifications pending review
 */
import React, { useCallback, useEffect, useState } from "react";

import type { Database, DrawMode, DrawStatus } from "@/types/database.types";

type DrawRow = Database["public"]["Tables"]["draws"]["Row"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function statusBadge(status: DrawStatus): React.JSX.Element {
  const map: Record<DrawStatus, string> = {
    pending: "draw-status--pending",
    simulated: "draw-status--simulated",
    published: "draw-status--published",
  };
  return (
    <span className={`draw-status-badge ${map[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

interface VerificationItem {
  id: string;
  winner_id: string;
  user_id: string;
  screenshot_url: string;
  verification_status: string;
  admin_notes: string | null;
  created_at: string;
  profiles?: { email?: string; full_name?: string | null };
  winners?: { match_type?: string; prize_amount_pence?: number };
}

export function AdminDrawManager(): React.JSX.Element {
  const [draws, setDraws] = useState<DrawRow[]>([]);
  const [verifications, setVerifications] = useState<VerificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [tab, setTab] = useState<"draws" | "verifications">("draws");

  // New draw form
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [mode, setMode] = useState<DrawMode>("random");

  const fetchDraws = useCallback(async () => {
    const res = await fetch("/api/admin/draws");
    if (!res.ok) return;
    const data = (await res.json()) as { draws: DrawRow[] };
    setDraws(data.draws);
  }, []);

  const fetchVerifications = useCallback(async () => {
    const res = await fetch("/api/admin/verifications?status=pending");
    if (!res.ok) return;
    const data = (await res.json()) as { verifications: VerificationItem[] };
    setVerifications(data.verifications);
  }, []);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchDraws(), fetchVerifications()]);
    setIsLoading(false);
  }, [fetchDraws, fetchVerifications]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  async function handleCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/draws", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draw_month: month, draw_year: year, draw_mode: mode }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        alert(d.error ?? "Failed to create draw");
      } else {
        await fetchDraws();
      }
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRun(id: string): Promise<void> {
    if (!confirm("Run the draw engine? This will generate numbers and compute matches.")) return;
    setRunningId(id);
    try {
      const res = await fetch(`/api/admin/draws/${id}`, { method: "POST" });
      const data = await res.json() as { drawn_numbers?: number[]; results_count?: number; winner_tiers?: unknown[] };
      if (!res.ok) { alert("Run failed"); return; }
      alert(
        `Draw complete!\nNumbers: ${(data.drawn_numbers ?? []).join(", ")}\n` +
        `Participants: ${data.results_count ?? 0}\n` +
        `Winner tiers: ${(data.winner_tiers ?? []).length}\n\n` +
        `Review results, then publish.`
      );
      await fetchDraws();
    } finally {
      setRunningId(null);
    }
  }

  async function handlePublish(id: string): Promise<void> {
    if (!confirm("Publish this draw? Results will be visible to users and winners notified.")) return;
    setPublishingId(id);
    try {
      const res = await fetch(`/api/admin/draws/${id}/publish`, {
        method: "POST",
      });
      if (!res.ok) { alert("Publish failed"); return; }
      await fetchDraws();
    } finally {
      setPublishingId(null);
    }
  }

  async function handleReview(
    verificationId: string,
    decision: "approved" | "rejected"
  ): Promise<void> {
    setReviewingId(verificationId);
    try {
      const res = await fetch(`/api/admin/verifications/${verificationId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          admin_notes: reviewNotes || undefined,
        }),
      });
      if (!res.ok) { alert("Review failed"); return; }
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
        <p>Loading draw management…</p>
      </div>
    );
  }

  return (
    <div className="admin-draw-manager">
      {/* Tabs */}
      <div className="admin-draw-tabs">
        <button
          className={`admin-draw-tab ${tab === "draws" ? "admin-draw-tab--active" : ""}`}
          onClick={() => setTab("draws")}
        >
          🎰 Draws
        </button>
        <button
          className={`admin-draw-tab ${tab === "verifications" ? "admin-draw-tab--active" : ""}`}
          onClick={() => setTab("verifications")}
        >
          🔍 Verifications {verifications.length > 0 && `(${verifications.length})`}
        </button>
      </div>

      {/* ── DRAWS TAB ───────────────────────────────────────────────────────── */}
      {tab === "draws" && (
        <>
          {/* Create form */}
          <form
            className="admin-charity-form"
            onSubmit={(e) => void handleCreate(e)}
          >
            <h3 className="admin-charity-form__title">Create New Draw</h3>
            <div className="admin-draw-form__row">
              <div className="score-form__field">
                <label className="score-form__label">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                  className="score-form__input"
                >
                  {MONTH_NAMES.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="score-form__field">
                <label className="score-form__label">Year</label>
                <input
                  type="number"
                  min={2024}
                  max={2100}
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                  className="score-form__input"
                />
              </div>
              <div className="score-form__field">
                <label className="score-form__label">Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as DrawMode)}
                  className="score-form__input"
                >
                  <option value="random">Random</option>
                  <option value="algorithmic">Algorithmic</option>
                </select>
              </div>
              <button
                type="submit"
                className="score-form__submit"
                disabled={isCreating}
                style={{ alignSelf: "flex-end" }}
              >
                {isCreating ? "Creating…" : "Create Draw"}
              </button>
            </div>
          </form>

          {/* Draw list */}
          <div className="admin-draw-list">
            {draws.length === 0 ? (
              <p style={{ color: "var(--color-text-secondary)", textAlign: "center", padding: "2rem" }}>
                No draws yet. Create the first one above.
              </p>
            ) : (
              draws.map((draw) => (
                <div key={draw.id} className="admin-draw-item">
                  <div className="admin-draw-item__info">
                    <div className="admin-draw-item__title">
                      {MONTH_NAMES[(draw.draw_month ?? 1) - 1]} {draw.draw_year}
                      {statusBadge(draw.status)}
                    </div>
                    <div className="admin-draw-item__meta">
                      Mode: {draw.draw_mode} · Subscribers: {draw.active_subscriber_count ?? 0}
                      {draw.drawn_numbers && (
                        <> · Numbers: [{draw.drawn_numbers.join(", ")}]</>
                      )}
                      {draw.total_prize_pool_pence > 0 && (
                        <> · Pool: ₹{(draw.total_prize_pool_pence / 100).toFixed(0)}</>
                      )}
                    </div>
                  </div>
                  <div className="admin-draw-item__actions">
                    {draw.status === "pending" && (
                      <button
                        onClick={() => void handleRun(draw.id)}
                        disabled={runningId === draw.id}
                        className="score-form__submit"
                        style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}
                      >
                        {runningId === draw.id ? "Running…" : "▶ Run Draw"}
                      </button>
                    )}
                    {draw.status === "simulated" && (
                      <>
                        <button
                          onClick={() => void handleRun(draw.id)}
                          disabled={runningId === draw.id}
                          className="score-item__btn"
                          style={{ fontSize: "0.8rem" }}
                        >
                          {runningId === draw.id ? "Running…" : "↺ Re-run"}
                        </button>
                        <button
                          onClick={() => void handlePublish(draw.id)}
                          disabled={publishingId === draw.id}
                          className="score-form__submit"
                          style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}
                        >
                          {publishingId === draw.id ? "Publishing…" : "📢 Publish"}
                        </button>
                      </>
                    )}
                    {draw.status === "published" && (
                      <span style={{ color: "#4ade80", fontSize: "0.8rem", fontWeight: 700 }}>
                        ✓ Published
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ── VERIFICATIONS TAB ───────────────────────────────────────────────── */}
      {tab === "verifications" && (
        <div className="admin-draw-list">
          {verifications.length === 0 ? (
            <p style={{ color: "var(--color-text-secondary)", textAlign: "center", padding: "2rem" }}>
              No pending verifications.
            </p>
          ) : (
            verifications.map((v) => (
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
                  <a
                    href={v.screenshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-verification-item__screenshot"
                  >
                    📸 View Screenshot ↗
                  </a>
                  <input
                    type="text"
                    placeholder="Admin notes (optional)"
                    value={reviewingId === v.id ? reviewNotes : ""}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="score-form__input"
                    style={{ marginTop: "0.5rem" }}
                    onFocus={() => setReviewingId(v.id)}
                  />
                </div>
                <div className="admin-verification-item__actions">
                  <button
                    onClick={() => void handleReview(v.id, "approved")}
                    disabled={reviewingId === v.id}
                    className="score-form__submit"
                    style={{ background: "linear-gradient(135deg, #4ade80, #22d3ee)", color: "#0a0f1e", padding: "0.5rem 1rem", fontSize: "0.8rem" }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => void handleReview(v.id, "rejected")}
                    disabled={reviewingId === v.id}
                    className="score-item__btn score-item__btn--delete"
                    style={{ fontSize: "0.8rem" }}
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
