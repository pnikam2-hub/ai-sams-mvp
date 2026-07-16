import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// ============================================
// Browser client (for client components)
// ============================================
export function createClientBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBrowserClient(url, key);
}

// ============================================
// Server client (for API routes)
// Alias: createClientServer (used by API routes)
// ============================================
export function createClientServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Alias for the same function (used by ai-score route)
export function createClientAdmin() {
  return createClientServer();
}
