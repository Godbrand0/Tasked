/**
 * Shared relative-time helper (issue #3).
 *
 * Takes epoch MILLISECONDS so both an ISO string (notifications) and a
 * unix-seconds value (task.createdAt) convert at the call site.
 * Ported from the formatter that used to live in NotificationBell.tsx.
 */
export function timeAgo(epochMs: number): string {
  const seconds = Math.floor((Date.now() - epochMs) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
