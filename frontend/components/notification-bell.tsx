"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, ChevronDown, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

type NotificationItem = {
  id: number;
  title: string;
  body: string;
  category: string;
  is_read: boolean;
  created_at: string | null;
};

type NotificationResponse = {
  status: string;
  items: NotificationItem[];
  count: number;
  unread_count: number;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function loadNotifications() {
    setLoading(true);
    try {
      const payload = await apiFetch<NotificationResponse>("/api/notifications?limit=8");
      setItems(payload.items);
      setUnreadCount(payload.unread_count);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications().catch(() => undefined);
    const timer = window.setInterval(() => {
      loadNotifications().catch(() => undefined);
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);

  async function markRead(notificationId: number) {
    await apiFetch(`/api/notifications/${notificationId}/read`, { method: "PATCH" });
    await loadNotifications();
  }

  async function markAllRead() {
    await apiFetch("/api/notifications/read-all", { method: "PATCH" });
    await loadNotifications();
  }

  const summary = useMemo(() => {
    if (unreadCount === 0) {
      return "No unread notifications";
    }
    return `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`;
  }, [unreadCount]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600"
      >
        <Bell className="h-3.5 w-3.5" />
        <span>Alerts</span>
        <ChevronDown className="h-3 w-3" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-3 w-[22rem] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <div className="text-sm font-extrabold text-slate-800">Notifications</div>
              <div className="text-[11px] text-slate-400">{summary}</div>
            </div>
            <button
              type="button"
              onClick={() => markAllRead().catch(() => undefined)}
              className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-600"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark all read</span>
            </button>
          </div>

          <div className="max-h-96 overflow-auto">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading alerts...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">No notifications yet.</div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => markRead(item.id).catch(() => undefined)}
                  className={`block w-full border-b border-slate-50 px-4 py-3 text-left transition last:border-b-0 ${
                    item.is_read ? "bg-white" : "bg-indigo-50/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-800">{item.title}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{item.body}</div>
                    </div>
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.is_read ? "bg-slate-200" : "bg-emerald-500"}`} />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
