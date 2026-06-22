"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { TIERS } from "@/lib/constants";

type FundingType = "self" | "grant";

export default function CreatePage() {
  const [fundingType, setFundingType] = useState<FundingType>("self");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expMin, setExpMin] = useState(0);
  const [expMax, setExpMax] = useState(4);
  const [deadline, setDeadline] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fee = fundingType === "self" ? 0.03 : 0.05;
  const numAmount = parseFloat(amount) || 0;
  const feeAmt = numAmount * fee;
  const netAmt = numAmount - feeAmt;
  const valid = title.trim().length > 0 && numAmount >= 1 && expMin <= expMax;

  function handleSubmit() {
    if (!valid) return;
    setSubmitting(true);
    setTimeout(() => setSubmitting(false), 2000);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F" }}>
      <Navbar />

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "#F0F0F5", margin: "0 0 8px", letterSpacing: "-0.02em" }}>Post a Task</h1>
          <p style={{ fontSize: 15, color: "#7070A0", margin: 0 }}>Lock USDX in escrow and match the right contributors on-chain.</p>
        </div>

        {/* Funding type toggle */}
        <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 14, padding: 6, display: "flex", gap: 4, marginBottom: 32 }}>
          {(["self", "grant"] as FundingType[]).map((type) => (
            <button key={type} onClick={() => setFundingType(type)}
              style={{ flex: 1, background: fundingType === type ? "#F7931A" : "transparent", color: fundingType === type ? "#0A0A0F" : "#9090B0", fontWeight: 700, fontSize: 14, padding: "10px", borderRadius: 10, border: "none", cursor: "pointer", transition: "all 0.15s" }}>
              {type === "self" ? "Self-Funded (3% fee)" : "Apply for Grant (5% fee)"}
            </button>
          ))}
        </div>

        {fundingType === "grant" && (
          <div style={{ background: "#5546FF0D", border: "1px solid #5546FF30", borderRadius: 12, padding: 16, marginBottom: 28, fontSize: 13, color: "#8B80FF", lineHeight: 1.7 }}>
            Grant tasks enter a <strong>3-day community voting period</strong>. Patrons vote using their USDX deposit weight + STX stake. If approved, USDX from the patron pool is released into escrow.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Title */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#9090B0", display: "block", marginBottom: 8 }}>Task Title <span style={{ color: "#F87171" }}>*</span></label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Build Stacks DeFi Analytics Dashboard" maxLength={200}
              style={{ width: "100%", background: "#111116", border: "1px solid #1E1E2A", borderRadius: 10, padding: "12px 14px", fontSize: 15, color: "#F0F0F5", outline: "none", boxSizing: "border-box" }}
              onFocus={(e) => (e.target.style.borderColor = "#F7931A50")}
              onBlur={(e) => (e.target.style.borderColor = "#1E1E2A")} />
            <div style={{ fontSize: 12, color: "#5050708", marginTop: 4, textAlign: "right" }}>{title.length}/200</div>
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#9090B0", display: "block", marginBottom: 8 }}>Description <span style={{ color: "#F87171" }}>*</span></label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the task scope, deliverables, and any technical requirements..." rows={5}
              style={{ width: "100%", background: "#111116", border: "1px solid #1E1E2A", borderRadius: 10, padding: "12px 14px", fontSize: 14, color: "#F0F0F5", outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.7, boxSizing: "border-box" }}
              onFocus={(e) => (e.target.style.borderColor = "#F7931A50")}
              onBlur={(e) => (e.target.style.borderColor = "#1E1E2A")} />
          </div>

          {/* Amount + fee breakdown */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#9090B0", display: "block", marginBottom: 8 }}>
              {fundingType === "self" ? "Bounty Amount (USDX)" : "Requested Amount (USDX)"} <span style={{ color: "#F87171" }}>*</span>
            </label>
            <div style={{ position: "relative" }}>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 500" min="1"
                style={{ width: "100%", background: "#111116", border: "1px solid #1E1E2A", borderRadius: 10, padding: "12px 60px 12px 14px", fontSize: 15, color: "#F0F0F5", outline: "none", boxSizing: "border-box" }}
                onFocus={(e) => (e.target.style.borderColor = "#F7931A50")}
                onBlur={(e) => (e.target.style.borderColor = "#1E1E2A")} />
              <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 13, fontWeight: 700, color: "#F7931A" }}>USDX</span>
            </div>
            {numAmount >= 1 && (
              <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 10, padding: "14px 16px", marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#7070A0" }}>Gross deposit</span>
                  <span style={{ color: "#F0F0F5", fontWeight: 600 }}>{numAmount.toLocaleString()} USDX</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#7070A0" }}>Protocol fee ({fee * 100}%)</span>
                  <span style={{ color: "#9090B0" }}>−{feeAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDX</span>
                </div>
                <div style={{ height: 1, background: "#1E1E2A" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: "#9090B0", fontWeight: 600 }}>Contributor receives</span>
                  <span style={{ color: "#00D395", fontWeight: 700 }}>{netAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDX</span>
                </div>
              </div>
            )}
          </div>

          {/* Experience range */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#9090B0", display: "block", marginBottom: 8 }}>Experience Range <span style={{ color: "#F87171" }}>*</span></label>
            <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                {(["min", "max"] as const).map((bound) => (
                  <div key={bound}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#7070A0", marginBottom: 8 }}>{bound === "min" ? "Minimum" : "Maximum"}</div>
                    <select value={bound === "min" ? expMin : expMax} onChange={(e) => bound === "min" ? setExpMin(Number(e.target.value)) : setExpMax(Number(e.target.value))}
                      style={{ width: "100%", background: "#18181F", border: "1px solid #1E1E2A", borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "#F0F0F5", outline: "none", cursor: "pointer" }}>
                      {TIERS.map((t) => <option key={t.id} value={t.id} disabled={bound === "max" ? t.id < expMin : t.id > expMax}>{t.label} — {t.years}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {TIERS.filter((t) => t.id >= expMin && t.id <= expMax).map((t) => (
                  <span key={t.id} style={{ background: t.bg, color: t.color, border: `1px solid ${t.color}30`, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{t.label}</span>
                ))}
              </div>
            </div>
            {expMin > expMax && <div style={{ fontSize: 12, color: "#F87171", marginTop: 6 }}>Minimum must be ≤ maximum</div>}
          </div>

          {/* Deadline — only for self-funded */}
          {fundingType === "self" && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#9090B0", display: "block", marginBottom: 8 }}>Deadline Block <span style={{ color: "#F87171" }}>*</span></label>
              <input type="number" value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="e.g. 162000 (current block + ~30 days)"
                style={{ width: "100%", background: "#111116", border: "1px solid #1E1E2A", borderRadius: 10, padding: "12px 14px", fontSize: 15, color: "#F0F0F5", outline: "none", boxSizing: "border-box" }}
                onFocus={(e) => (e.target.style.borderColor = "#F7931A50")}
                onBlur={(e) => (e.target.style.borderColor = "#1E1E2A")} />
              <div style={{ fontSize: 12, color: "#7070A0", marginTop: 4 }}>Current testnet block: ~150,000 · ~144 blocks/day · ~4,320 blocks/month</div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#9090B0", display: "block", marginBottom: 8 }}>Tags <span style={{ color: "#7070A0", fontWeight: 400 }}>(optional)</span></label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. React, Clarity, TypeScript (comma separated)"
              style={{ width: "100%", background: "#111116", border: "1px solid #1E1E2A", borderRadius: 10, padding: "12px 14px", fontSize: 14, color: "#F0F0F5", outline: "none", boxSizing: "border-box" }}
              onFocus={(e) => (e.target.style.borderColor = "#F7931A50")}
              onBlur={(e) => (e.target.style.borderColor = "#1E1E2A")} />
          </div>

          {/* Submit */}
          <div style={{ background: "#F7931A0A", border: "1px solid #F7931A20", borderRadius: 12, padding: 16, fontSize: 13, color: "#9090B0", lineHeight: 1.6 }}>
            {fundingType === "self"
              ? <>Your wallet will be prompted to transfer <strong style={{ color: "#F7931A" }}>{numAmount || "..."} USDX</strong> into escrow via <code style={{ color: "#F7931A", fontSize: 11 }}>create-task</code>. A post-condition will assert the exact amount leaving your account.</>
              : <>Clicking <strong style={{ color: "#F0F0F5" }}>Submit Grant Application</strong> calls <code style={{ color: "#F7931A", fontSize: 11 }}>apply-for-grant</code>. No USDX leaves your wallet — community patrons vote on whether to fund from the grant pool.</>}
          </div>

          <button disabled={!valid || submitting} onClick={handleSubmit}
            style={{ background: valid ? "#F7931A" : "#1E1E2A", color: valid ? "#0A0A0F" : "#50507088", fontWeight: 700, fontSize: 16, padding: "16px", borderRadius: 12, border: "none", cursor: valid ? "pointer" : "not-allowed", transition: "all 0.15s", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Submitting on-chain…" : fundingType === "self" ? "Lock Escrow & Post Task →" : "Submit Grant Application →"}
          </button>
        </div>
      </div>
    </div>
  );
}
