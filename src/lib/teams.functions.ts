import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { CatalogEmployee } from "./catalog.functions";

export type AiTeam = {
  id: string;
  slug: string;
  name: string;
  department_slug: string | null;
  tagline: string | null;
  description: string | null;
  price_monthly: number;
  sort_order: number;
};

const TEAM_COLUMNS = "id, slug, name, department_slug, tagline, description, price_monthly, sort_order";

export const listTeams = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient } = await import("./catalog.server");
  const { data, error } = await publicClient()
    .from("ai_teams")
    .select(TEAM_COLUMNS)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as AiTeam[];
});

export const getTeamContext = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ teamSlug: z.string().min(1).max(120), exclude: z.string().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { publicClient, CATALOG_COLUMNS } = await import("./catalog.server");
    const client = publicClient();

    const [teamResult, matesResult] = await Promise.all([
      client.from("ai_teams").select(TEAM_COLUMNS).eq("slug", data.teamSlug).maybeSingle(),
      client
        .from("ai_employees")
        .select(CATALOG_COLUMNS)
        .eq("team_slug", data.teamSlug)
        .eq("is_active", true)
        .neq("slug", data.exclude)
        .order("sort_order", { ascending: true })
        .limit(4),
    ]);

    if (teamResult.error) throw new Error(teamResult.error.message);
    if (matesResult.error) throw new Error(matesResult.error.message);

    return {
      team: (teamResult.data as unknown as AiTeam | null) ?? null,
      teammates: (matesResult.data ?? []) as unknown as CatalogEmployee[],
    };
  });
