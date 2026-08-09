// Stub for @coinbase/cdp-sdk, aliased in next.config.ts. RainbowKit's default
// Coinbase Wallet ("Base Account") connector statically imports CdpClient
// from this package purely for its x402 paid-API flow, which this app never
// uses (we don't include coinbaseWallet in our RainbowKit wallet list) — but
// the real package's x402 code imports several @x402/* packages we don't
// install, which breaks the build. This stub satisfies the import.
export class CdpClient {}
