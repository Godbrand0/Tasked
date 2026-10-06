// Retry wrapper for a one-shot value transfer (the gas top-up).
//
// The free Mezo RPC sheds load intermittently (see app/providers.tsx), and a
// single failed JSON-RPC call anywhere inside a send — nonce, gas estimate,
// fees, broadcast — fails the whole thing. Retrying the send fixes the common
// case. The danger is retrying after the first attempt actually went out (the
// response got lost) and paying twice, so before each retry we ask `hasLanded`
// whether the recipient has already been funded and stop if so.

export type SendOutcome<H> =
  | { kind: "sent"; hash: H; attempts: number }
  | { kind: "landed-unknown-hash"; attempts: number } // an earlier attempt went through but we never got its hash
  | { kind: "failed"; attempts: number; errors: unknown[] };

export async function sendWithRetry<H>(opts: {
  send: () => Promise<H>;
  hasLanded: () => Promise<boolean>;
  attempts?: number;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  onError?: (err: unknown, attempt: number) => void;
}): Promise<SendOutcome<H>> {
  const attempts = opts.attempts ?? 3;
  const delayMs = opts.delayMs ?? 600;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const errors: unknown[] = [];

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return { kind: "sent", hash: await opts.send(), attempts: attempt };
    } catch (err) {
      errors.push(err);
      opts.onError?.(err, attempt);
      // The error may have come after broadcast. If the recipient is funded the
      // earlier attempt landed, so sending again would pay them twice.
      if (await opts.hasLanded().catch(() => false)) return { kind: "landed-unknown-hash", attempts: attempt };
      if (attempt < attempts) await sleep(delayMs * attempt);
    }
  }
  return { kind: "failed", attempts, errors };
}
