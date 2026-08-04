import { createServerFn } from "@tanstack/react-start";

export type Department = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  icon: string | null;
  sort_order: number;
};

export const listDepartments = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient } = await import("./catalog.server");
  const { data, error } = await publicClient()
    .from("departments")
    .select("id, name, slug, tagline, description, icon, sort_order")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Department[];
});
