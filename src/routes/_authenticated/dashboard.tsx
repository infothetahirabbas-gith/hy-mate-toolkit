import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Gauge,
  Loader2,
  Plug,
  Rocket,
  Sparkles,
  Timer,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app/AppShell";
import { TaskDialog } from "@/components/app/TaskDialog";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import { dashboardQuery, workforceQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "AI Workforce Command Center — AI Employee Marketplace" },
      {
        name: "description",
        content: "Manage your AI employees, tasks, reports and performance in one command center.",
      },
      { property: "og:title", content: "AI Workforce Command Center" },
      { property: "og:description", content: "Track AI employees, tasks and reports." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

const WORKING_STATUS: Record<string, { label: string; className: string }> = {
  working: { label: "Working", className: "bg-primary-soft text-primary" },
  active: { label: "Active", className: "bg-primary-soft text-primary" },
  waiting: { label: "Waiting for setup", className: "bg-muted text-muted-foreground" },
  paused: { label: "Paused", className: "bg-muted text-muted-foreground" },
  error: { label: "Needs attention", className: "bg-destructive/10 text-destructive" },
};

function DashboardPage() {
  const { data, isLoading } = useQuery(workforceQuery);
  const { data: overview } = useQuery(dashboardQuery);

  const s = data?.summary;
  const stats = [
    { label: "Active AI employees", value: s?.activeEmployees ?? 0, icon: Users },
    { label: "Total tasks", value: s?.totalTasks ?? 0, icon: Gauge },
    { label: "Completed", value: s?.completed ?? 0, icon: CheckCircle2 },
    { label: "In progress", value: s?.processing ?? 0, icon: Loader2 },
    { label: "Pending", value: s?.pending ?? 0, icon: Clock },
    { label: "Reports", value: s?.reports ?? 0, icon: FileText },
    { label: "Time saved", value: `${s?.hoursSaved ?? 0}h`, icon: Timer },
    { label: "Monthly cost", value: `$${s?.monthlyCost ?? 0}`, icon: Wallet },
  ];

  return (
    <AppShell
      title="AI Workforce Command Center"
      description="Your AI team, their work and their output — live"
      actions={
        <>
          <TaskDialog />
          <Button asChild size="sm" variant="outline">
            <Link to="/marketplace">
              Hire
              <ArrowRight />
            </Link>
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {!overview?.onboarded ? (
            <div className="flex flex-col gap-4 rounded-2xl border border-primary/30 bg-primary-soft p-6 sm:flex-row sm:items-center">
              <Sparkles className="size-6 shrink-0 text-primary" />
              <div className="flex-1">
                <h2 className="font-semibold">Finish your business onboarding</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your AI employees produce far better work once they know your business, audience
                  and goals.
                </p>
              </div>
              <Button asChild>
                <Link to="/onboarding">
                  Complete setup
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft"
              >
                <stat.icon className="size-5 text-primary" />
                <div className="mt-4 text-2xl font-bold tracking-tight">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>

          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Your AI roster</h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/my-employees">Manage</Link>
              </Button>
            </div>

            {data && data.roster.length > 0 ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {data.roster.map((member) => {
                  const status = WORKING_STATUS[member.workingStatus] ?? WORKING_STATUS["active"]!;
                  return (
                    <div
                      key={member.subscriptionId}
                      className="rounded-2xl border border-border bg-card p-5 shadow-soft"
                    >
                      <div className="flex items-start gap-4">
                        <EmployeeAvatar
                          name={member.employee.name}
                          accent={member.employee.accent}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold">
                            {member.displayName || member.employee.name}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {member.employee.role_title}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                            status.className,
                          )}
                        >
                          {status.label}
                        </span>
                      </div>

                      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-muted/50 p-2">
                          <dt className="text-[11px] text-muted-foreground">Completed</dt>
                          <dd className="text-sm font-semibold">{member.tasksCompleted}</dd>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2">
                          <dt className="text-[11px] text-muted-foreground">Score</dt>
                          <dd className="text-sm font-semibold">{member.performanceScore}%</dd>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2">
                          <dt className="text-[11px] text-muted-foreground">Last active</dt>
                          <dd className="text-sm font-semibold">
                            {member.lastActivity
                              ? new Date(member.lastActivity).toLocaleDateString()
                              : "—"}
                          </dd>
                        </div>
                      </dl>

                      {member.currentTask ? (
                        <p className="mt-3 truncate text-xs text-muted-foreground">
                          Currently on: <span className="font-medium">{member.currentTask.name}</span>
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {member.activated ? (
                          <>
                            <Button asChild size="sm" variant="outline">
                              <Link
                                to="/workspace/$slug"
                                params={{ slug: member.employee.slug }}
                              >
                                Open workspace
                              </Link>
                            </Button>
                            <TaskDialog
                              defaultEmployeeId={member.employee.id}
                              trigger={
                                <Button size="sm" variant="ghost">
                                  Assign task
                                </Button>
                              }
                            />
                          </>
                        ) : (
                          <Button asChild size="sm" variant="hero">
                            <Link to="/activate/$slug" params={{ slug: member.employee.slug }}>
                              <Rocket />
                              Activate
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  You haven't hired an AI employee yet.
                </p>
                <Button asChild className="mt-4" variant="hero">
                  <Link to="/marketplace">Browse the marketplace</Link>
                </Button>
              </div>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-4 text-primary" />
                Latest reports
              </h2>
              <div className="mt-4 space-y-3">
                {overview && overview.recentReports.length > 0 ? (
                  overview.recentReports.map((report) => (
                    <div key={report.id} className="flex items-center gap-3 text-sm">
                      <span className="min-w-0 flex-1 truncate">{report.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No reports yet.</p>
                )}
              </div>
              <Button asChild variant="ghost" size="sm" className="mt-4">
                <Link to="/reports">View all reports</Link>
              </Button>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Plug className="size-4 text-primary" />
                Connected tools
              </h2>
              <p className="mt-4 text-3xl font-bold tracking-tight">{s?.connectedTools ?? 0}</p>
              <p className="text-xs text-muted-foreground">
                Tools your AI employees can currently draw on.
              </p>
              <Button asChild variant="ghost" size="sm" className="mt-4">
                <Link to="/integrations">Manage integrations</Link>
              </Button>
            </section>
          </div>
        </div>
      )}
    </AppShell>
  );
}
