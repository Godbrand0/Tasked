import "server-only";
import { PrivyClient } from "@privy-io/node";

// Server-side Privy client. Null (feature off) until both the public app id
// and PRIVY_APP_SECRET are set — callers must treat null as "not configured".
const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const APP_SECRET = process.env.PRIVY_APP_SECRET;

export const privyServer: PrivyClient | null =
  APP_ID && APP_SECRET ? new PrivyClient({ appId: APP_ID, appSecret: APP_SECRET }) : null;
