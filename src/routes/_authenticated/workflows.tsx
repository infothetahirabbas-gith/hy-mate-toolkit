import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  Copy,
  Loader2,
  Pause,
  Play,
  Plus,
  Trash2,
  Workflow as WorkflowIcon,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { memoryCenterQuery, workflowsQuery } from "@/lib/queries";
import {
  deleteWorkflow,
  duplicateWorkflow,
  runWorkflow,
  saveWorkflow,
  setWorkflowStatus,
  STEP_TYPES,
  TRIGGER_TYPES,
  type WorkflowStep,
} from "@/lib/workflows.functions";
import { TOOL_LIBRARY } from "@/lib/tools";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/workflows")({
  head: () => ({
    meta: [
      { title: "Workflow Automation — AI Employee Marketplace" },
      {
        name: "description",
        content: "Build automated workflows that trigger your AI employees.",
      },
      { property: "og:title", content: "Workflow Automation" },
      { property: "og:description", content: "Trigger your AI workforce automatically." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkflowsPage,
});

const TRIGGER_LABELS: Record<string, string> = {
  schedule: "Time-based schedule",
  event: "Event happens",
  data_change: "Data changes",
  manual: "Manual trigger",
};

const STEP_LABELS: Record<string, string> = {
  condition: "If condition",
  employee: "Assign AI employee",
  tool: "Use a tool",
  task: "Create a task",
  report: "Generate a report",
  message: "Send a message",
  output: "Deliver output",
};

type Draft = {
  id?: string;
  name: string;
  description: string;
  triggerType: (typeof TRIGGER_TYPES)[number];
  triggerValue: string;
  steps: WorkflowStep[];
};

const emptyDraft: Draft = {
  name: "",
  description: "",
  triggerType: "schedule",
  triggerValue: "Every Monday at 9:00",
  steps: [],
};

function WorkflowsPage() {
  const { data: workflows, isLoading } = useQuery(workflowsQuery);
  const { data: center } = useQuery(memoryCenterQuery);
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["workflows"] });

  const [draft, setDraft] = useState<Draft | null>(null);

  const save = useMutation({
    mutationFn: (value: Draft) => saveWorkflow({ data: value }),
    onSuccess: () => {
      setDraft(null);
      invalidate();
      toast.success("Workflow saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const run = useMutation({
    mutationFn: (id: string) => runWorkflow({ data: { id } }),
    onSuccess: (result) => {
      invalidate();
      toast.success(`Workflow ran — ${result.createdTasks} task(s) created`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: (vars: { id: string; status: "active" | "paused" }) =>
      setWorkflowStatus({ data: vars }),
    onSuccess: invalidate,
  });

  const duplicate = useMutation({
    mutationFn: (id: string) => duplicateWorkflow({ data: { id } }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteWorkflow({ data: { id } }),
    onSuccess: invalidate,
  });

  const roster = center?.employees ?? [];

  const updateStep = (index: number, patch: Partial<WorkflowStep>) => {
    if (!draft) return;
    const steps = draft.steps.map((step, i) => (i === index ? { ...step, ...patch } : step));
    setDraft({ ...draft, steps });
  };

  return (
    <AppShell
      title="Workflow Automation"
      description="Chain triggers, AI employees and tools into repeatable automations"
      actions={
        <Button variant="hero" onClick={() => setDraft({ ...emptyDraft })}>
          <Plus />
          New workflow
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : workflows?.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {workflows.map((workflow) => {
            const steps = (workflow.steps ?? []) as unknown as WorkflowStep[];
            const triggerValue =
              (workflow.trigger_config as { value?: string } | null)?.value ?? "";
            return (
              <article
                key={workflow.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-semibold">{workflow.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {TRIGGER_LABELS[workflow.trigger_type]} · {triggerValue || "not set"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase",
                      workflow.status === "active"
                        ? "bg-primary-soft text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {workflow.status}
                  </span>
                </div>

                <ol className="mt-4 space-y-1 text-sm">
                  {steps.map((step, index) => (
                    <li key={step.id} className="flex items-center gap-2 text-muted-foreground">
                      {index > 0 ? <ArrowDown className="size-3" /> : <Zap className="size-3" />}
                      <span className="text-foreground">{step.label || STEP_LABELS[step.type]}</span>
                    </li>
                  ))}
                  {steps.length === 0 ? (
                    <li className="text-muted-foreground">No steps yet.</li>
                  ) : null}
                </ol>

                <p className="mt-4 text-xs text-muted-foreground">
                  {workflow.run_count} runs
                  {workflow.last_run_at
                    ? ` · last ${new Date(workflow.last_run_at).toLocaleString()}`
                    : ""}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="hero" onClick={() => run.mutate(workflow.id)}>
                    {run.isPending ? <Loader2 className="animate-spin" /> : <Play />}
                    Run now
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toggle.mutate({
                        id: workflow.id,
                        status: workflow.status === "active" ? "paused" : "active",
                      })
                    }
                  >
                    {workflow.status === "active" ? <Pause /> : <Play />}
                    {workflow.status === "active" ? "Pause" : "Activate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setDraft({
                        id: workflow.id,
                        name: workflow.name,
                        description: workflow.description ?? "",
                        triggerType:
                          workflow.trigger_type as (typeof TRIGGER_TYPES)[number],
                        triggerValue,
                        steps,
                      })
                    }
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => duplicate.mutate(workflow.id)}>
                    <Copy />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => remove.mutate(workflow.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center">
          <WorkflowIcon className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 font-display text-lg font-semibold">No workflows yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Automate recurring work: "Every Monday → SEO Specialist → generate report".
          </p>
        </div>
      )}

      <Dialog open={Boolean(draft)} onOpenChange={(open) => (open ? null : setDraft(null))}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit workflow" : "Build a workflow"}</DialogTitle>
            <DialogDescription>
              Start with a trigger, then add the steps your AI employees should follow.
            </DialogDescription>
          </DialogHeader>

          {draft ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="w-name">Workflow name</Label>
                <Input
                  id="w-name"
                  maxLength={140}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Weekly SEO report"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="w-desc">Description</Label>
                <Textarea
                  id="w-desc"
                  rows={2}
                  maxLength={600}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </div>

              <div className="rounded-2xl border border-primary/30 bg-primary-soft p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Trigger</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Select
                    value={draft.triggerType}
                    onValueChange={(v) =>
                      setDraft({ ...draft, triggerType: v as (typeof TRIGGER_TYPES)[number] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TRIGGER_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    maxLength={200}
                    value={draft.triggerValue}
                    onChange={(e) => setDraft({ ...draft, triggerValue: e.target.value })}
                    placeholder="Every Monday at 9:00"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {draft.steps.map((step, index) => (
                  <div key={step.id} className="rounded-2xl border border-border p-4">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {index + 1}
                      </span>
                      <Select
                        value={step.type}
                        onValueChange={(v) =>
                          updateStep(index, { type: v as WorkflowStep["type"], config: {} })
                        }
                      >
                        <SelectTrigger className="w-52">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STEP_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {STEP_LABELS[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-destructive"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            steps: draft.steps.filter((_s, i) => i !== index),
                          })
                        }
                      >
                        <Trash2 />
                      </Button>
                    </div>

                    <div className="mt-3 space-y-2">
                      <Input
                        maxLength={140}
                        value={step.label}
                        onChange={(e) => updateStep(index, { label: e.target.value })}
                        placeholder="Step name"
                      />

                      {step.type === "employee" ? (
                        <Select
                          value={step.config["employeeId"] ?? ""}
                          onValueChange={(v) =>
                            updateStep(index, { config: { ...step.config, employeeId: v } })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose an AI employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {roster.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.name} — {employee.role_title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}

                      {step.type === "tool" ? (
                        <Select
                          value={step.config["toolId"] ?? ""}
                          onValueChange={(v) =>
                            updateStep(index, { config: { ...step.config, toolId: v } })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a tool" />
                          </SelectTrigger>
                          <SelectContent>
                            {TOOL_LIBRARY.map((tool) => (
                              <SelectItem key={tool.id} value={tool.id}>
                                {tool.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}

                      {step.type === "task" ||
                      step.type === "report" ||
                      step.type === "condition" ||
                      step.type === "message" ||
                      step.type === "output" ? (
                        <Textarea
                          rows={2}
                          maxLength={400}
                          value={step.config["description"] ?? ""}
                          onChange={(e) =>
                            updateStep(index, {
                              config: { ...step.config, description: e.target.value },
                            })
                          }
                          placeholder="What should happen here?"
                        />
                      ) : null}
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  className="w-full"
                  disabled={draft.steps.length >= 12}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      steps: [
                        ...draft.steps,
                        {
                          id: `step-${Date.now()}`,
                          type: "employee",
                          label: "",
                          config: {},
                        },
                      ],
                    })
                  }
                >
                  <Plus />
                  Add step
                </Button>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="hero"
              disabled={!draft || draft.name.trim().length < 3 || save.isPending}
              onClick={() => draft && save.mutate(draft)}
            >
              {save.isPending ? <Loader2 className="animate-spin" /> : null}
              Save workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
