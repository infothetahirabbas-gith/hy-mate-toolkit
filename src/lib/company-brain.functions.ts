import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Company Brain (P0.1)
//
// This file adds the fields the generated Supabase `Database` type does not
// yet know about (it can only be regenerated with the Supabase CLI, which
// isn't available in this environment). To keep the rest of the app fully
// typed we scope the `as any` escape hatches to this file only.

export type CompanyBrainProfile = {
    business_model: string | null;
    products: string | null;
    services: string | null;
    locations: string | null;
    pricing: string | null;
    target_markets: string | null;
    logo_url: string | null;
    brand_voice: string | null;
    brand_messaging: string | null;
    brand_positioning: string | null;
    brand_style_guidelines: string | null;
    brand_colors: string | null;
    target_customer: string | null;
    customer_personas: string | null;
    pain_points: string | null;
    customer_journeys: string | null;
    revenue_target: string | null;
    lead_target: string | null;
    marketing_target: string | null;
    growth_target: string | null;
};

export type Competitor = {
    id: string;
    user_id: string;
    name: string;
    website: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
};

const companyBrainProfileSchema = z.object({
    business_model: z.string().trim().max(600).default(""),
    products: z.string().trim().max(1000).default(""),
    services: z.string().trim().max(1000).default(""),
    locations: z.string().trim().max(600).default(""),
    pricing: z.string().trim().max(600).default(""),
    target_markets: z.string().trim().max(600).default(""),
    logo_url: z.string().trim().max(500).default(""),
    brand_voice: z.string().trim().max(800).default(""),
    brand_messaging: z.string().trim().max(800).default(""),
    brand_positioning: z.string().trim().max(800).default(""),
    brand_style_guidelines: z.string().trim().max(1200).default(""),
    brand_colors: z.string().trim().max(300).default(""),
    target_customer: z.string().trim().max(600).default(""),
    customer_personas: z.string().trim().max(1500).default(""),
    pain_points: z.string().trim().max(1000).default(""),
    customer_journeys: z.string().trim().max(1500).default(""),
    revenue_target: z.string().trim().max(200).default(""),
    lead_target: z.string().trim().max(200).default(""),
    marketing_target: z.string().trim().max(200).default(""),
    growth_target: z.string().trim().max(200).default(""),
});

// Reads the Company Brain-owned columns from business_profiles. Returns
// null values for a brand-new user who has not saved anything yet.
export const getCompanyBrainProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
        const { data, error } = await context.supabase
          .from("business_profiles")
          .select("*")
          .eq("user_id", context.userId)
          .maybeSingle();

               if (error) throw new Error(error.message);
        return (data ?? null) as (CompanyBrainProfile & { business_name?: string | null }) | null;
  });

// Saves the Company Brain-owned columns only. Deliberately does not touch
// business_name / website / industry / country / goals / brand_info /
// primary_goal / target_audience, which remain owned by the onboarding flow
// (saveBusinessProfile in account.functions.ts) so the two forms can never
// stomp on each other's data.
export const saveCompanyBrainProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => companyBrainProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
        const { error } = await (context.supabase.from("business_profiles") as any).upsert(
          { ...data, user_id: context.userId },
          { onConflict: "user_id" },
              );

               if (error) throw new Error(error.message);
        return { ok: true };
  });

export const listCompetitors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
        const { data, error } = await (context.supabase.from("company_competitors") as any)
          .select("*")
          .eq("user_id", context.userId)
          .order("created_at", { ascending: false });

               if (error) throw new Error(error.message);
        return (data ?? []) as Competitor[];
  });

const competitorSchema = z.object({
    name: z.string().trim().min(1).max(160),
    website: z.string().trim().max(300).default(""),
    notes: z.string().trim().max(1000).default(""),
});

export const addCompetitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => competitorSchema.parse(input))
  .handler(async ({ data, context }) => {
        const { error } = await (context.supabase.from("company_competitors") as any).insert({
                ...data,
                user_id: context.userId,
        });

               if (error) throw new Error(error.message);
        return { ok: true };
  });

const updateCompetitorSchema = competitorSchema.extend({
    id: z.string().uuid(),
});

export const updateCompetitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateCompetitorSchema.parse(input))
  .handler(async ({ data, context }) => {
        const { id, ...rest } = data;
        const { error } = await (context.supabase.from("company_competitors") as any)
          .update(rest)
          .eq("id", id)
          .eq("user_id", context.userId);

               if (error) throw new Error(error.message);
        return { ok: true };
  });

export const deleteCompetitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
        const { error } = await (context.supabase.from("company_competitors") as any)
          .delete()
          .eq("id", data.id)
          .eq("user_id", context.userId);

               if (error) throw new Error(error.message);
        return { ok: true };
  });
