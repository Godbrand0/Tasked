// Turns a send/read failure into a short, non-sensitive reason code the client
// can show, so a failing top-up can be diagnosed from the browser instead of
// needing the server logs. Only a category and a scrubbed, truncated message
// leave the server — never URLs (an RPC URL can embed an API key), keys or
// stack traces.

export type GasDripReason =
  | "insufficient_funds" // the sponsor wallet can't cover amount + fee
  | "wrong_chain"        // chain id mismatch between our config and the node
  | "nonce"              // nonce too low / already known / replacement underpriced
  | "rpc_rejected"       // the node refused the request (rate limit, 4xx, method blocked)
  | "timeout"
  | "unknown";

const scrub = (s: string) => s.replace(/https?:\/\/\S+/gi, "[url]").replace(/0x[0-9a-fA-F]{40,}/g, "[hex]").replace(/\s+/g, " ").trim().slice(0, 140);

type Layer = { name?: string; shortMessage?: string; details?: string; message?: string; status?: number; cause?: unknown };

// viem wraps failures in generic outer errors — e.g. an insufficient-balance
// failure while estimating gas surfaces as TransactionExecutionError "Missing or
// invalid parameters" — so the real reason is in the nested `cause` chain. Walk
// it (bounded, cycle-safe) and classify on all of it, reporting the deepest layer.
function layers(err: unknown): Layer[] {
  const out: Layer[] = [];
  const seen = new Set<unknown>();
  let cur: unknown = err;
  while (cur && typeof cur === "object" && !seen.has(cur) && out.length < 8) {
    seen.add(cur);
    out.push(cur as Layer);
    cur = (cur as Layer).cause;
  }
  return out;
}

export function classifyGasDripError(err: unknown): { reason: GasDripReason; detail: string } {
  const chain = layers(err);
  const text = chain
    .map((l) => `${l.shortMessage ?? ""} ${l.details ?? ""} ${l.message ?? ""}`)
    .join(" ")
    .toLowerCase();
  const root = chain[chain.length - 1];
  const outer = chain[0];
  // Outer layer says what we were doing; the root says why it failed.
  const rootText = root ? (root.details ?? root.shortMessage ?? root.message ?? "") : "";
  const detail = scrub(
    chain.length > 1 && root !== outer ? `${outer?.name ?? "Error"} -> ${root?.name ?? "Error"}: ${rootText}` : `${outer?.name ?? "Error"}: ${outer?.shortMessage ?? outer?.details ?? outer?.message ?? ""}`,
  );

  let reason: GasDripReason = "unknown";
  if (/insufficient funds|insufficient balance|exceeds the balance/.test(text)) reason = "insufficient_funds";
  else if (/chain id|chainid|invalid sender|wrong chain/.test(text)) reason = "wrong_chain";
  else if (/nonce|already known|already in mempool|replacement transaction underpriced|underpriced/.test(text)) reason = "nonce";
  else if (/timed out|timeout|aborted/.test(text)) reason = "timeout";
  else if (/http request failed|rate limit|too many requests|429|403|401|status: ?4\d\d|does not exist|not available|rpc request failed|unauthorized|forbidden/.test(text) || chain.some((l) => l.status && l.status >= 400)) reason = "rpc_rejected";
  return { reason, detail };
}
