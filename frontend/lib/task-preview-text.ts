// Pure text helpers for link previews (kept free of server-only imports so they can be unit-tested).

/** Markdown task description -> a short plain-text snippet that reads well in a link card. */
export function plainSnippet(markdown: string | null | undefined, max = 200): string {
  if (!markdown) return "";
  let s = markdown
    .replace(/```[\s\S]*?```/g, " ")          // fenced code blocks
    .replace(/<[^>]+>/g, " ")                 // raw HTML tags
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")    // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")  // links -> their text
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")       // headings
    .replace(/^\s*>\s?/gm, "")                // blockquotes
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, "") // list markers
    .replace(/(\*\*|__)(.+?)\1/g, "$2")       // bold
    .replace(/[*`]/g, "")                     // stray emphasis / inline code marks
    .replace(/\s+/g, " ")
    .trim();
  if (s.length <= max) return s;
  s = s.slice(0, max);
  const lastSpace = s.lastIndexOf(" ");
  if (lastSpace > max * 0.6) s = s.slice(0, lastSpace);
  return `${s.replace(/[\s.,;:!?-]+$/, "")}…`;
}

/** 400000000000000000000n of an 18-decimal token -> "400"; 1.3 -> "1.3"; 3.00700001 -> "3.007". */
export function formatReward(raw: bigint, decimals = 18): string {
  const negative = raw < BigInt(0);
  const abs = negative ? -raw : raw;
  const base = BigInt(10) ** BigInt(decimals);
  const whole = abs / base;
  const frac = (abs % base).toString().padStart(decimals, "0").slice(0, 4).replace(/0+$/, "");
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${wholeStr}${frac ? `.${frac}` : ""}`;
}

/** Trim a title to fit a card without cutting a word in half where avoidable. */
export function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s.,;:!?-]+$/, "")}…`;
}
