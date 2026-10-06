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

export function classifyGasDripError(err: unknown): { reason: GasDripReason; detail: string } {
  const e = err as { shortMessage?: string; message?: string; details?: string; name?: string; status?: number } | undefined;
  const text = `${e?.shortMessage ?? ""} ${e?.details ?? ""} ${e?.message ?? ""}`.toLowerCase();
  const detail = scrub(`${e?.name ?? "Error"}: ${e?.shortMessage ?? e?.details ?? e?.message ?? ""}`);

  let reason: GasDripReason = "unknown";
  if (/insufficient funds|exceeds the balance|insufficient balance/.test(text)) reason = "insufficient_funds";
  else if (/chain id|chainid|invalid sender|wrong chain/.test(text)) reason = "wrong_chain";
  else if (/nonce|already known|replacement transaction underpriced|underpriced/.test(text)) reason = "nonce";
  else if (/timed out|timeout|aborted/.test(text)) reason = "timeout";
  else if (/http request failed|rate limit|too many requests|429|403|401|400|status: ?4\d\d|does not exist|not available|rpc request failed|unauthorized|forbidden/.test(text) || (e?.status && e.status >= 400)) reason = "rpc_rejected";
  return { reason, detail };
}
