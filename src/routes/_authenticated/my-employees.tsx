import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Pause, Play, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app/AppShell";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import { mySubscriptionsQuery } from "@/lib/queries";
import { setSubscriptionStatus } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/my-employees")({
  head: () => ({
    meta: [
      { title: "My AI Employees — AI Employee Marketplace" },
      { name: "description", content: "Manage the AI employees on your team." },
      { property: "og:title", content: "My AI Employees" },
      { property: "og:description", content: "Manage the AI employees on your team." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyEmployeesPage,
});

function MyEmployeesPage() {
  const { data, isLoading } = useQuery(mySubscriptionsQuery);
  const queryClient = useQueryClient();

  const update = useMutation({
    mutationFn: (vars: { subscriptionId: string; status: "active" | "paused" | "cancelled" }) =>
      setSubscriptionStatus({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Subscription updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell
      title="My AI employees"
      description="Manage seats, pause work or open a workspace"
      actions={
        <Button asChild size="sm" variant="hero">
          <Link to="/marketplace">Hire more</Link>
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-4">
          {data.map((sub) => (
            <div
              key={sub.id}
              className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-soft lg:flex-row lg:items-center"
            >
              <EmployeeAvatar name={sub.employee.name} accent={sub.employee.accent} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold">{sub.employee.name}</h2>
                  <Badge
                    variant={sub.status === "active" ? "default" : "secondary"}
                    className="rounded-full text-[10px] uppercase"
                  >
                    {sub.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{sub.employee.role_title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {sub.tasks_completed} tasks completed · ${sub.price_monthly}/month · hired{" "}
                  {new Date(sub.subscription_date).toLocaleDateString()}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {sub.status === "active" ? (
                  <>
                    <Button asChild size="sm" variant="hero">
                      <Link to="/workspace/$slug" params={{ slug: sub.employee.slug }}>
                        Open workspace
                        <ArrowRight />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={update.isPending}
                      onClick={() =>
                        update.mutate({ subscriptionId: sub.id, status: "paused" })
                      }
                    >
                      <Pause />
                      Pause
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ subscriptionId: sub.id, status: "active" })}
                  >
                    <Play />
                    Reactivate
                  </Button>
                )}
                {sub.status !== "cancelled" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={update.isPending}
                    onClick={() =>
                      update.mutate({ subscriptionId: sub.id, status: "cancelled" })
                    }
                  >
                    <X />
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-14 text-center">
          <h2 className="font-semibold">No AI employees yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Hire your first specialist and put them to work today.
          </p>
          <Button asChild variant="hero" className="mt-5">
            <Link to="/marketplace">Browse marketplace</Link>
          </Button>
        </div>
      )}
    </AppShell>
  );
}
