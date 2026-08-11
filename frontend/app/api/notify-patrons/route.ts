import { NextRequest, NextResponse } from "next/server";
import { getPatronAddresses } from "@/lib/patrons";
import { notify } from "@/lib/notifications";

// Fired once when a grant application (applyForGrant) confirms on-chain —
// every registered patron (investor role) gets notified that a new grant
// application is open for their vote, in-app and by email.

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const taskId = typeof body?.taskId === "number" ? body.taskId : undefined;
  const taskTitle = typeof body?.taskTitle === "string" ? body.taskTitle : undefined;
  const amount = typeof body?.amount === "string" ? body.amount : undefined;
  const creatorAddress = typeof body?.creatorAddress === "string" ? body.creatorAddress.toLowerCase() : undefined;

  if (taskId === undefined) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const patrons = await getPatronAddresses();
  await Promise.all(
    patrons
      .filter(p => p !== creatorAddress)
      .map(p => notify(p, "grant_vote_opened", taskId, { taskTitle, amount, actorAddress: creatorAddress }))
  );

  return NextResponse.json({ notified: patrons.length });
}
