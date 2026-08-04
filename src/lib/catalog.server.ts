import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const CATALOG_COLUMNS =
  "id, slug, name, role_title, category, tagline, description, features, skills, price_monthly, accent, workspace_input_label, workspace_input_placeholder, gender, department, department_slug, main_responsibility, personality, daily_tasks, business_benefits, target_customers, integrations, reviews";

export function publicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Backend is not configured.");

  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}
