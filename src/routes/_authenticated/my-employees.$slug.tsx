import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Network,
  ListChecks,
  Wrench,
  Target,
  Building2,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import { employeeRoleProfileQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/my-employees/$slug")({
  head: () => ({
    meta: [
      { title: "AI Employee Profile — Hy-Mate" },
      { name: "description", content: "Department, designation, authority and capabilities for this AI employee." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmployeeProfilePage,
});

const SENIORITY_LABEL: Record<string, string> = {
  assistant: "Level 1 · Assistant",
  specialist: "Level 2 · Specialist",
  senior_specialist: "Level 3 · Senior Specialist",
  manager: "Level 4 · Manager",
  ai_manager: "Level 5 · AI Manager",
};

function EmployeeProfilePage() {
  const { slug } = Route.useParams();
  const { data: profile, isLoading, isError, error, refetch, isFetching } = useQuery(
    employeeRoleProfileQuery(slug),
  );

  return (
    <AppShell
      title="AI employee profile"
      description="Department, designation, authority and capabilities for this role"
      actions={
        <Button asChild size="sm" variant="outline">
          <Link to="/my-employees">
            <ArrowLeft />
            Back to My AI Employees
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : isError ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Could not load this profile</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "Something went wrong."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={isFetching} onClick={() => refetch()}>
              {isFetching ? <Loader2 className="animate-spin" /> : null}
              Retry
            </Button>
            <Button asChild size="sm" variant="hero">
              <Link to="/marketplace">Browse marketplace</Link>
            </Button>
          </CardContent>
        </Card>
      ) : profile ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-col gap-5 pt-6 lg:flex-row lg:items-center">
              <EmployeeAvatar name={profile.employee.name} accent={profile.employee.accent} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight">{profile.employee.name}</h2>
                  <Badge variant={profile.status === "active" ? "default" : "secondary"} className="rounded-full text-[10px] uppercase">
                    {profile.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{profile.employee.designation}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {profile.employee.department ? (
                    <Badge variant="outline" className="gap-1">
                      <Building2 className="size-3" />
                      {profile.employee.department}
                    </Badge>
                  ) : null}
                  <Badge variant="outline" className="gap-1">
                    <Network className="size-3" />
                    {SENIORITY_LABEL[profile.employee.seniorityLevel] ?? profile.employee.seniorityLevel}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <ShieldCheck className="size-3" />
                    Authority {profile.employee.authorityLevel}/5
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Primary mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {profile.employee.primaryMission || "No mission statement recorded yet for this role."}
                </p>
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Authority
                </p>
                <p className="text-sm text-muted-foreground">
                  {profile.employee.authorityDescription ?? "Not defined."}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reports to</CardTitle>
                <CardDescription>Resolved from this workspace's active roster</CardDescription>
              </CardHeader>
              <CardContent>
                {profile.reportsTo ? (
                  <Link
                    to="/my-employees/$slug"
                    params={{ slug: profile.reportsTo.slug }}
                    className="flex items-center justify-between rounded-lg border border-border p-3 text-sm hover:bg-accent"
                  >
                    <span>
                      <span className="font-semibold">{profile.reportsTo.name}</span>
                      <span className="block text-xs text-muted-foreground">{profile.reportsTo.roleTitle}</span>
                    </span>
                    <ArrowLeft className="size-4 rotate-180" />
                  </Link>
                ) : profile.employee.seniorityLevel === "manager" || profile.employee.seniorityLevel === "ai_manager" ? (
                  <p className="text-sm text-muted-foreground">
                    This role sits at the top of its department and does not report to another AI employee.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No manager is hired in this department yet. Hire a manager-level AI employee in the same
                    department to complete the reporting line.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Responsibility matrix</CardTitle>
              <CardDescription>What this employee owns, supports and must escalate</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-3">
              <ResponsibilityColumn label="Own" items={profile.responsibilities.own} tone="default" />
              <ResponsibilityColumn label="Support" items={profile.responsibilities.support} tone="secondary" />
              <ResponsibilityColumn label="Escalate" items={profile.responsibilities.escalate} tone="outline" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Capabilities</CardTitle>
              <CardDescription>Registered capabilities this role is allowed to hold</CardDescription>
            </CardHeader>
            <CardContent>
              {profile.capabilities.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {profile.capabilities.map((cap) => (
                    <div key={cap.slug} className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2">
                        <Target className="size-4 text-muted-foreground" />
                        <span className="text-sm font-semibold">{cap.name}</span>
                      </div>
                      {cap.description ? (
                        <p className="mt-1 text-xs text-muted-foreground">{cap.description}</p>
                      ) : null}
                      <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                        Execution pending &middot; architecture only
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No capabilities are mapped to this role yet.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListChecks className="size-4" />
                  KPIs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.kpis.length ? (
                  <ul className="space-y-2 text-sm">
                    {profile.kpis.map((kpi, index) => (
                      <li key={index} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                        <span>{kpi.name}</span>
                        <span className="text-muted-foreground">{kpi.target}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No KPIs defined for this role yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wrench className="size-4" />
                  Tools &amp; permissions
                </CardTitle>
                <CardDescription>Configured in Tool Registry for this employee</CardDescription>
              </CardHeader>
              <CardContent>
                {profile.tools.length ? (
                  <ul className="space-y-2 text-sm">
                    {profile.tools.map((tool) => (
                      <li key={tool.toolId} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                        <span>{tool.toolId}</span>
                        <Badge variant="outline" className="capitalize">{tool.permission}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No tool permissions configured yet.{" "}
                    <Link to="/tools" className="underline underline-offset-2">
                      Open Tool Registry
                    </Link>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workload</CardTitle>
              <CardDescription>Real counts from this workspace's tasks, not estimates</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-2xl font-bold">{profile.workload.openTasks}</p>
                <p className="text-muted-foreground">Open tasks</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{profile.workload.completedTasks}</p>
                <p className="text-muted-foreground">Completed tasks</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </AppShell>
  );
}

function ResponsibilityColumn({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: "default" | "secondary" | "outline";
}) {
  return (
    <div>
      <Badge variant={tone} className="mb-3 uppercase tracking-wide">
        {label}
      </Badge>
      {items.length ? (
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {items.map((item, index) => (
            <li key={index}>&bull; {item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Not defined yet.</p>
      )}
    </div>
  );
}
