import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(projectUrl && publishableKey);

let browserClient: SupabaseClient | undefined;

export function getSupabaseClient() {
  if (!isSupabaseConfigured) return null;

  if (!browserClient) {
    browserClient = createClient(projectUrl!, publishableKey!);
  }

  return browserClient;
}
