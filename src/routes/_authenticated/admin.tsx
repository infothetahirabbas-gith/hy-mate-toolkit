import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { getAdminOverview } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — AI Employee Marketplace" },
      { name: "description", content: "Platform metrics, users and subscriptions." },
      { property: "og:title", content: "Admin" },
      { property: "og:description", content: "Platform metrics, users and subscriptions." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => getAdminOverview(),
    retry: false,
  });

  return (
    <AppShell title="Admin" description="Platform overview">
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-dashed border-border p-14 text-center text-sm text-muted-foreground">
          You don't have access to the admin area.
        </div>
      ) : data ? (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Users", value: data.metrics.totalUsers },
              { label: "Active subscriptions", value: data.metrics.activeSubscriptions },
              { label: "MRR", value: `$${data.metrics.mrr}` },
              { label: "Tasks run", value: data.metrics.tasksRun },
              { label: "Tasks completed", value: data.metrics.tasksCompleted },
              { label: "Reports generated", value: data.metrics.reportsGenerated },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft"
              >
                <div className="text-xs text-muted-foreground">{stat.label}</div>
                <div className="mt-1 text-2xl font-bold tracking-tight">{stat.value}</div>
              </div>
            ))}
          </div>

          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <h2 className="border-b border-border p-5 text-sm font-semibold">Recent users</h2>
            {data.users.slice(0, 15).map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-4 border-b border-border p-4 text-sm last:border-b-0"
              >
                <span className="min-w-0 flex-1 truncate">{user.name || "—"}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{user.email}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <h2 className="border-b border-border p-5 text-sm font-semibold">AI employees</h2>
            {data.employees.map((employee) => (
              <div
                key={employee.id}
                className="flex flex-wrap items-center gap-3 border-b border-border p-4 text-sm last:border-b-0"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{employee.name}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {employee.role_title}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{employee.category}</span>
                <span className="shrink-0 text-xs">${employee.price_monthly}/mo</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toggleEmployee.mutate({ id: employee.id, is_active: !employee.is_active })
                  }
                  disabled={toggleEmployee.isPending}
                >
                  {employee.is_active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            ))}
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <h2 className="border-b border-border p-5 text-sm font-semibold">Categories</h2>
            {(categories ?? []).map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-3 border-b border-border p-4 text-sm last:border-b-0"
              >
                <span className="w-32 shrink-0 font-medium">{category.name}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {category.description}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeCategory.mutate({ id: category.id })}
                  disabled={removeCategory.isPending}
                >
                  Remove
                </Button>
              </div>
            ))}
            <form
              className="flex gap-2 p-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!newCategory.trim()) return;
                saveCategory.mutate({ name: newCategory.trim(), description: "", sort_order: 99 });
              }}
            >
              <Input
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                placeholder="New category name"
                maxLength={60}
              />
              <Button type="submit" disabled={saveCategory.isPending}>
                Add
              </Button>
            </form>
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <h2 className="border-b border-border p-5 text-sm font-semibold">Subscriptions</h2>
            {data.subscriptions.slice(0, 20).map((sub) => (
              <div
                key={sub.id}
                className="flex flex-wrap items-center gap-3 border-b border-border p-4 text-sm last:border-b-0"
              >
                <span className="min-w-0 flex-1 truncate">
                  {(sub.employee as { name?: string } | null)?.name ?? "—"}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{sub.plan}</span>
                <span className="shrink-0 text-xs">${sub.price_monthly}/mo</span>
                <span className="shrink-0 text-xs font-medium">{sub.status}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updateSub.isPending}
                  onClick={() =>
                    updateSub.mutate({
                      id: sub.id,
                      status: sub.status === "active" ? "paused" : "active",
                    })
                  }
                >
                  {sub.status === "active" ? "Pause" : "Activate"}
                </Button>
              </div>
            ))}
          </section>
        </div>

      ) : null}
    </AppShell>
  );
}
