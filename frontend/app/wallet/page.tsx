"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount, usePublicClient } from "wagmi";
import PageShell, { Container } from "@/components/ui/PageShell";
import Address from "@/components/ui/Address";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { IconSend, IconSpinner, IconCheck, IconAlertTriangle } from "@/components/icons";
import { MEZO_EXPLORER_URL } from "@/lib/constants";
import { useWallet } from "@/lib/wallet-context";
import { useTaskifyTx } from "@/lib/use-taskify";
import { ERC20_ABI, MEZO_ADDRESS, MUSD_ADDRESS, TASKIFY_ADDRESS } from "@/lib/taskify";
import { formatContractError } from "@/lib/errors";
import {
  SEND_TOKENS, chunkAddress, describeMethod, formatTokenAmount, parseTokenAmount,
  toInputAmount, validateRecipient, type SendToken,
} from "@/lib/send-tokens";

type Tab = "send" | "history";
type Step = "form" | "review" | "sending" | "done";

// Built-in Mezo token addresses that are NOT user wallets: sending to any of
// these is accepted by the chain and the funds are gone for good (verified for
// the MEZO token on mainnet).
const BTC_TOKEN = "0x7b7c000000000000000000000000000000000000";
function blockedRecipients(): Record<string, string> {
  const out: Record<string, string> = { [BTC_TOKEN]: "That's the BTC token contract, not a wallet — funds sent there are lost." };
  if (MUSD_ADDRESS) out[MUSD_ADDRESS.toLowerCase()] = "That's the MUSD token contract, not a wallet — funds sent there are lost.";
  if (MEZO_ADDRESS) out[MEZO_ADDRESS.toLowerCase()] = "That's the MEZO token contract, not a wallet — funds sent there are lost.";
  if (TASKIFY_ADDRESS) out[TASKIFY_ADDRESS.toLowerCase()] = "That's the Taskify contract — funds sent there can't be recovered. To fund a task, create one instead.";
  return out;
}

const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 };
const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--text-dim)", marginBottom: 6, display: "block" };
const input: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10,
  padding: "12px 14px", fontSize: 16, color: "var(--text)", outline: "none", fontFamily: "var(--font-geist-mono)",
};

export default function WalletPage() {
  return (
    <Suspense>
      <WalletPageInner />
    </Suspense>
  );
}

function WalletPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tab: Tab = params.get("tab") === "history" ? "history" : "send";
  const { address } = useAccount();
  const { connected, connect, musdRawBalance, mezoRawBalance, nativeBalance } = useWallet();

  const setTab = (t: Tab) => router.replace(`/wallet?tab=${t}`, { scroll: false });

  return (
    <PageShell>
      <Container maxWidth={720} style={{ padding: "32px 24px 64px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", margin: "0 0 6px", letterSpacing: "-0.02em" }}>Wallet</h1>
        <p style={{ fontSize: 14, color: "var(--text-dim)", margin: "0 0 20px" }}>Send the MUSD and MEZO you've earned to any wallet.</p>

        {!connected || !address ? (
          <div style={card}>
            <EmptyState size="lg" icon={IconSend} title="Connect your wallet" description="Connect to see your balances and send tokens."
              action={<Button variant="primary" size="sm" onClick={connect}>Connect Wallet</Button>} />
          </div>
        ) : (
          <>
            <div style={{ ...card, marginBottom: 16, padding: 20 }}>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12 }}>
                Your address <Address value={address} style={{ marginLeft: 6, fontFamily: "var(--font-geist-mono)", color: "var(--text-muted)" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                {[
                  { sym: "MUSD", amt: formatTokenAmount(musdRawBalance), color: "var(--success)" },
                  { sym: "MEZO", amt: formatTokenAmount(mezoRawBalance), color: "var(--primary)" },
                  { sym: "BTC (gas)", amt: formatTokenAmount(nativeBalance, 8), color: "var(--text-muted)" },
                ].map((b) => (
                  <div key={b.sym} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", minWidth: 0 }}>
                    <div className="figure" style={{ fontSize: 18, fontWeight: 800, color: b.color, overflowWrap: "anywhere" }}>{b.amt}</div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{b.sym}</div>
                  </div>
                ))}
              </div>
            </div>

            <div role="tablist" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {(["send", "history"] as Tab[]).map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className="btn-motion"
                  style={{ padding: "9px 18px", borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: "pointer", border: "1px solid var(--border)",
                    background: tab === t ? "var(--primary)" : "var(--surface)", color: tab === t ? "var(--on-primary)" : "var(--text-muted)" }}>
                  {t === "send" ? "Send" : "History"}
                </button>
              ))}
            </div>

            {tab === "send" ? <SendTab address={address} /> : <HistoryTab address={address} />}
          </>
        )}
      </Container>
    </PageShell>
  );
}

