import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only — uses the service_role key, which bypasses every RLS policy
// in supabase/schema.sql. Only ever import this from API routes / server
// code, never from a "use client" component (the `server-only` import above
// makes that a build error, not just a convention).
//
// Why this exists at all: writes are RLS-gated on `auth.jwt() ->> 'address'`
// matching the row's address, which requires real Sign-In-With-Ethereum auth
// we haven't built yet. Until then, API routes use this client to write on
// a user's behalf, trusting the address the client sends. That's a known,
// deliberate gap — anyone can currently claim any address in a request body
// — acceptable for comments/applications today, not for anything that
// moves value (which stays on-chain and enforced by Taskify.sol regardless).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = url && serviceRoleKey ? createClient(url, serviceRoleKey) : null;
