import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createPublicClient, createWalletClient, defineChain, getAddress, http, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyGasGrant } from "@/lib/gas-grant";
import { TASKIFY_ABI, TASKIFY_ADDRESS } from "@/lib/taskify";

// One-time gas sponsorship for first-time contributors. Mezo's gas token is
// BTC, so a brand-new wallet can't call registerUser until it holds some —
// a wall for someone whose whole reason for being here is to *earn* MUSD.
// /register calls this silently on the way to registration when the wallet
// has no BTC; the user never sees a "gas" step.
//
// Farm resistance is by economics, not by cryptography: one drip per Google
// `sub` (proven by a short-lived token from the OAuth callback), and the
// drip is sized to a few cents — less than a throwaway Google account costs,
// so farming is net-negative. A daily cap bounds the worst case regardless.
//
// Dormant unless fully configured. See GAS_DRIP.md for the design, the
// eligibility rules, calibration, and the kill switch.

const RPC_URL = process.env.NEXT_PUBLIC_MEZO_RPC_URL || "https://mezo.drpc.org";
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_MEZO_CHAIN_ID ?? 31612);
const PRIVATE_KEY = process.env.GAS_DRIP_PRIVATE_KEY as `0x${string}` | undefined;
const IP_SALT = process.env.GAS_DRIP_SECRET || "";

function bigintEnv(name: string): bigint | null {
  const v = process.env[name];
  if (!v) return null;
  try { return BigInt(v); } catch { return null; }
}
const AMOUNT_WEI = bigintEnv("GAS_DRIP_AMOUNT_WEI");
const MIN_SIGNER_BALANCE_WEI = bigintEnv("GAS_DRIP_MIN_SIGNER_BALANCE_WEI") ?? BigInt(0);
const DAILY_CAP = Number(process.env.GAS_DRIP_DAILY_CAP ?? "0");

