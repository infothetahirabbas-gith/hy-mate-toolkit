import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { tasksQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — AI Employee Marketplace" },
      { name: "description", content: "Track every task your AI employees are working on." },
      { property: "og:title", content: "AI Employee Tasks" },
      { property: "og:description", content: "Track every task your AI employees are working on." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TasksPage,
});

const FILTERS = ["all", "pending", "processing", "completed", "failed"] as const;

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-primary-soft text-primary",
  processing: "bg-accent/15 text-accent-foreground",
  pending: "bg-muted text-muted-foreground",
  failed: "bg-destructive/10 text-destructive",
};

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="size-4" />;
  if (status === "failed") return <XCircle className="size-4" />;
  if (status === "processing") return <Loader2 className="size-4 animate-spin" />;
  return <Clock className="size-4" />;
}

function TasksPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const { data, isLoading } = useQuery(tasksQuery);

  const tasks = (data ?? []).filter((task) => filter === "all" || task.status === filter);

  return (
    <AppShell title="Tasks" description="Everything you have assigned to your AI workforce">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize transition-colors",
              filter === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
            )}
          >
            {value}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : tasks.length > 0 ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="grid gap-3 border-b border-border p-5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
                      STATUS_STYLES[task.status] ?? "bg-muted text-muted-foreground",
                    )}
                  >
                    <StatusIcon status={task.status} />
                    {task.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(task.created_at).toLocaleString()}
                  </span>
                </div>
                <h2 className="mt-2 truncate font-semibold">{task.task_name}</h2>
                <p className="truncate text-sm text-muted-foreground">
                  {task.employee?.name ?? "AI employee"} · {task.employee?.role_title ?? task.task_type}
                </p>
              </div>
              {task.employee ? (
                <Button asChild size="sm" variant="outline">
                  <Link to="/workspace/$slug" params={{ slug: task.employee.slug }}>
                    Open workspace
                  </Link>
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-14 text-center text-sm text-muted-foreground">
          No tasks in this view yet. Brief an AI employee from their workspace to get started.
        </div>
      )}
    </AppShell>
  );
}
