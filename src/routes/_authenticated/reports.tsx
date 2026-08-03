import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { reportsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — AI Employee Marketplace" },
      { name: "description", content: "Every deliverable your AI employees have produced." },
      { property: "og:title", content: "AI Employee Reports" },
      { property: "og:description", content: "Every deliverable your AI employees produced." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data, isLoading } = useQuery(reportsQuery);

  return (
    <AppShell title="Reports" description="Deliverables produced by your AI team">
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-4">
          {data.map((report) => (
            <article
              key={report.id}
              className="rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-secondary px-2.5 py-1 font-medium uppercase">
                  {report.type}
                </span>
                <span>{new Date(report.created_at).toLocaleString()}</span>
              </div>
              <h2 className="mt-3 font-bold">{report.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{report.summary}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-14 text-center text-sm text-muted-foreground">
          No reports yet. Assign a task to an AI employee to generate one.
        </div>
      )}
    </AppShell>
  );
}
