"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface AvatarProps {
  src?: string;
  alt: string;
  size: number;
  radius?: number | string;
  gradient: string;
  fontSize?: number;
  style?: React.CSSProperties;
}

// Shows the real avatar when one loads successfully; otherwise falls back to
// an initial-letter badge on the given gradient — never a bare neutral
// background, which reads as invisible in light mode when no letter shows.
export default function Avatar({ src, alt, size, radius = "50%", gradient, fontSize, style }: AvatarProps) {
  const [errored, setErrored] = useState(false);
  useEffect(() => setErrored(false), [src]);

  const showImage = Boolean(src) && !errored;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: "hidden",
        position: "relative",
        background: gradient,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: fontSize ?? Math.round(size * 0.4),
        fontWeight: 800,
        color: "white",
        flexShrink: 0,
        ...style,
      }}
    >
      {showImage ? (
        <Image src={src as string} alt={alt} fill sizes={`${size}px`} style={{ objectFit: "cover" }} onError={() => setErrored(true)} />
      ) : (
        (alt || "?").charAt(0).toUpperCase()
      )}
    </div>
  );
}
