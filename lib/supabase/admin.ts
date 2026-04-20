// lib/supabase/admin.ts

import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client menggunakan service role key.
 * HANYA dipakai di server-side (Route Handlers / Server Actions).
 * Jangan pernah ekspos ke client.
 */
export const createAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
};
