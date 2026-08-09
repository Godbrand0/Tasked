/**
 * Taskify on-chain event indexer.
 *
 * Populates the "[on-chain cache]" tables in supabase/schema.sql (users_onchain,
 * tasks, task_applicants_onchain, community_submissions, patrons_onchain,
 * grant_votes_onchain, grant_voters_onchain, wave_snapshots_onchain,
 * wave_claims_onchain) by polling Taskify.sol events and re-reading the
 * relevant on-chain getters for full row data.
 *
 * NOT RUNNABLE YET: Taskify.sol has no deployed address (see README.md,
 * "Contract Addresses"). This is written and ready — set TASKIFY_CONTRACT_ADDRESS
 * once a deployment exists, and everything below should work against it as-is.
 * It has NOT been run against a live contract, since none exists.
 *
 * Run with: pnpm indexer   (polls forever)  or  pnpm indexer:once  (single pass)
 *
 * Required env (frontend/.env.local):
 *   TASKIFY_CONTRACT_ADDRESS   the deployed Taskify.sol address
 *   TASKIFY_DEPLOY_BLOCK       block number the contract was deployed at
 *                              (first-run starting point; omit to start from
 *                              the current block, which would miss history)
 *   NEXT_PUBLIC_MEZO_RPC_URL, NEXT_PUBLIC_MEZO_CHAIN_ID   already present for the frontend
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   already present for the frontend
 */
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(import.meta.dirname, "../.env.local") });

import { createPublicClient, http, type Log, defineChain } from "viem";
import { createClient } from "@supabase/supabase-js";
import taskifyAbi from "../lib/abi/Taskify.json" with { type: "json" };

const CONTRACT_ADDRESS = process.env.TASKIFY_CONTRACT_ADDRESS as `0x${string}` | undefined;
const DEPLOY_BLOCK = process.env.TASKIFY_DEPLOY_BLOCK ? BigInt(process.env.TASKIFY_DEPLOY_BLOCK) : undefined;
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_MEZO_CHAIN_ID ?? 31611);
const RPC_URL = process.env.NEXT_PUBLIC_MEZO_RPC_URL ?? "https://rpc.test.mezo.org";
const POLL_INTERVAL_MS = 15_000;
const BLOCK_CHUNK = 2000n; // getLogs range per request, keeps individual RPC calls small

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — check frontend/.env.local");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, serviceRoleKey);

if (!CONTRACT_ADDRESS) {
  console.error(
    "TASKIFY_CONTRACT_ADDRESS is not set — Taskify.sol isn't deployed yet.\n" +
    "This indexer has nothing to index until it is. See README.md > Contract Addresses."
  );
  process.exit(1);
}

