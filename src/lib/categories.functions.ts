import { createServerFn } from "@tanstack/react-start";

export type EmployeeCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tagline: string | null;
  icon: string | null;
  sort_order: number;
};

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient } = await import("./catalog.server");
  const { data, error } = await publicClient()
    .from("ai_employee_categories")
    .select("id, name, slug, description, tagline, icon, sort_order")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as EmployeeCategory[];
});
