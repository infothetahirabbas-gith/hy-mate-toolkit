import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Play, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { memoryCenterQuery, projectQuery, projectsQuery } from "@/lib/queries";
import { createProject, deleteProject, runProjectCollaboration } from "@/lib/projects.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/teams")({
  head: () => ({
    meta: [
      { title: "AI Team Projects — AI Employee Marketplace" },
      {
        name: "description",
        content: "Put multiple AI employees on one project and let them collaborate.",
      },
      { property: "og:title", content: "AI Team Projects" },
      { property: "og:description", content: "Multi-agent collaboration for your business." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TeamsPage,
});

const STATUS_STYLES: Record<string, string> = {
  planning: "bg-muted text-muted-foreground",
  running: "bg-accent/15 text-accent-foreground",
  completed: "bg-primary-soft text-primary",
};

function TeamsPage() {
  const { data: projects, isLoading } = useQuery(projectsQuery);
  const { data: center } = useQuery(memoryCenterQuery);
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    goal: "",
    description: "",
    dueDate: "",
    sharedKnowledge: "",
    employeeIds: [] as string[],
  });

  const create = useMutation({
    mutationFn: () => createProject({ data: form }),
    onSuccess: ({ projectId }) => {
      setCreating(false);
      setForm({
        name: "",
        goal: "",
        description: "",
        dueDate: "",
        sharedKnowledge: "",
        employeeIds: [],
      });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setOpenId(projectId);
      toast.success("Project created — your AI team is assigned");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const run = useMutation({
    mutationFn: (id: string) => runProjectCollaboration({ data: { id } }),
    onSuccess: (_r, id) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      toast.success("Your AI team finished the project");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteProject({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  const roster = center?.employees ?? [];

  return (
    <AppShell
      title="AI Team Projects"
      description="Assign several AI employees to one goal and let them work together"
      action={
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus />
              New project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Create a team project</DialogTitle>
              <DialogDescription>
                Pick the AI employees who should collaborate. The first one you select leads.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="p-name">Project name</Label>
                <Input
                  id="p-name"
                  maxLength={140}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Q3 product launch"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-goal">Goal</Label>
                <Textarea
                  id="p-goal"
                  rows={2}
                  maxLength={600}
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value })}
                  placeholder="Launch the new plan and generate 200 qualified leads."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-desc">Description</Label>
                <Textarea
                  id="p-desc"
                  rows={3}
                  maxLength={1500}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="p-due">Deadline</Label>
                  <Input
                    id="p-due"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-know">Shared knowledge</Label>
                  <Input
                    id="p-know"
                    maxLength={400}
                    value={form.sharedKnowledge}
                    onChange={(e) => setForm({ ...form, sharedKnowledge: e.target.value })}
                    placeholder="Budget, brand rules, key links"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>AI team members</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {roster.map((employee) => {
                    const selected = form.employeeIds.includes(employee.id);
                    const index = form.employeeIds.indexOf(employee.id);
                    return (
                      <button
                        key={employee.id}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            employeeIds: selected
                              ? form.employeeIds.filter((id) => id !== employee.id)
                              : [...form.employeeIds, employee.id].slice(0, 6),
                          })
                        }
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                          selected
                            ? "border-primary bg-primary-soft"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        <EmployeeAvatar
                          name={employee.name}
                          accent={employee.accent}
                          className="size-8 text-xs"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{employee.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {selected && index === 0 ? "Team lead" : employee.role_title}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {roster.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Hire AI employees first — they become available as team members.
                  </p>
                ) : null}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="hero"
                disabled={form.name.trim().length < 3 || !form.employeeIds.length || create.isPending}
                onClick={() => create.mutate()}
              >
                {create.isPending ? <Loader2 className="animate-spin" /> : null}
                Create project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : projects?.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {projects.map((project) => (
            <article
              key={project.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">{project.name}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {project.goal ?? project.description ?? "No goal set"}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase",
                    STATUS_STYLES[project.status] ?? STATUS_STYLES["planning"],
                  )}
                >
                  {project.status}
                </span>
              </div>

              <div className="mt-4 flex -space-x-2">
                {project.members.map((member) => (
                  <EmployeeAvatar
                    key={member.employee.id}
                    name={member.employee.name}
                    accent={member.employee.accent}
                    className="size-8 border-2 border-card text-[10px]"
                  />
                ))}
              </div>

              <div className="mt-4 space-y-1">
                <Progress value={project.progress} />
                <p className="text-xs text-muted-foreground">{project.progress}% complete</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="hero"
                  disabled={run.isPending}
                  onClick={() => run.mutate(project.id)}
                >
                  {run.isPending ? <Loader2 className="animate-spin" /> : <Play />}
                  Run team
                </Button>
                <Button size="sm" variant="outline" onClick={() => setOpenId(project.id)}>
                  <Users />
                  Workspace
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => remove.mutate(project.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center">
          <Users className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 font-display text-lg font-semibold">No team projects yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a project and let several AI employees work on it together.
          </p>
        </div>
      )}

      <ProjectWorkspace id={openId} onClose={() => setOpenId(null)} />
    </AppShell>
  );
}

function ProjectWorkspace({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({ ...projectQuery(id ?? ""), enabled: Boolean(id) });

  return (
    <Dialog open={Boolean(id)} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {isLoading || !data ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{data.project.name}</DialogTitle>
              <DialogDescription>{data.project.goal ?? "Shared team workspace"}</DialogDescription>
            </DialogHeader>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Team
              </h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {data.members.map((member) => {
                  const employee = member.employee as unknown as {
                    name: string;
                    role_title: string;
                    accent: string;
                  };
                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 rounded-xl border border-border p-3"
                    >
                      <EmployeeAvatar
                        name={employee.name}
                        accent={employee.accent}
                        className="size-8 text-xs"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{employee.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {member.project_role} · {member.status}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Team communication
              </h3>
              <div className="mt-3 space-y-3">
                {data.messages.map((message) => {
                  const employee = message.employee as unknown as {
                    name: string;
                    accent: string;
                  } | null;
                  return (
                    <div key={message.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {employee ? (
                          <EmployeeAvatar
                            name={employee.name}
                            accent={employee.accent}
                            className="size-5 text-[9px]"
                          />
                        ) : null}
                        <span className="font-medium text-foreground">
                          {employee?.name ?? (message.author === "user" ? "You" : "System")}
                        </span>
                        <span>· {message.kind}</span>
                        <span className="ml-auto">
                          {new Date(message.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm">{message.content}</p>
                    </div>
                  );
                })}
                {data.messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No messages yet. Run the team to start the collaboration.
                  </p>
                ) : null}
              </div>
            </section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
