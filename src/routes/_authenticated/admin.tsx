import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { getAdminOverview } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — AI Employee Marketplace" },
      { name: "description", content: "Platform metrics, users and subscriptions." },
      { property: "og:title", content: "Admin" },
      { property: "og:description", content: "Platform metrics, users and subscriptions." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => getAdminOverview(),
    retry: false,
  });

  return (
    <AppShell title="Admin" description="Platform overview">
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-dashed border-border p-14 text-center text-sm text-muted-foreground">
          You don't have access to the admin area.
        </div>
      ) : data ? (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Users", value: data.metrics.totalUsers },
              { label: "Active subscriptions", value: data.metrics.activeSubscriptions },
              { label: "MRR", value: `$${data.metrics.mrr}` },
              { label: "Tasks run", value: data.metrics.tasksRun },
              { label: "Tasks completed", value: data.metrics.tasksCompleted },
              { label: "Reports generated", value: data.metrics.reportsGenerated },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft"
              >
                <div className="text-xs text-muted-foreground">{stat.label}</div>
                <div className="mt-1 text-2xl font-bold tracking-tight">{stat.value}</div>
              </div>
            ))}
          </div>

          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <h2 className="border-b border-border p-5 text-sm font-semibold">Recent users</h2>
            {data.users.slice(0, 15).map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-4 border-b border-border p-4 text-sm last:border-b-0"
              >
                <span className="min-w-0 flex-1 truncate">{user.name || "—"}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{user.email}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
