import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Batched applicant counts for development tasks on the browse-tasks list —
// avoids one request per task card. GET /api/applications?taskId= (single
// task, full rows) is what the task detail page uses instead.

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const taskIdsParam = req.nextUrl.searchParams.get("taskIds");
  if (!taskIdsParam) {
    return NextResponse.json({ error: "taskIds query param is required (comma-separated)" }, { status: 400 });
  }
  const taskIds = taskIdsParam.split(",").map(Number).filter(n => Number.isInteger(n));
  if (taskIds.length === 0) {
    return NextResponse.json({ counts: {} });
  }

  const { data, error } = await supabaseAdmin
    .from("task_applications")
    .select("task_id")
    .in("task_id", taskIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const counts: Record<number, number> = {};
  for (const row of data) {
    counts[row.task_id] = (counts[row.task_id] ?? 0) + 1;
  }
  return NextResponse.json({ counts });
}
