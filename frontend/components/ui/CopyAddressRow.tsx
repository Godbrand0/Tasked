"use client";

import type { MouseEvent } from "react";
import { useCopy } from "@/lib/use-copy";
import { IconCopy, IconCheck } from "@/components/icons";

/**
 * A labelled "Copy address" row for wallet menus (the connected-wallet dropdowns
 * on the landing navbar and the app Navbar). Clicking copies the full address,
 * flips the icon/label to "Copied" for ~2s, and keeps the menu open.
 *
 * Per issue #6: the row is explicit and labelled (unlike the hover-icon on
 * <Address />), and sits above the Disconnect action.
 */
export default function CopyAddressRow({ address }: { address: string }) {
  const { copied, copy } = useCopy(2000);

  async function onCopy(e: MouseEvent<HTMLButtonElement>) {
    // The row lives inside a dropdown that is itself inside clickable chrome;
    // stop the event so the menu doesn't close or navigate.
    e.preventDefault();
    e.stopPropagation();
    await copy(address);
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="wallet-dropdown-item"
      aria-label={copied ? "Address copied" : "Copy address"}
      title={copied ? "Copied" : "Copy address"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 12px",
        borderRadius: "var(--radius-sm)",
        fontSize: 13,
        color: copied ? "var(--success)" : "var(--text-soft)",
        fontWeight: 600,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        transition: "background 0.1s",
      }}
    >
      {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
      {copied ? "Copied" : "Copy address"}
    </button>
  );
}
