import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { workforceQuery } from "@/lib/queries";
import { createTask, runTask } from "@/lib/workforce.functions";
import { recommendedTools, TOOL_LIBRARY } from "@/lib/tools";
import { cn } from "@/lib/utils";

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export function TaskDialog({
  defaultEmployeeId,
  trigger,
}: {
  defaultEmployeeId?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { data } = useQuery(workforceQuery);
  const queryClient = useQueryClient();

  const roster = (data?.roster ?? []).filter((r) => r.subscriptionStatus === "active");
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("medium");
  const [deadline, setDeadline] = useState("");
  const [tools, setTools] = useState<string[]>([]);

  const selected = roster.find((r) => r.employee.id === employeeId);
  const suggested = selected ? recommendedTools(selected.employee.category) : [];
  const toolOptions = suggested.length
    ? [...suggested, ...TOOL_LIBRARY.filter((t) => !suggested.some((s) => s.id === t.id))]
    : TOOL_LIBRARY;

  const create = useMutation({
    mutationFn: async () => {
      const res = await createTask({
        data: {
          employeeId,
          taskName: name.trim(),
          description: description.trim(),
          priority,
          deadline,
          tools,
          run: true,
        },
      });
      return res.taskId;
    },
    onSuccess: async (taskId) => {
      setOpen(false);
      setName("");
      setDescription("");
      setTools([]);
      setDeadline("");
      queryClient.invalidateQueries();
      toast.success("Task created — your AI employee is starting work");
      try {
        await runTask({ data: { taskId } });
        toast.success("Task complete — ready for your review");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "The task failed");
      }
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="hero">
            <Plus />
            Create task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign a task</DialogTitle>
          <DialogDescription>
            Brief one of your AI employees the way you would brief a new hire.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>AI employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an AI employee" />
              </SelectTrigger>
              <SelectContent>
                {roster.map((r) => (
                  <SelectItem key={r.employee.id} value={r.employee.id}>
                    {r.displayName || r.employee.name} — {r.employee.role_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-name">Task name</Label>
            <Input
              id="task-name"
              value={name}
              maxLength={140}
              onChange={(e) => setName(e.target.value)}
              placeholder="Create a 30-day SEO plan for my website"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              rows={4}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context, goals, constraints and what a great result looks like."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-deadline">Deadline</Label>
              <Input
                id="task-deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tools required</Label>
            <div className="flex flex-wrap gap-2">
              {toolOptions.slice(0, 10).map((tool) => {
                const active = tools.includes(tool.name);
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() =>
                      setTools((prev) =>
                        active ? prev.filter((t) => t !== tool.name) : [...prev, tool.name],
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    {tool.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="hero"
            disabled={create.isPending || !employeeId || name.trim().length < 3}
            onClick={() => create.mutate()}
          >
            {create.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
