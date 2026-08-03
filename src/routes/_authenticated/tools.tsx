import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Loader2, Plug } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toolRegistryQuery } from "@/lib/queries";
import { setToolPermission, type PermissionLevel } from "@/lib/tools.functions";
import { recommendedTools, TOOL_LIBRARY } from "@/lib/tools";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tools")({
  head: () => ({
    meta: [
      { title: "AI Tool Registry — AI Employee Marketplace" },
      {
        name: "description",
        content: "Control which tools each AI employee can use, and review every action taken.",
      },
      { property: "og:title", content: "AI Tool Registry" },
      { property: "og:description", content: "Permissions and activity logs for your AI workforce." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ToolsPage,
});

const PERMISSION_LABELS: Record<PermissionLevel, string> = {
  full: "Full access",
  approval: "Ask approval",
  disabled: "Disabled",
};

function ToolsPage() {
  const { data, isLoading } = useQuery(toolRegistryQuery);
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>("");

  const mutate = useMutation({
    mutationFn: (vars: { employeeId: string; toolId: string; permission: PermissionLevel }) =>
      setToolPermission({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool-registry"] });
      toast.success("Permission updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const employees = data?.employees ?? [];
  const selected = employees.find((e) => e.id === selectedId) ?? employees[0];

  const tools = useMemo(() => {
    if (!selected) return [];
    const suggested = new Set(recommendedTools(selected.category).map((t) => t.id));
    (selected.available_tools ?? []).forEach((t) => suggested.add(t));
    return TOOL_LIBRARY.map((tool) => ({ ...tool, suggested: suggested.has(tool.id) })).sort(
      (a, b) => Number(b.suggested) - Number(a.suggested),
    );
  }, [selected]);

  const permissionFor = (toolId: string): PermissionLevel => {
    const record = (data?.permissions ?? []).find(
      (p) => p.employee_id === selected?.id && p.tool_id === toolId,
    );
    return (record?.permission as PermissionLevel) ?? "disabled";
  };

  const connected = new Set(
    (data?.integrations ?? []).filter((i) => i.status === "connected").map((i) => i.provider),
  );

  return (
    <AppShell
      title="AI Tool Registry"
      description="Decide exactly what each AI employee is allowed to do"
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : !selected ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center">
          <Plug className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 font-display text-lg font-semibold">No active AI employees</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hire an AI employee to configure its tool permissions.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selected.id} onValueChange={setSelectedId}>
              <SelectTrigger className="w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name} — {employee.role_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <EmployeeAvatar
              name={selected.name}
              accent={selected.accent}
              className="size-9 text-xs"
            />
          </div>

          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Tool</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 w-52">Permission</th>
                </tr>
              </thead>
              <tbody>
                {tools.map((tool) => (
                  <tr key={tool.id} className="border-t border-border">
                    <td className="px-5 py-3">
                      <p className="font-medium">{tool.name}</p>
                      <p className="text-xs text-muted-foreground">{tool.description}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase",
                          connected.has(tool.id)
                            ? "bg-primary-soft text-primary"
                            : tool.suggested
                              ? "bg-accent/15 text-accent-foreground"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {connected.has(tool.id)
                          ? "connected"
                          : tool.suggested
                            ? "recommended"
                            : "available"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Select
                        value={permissionFor(tool.id)}
                        onValueChange={(v) =>
                          mutate.mutate({
                            employeeId: selected.id,
                            toolId: tool.id,
                            permission: v as PermissionLevel,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(PERMISSION_LABELS) as PermissionLevel[]).map((level) => (
                            <SelectItem key={level} value={level}>
                              {PERMISSION_LABELS[level]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Activity className="size-4 text-primary" />
              Tool activity log
            </h2>
            <div className="mt-4 space-y-2">
              {(data?.logs ?? []).map((log) => {
                const employee = log.employee as unknown as { name: string; accent: string } | null;
                const task = log.task as unknown as { task_name: string } | null;
                return (
                  <div
                    key={log.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm"
                  >
                    {employee ? (
                      <EmployeeAvatar
                        name={employee.name}
                        accent={employee.accent}
                        className="size-6 text-[10px]"
                      />
                    ) : null}
                    <span className="font-medium">{employee?.name ?? "System"}</span>
                    <span className="text-muted-foreground">{log.action}</span>
                    {task ? (
                      <span className="text-xs text-muted-foreground">· {task.task_name}</span>
                    ) : null}
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase",
                        log.outcome === "blocked"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary-soft text-primary",
                      )}
                    >
                      {log.outcome}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                );
              })}
              {(data?.logs ?? []).length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No tool activity yet. Every action your AI employees take will appear here.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
