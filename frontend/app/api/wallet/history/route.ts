import { NextRequest, NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { MUSD_ADDRESS, MEZO_ADDRESS } from "@/lib/taskify";
import { MEZO_IS_TESTNET } from "@/lib/constants";

// MUSD / MEZO transfer history for /wallet, proxied from Mezo's Blockscout API.
// Proxied rather than called from the browser so we don't depend on the
// explorer's CORS policy and can cache briefly. Reading Transfer logs straight
// off the public RPC is unreliable (it sheds load — see app/providers.tsx).
//
// The explorer API lives on its own host (api.explorer.mezo.org), not the UI
// host. Testnet has no default here: set MEZO_EXPLORER_API_URL to enable it.

const API_URL =
  process.env.MEZO_EXPLORER_API_URL ?? (MEZO_IS_TESTNET ? "" : "https://api.explorer.mezo.org");

const TOKENS = new Map<string, "MUSD" | "MEZO">();
if (MUSD_ADDRESS) TOKENS.set(MUSD_ADDRESS.toLowerCase(), "MUSD");
if (MEZO_ADDRESS) TOKENS.set(MEZO_ADDRESS.toLowerCase(), "MEZO");

// Blockscout's next-page cursor; only these keys are forwarded upstream.
const CURSOR_KEYS = ["block_number", "index", "items_count"] as const;

interface ExplorerTransfer {
  block_number: number;
  log_index: number;
  timestamp: string;
  method?: string | null;
  transaction_hash: string;
  from: { hash: string };
  to: { hash: string };
  token: { address: string; symbol?: string };
  total: { value: string };
}

export async function GET(req: NextRequest) {
  if (!API_URL) return NextResponse.json({ error: "Transfer history isn't available on this network." }, { status: 503 });

  const rawAddress = req.nextUrl.searchParams.get("address") ?? "";
  if (!isAddress(rawAddress)) return NextResponse.json({ error: "A valid address is required" }, { status: 400 });
  const address = getAddress(rawAddress);

  const upstream = new URL(`${API_URL}/api/v2/addresses/${address}/token-transfers`);
  upstream.searchParams.set("type", "ERC-20");
  for (const key of CURSOR_KEYS) {
    const v = req.nextUrl.searchParams.get(key);
    if (v && /^\d+$/.test(v)) upstream.searchParams.set(key, v);
  }

  let data: { items?: ExplorerTransfer[]; next_page_params?: Record<string, unknown> | null };
  try {
    const res = await fetch(upstream, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`explorer responded ${res.status}`);
    data = await res.json();
  } catch (err) {
    console.error("[wallet-history] explorer request failed:", err);
    return NextResponse.json({ error: "Couldn't load history right now — try again shortly." }, { status: 502 });
  }

  const me = address.toLowerCase();
  const items = (data.items ?? []).flatMap((t) => {
    const token = TOKENS.get(t.token?.address?.toLowerCase());
    if (!token) return []; // other tokens in the wallet aren't ours to show
    const outgoing = t.from.hash.toLowerCase() === me;
    return [{
      hash: t.transaction_hash,
      logIndex: t.log_index,
      timestamp: t.timestamp,
      direction: outgoing ? ("out" as const) : ("in" as const),
      counterparty: outgoing ? t.to.hash : t.from.hash,
      token,
      value: t.total.value, // raw base units as a string — never a float
      method: t.method ?? null,
    }];
  });

  const cursor = data.next_page_params
    ? Object.fromEntries(CURSOR_KEYS.flatMap((k) => (data.next_page_params?.[k] != null ? [[k, String(data.next_page_params[k])]] : [])))
    : null;

  return NextResponse.json(
    { items, next: cursor },
    { headers: { "Cache-Control": "private, max-age=10" } }, // private: it's per-address, keep it out of shared caches
  );
}
