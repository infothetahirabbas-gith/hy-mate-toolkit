import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type EmployeeReview = {
  author: string;
  title: string;
  rating: number;
  body: string;
};

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
  main_responsibility: string;
  personality: string[];
  daily_tasks: string[];
  business_benefits: string[];
  target_customers: string[];
  integrations: string[];
  reviews: EmployeeReview[];
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
