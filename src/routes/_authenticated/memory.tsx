import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Brain,
  Check,
  Loader2,
  Pause,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { memoryCenterQuery } from "@/lib/queries";
import {
  clearAllMemories,
  MEMORY_CATEGORIES,
  removeMemory,
  saveMemory,
  setMemoryStatus,
  updateMemorySettings,
} from "@/lib/memory.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/memory")({
  head: () => ({
    meta: [
      { title: "AI Memory Management — AI Employee Marketplace" },
      {
        name: "description",
        content: "Review, approve and control everything your AI employees remember.",
      },
      { property: "og:title", content: "AI Memory Management" },
      { property: "og:description", content: "Approve and control your AI employees' memory." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MemoryPage,
});

const CATEGORY_LABELS: Record<string, string> = {
  business: "Business Knowledge",
  preference: "Customer Preferences",
  decision: "Previous Decisions",
  task_history: "Task History",
  communication: "Communication Preferences",
};

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-primary-soft text-primary",
  pending: "bg-accent/15 text-accent-foreground",
  rejected: "bg-destructive/10 text-destructive",
  disabled: "bg-muted text-muted-foreground",
};

function MemoryPage() {
  const { data, isLoading } = useQuery(memoryCenterQuery);
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["memory-center"] });

  const [category, setCategory] = useState<string>("all");
  const [employeeId, setEmployeeId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<{ id: string; content: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [draftCategory, setDraftCategory] =
    useState<(typeof MEMORY_CATEGORIES)[number]>("business");

  const status = useMutation({
    mutationFn: (vars: { id: string; status: "approved" | "rejected" | "disabled" | "pending" }) =>
      setMemoryStatus({ data: vars }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: (vars: { id?: string; content: string }) =>
      saveMemory({
        data: {
          ...(vars.id ? { id: vars.id } : {}),
          content: vars.content,
          category: draftCategory,
          employeeId: null,
          importance: 4,
        },
      }),
    onSuccess: () => {
      setEditing(null);
      setDraft("");
      invalidate();
      toast.success("Memory saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeMemory({ data: { id } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const clearAll = useMutation({
    mutationFn: () => clearAllMemories({}),
    onSuccess: () => {
      invalidate();
      toast.success("All memories cleared");
    },
  });

  const settings = useMutation({
    mutationFn: (vars: { autoSave: boolean; requireApproval: boolean }) =>
      updateMemorySettings({ data: vars }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const memories = useMemo(() => {
    return (data?.memories ?? []).filter((m) => {
      if (category !== "all" && m.category !== category) return false;
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (employeeId !== "all" && m.employee_id !== employeeId) return false;
      return true;
    });
  }, [data, category, statusFilter, employeeId]);

  const pending = (data?.memories ?? []).filter((m) => m.status === "pending").length;
  const current = data?.settings ?? { auto_save: true, require_approval: false };

  return (
    <AppShell
      title="AI Memory Management"
      description="Everything your AI employees have learned — under your control"
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="All AI employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All AI employees</SelectItem>
                  {(data?.employees ?? []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} — {e.role_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {MEMORY_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c] ?? c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  <SelectItem value="pending">Pending review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {pending > 0 ? (
              <div className="rounded-2xl border border-primary/30 bg-primary-soft p-4 text-sm">
                <span className="font-semibold">{pending} memories are waiting for approval.</span>{" "}
                Your AI employees will not use them until you approve.
              </div>
            ) : null}

            <div className="space-y-3">
              {memories.map((memory) => {
                const employee = memory.employee as unknown as {
                  name: string;
                  role_title: string;
                  accent: string;
                } | null;
                const isEditing = editing?.id === memory.id;

                return (
                  <article
                    key={memory.id}
                    className="rounded-2xl border border-border bg-card p-5 shadow-soft"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1",
                          STATUS_STYLES[memory.status] ?? STATUS_STYLES["approved"],
                        )}
                      >
                        {memory.status === "pending" ? "pending review" : memory.status}
                      </span>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                        {CATEGORY_LABELS[memory.category] ?? memory.category}
                      </span>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                        source: {memory.source}
                      </span>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                        {memory.confidence}% confidence
                      </span>
                      <span className="ml-auto font-normal normal-case text-muted-foreground">
                        {new Date(memory.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {employee ? (
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <EmployeeAvatar
                          name={employee.name}
                          accent={employee.accent}
                          className="size-6 text-[10px]"
                        />
                        {employee.name} · {employee.role_title}
                      </div>
                    ) : null}

                    {isEditing ? (
                      <div className="mt-3 space-y-2">
                        <Textarea
                          rows={3}
                          maxLength={600}
                          value={editing.content}
                          onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => save.mutate({ id: memory.id, content: editing.content })}
                          >
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm">{memory.content}</p>
                    )}

                    {!isEditing ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {memory.status !== "approved" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => status.mutate({ id: memory.id, status: "approved" })}
                          >
                            <Check />
                            Approve
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setDraftCategory(
                              (MEMORY_CATEGORIES as readonly string[]).includes(memory.category)
                                ? (memory.category as (typeof MEMORY_CATEGORIES)[number])
                                : "business",
                            );
                            setEditing({ id: memory.id, content: memory.content });
                          }}
                        >
                          <Pencil />
                          Edit
                        </Button>
                        {memory.status !== "disabled" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => status.mutate({ id: memory.id, status: "disabled" })}
                          >
                            <Pause />
                            Disable
                          </Button>
                        ) : null}
                        {memory.status !== "rejected" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => status.mutate({ id: memory.id, status: "rejected" })}
                          >
                            <X />
                            Reject
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => remove.mutate(memory.id)}
                        >
                          <Trash2 />
                          Delete
                        </Button>
                      </div>
                    ) : null}
                  </article>
                );
              })}

              {memories.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                  No memories in this view yet. Your AI employees learn as you chat and assign work.
                </div>
              ) : null}
            </div>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Plus className="size-4 text-primary" />
                Teach a memory
              </h2>
              <div className="mt-4 space-y-3">
                <Select
                  value={draftCategory}
                  onValueChange={(v) => setDraftCategory(v as typeof draftCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMORY_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_LABELS[c] ?? c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  rows={3}
                  maxLength={600}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="We never discount below 20%."
                />
                <Button
                  className="w-full"
                  variant="hero"
                  disabled={draft.trim().length < 4 || save.isPending}
                  onClick={() => save.mutate({ content: draft.trim() })}
                >
                  Save memory
                </Button>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Brain className="size-4 text-primary" />
                Memory settings
              </h2>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="auto-save" className="text-sm font-normal">
                    Auto-save memories
                  </Label>
                  <Switch
                    id="auto-save"
                    checked={current.auto_save}
                    onCheckedChange={(checked) =>
                      settings.mutate({
                        autoSave: checked,
                        requireApproval: current.require_approval,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="require-approval" className="text-sm font-normal">
                    Require approval before learning
                  </Label>
                  <Switch
                    id="require-approval"
                    checked={current.require_approval}
                    onCheckedChange={(checked) =>
                      settings.mutate({ autoSave: current.auto_save, requireApproval: checked })
                    }
                  />
                </div>
                <Button
                  variant="outline"
                  className="w-full text-destructive"
                  disabled={clearAll.isPending}
                  onClick={() => clearAll.mutate()}
                >
                  <Trash2 />
                  Clear all memories
                </Button>
              </div>
            </section>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
