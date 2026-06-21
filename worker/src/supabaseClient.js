import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set both in Render → Environment.'
  );
}

// The Playwright Docker base image ships Node 20, which has no native
// WebSocket global — supabase-js's realtime client needs one regardless of
// whether we actually use realtime features, so we hand it the `ws` package.
export const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});
