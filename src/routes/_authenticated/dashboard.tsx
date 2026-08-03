import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/app/AppShell";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import { dashboardQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — AI Employee Marketplace" },
      { name: "description", content: "Track your AI employees, tasks and reports in one place." },
      { property: "og:title", content: "Your AI Team Dashboard" },
      { property: "og:description", content: "Track AI employees, tasks and reports." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data, isLoading } = useQuery(dashboardQuery);

  const stats = [
    { label: "Active AI employees", value: data?.activeEmployees ?? 0, icon: Users },
    { label: "Monthly spend", value: `$${data?.monthlySpend ?? 0}`, icon: Wallet },
    { label: "Tasks completed", value: data?.tasksCompleted ?? 0, icon: CheckCircle2 },
    { label: "Reports generated", value: data?.reportsGenerated ?? 0, icon: FileText },
  ];

  return (
    <AppShell
      title={data?.businessName ? `Welcome back, ${data.businessName}` : "Dashboard"}
      description="Your AI team at a glance"
      actions={
        <Button asChild size="sm" variant="hero">
          <Link to="/marketplace">
            Hire AI employee
            <ArrowRight />
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {!data?.onboarded ? (
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
              <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.roster.map((employee) => (
                  <Link
                    key={employee.id}
                    to="/workspace/$slug"
                    params={{ slug: employee.slug }}
                    className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift"
                  >
                    <EmployeeAvatar name={employee.name} accent={employee.accent} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{employee.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {employee.role_title}
                      </div>
                    </div>
                    <ArrowRight className="ml-auto size-4 text-muted-foreground" />
                  </Link>
                ))}
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
                <TrendingUp className="size-4 text-primary" />
                Recent activity
              </h2>
              <div className="mt-4 space-y-3">
                {data && data.recentTasks.length > 0 ? (
                  data.recentTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 text-sm">
                      <Badge
                        variant={task.status === "completed" ? "secondary" : "outline"}
                        className="rounded-full text-[10px] uppercase"
                      >
                        {task.status}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate">{task.task_name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(task.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No tasks yet.</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-4 text-primary" />
                Latest reports
              </h2>
              <div className="mt-4 space-y-3">
                {data && data.recentReports.length > 0 ? (
                  data.recentReports.map((report) => (
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
          </div>
        </div>
      )}
    </AppShell>
  );
}