const mezoChain = defineChain({
  id: CHAIN_ID,
  name: "Mezo",
  nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

export async function POST(req: NextRequest) {
  // Feature is entirely off unless every piece is configured.
  if (
    !supabaseAdmin ||
    !PRIVATE_KEY ||
    !AMOUNT_WEI || AMOUNT_WEI <= BigInt(0) ||
    DAILY_CAP <= 0 ||
    !TASKIFY_ADDRESS
  ) {
    return NextResponse.json({ error: "Gas sponsorship isn't available right now." }, { status: 503 });
  }
  const sb = supabaseAdmin;
  const amountWei = AMOUNT_WEI;
  const taskifyAddress = TASKIFY_ADDRESS;
  const privateKey = PRIVATE_KEY;

  const body = await req.json().catch(() => null);
  const rawAddress = typeof body?.address === "string" ? body.address : "";
  const gasGrant = typeof body?.gasGrant === "string" ? body.gasGrant : null;

  if (!isAddress(rawAddress) || !gasGrant) {
    return NextResponse.json({ error: "address and gasGrant are required" }, { status: 400 });
  }
  const address = getAddress(rawAddress);
  const addressLc = address.toLowerCase();

  // 1. Google identity — the dedupe key is the stable `sub`, not the email.
  //    No wallet-control signature: it never protected against farming (a
  //    farmer owns all their fake wallets), only against the non-threat of
  //    funding a stranger's fresh address. Dropping it keeps the flow silent.
  const sub = verifyGasGrant(gasGrant);
  if (!sub) {
    return NextResponse.json({ error: "Google verification expired — reconnect Google and try again." }, { status: 401 });
  }

  // 2. Friendly pre-check for the dedupe (the unique constraints below are the real guard)
  const { data: seen } = await sb
    .from("gas_drips")
    .select("id")
    .or(`google_sub.eq.${sub},address.eq.${addressLc}`)
    .limit(1);
  if (seen && seen.length > 0) {
    return NextResponse.json({ error: "This account has already received a one-time gas top-up." }, { status: 409 });
  }

  // 3. Global daily cap (kill switch: set GAS_DRIP_DAILY_CAP=0)
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count: recent } = await sb
    .from("gas_drips")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if ((recent ?? 0) >= DAILY_CAP) {
    return NextResponse.json({ error: "Daily gas-sponsorship limit reached — try again tomorrow, or fund your wallet manually." }, { status: 429 });
  }

  const publicClient = createPublicClient({ chain: mezoChain, transport: http(RPC_URL) });

  // 4. Wallet must be brand-new and not already registered on Taskify
  let txCount: number;
  let balance: bigint;
  let role: number;
  try {
    const [count, bal, userRow] = await Promise.all([
      publicClient.getTransactionCount({ address }),
      publicClient.getBalance({ address }),
      publicClient.readContract({
        address: taskifyAddress,
        abi: TASKIFY_ABI,
        functionName: "users",
        args: [address],
      }) as Promise<readonly unknown[]>,
    ]);
    txCount = count;
    balance = bal;
    role = Number((userRow as readonly unknown[])[1] ?? 0);
  } catch (err) {
    console.error("[gas-drip] chain read failed:", err);
    return NextResponse.json({ error: "Couldn't reach Mezo just now — try again shortly." }, { status: 502 });
  }
  if (txCount > 0 || balance > BigInt(0)) {
    return NextResponse.json({ error: "This wallet isn't new — one-time top-ups are for fresh wallets only." }, { status: 409 });
  }
  if (role !== 0) {
    return NextResponse.json({ error: "This wallet is already registered on Taskify." }, { status: 409 });
  }

  // 5. Reserve the slot BEFORE sending — the unique constraints reject a
  //    concurrent second request here, so no double-send.
  const ipHash = IP_SALT
    ? crypto.createHmac("sha256", IP_SALT).update((req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ?? "").digest("hex")
    : null;
  const { error: reserveErr } = await sb
    .from("gas_drips")
    .insert({ google_sub: sub, address: addressLc, amount: amountWei.toString(), ip_hash: ipHash });
  if (reserveErr) {
    if (reserveErr.code === "23505") {
      return NextResponse.json({ error: "This account has already received a one-time gas top-up." }, { status: 409 });
    }
    console.error("[gas-drip] reserve insert failed:", reserveErr);
    return NextResponse.json({ error: "Something went wrong — try again shortly." }, { status: 500 });
  }

  const releaseReservation = async () => {
    await sb
      .from("gas_drips")
      .delete()
      .eq("google_sub", sub)
      .is("tx_hash", null);
  };

  // 6. Sponsor wallet must have enough left (fail closed)
  const account = privateKeyToAccount(privateKey);
  let signerBalance: bigint;
  try {
    signerBalance = await publicClient.getBalance({ address: account.address });
  } catch {
    await releaseReservation();
    return NextResponse.json({ error: "Gas sponsorship is temporarily unavailable." }, { status: 503 });
  }
  if (signerBalance < amountWei + MIN_SIGNER_BALANCE_WEI) {
    console.error("[gas-drip] sponsor wallet float low:", signerBalance.toString());
    await releaseReservation();
    return NextResponse.json({ error: "Gas sponsorship is temporarily unavailable — please fund your wallet manually." }, { status: 503 });
  }

  // 7. Send
  const walletClient = createWalletClient({ account, chain: mezoChain, transport: http(RPC_URL) });
  let txHash: `0x${string}`;
  try {
    txHash = await walletClient.sendTransaction({ to: address, value: amountWei });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
  } catch (err) {
    console.error("[gas-drip] send failed:", err);
    await releaseReservation();
    return NextResponse.json({ error: "The gas top-up transaction failed — try again shortly." }, { status: 502 });
  }

  // 8. Finalise the reservation with the real hash
  const { error: finalErr } = await sb
    .from("gas_drips")
    .update({ tx_hash: txHash })
    .eq("google_sub", sub);
  if (finalErr) {
    // The BTC already went out — log loudly, don't fail the user.
    console.error("[gas-drip] failed to finalise record after send:", finalErr, { sub, addressLc, txHash });
  }

  return NextResponse.json({ txHash });
}
