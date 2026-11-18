import { createClient } from '@supabase/supabase-js';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Falls back to the project's public (publishable) credentials so the app works
// even when no .env file is present. These are safe to ship to the browser.
const supabaseUrl = envUrl || 'https://flatxeqlvqzupupunmza.supabase.co';
const supabaseAnonKey = envKey || 'sb_publishable_nJ3JX3eTTonuRLzxduPSVA_AW3mZL-y';

export const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseAnonKey);

if (!envUrl || !envKey) {
  console.info('[LostLink] Using default Supabase credentials (no .env found). Set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to override.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
