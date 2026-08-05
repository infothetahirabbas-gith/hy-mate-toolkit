import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type EmployeeReview = {
  author: string;
  title: string;
  rating: number;
  body: string;
};

export type SkillLevel = { name: string; level: string };
export type ToolStatus = { name: string; status: string };
export type PortfolioItem = { title: string; type: string; summary: string };
export type EmployeeFaq = { q: string; a: string };

export type CatalogEmployee = {
  id: string;
  slug: string;
  name: string;
  role_title: string;
  category: string;
  tagline: string;
  description: string;
  features: string[];
  skills: string[];
  price_monthly: number;
  accent: string;
  workspace_input_label: string;
  workspace_input_placeholder: string;
  gender: string;
  department: string;
  department_slug: string | null;
  team_slug: string | null;
  main_responsibility: string;
  personality: string[];
  daily_tasks: string[];
  business_benefits: string[];
  target_customers: string[];
  integrations: string[];
  reviews: EmployeeReview[];
  rating: number;
  review_count: number;
  businesses_served: number;
  verified: boolean;
  version: string;
  last_updated_on: string;
  languages: string[];
  experience_years: number;
  hours_saved_monthly: number;
  cost_savings_monthly: number;
  success_rate: number;
  tasks_completed: number;
  avg_completion_minutes: number;
  satisfaction: number;
  intro_line: string | null;
  skill_levels: SkillLevel[];
  tool_status: ToolStatus[];
  portfolio: PortfolioItem[];
  faqs: EmployeeFaq[];
};

export const listEmployees = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient, CATALOG_COLUMNS } = await import("./catalog.server");
  const { data, error } = await publicClient()
    .from("ai_employees")
    .select(CATALOG_COLUMNS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CatalogEmployee[];
});

export const getEmployeeBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const { publicClient, CATALOG_COLUMNS } = await import("./catalog.server");
    const { data: row, error } = await publicClient()
      .from("ai_employees")
      .select(CATALOG_COLUMNS)
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (row as unknown as CatalogEmployee | null) ?? null;
  });
