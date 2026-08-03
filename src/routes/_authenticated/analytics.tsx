import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, Clock, FileText, Loader2, TrendingUp, Users } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { analyticsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — AI Employee Marketplace" },
      {
        name: "description",
        content: "Measure output, success rate and time saved by your AI workforce.",
      },
      { property: "og:title", content: "AI Workforce Analytics" },
      {
        property: "og:description",
        content: "Measure output, success rate and time saved by your AI workforce.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data, isLoading } = useQuery(analyticsQuery);

  const totals = data?.totals;
  const months = data?.months ?? [];
  const peak = Math.max(1, ...months.map((m) => m.tasks));

  const cards = [
    { label: "Tasks run", value: totals?.tasks ?? 0, icon: Activity },
    { label: "Completed", value: totals?.completed ?? 0, icon: CheckCircle2 },
    { label: "Success rate", value: `${totals?.successRate ?? 0}%`, icon: TrendingUp },
    { label: "Hours saved", value: `${totals?.hoursSaved ?? 0}h`, icon: Clock },
    { label: "Reports", value: totals?.reports ?? 0, icon: FileText },
    { label: "Active employees", value: totals?.activeEmployees ?? 0, icon: Users },
  ];

  return (
    <AppShell title="Analytics" description="How your AI workforce is performing">
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-border bg-card p-6 shadow-soft"
              >
                <card.icon className="size-5 text-primary" />
                <div className="mt-4 font-display text-3xl font-bold tracking-tight">
                  {card.value}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{card.label}</div>
              </div>
            ))}
          </div>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-bold">Task volume, last 6 months</h2>
            <div className="mt-8 flex h-48 items-end gap-3">
              {months.map((month) => (
                <div key={month.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{month.tasks}</span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-primary transition-all duration-700"
                    style={{ height: `${Math.max(4, (month.tasks / peak) * 100)}%` }}
                  />
                  <span className="text-xs text-muted-foreground">{month.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-bold">Most used AI employees</h2>
            {data && data.leaderboard.length > 0 ? (
              <ul className="mt-5 space-y-4">
                {data.leaderboard.map((row) => (
                  <li key={row.name} className="grid gap-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{row.name}</span>
                      <span className="font-mono text-muted-foreground">{row.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${(row.count / (data.leaderboard[0]?.count || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Run a few tasks and usage insights will appear here.
              </p>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}
