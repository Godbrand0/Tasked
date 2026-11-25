import { NextRequest, NextResponse } from "next/server";
import { getPublicTasks } from "@/lib/public-tasks";
import { STATUS_NAME } from "@/lib/taskify";

// Public, read-only task feed for integrations such as the Mezo Discord bot.
//
//   GET /api/public/tasks                 every task, newest first
//   GET /api/public/tasks?status=open     only tasks with that status (case-insensitive)
//
// No auth. Data is cached for about a minute (in memory and at the CDN), so
// polling every 1–2 minutes is plenty. See lib/public-tasks.ts for the fields.

const VALID = new Set<string>(STATUS_NAME.filter((s) => s !== "NONE"));

export async function GET(req: NextRequest) {
  const statusParam = req.nextUrl.searchParams.get("status");
  const status = statusParam?.toUpperCase() ?? null;
  if (status && !VALID.has(status)) {
    return NextResponse.json(
      { error: `Unknown status "${statusParam}". Use one of: ${[...VALID].join(", ").toLowerCase()}.` },
      { status: 400, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }

  try {
    const all = await getPublicTasks();
    const tasks = status ? all.filter((t) => t.status === status) : all;
    return NextResponse.json(
      { tasks },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (err) {
    console.error("[public/tasks] failed:", err);
    return NextResponse.json(
      { error: "Couldn't load tasks right now. Try again shortly." },
      { status: 503, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }
}
