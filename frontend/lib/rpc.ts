import { MEZO_IS_TESTNET } from "@/lib/constants";

// Mezo RPC endpoints, in the order they're tried. One keyless endpoint isn't
// enough: dRPC's free tier rejects bursts of requests with HTTP 400 / "the method
// eth_call does not exist / is not available" (see app/providers.tsx), and the
// task form makes a handful of reads at once. Wrapping several endpoints in
// viem's `fallback` transport moves a failed request to the next one.
//
// Validation Cloud goes first: in a 30-request burst test it was the steadiest
// of Mezo's four documented public endpoints and supports everything the app
// uses (batching, multicall, fee history, estimateGas). The other two documented
// ones (Boar, Imperator) dropped requests under the same test, so they're left out.
//
// NEXT_PUBLIC_MEZO_RPC_URL, if set, is tried before all of these — put a
// dedicated/keyed endpoint there. (It ships to the browser, so use a key that is
// origin-restricted or rate-limited per origin.)
const MAINNET_PUBLIC_RPCS = ["https://mainnet.mezo.public.validationcloud.io", "https://mezo.drpc.org"];

export const MEZO_RPC_URLS: string[] = (() => {
  const urls = [process.env.NEXT_PUBLIC_MEZO_RPC_URL, ...(MEZO_IS_TESTNET ? [] : MAINNET_PUBLIC_RPCS)].filter(
    (u): u is string => Boolean(u),
  );
  return urls.length > 0 ? [...new Set(urls)] : ["https://mezo.drpc.org"];
})();
