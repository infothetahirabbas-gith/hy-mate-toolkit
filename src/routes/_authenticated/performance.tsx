import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Star } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import { performanceQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/performance")({
  head: () => ({
    meta: [
      { title: "Workforce Performance — AI Employee Marketplace" },
      {
        name: "description",
        content: "Track output, success rate and time saved for every AI employee you hired.",
      },
      { property: "og:title", content: "AI Workforce Performance" },
      {
        property: "og:description",
        content: "Track output, success rate and time saved for every AI employee you hired.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PerformancePage,
});

function PerformancePage() {
  const { data, isLoading } = useQuery(performanceQuery);

  return (
    <AppShell
      title="Performance"
      description="How each AI employee on your team is performing"
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-4">
          {data.map((row) => (
            <article
              key={row.employeeId}
              className="rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
                <EmployeeAvatar name={row.name} accent={row.accent} className="shrink-0" />
                <div className="min-w-0">
                  <h2 className="truncate font-bold">{row.name}</h2>
                  <p className="truncate text-sm text-muted-foreground">{row.roleTitle}</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/workspace/$slug" params={{ slug: row.slug }}>
                    Open workspace
                  </Link>
                </Button>
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
                {[
                  { label: "Tasks", value: row.tasks },
                  { label: "Completed", value: row.completed },
                  { label: "Reports", value: row.reports },
                  { label: "Hours saved", value: `${row.hoursSaved}h` },
                  { label: "Success rate", value: `${row.successRate}%` },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-muted/60 p-4">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {stat.label}
                    </dt>
                    <dd className="mt-1 font-display text-xl font-bold">{stat.value}</dd>
                  </div>
                ))}
              </dl>

              {row.rating !== null ? (
                <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Star className="size-4 fill-accent text-accent" />
                  <span className="font-semibold text-foreground">{row.rating}</span> average rating
                  from your feedback
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-14 text-center">
          <p className="text-sm text-muted-foreground">
            Hire an AI employee and their performance will show up here.
          </p>
          <Button asChild className="mt-4">
            <Link to="/marketplace">Browse the marketplace</Link>
          </Button>
        </div>
      )}
    </AppShell>
  );
}