// ─── Send ────────────────────────────────────────────────────────────────────

function SendTab({ address }: { address: string }) {
  const { musdRawBalance, mezoRawBalance, nativeBalance, refetchTokenBalances } = useWallet();
  const publicClient = usePublicClient();
  const { send } = useTaskifyTx();

  const [token, setToken] = useState<SendToken>("MUSD");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [touched, setTouched] = useState({ to: false, amount: false });
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState("");
  const [isContract, setIsContract] = useState(false);
  const [ackContract, setAckContract] = useState(false);
  const [feeNote, setFeeNote] = useState("");
  const [txHash, setTxHash] = useState("");
  // Set when the transfer WAS broadcast but its confirmation timed out (useTaskifyTx
  // throws "Sent, but couldn't confirm…"). It may well have succeeded, so we must
  // not drop back to the review screen where a second click would send it again.
  const [unconfirmed, setUnconfirmed] = useState("");
  const [busy, setBusy] = useState(false);

  const balance = token === "MUSD" ? musdRawBalance : mezoRawBalance;
  const tokenAddr = token === "MUSD" ? MUSD_ADDRESS : MEZO_ADDRESS;
  const blocked = useMemo(blockedRecipients, []);

  const recipient = validateRecipient(to, { self: address, blocked });
  const parsed = parseTokenAmount(amount, balance);
  const formValid = recipient.ok && parsed.ok;

  // Review: checks that need the network — is the recipient a contract, and can
  // the wallet afford gas — before the user is asked to confirm anything.
  async function review() {
    setTouched({ to: true, amount: true });
    setError("");
    if (!recipient.ok || !parsed.ok || !publicClient || !tokenAddr) return;
    setBusy(true);
    try {
      if (nativeBalance === BigInt(0)) {
        setError("You need a little BTC in this wallet to pay the network fee. It's a fraction of a cent per transfer.");
        return;
      }
      const [code, gas, gasPrice] = await Promise.all([
        publicClient.getCode({ address: recipient.address }),
        publicClient.estimateContractGas({ address: tokenAddr, abi: ERC20_ABI, functionName: "transfer", args: [recipient.address, parsed.value], account: address as `0x${string}` }).catch(() => null),
        publicClient.getGasPrice().catch(() => null),
      ]);
      if (gas !== null && gasPrice !== null) {
        const fee = gas * gasPrice;
        if (nativeBalance < fee) {
          setError("Your BTC balance is too low to cover the network fee for this transfer.");
          return;
        }
        setFeeNote(`≈ ${formatTokenAmount(fee, 10)} BTC network fee`);
      } else {
        setFeeNote("");
      }
      setIsContract(Boolean(code && code !== "0x"));
      setAckContract(false);
      setStep("review");
    } catch {
      setError("Couldn't check this transfer right now — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!recipient.ok || !parsed.ok || !tokenAddr) return;
    setStep("sending");
    setError("");
    try {
      const receipt = await send("transfer", [recipient.address, parsed.value], { address: tokenAddr, abi: ERC20_ABI });
      if (receipt.status !== "success") throw new Error("The transfer was reverted on-chain.");
      setTxHash(receipt.transactionHash);
      setStep("done");
      void refetchTokenBalances();
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Sent, but")) {
        setUnconfirmed(err.message);
        setStep("done");
        void refetchTokenBalances();
        return;
      }
      setError(formatContractError(err, "Transfer failed. Nothing was sent."));
      setStep("review");
    }
  }

  function reset() {
    setTo(""); setAmount(""); setTouched({ to: false, amount: false }); setError(""); setTxHash(""); setUnconfirmed(""); setStep("form");
  }

  if (step === "done" && unconfirmed) {
    return (
      <div style={card}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", margin: "0 0 8px" }}>Submitted, confirmation delayed</h2>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.6 }}>
          Your transfer was sent to the network but we couldn't confirm it in time. It has probably gone through. Check the explorer before trying again so you don't send it twice.
        </p>
        <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "0 0 16px", overflowWrap: "anywhere" }}>{unconfirmed}</p>
        <Button variant="outline" size="sm" onClick={reset}>Done</Button>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div style={{ ...card, textAlign: "center" }}>
        <div style={{ color: "var(--success)", marginBottom: 10, display: "flex", justifyContent: "center" }}><IconCheck size={32} /></div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", margin: "0 0 6px" }}>Sent</h2>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 16px" }}>
          {parsed.ok ? formatTokenAmount(parsed.value, 18) : amount} {token} is on its way to{" "}
          <span style={{ fontFamily: "var(--font-geist-mono)" }}>{recipient.ok ? `${recipient.address.slice(0, 8)}…${recipient.address.slice(-6)}` : ""}</span>.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <a href={`${MEZO_EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noreferrer" className="btn-motion"
            style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", textDecoration: "none", border: "1px solid var(--border-strong)", borderRadius: 8, padding: "9px 16px" }}>
            View on explorer ↗
          </a>
          <Button variant="primary" size="sm" onClick={reset}>Send another</Button>
        </div>
      </div>
    );
  }

  if (step === "review" || step === "sending") {
    const sending = step === "sending";
    return (
      <div style={card}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", margin: "0 0 16px" }}>Review transfer</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <span style={label}>You send</span>
            <div className="figure" style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", overflowWrap: "anywhere" }}>
              {parsed.ok ? formatTokenAmount(parsed.value, 18) : amount} <span style={{ fontSize: 16, color: "var(--text-dim)" }}>{token}</span>
            </div>
          </div>
          <div>
            <span style={label}>To (check every character)</span>
            <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 15, color: "var(--text)", display: "flex", flexWrap: "wrap", gap: "2px 8px", lineHeight: 1.6 }}>
              {recipient.ok && chunkAddress(recipient.address).map((c, i) => <span key={i}>{c}</span>)}
            </div>
          </div>
          {feeNote && <div style={{ fontSize: 13, color: "var(--text-dim)" }}>{feeNote}</div>}
          {isContract && (
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--text-muted)", background: "color-mix(in srgb, var(--gold) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--gold) 30%, transparent)", borderRadius: 10, padding: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={ackContract} onChange={(e) => setAckContract(e.target.checked)} style={{ marginTop: 3 }} />
              <span><strong>This address is a smart contract</strong>, not a regular wallet. Some contracts can't return tokens sent to them. Only continue if you're sure it accepts them (e.g. an exchange deposit address or a Safe).</span>
            </label>
          )}
          <p style={{ fontSize: 12, color: "var(--text-dim)", margin: 0, lineHeight: 1.6 }}>Transfers are final. Taskify can't reverse or recover a transaction.</p>
          {error && <ErrorBox>{error}</ErrorBox>}
          <div style={{ display: "flex", gap: 10 }}>
            <button disabled={sending} onClick={() => { setError(""); setStep("form"); }} className="btn-motion"
              style={{ flex: 1, background: "transparent", border: "1px solid var(--border-strong)", color: "var(--text-muted)", fontWeight: 700, fontSize: 14, padding: 12, borderRadius: 10, cursor: sending ? "not-allowed" : "pointer" }}>
              Edit
            </button>
            <button disabled={sending || (isContract && !ackContract)} onClick={confirm} className="btn-motion"
              style={{ flex: 2, background: "var(--primary)", color: "var(--on-primary)", border: "none", fontWeight: 700, fontSize: 14, padding: 12, borderRadius: 10, display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
                cursor: sending || (isContract && !ackContract) ? "not-allowed" : "pointer", opacity: sending || (isContract && !ackContract) ? 0.6 : 1 }}>
              {sending ? <><IconSpinner size={16} /> Confirm in your wallet…</> : "Confirm & send"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={card}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <span style={label}>Token</span>
          <div style={{ display: "flex", gap: 8 }}>
            {SEND_TOKENS.map((t) => (
              <button key={t} onClick={() => { setToken(t); setAmount(""); setTouched((s) => ({ ...s, amount: false })); }} className="btn-motion"
                style={{ flex: 1, padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
                  border: `1px solid ${token === t ? "var(--primary)" : "var(--border)"}`, background: token === t ? "color-mix(in srgb, var(--primary) 9%, transparent)" : "var(--surface-2)", color: token === t ? "var(--primary)" : "var(--text-muted)" }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="send-to" style={label}>Recipient address</label>
          <input id="send-to" value={to} onChange={(e) => setTo(e.target.value)} onBlur={() => setTouched((s) => ({ ...s, to: true }))}
            placeholder="0x…" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} style={input} />
          {touched.to && !recipient.ok && <FieldError>{recipient.error}</FieldError>}
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <label htmlFor="send-amount" style={label}>Amount</label>
            <button type="button" onClick={() => { setAmount(toInputAmount(balance)); setTouched((s) => ({ ...s, amount: true })); }}
              style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, marginBottom: 6 }}>
              Max · {formatTokenAmount(balance)} {token}
            </button>
          </div>
          <input id="send-amount" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => setTouched((s) => ({ ...s, amount: true }))}
            placeholder="0.0" inputMode="decimal" autoComplete="off" style={input} />
          {touched.amount && !parsed.ok && <FieldError>{parsed.error}</FieldError>}
        </div>
        {error && <ErrorBox>{error}{" "}{nativeBalance === BigInt(0) && <Link href="/faq" style={{ color: "var(--primary)" }}>How to get BTC on Mezo →</Link>}</ErrorBox>}
        <button disabled={busy || (touched.to && touched.amount && !formValid)} onClick={review} className="btn-motion"
          style={{ background: "var(--primary)", color: "var(--on-primary)", border: "none", fontWeight: 700, fontSize: 15, padding: 14, borderRadius: 10, cursor: busy ? "wait" : "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
            opacity: busy || (touched.to && touched.amount && !formValid) ? 0.6 : 1 }}>
          {busy ? <><IconSpinner size={16} /> Checking…</> : "Review transfer"}
        </button>
      </div>
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <div role="alert" style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>{children}</div>;
}
function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--danger) 19%, transparent)", borderRadius: 10, padding: "10px 14px" }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}><IconAlertTriangle size={14} /></span><span>{children}</span>
    </div>
  );
}

// ─── History ─────────────────────────────────────────────────────────────────

interface HistoryItem {
  hash: string; logIndex: number; timestamp: string; direction: "in" | "out";
  counterparty: string; token: SendToken; value: string; method: string | null;
}
type Cursor = Record<string, string> | null;

function HistoryTab({ address }: { address: string }) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [next, setNext] = useState<Cursor>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (cursor: Cursor, replace: boolean) => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ address, ...(cursor ?? {}) });
      const res = await fetch(`/api/wallet/history?${qs}`);
      const data: { items?: HistoryItem[]; next?: Cursor; error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't load history.");
      setItems((prev) => (replace ? data.items ?? [] : [...prev, ...(data.items ?? [])]));
      setNext(data.next ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load history.");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { void load(null, true); }, [load]);

  if (!loading && !error && items.length === 0) {
    return <div style={card}><EmptyState size="lg" icon={IconSend} title="No transfers yet" description="MUSD and MEZO you send or receive will show up here." /></div>;
  }

  return (
    <div style={{ ...card, padding: 0, overflow: "hidden" }}>
      {items.map((t) => {
        const incoming = t.direction === "in";
        const why = describeMethod(t.method, t.direction);
        return (
          <a key={`${t.hash}-${t.logIndex}`} href={`${MEZO_EXPLORER_URL}/tx/${t.hash}`} target="_blank" rel="noreferrer" className="table-row"
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid var(--border)", textDecoration: "none", color: "inherit" }}>
            <div aria-hidden style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800,
              background: incoming ? "color-mix(in srgb, var(--success) 12%, transparent)" : "var(--surface-2)", color: incoming ? "var(--success)" : "var(--text-muted)" }}>
              {incoming ? "↓" : "↑"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{why ?? (incoming ? "Received" : "Sent")}</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-geist-mono)", overflow: "hidden", textOverflow: "ellipsis" }}>
                {incoming ? "from" : "to"} {t.counterparty.slice(0, 8)}…{t.counterparty.slice(-6)} · {new Date(t.timestamp).toLocaleDateString()}
              </div>
            </div>
            <div className="figure" style={{ fontSize: 14, fontWeight: 700, color: incoming ? "var(--success)" : "var(--text)", textAlign: "right", flexShrink: 0 }}>
              {incoming ? "+" : "−"}{formatTokenAmount(BigInt(t.value))} {t.token}
            </div>
          </a>
        );
      })}
      {loading && <div style={{ padding: 20, display: "flex", justifyContent: "center", color: "var(--text-dim)" }}><IconSpinner size={18} /></div>}
      {error && <div style={{ padding: 16 }}><ErrorBox>{error}</ErrorBox></div>}
      {!loading && next && (
        <button onClick={() => load(next, false)} className="btn-motion"
          style={{ width: "100%", padding: 14, background: "transparent", border: "none", color: "var(--primary)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          Load more
        </button>
      )}
      {!loading && error && (
        <button onClick={() => load(null, true)} className="btn-motion" style={{ width: "100%", padding: 14, background: "transparent", border: "none", color: "var(--primary)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Try again</button>
      )}
    </div>
  );
}
