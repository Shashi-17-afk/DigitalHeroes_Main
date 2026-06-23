"use client";

/**
 * AdminUserManager — Paginated user list with subscription status
 */
import { useCallback, useEffect, useState } from "react";

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  score_count: number;
  subscription: {
    status: string;
    plan_type: string;
    current_period_end: string | null;
  } | null;
}

interface UsersResponse {
  users: UserRow[];
  total: number;
  page: number;
  page_size: number;
}

function SubscriptionBadge({
  sub,
}: {
  sub: UserRow["subscription"];
}): React.JSX.Element {
  if (!sub) {
    return <span className="admin-user-badge admin-user-badge--inactive">No Sub</span>;
  }
  return (
    <span
      className={`admin-user-badge ${
        sub.status === "active" ? "admin-user-badge--active" : "admin-user-badge--inactive"
      }`}
    >
      {sub.status === "active" ? `✓ ${sub.plan_type}` : sub.status}
    </span>
  );
}

export function AdminUserManager(): React.JSX.Element {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load");
      const json = (await res.json()) as UsersResponse;
      setData(json);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, [page, debouncedSearch]);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0;

  return (
    <div className="admin-user-manager">
      {/* Search bar */}
      <div className="admin-user-manager__toolbar">
        <input
          type="search"
          placeholder="Search by email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="score-form__input admin-user-manager__search"
        />
        {data && (
          <span className="admin-user-manager__count">
            {data.total} user{data.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="score-manager__loading">
          <div className="score-manager__spinner" />
          <p>Loading users…</p>
        </div>
      ) : !data || data.users.length === 0 ? (
        <div className="score-list__empty">
          <div className="score-list__empty-icon">👥</div>
          <h3>No users found</h3>
        </div>
      ) : (
        <div className="admin-user-table-wrap">
          <table className="admin-user-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Subscription</th>
                <th>Scores</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.id} className="admin-user-row">
                  <td className="admin-user-row__email-cell">
                    <div className="admin-user-row__name">
                      {user.full_name ?? "—"}
                    </div>
                    <div className="admin-user-row__email">{user.email}</div>
                  </td>
                  <td>
                    <span
                      className={`admin-user-badge ${
                        user.role === "admin"
                          ? "admin-user-badge--admin"
                          : "admin-user-badge--inactive"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <SubscriptionBadge sub={user.subscription} />
                  </td>
                  <td className="admin-user-row__scores">
                    {user.score_count}
                  </td>
                  <td className="admin-user-row__date">
                    {new Date(user.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="admin-user-pagination">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="score-item__btn"
          >
            ← Prev
          </button>
          <span className="admin-user-pagination__info">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="score-item__btn"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
