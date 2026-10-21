"use client";

import { type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { getAddress } from "viem";
import { formatAddress } from "@/lib/wallet-context";
import { useCopy } from "@/lib/use-copy";
import { IconCheck, IconCopy } from "@/components/icons";

const COPIED_MS = 1800;

function checksum(value: string) {
  try {
    return getAddress(value);
  } catch {
    return value;
  }
}

// A wallet address with a click-to-copy button. Displays the truncated
// address by default (or `children` when a call site needs custom display),
// but always copies the full checksummed address.
export default function Address({
  value,
  children,
  className,
  style,
}: {
  value: string;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const { copied, copy } = useCopy(COPIED_MS);

  async function handleCopy(e: MouseEvent<HTMLButtonElement>) {
    // Addresses often sit inside a <Link> to the profile — copying shouldn't navigate.
    e.preventDefault();
    e.stopPropagation();
    await copy(checksum(value));
  }

  return (
    <span className={className ? `address-copy ${className}` : "address-copy"} style={style}>
      {children ?? formatAddress(value)}
      <button
        type="button"
        onClick={handleCopy}
        className="address-copy-btn"
        data-copied={copied}
        aria-label={copied ? "Address copied" : "Copy address"}
        title={copied ? "Copied" : "Copy address"}
      >
        {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
      </button>
    </span>
  );
}
