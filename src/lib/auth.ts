import { createClient, hasSupabaseConfig } from "@/lib/supabase/server";

export async function getCurrentUser() {
  if (!hasSupabaseConfig()) {
    return { supabase: null, user: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null };
  }

  return { supabase, user };
}