const mezoChain = defineChain({
  id: CHAIN_ID,
  name: "Mezo",
  nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const client = createPublicClient({ chain: mezoChain, transport: http(RPC_URL) });

// ── Roles/status/kind enums, matching Taskify.sol exactly ──────────────────
const ROLE = ["None", "Creator", "Contributor", "Investor"] as const;
const STATUS = [
  "None", "Open", "Assigned", "InProgress", "Submitted", "FundsReleased",
  "Cancelled", "Expired", "GrantPending", "GrantRejected",
] as const;
const FUNDING_TYPE = ["Self", "Grant"] as const;
const KIND = ["Development", "Community"] as const;

function toIso(unixSeconds: bigint): string {
  return new Date(Number(unixSeconds) * 1000).toISOString();
}

async function blockTimestampIso(blockNumber: bigint): Promise<string> {
  const block = await client.getBlock({ blockNumber });
  return new Date(Number(block.timestamp) * 1000).toISOString();
}

// ── Re-read helpers — always prefer a fresh on-chain read over trusting
//    event args alone, so the cache reflects true current state even if
//    events are processed out of order or a later tx changed things. ──────

async function syncUser(address: string) {
  const [username, role, experienceLevel, tasksCompleted, totalEarned, githubVerified, registeredAt, lastExperienceUpdate, xVerified] =
    (await client.readContract({
      address: CONTRACT_ADDRESS!,
      abi: taskifyAbi,
      functionName: "users",
      args: [address],
    })) as [string, number, number, bigint, bigint, boolean, bigint, bigint, boolean];

  const currentBlock = await client.getBlockNumber();
  await supabase.from("users_onchain").upsert({
    address: address.toLowerCase(),
    username,
    role: ROLE[role].toLowerCase(),
    experience_level: experienceLevel,
    tasks_completed: tasksCompleted.toString(),
    total_earned: totalEarned.toString(),
    github_verified: githubVerified,
    x_verified: xVerified,
    registered_at: toIso(registeredAt),
    last_experience_update: toIso(lastExperienceUpdate),
    last_synced_block: Number(currentBlock),
    last_synced_at: new Date().toISOString(),
  }, { onConflict: "address" });
}

async function syncTask(taskId: bigint, createdAtBlock: bigint, txHash: string) {
  const [creator, title, amount, token, experienceMin, experienceMax, status, fundingType, assignee, deadline, createdAt, kind, maxWinners] =
    (await client.readContract({
      address: CONTRACT_ADDRESS!,
      abi: taskifyAbi,
      functionName: "tasks",
      args: [taskId],
    })) as [string, string, bigint, string, number, number, number, number, string, bigint, bigint, number, number];

  const currentBlock = await client.getBlockNumber();
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  await supabase.from("tasks").upsert({
    id: Number(taskId),
    creator_address: creator.toLowerCase(),
    title,
    amount: amount.toString(),
    token_address: token.toLowerCase(),
    experience_min: experienceMin,
    experience_max: experienceMax,
    status: STATUS[status],
    funding_type: FUNDING_TYPE[fundingType].toLowerCase(),
    kind: KIND[kind].toLowerCase(),
    max_winners: maxWinners || null,
    assignee_address: assignee.toLowerCase() === zeroAddress ? null : assignee.toLowerCase(),
    deadline: toIso(deadline),
    created_at: toIso(createdAt),
    tx_hash_created: txHash,
    last_synced_block: Number(currentBlock),
    last_synced_at: new Date().toISOString(),
  }, { onConflict: "id" });
  void createdAtBlock;
}

async function syncPatron(address: string) {
  const [totalDeposited, mezoStaked, tier] = (await client.readContract({
    address: CONTRACT_ADDRESS!,
    abi: taskifyAbi,
    functionName: "patrons",
    args: [address],
  })) as [bigint, bigint, number];

  await supabase.from("patrons_onchain").upsert({
    address: address.toLowerCase(),
    total_deposited: totalDeposited.toString(),
    mezo_staked: mezoStaked.toString(),
    tier,
    last_synced_at: new Date().toISOString(),
  }, { onConflict: "address" });
}

async function syncGrantVote(taskId: bigint) {
  const [votesFor, votesAgainst, deadline, executed] = (await client.readContract({
    address: CONTRACT_ADDRESS!,
    abi: taskifyAbi,
    functionName: "grantVotes",
    args: [taskId],
  })) as [bigint, bigint, bigint, boolean];

  await supabase.from("grant_votes_onchain").upsert({
    task_id: Number(taskId),
    votes_for: votesFor.toString(),
    votes_against: votesAgainst.toString(),
    deadline: toIso(deadline),
    executed,
  }, { onConflict: "task_id" });
}

// ── Event handlers ──────────────────────────────────────────────────────────

async function handleLog(log: Log & { eventName?: string; args?: Record<string, unknown> }) {
  const name = log.eventName;
  const args = log.args ?? {};
  const blockNumber = log.blockNumber!;
  const txHash = log.transactionHash!;

  switch (name) {
    case "UserRegistered": {
      await syncUser(args.user as string);
      break;
    }
    case "ExperienceUpdated": {
      await syncUser(args.user as string);
      break;
    }
    case "TaskCreated": {
      await syncTask(args.taskId as bigint, blockNumber, txHash);
      break;
    }
    case "GrantApplied": {
      await syncTask(args.taskId as bigint, blockNumber, txHash);
      await syncGrantVote(args.taskId as bigint);
      break;
    }
    case "GrantVoted": {
      const taskId = args.taskId as bigint;
      const voter = (args.voter as string).toLowerCase();
      await supabase.from("grant_voters_onchain").upsert({
        task_id: Number(taskId),
        voter_address: voter,
        support: args.support as boolean,
        weight: (args.weight as bigint).toString(),
        voted_at: await blockTimestampIso(blockNumber),
      }, { onConflict: "task_id,voter_address" });
      await syncGrantVote(taskId);
      break;
    }
    case "GrantExecuted": {
      const taskId = args.taskId as bigint;
      await syncGrantVote(taskId);
      await supabase.from("grant_votes_onchain").update({ approved: args.approved as boolean }).eq("task_id", Number(taskId));
      await syncTask(taskId, blockNumber, txHash);
      break;
    }
    case "TaskApplied": {
      const taskId = args.taskId as bigint;
      const contributor = (args.contributor as string).toLowerCase();
      await supabase.from("task_applicants_onchain").upsert({
        task_id: Number(taskId),
        applicant_address: contributor,
        applied_at: await blockTimestampIso(blockNumber),
      }, { onConflict: "task_id,applicant_address" });
      break;
    }
    case "CommunityTaskJoined": {
      const taskId = args.taskId as bigint;
      const participant = (args.participant as string).toLowerCase();
      await supabase.from("task_applicants_onchain").upsert({
        task_id: Number(taskId),
        applicant_address: participant,
        applied_at: await blockTimestampIso(blockNumber),
      }, { onConflict: "task_id,applicant_address" });
      await supabase.from("community_submissions").upsert({
        task_id: Number(taskId),
        participant_address: participant,
        proof_url: args.proofUrl as string,
        joined_at: await blockTimestampIso(blockNumber),
      }, { onConflict: "task_id,participant_address" });
      break;
    }
    case "WinnersSelected": {
      const taskId = args.taskId as bigint;
      const winners = (args.winners as string[]).map(w => w.toLowerCase());
      await supabase.from("community_submissions").update({ is_winner: true }).eq("task_id", Number(taskId)).in("participant_address", winners);
      await supabase.from("tasks").update({ winners }).eq("id", Number(taskId));
      await syncTask(taskId, blockNumber, txHash);
      break;
    }
    case "TaskAssigned": {
      await syncTask(args.taskId as bigint, blockNumber, txHash);
      break;
    }
    case "TaskStarted":
    case "TaskSubmitted":
    case "TaskCancelled":
    case "TaskExpired": {
      await syncTask(args.taskId as bigint, blockNumber, txHash);
      break;
    }
    case "TaskFundsReleased": {
      const taskId = args.taskId as bigint;
      await syncTask(taskId, blockNumber, txHash);
      await syncUser(args.assignee as string);
      break;
    }
    case "WaveAdvanced": {
      const finishedWaveId = args.finishedWaveId as bigint;
      const [, startTime, poolAmount, totalTasks] = (await client.readContract({
        address: CONTRACT_ADDRESS!,
        abi: taskifyAbi,
        functionName: "getCurrentWave",
      })) as [bigint, bigint, bigint, bigint];
      const [snapPool, snapTasks] = (await client.readContract({
        address: CONTRACT_ADDRESS!,
        abi: taskifyAbi,
        functionName: "waveSnapshots",
        args: [finishedWaveId],
      })) as [bigint, bigint];
      const finishedAt = await blockTimestampIso(blockNumber);
      await supabase.from("wave_snapshots_onchain").upsert({
        wave_id: Number(finishedWaveId),
        pool_amount: snapPool.toString(),
        total_tasks: Number(snapTasks),
        started_at: finishedAt, // approximation — exact wave start isn't independently retrievable post-advance
        finished_at: finishedAt,
      }, { onConflict: "wave_id" });
      void startTime; void poolAmount; void totalTasks;
      break;
    }
    case "WaveRewardClaimed": {
      const waveId = args.waveId as bigint;
      const creator = (args.creator as string).toLowerCase();
      await supabase.from("wave_claims_onchain").upsert({
        wave_id: Number(waveId),
        creator_address: creator,
        reward_amount: (args.reward as bigint).toString(),
        claimed_at: await blockTimestampIso(blockNumber),
        tx_hash: txHash,
      }, { onConflict: "wave_id,creator_address" });
      break;
    }
    case "Deposited":
    case "MezoStaked":
    case "MezoUnstaked": {
      await syncPatron(args.patron as string);
      break;
    }
    default:
      break;
  }
}

// ── Resumable polling loop ──────────────────────────────────────────────────

async function getLastSyncedBlock(): Promise<bigint> {
  const { data } = await supabase.from("indexer_state").select("last_synced_block").eq("chain_id", CHAIN_ID).maybeSingle();
  if (data) return BigInt(data.last_synced_block);
  const start = DEPLOY_BLOCK ?? (await client.getBlockNumber());
  await supabase.from("indexer_state").upsert({ chain_id: CHAIN_ID, last_synced_block: Number(start) }, { onConflict: "chain_id" });
  return start;
}

async function setLastSyncedBlock(block: bigint) {
  await supabase.from("indexer_state").upsert({
    chain_id: CHAIN_ID,
    last_synced_block: Number(block),
    updated_at: new Date().toISOString(),
  }, { onConflict: "chain_id" });
}

async function runOnce(): Promise<void> {
  const latest = await client.getBlockNumber();
  let from = (await getLastSyncedBlock()) + 1n;
  if (from > latest) return;

  while (from <= latest) {
    const to = from + BLOCK_CHUNK - 1n > latest ? latest : from + BLOCK_CHUNK - 1n;
    const logs = await client.getContractEvents({
      address: CONTRACT_ADDRESS!,
      abi: taskifyAbi,
      fromBlock: from,
      toBlock: to,
    });
    for (const rawLog of logs) {
      const log = rawLog as Log & { eventName?: string; args?: Record<string, unknown> };
      try {
        await handleLog(log);
      } catch (err) {
        console.error(`Failed to process ${log.eventName} at block ${log.blockNumber} (tx ${log.transactionHash}):`, err);
      }
    }
    await setLastSyncedBlock(to);
    console.log(`Synced blocks ${from}–${to} (${logs.length} events)`);
    from = to + 1n;
  }
}

async function main() {
  const once = process.argv.includes("--once");
  console.log(`Taskify indexer starting — contract ${CONTRACT_ADDRESS}, chain ${CHAIN_ID}, rpc ${RPC_URL}`);
  if (once) {
    await runOnce();
    process.exit(0);
  }
  for (;;) {
    await runOnce().catch(err => console.error("Poll cycle failed:", err));
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main();
