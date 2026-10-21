import type { Metadata } from "next";
import { getTaskPreview } from "@/lib/task-preview";
import { clip } from "@/lib/task-preview-text";

// The task page itself is a client component, so it can't export metadata. This
// server layout does, which is what makes a shared task link unfurl into a card
// (title, reward, summary) in Discord, X, Telegram, Slack and the rest, instead of
// the generic site description. The card image comes from ./opengraph-image.tsx.

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const task = await getTaskPreview(id).catch(() => null);
  if (!task) return {}; // unknown task: fall back to the site-wide defaults

  const reward = `${task.reward} ${task.symbol}`.trim();
  const title = `${clip(task.title, 90)} · ${reward}`;
  const facts = [task.kind + " task", task.status, reward, task.winners ? `up to ${task.winners} winners` : null].filter(Boolean).join(" · ");
  const description = clip(task.snippet ? `${facts}. ${task.snippet}` : `${facts}. Bounty on Taskify, paid from escrow on Mezo.`, 280);

  return {
    title,
    description,
    openGraph: { type: "website", siteName: "Taskify", title, description, url: `/tasks/${task.id}` },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: `/tasks/${task.id}` },
  };
}

export default function TaskLayout({ children }: { children: React.ReactNode }) {
  return children;
}
