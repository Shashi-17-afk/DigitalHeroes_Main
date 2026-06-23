"use client";

/**
 * NotificationBell — PRD §13
 * Renders a bell icon with unread count badge in the dashboard header.
 * Clicking opens a dropdown panel listing recent notifications.
 * Supports: mark one read, mark all read, auto-refresh every 60s.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import type { Database, NotificationType } from "@/types/database.types";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

const TYPE_ICON: Record<NotificationType, string> = {
  draw_result: "🎰",
  winner_alert: "🏆",
  payment_reminder: "💳",
  system: "📢",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationBell(): React.JSX.Element {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications: NotificationRow[];
        unread_count: number;
      };
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch { /* silent */ }
  }, []);

  // Initial fetch + auto-refresh every 60s
  useEffect(() => {
    void fetchNotifications();
    const interval = setInterval(() => { void fetchNotifications(); }, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Mark a single notification read
  async function handleMarkRead(id: string): Promise<void> {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  // Mark all read
  async function handleMarkAllRead(): Promise<void> {
    setIsLoading(true);
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="notif-bell-wrap" ref={panelRef}>
      {/* Bell trigger */}
      <button
        id="notification-bell"
        className="notif-bell-btn"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ""}`}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notif-bell-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          {/* Panel header */}
          <div className="notif-panel__header">
            <h3 className="notif-panel__title">Notifications</h3>
            {unreadCount > 0 && (
              <button
                className="notif-panel__mark-all"
                onClick={() => void handleMarkAllRead()}
                disabled={isLoading}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="notif-panel__list">
            {notifications.length === 0 ? (
              <div className="notif-panel__empty">
                <span>🔕</span>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${n.is_read ? "" : "notif-item--unread"}`}
                  onClick={() => {
                    if (!n.is_read) void handleMarkRead(n.id);
                  }}
                >
                  <span className="notif-item__icon">
                    {TYPE_ICON[n.type] ?? "📢"}
                  </span>
                  <div className="notif-item__body">
                    <div className="notif-item__title">{n.title}</div>
                    <div className="notif-item__body-text">{n.body}</div>
                    <div className="notif-item__time">
                      {timeAgo(n.created_at)}
                    </div>
                  </div>
                  {!n.is_read && <span className="notif-item__dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
