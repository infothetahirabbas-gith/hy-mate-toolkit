import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  Columns3,
  Eye,
  List,
  Loader2,
  Play,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { TaskDialog } from "@/components/app/TaskDialog";
import { Button } from "@/components/ui/button";
import { workforceTasksQuery } from "@/lib/queries";
import { runTask, setTaskStatus, TASK_STATUSES } from "@/lib/workforce.functions";
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

const FILTERS = ["all", ...TASK_STATUSES] as const;

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-primary-soft text-primary",
  review: "bg-accent/15 text-accent-foreground",
  processing: "bg-accent/15 text-accent-foreground",
  incomplete: "bg-muted text-muted-foreground",
  failed: "bg-destructive/10 text-destructive",
};

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-destructive/10 text-destructive",
  high: "bg-accent/15 text-accent-foreground",
  medium: "bg-muted text-muted-foreground",
  low: "bg-muted text-muted-foreground",
};

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="size-4" />;
  if (status === "failed") return <XCircle className="size-4" />;
  if (status === "processing") return <Loader2 className="size-4 animate-spin" />;
  if (status === "review") return <Eye className="size-4" />;
  return <Clock className="size-4" />;
}

function TasksPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [view, setView] = useState<"list" | "board">("list");
  const { data, isLoading } = useQuery(workforceTasksQuery);
  const queryClient = useQueryClient();

  const move = useMutation({
    mutationFn: (vars: { taskId: string; status: (typeof TASK_STATUSES)[number] }) =>
      setTaskStatus({ data: vars }),
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (error: Error) => toast.error(error.message),
  });

  const run = useMutation({
    mutationFn: (taskId: string) => runTask({ data: { taskId } }),
    onMutate: () => toast.info("Your AI employee is starting work…"),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Task complete — ready for review");
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries();
      toast.error(error.message);
    },
  });

  const all = data ?? [];
  const tasks = all.filter((task) => filter === "all" || task.status === filter);

  return (
    <AppShell
      title="Tasks"
      description="Everything you have assigned to your AI workforce"
      actions={<TaskDialog />}
    >
      <div className="flex flex-wrap items-center gap-2">
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
        <div className="ml-auto flex overflow-hidden rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setView("list")}
            aria-label="List view"
            className={cn("px-3 py-1.5", view === "list" && "bg-muted")}
          >
            <List className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("board")}
            aria-label="Board view"
            className={cn("px-3 py-1.5", view === "board" && "bg-muted")}
          >
            <Columns3 className="size-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : view === "board" ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          {TASK_STATUSES.map((status) => {
            const column = all.filter((task) => task.status === status);
            return (
              <div key={status} className="rounded-2xl border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between px-1 pb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide">{status}</span>
                  <span className="text-xs text-muted-foreground">{column.length}</span>
                </div>
                <div className="space-y-2">
                  {column.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-xl border border-border bg-card p-3 shadow-soft"
                    >
                      <div className="text-sm font-medium">{task.task_name}</div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {task.employee?.name ?? "AI employee"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                            PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES["medium"],
                          )}
                        >
                          {task.priority}
                        </span>
                        {task.deadline ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            {new Date(task.deadline).toLocaleDateString()}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {status === "incomplete" || status === "failed" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={run.isPending}
                            onClick={() => run.mutate(task.id)}
                          >
                            <Play />
                            Run
                          </Button>
                        ) : null}
                        {status === "review" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              move.mutate({ taskId: task.id, status: "completed" })
                            }
                          >
                            Approve
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {column.length === 0 ? (
                    <p className="px-1 py-6 text-center text-xs text-muted-foreground">Empty</p>
                  ) : null}
                </div>
              </div>
            );
          })}
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
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                      PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES["medium"],
                    )}
                  >
                    {task.priority}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(task.created_at).toLocaleString()}
                  </span>
                </div>
                <h2 className="mt-2 truncate font-semibold">{task.task_name}</h2>
                <p className="truncate text-sm text-muted-foreground">
                  {task.employee?.name ?? "AI employee"} ·{" "}
                  {task.employee?.role_title ?? task.task_type}
                  {task.tools_required.length ? ` · ${task.tools_required.join(", ")}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {task.status === "incomplete" || task.status === "failed" ? (
                  <Button
                    size="sm"
                    variant="hero"
                    disabled={run.isPending}
                    onClick={() => run.mutate(task.id)}
                  >
                    <Play />
                    Run task
                  </Button>
                ) : null}
                {task.status === "review" ? (
                  <Button
                    size="sm"
                    variant="hero"
                    onClick={() => move.mutate({ taskId: task.id, status: "completed" })}
                  >
                    Approve
                  </Button>
                ) : null}
                {task.employee ? (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/workspace/$slug" params={{ slug: task.employee.slug }}>
                      Workspace
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-14 text-center text-sm text-muted-foreground">
          No tasks in this view yet. Create one to put your AI workforce to work.
        </div>
      )}
    </AppShell>
  );
}
