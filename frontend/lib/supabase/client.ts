import { createClient } from '@supabase/supabase-js';

// Client-side Supabase client
// Used in client components
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// Singleton instance for browser
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabase() {
  if (!browserClient) {
    browserClient = createBrowserClient();
  }
  return browserClient;
}
