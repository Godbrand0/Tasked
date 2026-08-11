import "server-only";
import { createPublicClient, http } from "viem";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { TASKIFY_ABI, TASKIFY_ADDRESS, ROLE_ID } from "@/lib/taskify";

const RPC_URL = process.env.NEXT_PUBLIC_MEZO_RPC_URL || "https://rpc.test.mezo.org";

// Role lives on-chain only (no indexer running yet — see supabase/schema.sql's
// "ON-CHAIN CACHE" section), so "who is a patron" can't be answered from
// Supabase alone. `profiles` has one row for every address that's ever
// touched the app (registration, comments, applications, etc.), so it's
// used as the candidate list, then each is checked on-chain for the
// investor role. Fine at today's scale; would need batching/multicall if
// the user base grows large enough for this to get slow.
export async function getPatronAddresses(): Promise<string[]> {
  const contractAddress = TASKIFY_ADDRESS;
  if (!supabaseAdmin || !contractAddress) return [];

  const { data } = await supabaseAdmin.from("profiles").select("address");
  const addresses = (data ?? []).map(r => r.address as string);
  if (addresses.length === 0) return [];

  const client = createPublicClient({ transport: http(RPC_URL) });
  const results = await Promise.all(
    addresses.map(async (addr) => {
      try {
        const user = await client.readContract({
          address: contractAddress,
          abi: TASKIFY_ABI,
          functionName: "users",
          args: [addr as `0x${string}`],
        }) as readonly [string, number, ...unknown[]];
        return user[1] === ROLE_ID.investor ? addr : null;
      } catch {
        return null;
      }
    })
  );

  return results.filter((a): a is string => a !== null);
}
