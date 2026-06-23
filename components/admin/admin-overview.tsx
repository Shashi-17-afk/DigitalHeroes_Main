"use client";

/**
 * AdminOverview — Real-time admin dashboard metrics
 * Fetches from /api/admin/stats on mount
 */
import { useCallback, useEffect, useState } from "react";

interface AdminStats {
  users: { total: number };
  subscriptions: {
    active: number;
    estimated_monthly_revenue_pence: number;
  };
  draws: {
    pending: number;
    published: number;
    recent: Array<{
      draw_month: number;
      draw_year: number;
      status: string;
      total_prize_pool_pence: number;
    }>;
  };
  verifications: { pending: number };
  charities: { active: number };
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function StatTile({
  icon,
  label,
  value,
  sub,
  alert,
}: {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  alert?: boolean;
}): React.JSX.Element {
  return (
    <div className={`admin-stat-tile ${alert ? "admin-stat-tile--alert" : ""}`}>
      <div className="admin-stat-tile__icon">{icon}</div>
      <div className="admin-stat-tile__body">
        <div className="admin-stat-tile__value">{value}</div>
        <div className="admin-stat-tile__label">{label}</div>
        {sub && <div className="admin-stat-tile__sub">{sub}</div>}
      </div>
    </div>
  );
}

export function AdminOverview(): React.JSX.Element {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to load stats");
      const data = (await res.json()) as AdminStats;
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchStats(); }, [fetchStats]);

  if (isLoading) {
    return (
      <div className="score-manager__loading">
        <div className="score-manager__spinner" />
        <p>Loading admin stats…</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="score-list__empty">
        <div className="score-list__empty-icon">⚠️</div>
        <p>Failed to load stats: {error}</p>
      </div>
    );
  }

  const revenue = `₹${(stats.subscriptions.estimated_monthly_revenue_pence / 100).toFixed(0)}`;

  return (
    <div className="admin-overview">
      {/* Stats grid */}
      <div className="admin-stats-grid">
        <StatTile
          icon="👥"
          label="Total Users"
          value={stats.users.total}
          sub="All registered accounts"
        />
        <StatTile
          icon="✅"
          label="Active Subscribers"
          value={stats.subscriptions.active}
          sub={`~${revenue} / month`}
        />
        <StatTile
          icon="💚"
          label="Active Charities"
          value={stats.charities.active}
        />
        <StatTile
          icon="🎰"
          label="Published Draws"
          value={stats.draws.published}
          sub={`${stats.draws.pending} pending`}
        />
        <StatTile
          icon="🔍"
          label="Pending Verifications"
          value={stats.verifications.pending}
          alert={stats.verifications.pending > 0}
          sub={stats.verifications.pending > 0 ? "Action required" : "All clear"}
        />
      </div>

      {/* Quick actions */}
      <div className="admin-overview__section">
        <h2 className="admin-overview__section-title">Quick Actions</h2>
        <div className="admin-quick-actions">
          <a href="/admin/draws" className="admin-action-card">
            <span className="admin-action-card__icon">🎰</span>
            <span className="admin-action-card__label">Manage Draws</span>
            <span className="admin-action-card__arrow">→</span>
          </a>
          <a href="/admin/winners" className="admin-action-card">
            <span className="admin-action-card__icon">🏆</span>
            <span className="admin-action-card__label">Review Winners</span>
            {stats.verifications.pending > 0 && (
              <span className="admin-action-card__badge">
                {stats.verifications.pending}
              </span>
            )}
            <span className="admin-action-card__arrow">→</span>
          </a>
          <a href="/admin/charities" className="admin-action-card">
            <span className="admin-action-card__icon">💚</span>
            <span className="admin-action-card__label">Manage Charities</span>
            <span className="admin-action-card__arrow">→</span>
          </a>
          <a href="/admin/users" className="admin-action-card">
            <span className="admin-action-card__icon">👥</span>
            <span className="admin-action-card__label">View Users</span>
            <span className="admin-action-card__arrow">→</span>
          </a>
        </div>
      </div>

      {/* Recent draws */}
      {stats.draws.recent.length > 0 && (
        <div className="admin-overview__section">
          <h2 className="admin-overview__section-title">Recent Draws</h2>
          <div className="admin-recent-draws">
            {stats.draws.recent.map((draw, i) => (
              <div key={i} className="admin-recent-draw-row">
                <span className="admin-recent-draw-row__period">
                  {MONTH_NAMES[(draw.draw_month ?? 1) - 1]} {draw.draw_year}
                </span>
                <span className={`draw-status-badge draw-status--${draw.status}`}>
                  {draw.status}
                </span>
                <span className="admin-recent-draw-row__pool">
                  ₹{(draw.total_prize_pool_pence / 100).toFixed(0)}
                </span>
                <a href="/admin/draws" className="admin-recent-draw-row__link">
                  Manage →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
