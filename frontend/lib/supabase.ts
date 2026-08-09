import { createClient } from "@supabase/supabase-js";

// Browser-safe client — anon key only, gated entirely by the RLS policies in
// supabase/schema.sql (public read on every table; writes require a wallet's
// own address, which needs real Sign-In-With-Ethereum auth we don't have
// yet — see lib/supabase-admin.ts for how writes work in the meantime).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
