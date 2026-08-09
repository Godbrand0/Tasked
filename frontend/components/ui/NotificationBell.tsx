"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/wallet-context";

interface Notification {
  id: string;
  type: "task_assigned" | "work_submitted" | "funds_released" | "grant_vote_opened" | "wave_reward_ready";
  task_id: number | null;
  read: boolean;
  created_at: string;
}

const META: Record<Notification["type"], { icon: string; label: string }> = {
  task_assigned: { icon: "🎯", label: "Task assigned to you" },
  work_submitted: { icon: "📤", label: "Work submitted" },
  funds_released: { icon: "💸", label: "Funds released" },
  grant_vote_opened: { icon: "🗳️", label: "Grant vote opened" },
  wave_reward_ready: { icon: "🌊", label: "Wave reward ready to claim" },
};

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const { address, connected, isRegistered } = useWallet();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  function load() {
    if (!address) return;
    setLoading(true);
    fetch(`/api/notifications?address=${address}`)
      .then(res => res.json())
      .then((data: { notifications?: Notification[] }) => setNotifications(data.notifications ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (connected && isRegistered && address) load();
    else setNotifications([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, connected, isRegistered]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function markRead(id?: string) {
    if (!address) return;
    setNotifications(prev => prev.map(n => (!id || n.id === id) ? { ...n, read: true } : n));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { address, id } : { address }),
    }).catch(() => {});
  }

  function handleClickNotification(n: Notification) {
    if (!n.read) markRead(n.id);
    setOpen(false);
    if (n.task_id != null) router.push(`/tasks/${n.task_id}`);
  }

  if (!connected || !isRegistered) return null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) load(); }}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        style={{ position: "relative", width: 34, height: 34, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: "var(--primary)", color: "var(--on-primary)", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, width: 320, maxHeight: 400, overflowY: "auto", boxShadow: "0 16px 48px rgba(0,0,0,0.4)", zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Notifications</span>
            {unreadCount > 0 && (
              <button onClick={() => markRead()} style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Mark all read
              </button>
            )}
          </div>
          {loading ? (
            <div style={{ padding: "24px 14px", textAlign: "center", fontSize: 13, color: "var(--text-dim)" }}>Loading…</div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: "24px 14px", textAlign: "center", fontSize: 13, color: "var(--text-dim)" }}>No notifications yet.</div>
          ) : (
            notifications.map(n => (
              <button
                key={n.id}
                onClick={() => handleClickNotification(n)}
                style={{ display: "flex", gap: 10, width: "100%", padding: "12px 14px", background: n.read ? "transparent" : "color-mix(in srgb, var(--primary) 6%, transparent)", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{META[n.type]?.icon ?? "🔔"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: "var(--text)" }}>{META[n.type]?.label ?? n.type}</div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                    {n.task_id != null ? `Task #${n.task_id} · ` : ""}{timeAgo(n.created_at)}
                  </div>
                </div>
                {!n.read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", flexShrink: 0, marginTop: 4 }} />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
