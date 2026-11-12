import { NextRequest, NextResponse } from "next/server";
import { getApprovedVoterAddresses } from "@/lib/patrons";
import { notify } from "@/lib/notifications";
import { requireCaller } from "@/lib/verify-caller";
import { getTaskCreator } from "@/lib/task-onchain";

// Fired once when a grant application (applyForGrant) confirms on-chain —
// every approved voter (see approvedVoters/setApprovedVoters in Taskify.sol)
// gets notified that a new grant application is open for their vote,
// in-app and by email.

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const taskId = typeof body?.taskId === "number" ? body.taskId : undefined;
  const taskTitle = typeof body?.taskTitle === "string" ? body.taskTitle : undefined;
  const amount = typeof body?.amount === "string" ? body.amount : undefined;

  if (taskId === undefined) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  // Only the task's on-chain creator can alert voters about it.
  const creatorAddress = await getTaskCreator(taskId);
  if (!creatorAddress) {
    return NextResponse.json({ error: "Couldn't find this task on-chain yet. Try again in a moment." }, { status: 409 });
  }
  const denied = await requireCaller(req, creatorAddress);
  if (denied) return denied;

  const voters = await getApprovedVoterAddresses();
  await Promise.all(
    voters
      .filter(v => v !== creatorAddress)
      .map(v => notify(v, "grant_vote_opened", taskId, { taskTitle, amount, actorAddress: creatorAddress }))
  );

  return NextResponse.json({ notified: voters.length });
}
