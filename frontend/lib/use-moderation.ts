"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

// Client reads of /api/moderation (see lib/moderation.ts).

/** Ids of tasks Taskify doesn't list: held for review or removed by an admin. */
export function useHiddenTaskIds(): Set<number> {
  const { data } = useQuery({
    queryKey: ["moderation", "hidden"],
    refetchInterval: 60000,
    queryFn: async (): Promise<number[]> => {
      const res = await fetch("/api/moderation");
      if (!res.ok) return [];
      return ((await res.json()).hidden ?? []) as number[];
    },
  });
  return useMemo(() => new Set(data ?? []), [data]);
}

export type TaskModerationStatus = "live" | "pending_review" | "approved" | "hidden";

export function useTaskModeration(taskId: number | undefined) {
  return useQuery({
    queryKey: ["moderation", "task", taskId],
    enabled: taskId !== undefined,
    queryFn: async (): Promise<TaskModerationStatus> => {
      const res = await fetch(`/api/moderation?taskId=${taskId}`);
      if (!res.ok) return "live";
      return ((await res.json()).status ?? "live") as TaskModerationStatus;
    },
  });
}

export function useCreatorStanding(address: string | undefined) {
  const { data } = useQuery({
    queryKey: ["moderation", "standing", address?.toLowerCase()],
    enabled: !!address,
    queryFn: async (): Promise<"warned" | "blocked" | null> => {
      const res = await fetch(`/api/moderation?address=${address}`);
      if (!res.ok) return null;
      return (await res.json()).standing ?? null;
    },
  });
  return data ?? null;
}

/** Drops hidden tasks, except the viewer's own (they still see theirs, with a review banner). */
export function visibleTasks<T extends { id: number; creator: string }>(tasks: T[], hidden: Set<number>, viewer?: string | null): T[] {
  if (hidden.size === 0) return tasks;
  const me = viewer?.toLowerCase();
  return tasks.filter((t) => !hidden.has(t.id) || (!!me && t.creator.toLowerCase() === me));
}
