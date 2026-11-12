import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only — uses the service_role key, which bypasses every RLS policy
// in supabase/schema.sql. Only ever import this from API routes / server
// code, never from a "use client" component (the `server-only` import above
// makes that a build error, not just a convention).
//
// Why this exists at all: writes are RLS-gated on `auth.jwt() ->> 'address'`,
// which our Privy sessions don't populate, so API routes write on the user's
// behalf with this client. Because it bypasses RLS, every route that writes
// for an address MUST first prove the caller owns it with requireCaller()
// from lib/verify-caller.ts (or, for creator-only actions, check the on-chain
// creator via lib/task-onchain.ts). Never trust an address from the request body.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = url && serviceRoleKey ? createClient(url, serviceRoleKey) : null;
