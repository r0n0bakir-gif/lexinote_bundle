import { createBrowserClient } from "@supabase/ssr";
import { getRequiredPublicEnv } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const { supabaseUrl, supabaseAnonKey } = getRequiredPublicEnv();

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  );
}
