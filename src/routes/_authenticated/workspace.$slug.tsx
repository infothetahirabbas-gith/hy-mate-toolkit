import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Lightbulb, ListChecks, Loader2, Send, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/app/AppShell";
import { AgentChat } from "@/components/app/AgentChat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";

import { employeeQuery, employeeActivityQuery } from "@/lib/queries";
import { runEmployeeTask } from "@/lib/ai.functions";
import type { AiEmployeeResult } from "@/lib/ai-types";

export const Route = createFileRoute("/_authenticated/workspace/$slug")({
  head: () => ({
    meta: [
      { title: "AI Employee Workspace — AI Employee Marketplace" },
      { name: "description", content: "Brief your AI employee and review their deliverables." },
      { property: "og:title", content: "AI Employee Workspace" },
      { property: "og:description", content: "Brief your AI employee and review deliverables." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkspacePage,
});

function WorkspacePage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: employee, isLoading } = useQuery(employeeQuery(slug));
  const { data: activity } = useQuery(employeeActivityQuery(slug));

  const [input, setInput] = useState("");
  const [result, setResult] = useState<AiEmployeeResult | null>(null);

  const run = useMutation({
    mutationFn: () =>
      runEmployeeTask({
        data: { slug, input: input.trim(), taskName: input.trim().slice(0, 80) },
      }),
    onSuccess: (data) => {
      setResult(data.result);
      setInput("");
      queryClient.invalidateQueries();
      toast.success("Task completed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <AppShell title="Workspace">
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!employee) {
    return (
      <AppShell title="Workspace">
        <div className="rounded-2xl border border-dashed border-border p-14 text-center">
          <p className="text-sm text-muted-foreground">That AI employee could not be found.</p>
          <Button asChild className="mt-4">
            <Link to="/marketplace">Back to marketplace</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={`${employee.name}'s workspace`} description={employee.role_title}>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tasks">Tasks & briefing</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-0">
            <AgentChat
              slug={slug}
              name={employee.name}
              accent={employee.accent}
              roleTitle={employee.role_title}
            />
          </TabsContent>

          <TabsContent value="tasks" className="mt-0 space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">

            <label htmlFor="brief" className="text-sm font-semibold">
              {employee.workspace_input_label}
            </label>
            <Textarea
              id="brief"
              rows={4}
              maxLength={1000}
              className="mt-3"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={employee.workspace_input_placeholder}
            />
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{input.length}/1000</span>
              <Button
                variant="hero"
                disabled={run.isPending || input.trim().length < 3}
                onClick={() => run.mutate()}
              >
                {run.isPending ? <Loader2 className="animate-spin" /> : <Send />}
                {run.isPending ? `${employee.name} is working…` : `Assign to ${employee.name}`}
              </Button>
            </div>
          </section>

          {result ? <ResultCard result={result} /> : null}

          <section>
            <h2 className="text-sm font-semibold">Task history</h2>
            <div className="mt-3 space-y-3">
              {activity && activity.length > 0 ? (
                activity.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => setResult((task.result as AiEmployeeResult) ?? null)}
                    className="w-full rounded-xl border border-border bg-card p-4 text-left shadow-soft transition-colors hover:border-primary/30"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="rounded-full text-[10px] uppercase">
                        {task.status}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {task.task_name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(task.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{task.input}</p>
                  </button>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No tasks yet. Send {employee.name} their first brief.
                </p>
              )}
            </div>
          </section>
          </TabsContent>
        </Tabs>


        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-3">
              <EmployeeAvatar name={employee.name} accent={employee.accent} />
              <div className="min-w-0">
                <div className="truncate font-bold">{employee.name}</div>
                <div className="truncate text-xs text-muted-foreground">{employee.category}</div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{employee.tagline}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {employee.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-primary-soft p-6">
            <Sparkles className="size-4 text-primary" />
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {employee.name} uses your business profile and previous tasks as memory. Keep your
              onboarding up to date for sharper results.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-4">
              <Link to="/onboarding">Update business profile</Link>
            </Button>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

export function ResultCard({ result }: { result: AiEmployeeResult }) {
  return (
    <section className="animate-fade space-y-6 rounded-2xl border border-border bg-card p-6 shadow-lift">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{result.headline}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{result.summary}</p>
      </div>

      {result.metrics.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {result.metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-border bg-muted/40 p-4">
              <div className="text-xs text-muted-foreground">{metric.label}</div>
              <div className="mt-1 text-lg font-bold tracking-tight">{metric.value}</div>
              {metric.hint ? (
                <div className="mt-1 text-[11px] text-muted-foreground">{metric.hint}</div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {result.findings.length > 0 ? (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="size-4 text-primary" />
            Findings
          </h3>
          <ul className="mt-3 space-y-3">
            {result.findings.map((finding) => (
              <li key={finding.title} className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{finding.title}</span>
                  <Badge variant="outline" className="rounded-full text-[10px] uppercase">
                    {finding.severity}
                  </Badge>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{finding.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.opportunities.length > 0 ? (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="size-4 text-accent" />
            Opportunities
          </h3>
          <ul className="mt-3 space-y-3">
            {result.opportunities.map((item) => (
              <li key={item.title} className="rounded-xl border border-border p-4">
                <div className="font-medium">{item.title}</div>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.detail}</p>
                {item.impact ? (
                  <p className="mt-1 text-xs text-accent">Impact: {item.impact}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.actionPlan.length > 0 ? (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <ListChecks className="size-4 text-primary" />
            Action plan
          </h3>
          <ol className="mt-3 space-y-3">
            {result.actionPlan.map((step, index) => (
              <li key={step.title} className="flex gap-3 rounded-xl border border-border p-4">
                <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
                <div>
                  <div className="font-medium">{step.title}</div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{step.detail}</p>
                  <div className="mt-2 flex gap-2 text-[11px] text-muted-foreground">
                    {step.effort ? <span>Effort: {step.effort}</span> : null}
                    {step.impact ? <span>Impact: {step.impact}</span> : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {result.closingNote ? (
        <p className="border-t border-border pt-4 text-xs text-muted-foreground">
          {result.closingNote}
        </p>
      ) : null}
    </section>
  );
}
