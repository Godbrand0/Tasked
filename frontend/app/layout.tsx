import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "./providers";
import SiteFooter from "@/components/SiteFooter";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The host link scrapers should fetch cards from. In production that is the www address:
// the bare domain 308-redirects to it, and NEXT_PUBLIC_BASE_URL is set to the bare domain
// (it also feeds OAuth callbacks and email links, so it isn't changed here). An explicit
// NEXT_PUBLIC_SITE_URL overrides this; outside production we keep the local base URL.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === "production" ? "https://www.taskifybounties.com" : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000");

const SITE_DESCRIPTION =
  "Trustless task escrow, community-governed grant funding, and experience-matched or open-to-anyone bounties built on Mezo.";

export const metadata: Metadata = {
  // Resolves relative URLs in og:image / canonical to absolute ones; link scrapers need absolute URLs.
  metadataBase: new URL(SITE_URL),
  title: "Taskify: On-Chain Bounties for the Mezo Community",
  description: SITE_DESCRIPTION,
  openGraph: { type: "website", siteName: "Taskify", title: "Taskify: On-Chain Bounties for the Mezo Community", description: SITE_DESCRIPTION },
  twitter: { card: "summary_large_image", title: "Taskify: On-Chain Bounties for the Mezo Community", description: SITE_DESCRIPTION },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <Providers>
            {children}
            <SiteFooter />
          </Providers>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
