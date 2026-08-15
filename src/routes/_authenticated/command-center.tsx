import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Crown,
  Info,
  Loader2,
  Play,
  Send,
  Settings2,
  ShieldAlert,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import {
  createCompanyGoal,
  deleteCompanyGoal,
  dispatchGoalStep,
  listCompanyGoals,
  setCompanyGoalStatus,
  setGoalStepStatus,
} from "@/lib/command-center.functions";
import { cn } from "@/lib/utils";

const goalsQuery = queryOptions({
  queryKey: ["company-goals"],
  queryFn: () => listCompanyGoals(),
});

export const Route = createFileRoute("/_authenticated/command-center")({
  head: () => ({
    meta: [
      { title: "CEO Command Center — AI Employee Marketplace" },
      {
        name: "description",
        content:
          "Set a company goal and let your AI executive team turn it into a department-by-department execution plan.",
      },
      { property: "og:title", content: "CEO Command Center" },
      { property: "og:description", content: "Turn business goals into AI workforce execution." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CommandCenterPage,
});

const RISK_STYLES: Record<string, string> = {
  low: "bg-primary-soft text-primary",
  medium: "bg-amber-500/10 text-amber-600",
  high: "bg-destructive/10 text-destructive",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  dispatched: "bg-primary-soft text-primary",
  approved: "bg-primary-soft text-primary",
  completed: "bg-emerald-500/10 text-emerald-600",
  blocked: "bg-destructive/10 text-destructive",
  skipped: "bg-muted text-muted-foreground",
};

function formatCapability(slug: string) {
  return slug
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const AUTONOMY = [
  { value: "suggest", label: "Suggest only", hint: "Every step waits for you" },
  { value: "assisted", label: "Assisted", hint: "Risky steps need approval" },
  { value: "autonomous", label: "Autonomous", hint: "Only high-risk steps stop" },
] as const;

function CommandCenterPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(goalsQuery);

  const [goal, setGoal] = useState("");
  const [context, setContext] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [autonomy, setAutonomy] = useState<(typeof AUTONOMY)[number]["value"]>("assisted");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["company-goals"] });

  const plan = useMutation({
    mutationFn: () =>
      createCompanyGoal({
        data: {
          goal: goal.trim(),
          context: context.trim(),
          budget: Number(budget) || 0,
          deadline,
          autonomyLevel: autonomy,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Strategy ready — ${res.steps} steps assigned across your departments.`);
      setGoal("");
      setContext("");
      setBudget("");
      setDeadline("");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const dispatch = useMutation({
    mutationFn: (stepId: string) => dispatchGoalStep({ data: { stepId } }),
    onSuccess: () => {
      toast.success("Task created and sent to the AI employee.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const stepStatus = useMutation({
    mutationFn: (vars: { stepId: string; status: "approved" | "completed" | "skipped" }) =>
      setGoalStepStatus({ data: { stepId: vars.stepId, status: vars.status, result: "" } }),
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error(error.message),
  });

  const goalStatus = useMutation({
    mutationFn: (vars: { goalId: string; status: "active" | "paused" }) =>
      setCompanyGoalStatus({ data: vars }),
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error(error.message),
  });

  const removeGoal = useMutation({
    mutationFn: (goalId: string) => deleteCompanyGoal({ data: { goalId } }),
    onSuccess: () => {
      toast.success("Goal removed.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const goals = data?.goals ?? [];

  return (
    <AppShell
      title="CEO Command Center"
      description="Give your AI workforce a business goal — get a department-level execution plan"
    >
      <div className="space-y-8">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
              <Crown className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-bold tracking-tight">Set a company goal</h2>
              <p className="text-sm text-muted-foreground">
                Your AI Chief of Staff writes the strategy, splits it into steps and assigns each one
                to an AI employee on your roster.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="goal">Business goal</Label>
              <Input
                id="goal"
                placeholder="Grow qualified inbound leads by 40% in the next quarter"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="context">Context the team should know (optional)</Label>
              <Textarea
                id="context"
                rows={3}
                placeholder="Current channels, what has already been tried, constraints…"
                value={context}
                onChange={(e) => setContext(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="budget">Budget (USD, optional)</Label>
                <Input
                  id="budget"
                  type="number"
                  min={0}
                  placeholder="5000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deadline">Deadline (optional)</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Autonomy level</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {AUTONOMY.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setAutonomy(level.value)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      autonomy === level.value
                        ? "border-primary bg-primary-soft"
                        : "border-border hover:bg-muted/50",
                    )}
                  >
                    <div className="text-sm font-semibold">{level.label}</div>
                    <div className="text-xs text-muted-foreground">{level.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="hero"
                disabled={goal.trim().length < 8 || plan.isPending}
                onClick={() => plan.mutate()}
              >
                {plan.isPending ? <Loader2 className="animate-spin" /> : <Target />}
                {plan.isPending ? "Building strategy…" : "Build execution plan"}
              </Button>
              <p className="text-xs text-muted-foreground">
                {data?.roster.length ?? 0} AI employees available for assignment
              </p>
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : goals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No company goals yet. Set one above and your AI executive team will plan it out.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {goals.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-border bg-card p-6 shadow-soft"
              >
                <header className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold tracking-tight">{item.goal}</h3>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold capitalize text-muted-foreground">
                        {item.status}
                      </span>
                      <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold capitalize text-primary">
                        {item.autonomy_level}
                      </span>
                    </div>
                    {item.summary ? (
                      <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {item.status !== "completed" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          goalStatus.mutate({
                            goalId: item.id,
                            status: item.status === "paused" ? "active" : "paused",
                          })
                        }
                      >
                        {item.status === "paused" ? "Resume" : "Pause"}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Delete goal"
                      onClick={() => removeGoal.mutate(item.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </header>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{item.progress}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-primary transition-all"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>

                {item.strategy.length > 0 || item.kpis.length > 0 || item.risks.length > 0 ? (
                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    {item.strategy.length > 0 ? (
                      <div className="rounded-xl bg-muted/40 p-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Strategy
                        </h4>
                        <ul className="mt-2 space-y-2 text-sm">
                          {item.strategy.map((phase) => (
                            <li key={phase.phase}>
                              <span className="font-medium">{phase.phase}</span>
                              <span className="block text-xs text-muted-foreground">
                                {phase.focus}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {item.kpis.length > 0 ? (
                      <div className="rounded-xl bg-muted/40 p-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          KPIs
                        </h4>
                        <ul className="mt-2 space-y-2 text-sm">
                          {item.kpis.map((kpi) => (
                            <li key={kpi.name} className="flex justify-between gap-3">
                              <span>{kpi.name}</span>
                              <span className="font-semibold">{kpi.target}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {item.risks.length > 0 ? (
                      <div className="rounded-xl bg-muted/40 p-4">
                        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <AlertTriangle className="size-3.5" />
                          Risks
                        </h4>
                        <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                          {item.risks.map((risk) => (
                            <li key={risk}>{risk}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-6 space-y-3">
                  {item.steps.map((step) => (
                    <div
                      key={step.id}
                      className="rounded-xl border border-border p-4"
                    >
                      <div className="flex flex-wrap items-start gap-3">
                        <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {step.sequence}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{step.title}</span>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                                RISK_STYLES[step.risk] ?? RISK_STYLES["low"],
                              )}
                            >
                              {step.risk} risk
                            </span>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                                STATUS_STYLES[step.status] ?? STATUS_STYLES["pending"],
                              )}
                            >
                              {step.status}
                            </span>
                            {step.required_capability_slug ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            {formatCapability(step.required_capability_slug)}
                          </span>
                        ) : null}
                        {step.requires_approval && step.status === "pending" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                                <ShieldAlert className="size-3" />
                                Needs your approval
                              </span>
                            ) : null}
                          </div>
                          {step.detail ? (
                            <p className="mt-1.5 text-sm text-muted-foreground">{step.detail}</p>
                          ) : null}
                          {step.expected_outcome ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Outcome: {step.expected_outcome}
                            </p>
                          ) : null}
                          {step.dispatch_reason ? (
                            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                              <Info className="mt-0.5 size-3.5 shrink-0" />
                              <span>{step.dispatch_reason}</span>
                            </p>
                          ) : null}
                          {step.status === "blocked" && step.blocked_reason ? (
                            <div className="mt-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                              <p className="flex items-start gap-1.5 text-xs font-medium text-destructive">
                                <Settings2 className="mt-0.5 size-3.5 shrink-0" />
                                <span>Configuration required: {step.blocked_reason}</span>
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Button asChild size="sm" variant="outline">
                                  <Link to="/marketplace">Hire / activate employee</Link>
                                </Button>
                                <Button asChild size="sm" variant="outline">
                                  <Link to="/integrations">Connect integration</Link>
                                </Button>
                                <Button asChild size="sm" variant="outline">
                                  <Link to="/tools">Grant tool permission</Link>
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          {step.employee ? (
                            <div className="flex items-center gap-2">
                              <EmployeeAvatar
                                name={step.employee.name}
                                accent={step.employee.accent}
                                className="size-8"
                              />
                              <div className="hidden text-xs sm:block">
                                <div className="font-medium">{step.employee.name}</div>
                                <div className="text-muted-foreground">
                                  {step.employee.role_title}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Unstaffed · {step.owner_role}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {step.requires_approval && step.status === "pending" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              stepStatus.mutate({ stepId: step.id, status: "approved" })
                            }
                          >
                            <CheckCircle2 />
                            Approve
                          </Button>
                        ) : null}

                        {step.employee && !step.task_id && step.status !== "blocked" ? (
                          <Button
                            size="sm"
                            disabled={
                              dispatch.isPending ||
                              (step.requires_approval && step.status === "pending")
                            }
                            onClick={() => dispatch.mutate(step.id)}
                          >
                            <Send />
                            Send to {step.employee.name.split(" ")[0]}
                          </Button>
                        ) : null}

                        {step.task_id ? (
                          <Button asChild size="sm" variant="outline">
                            <Link to="/tasks">
                              <Play />
                              Open task
                            </Link>
                          </Button>
                        ) : null}

                        {!step.employee ? (
                          <Button asChild size="sm" variant="outline">
                            <Link to="/marketplace">Hire for this role</Link>
                          </Button>
                        ) : null}

                        {step.status !== "completed" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              stepStatus.mutate({ stepId: step.id, status: "completed" })
                            }
                          >
                            Mark done
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
