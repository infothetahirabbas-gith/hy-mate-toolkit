import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/app/AppShell";
import { mySubscriptionsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Billing — AI Employee Marketplace" },
      { name: "description", content: "Review your AI employee seats and monthly spend." },
      { property: "og:title", content: "Billing" },
      { property: "og:description", content: "Review your AI employee seats and monthly spend." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  const { data, isLoading } = useQuery(mySubscriptionsQuery);
  const active = (data ?? []).filter((s) => s.status === "active");
  const total = active.reduce((sum, s) => sum + s.price_monthly, 0);

  return (
    <AppShell title="Billing" description="Your seats and monthly spend">
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="text-xs text-muted-foreground">Current monthly total</div>
            <div className="mt-1 text-4xl font-extrabold tracking-tight">${total}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              {active.length} active seat{active.length === 1 ? "" : "s"}. Card payments are coming
              soon — seats are free while we're in preview.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            {(data ?? []).length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No seats yet.{" "}
                <Link to="/marketplace" className="font-semibold text-primary hover:underline">
                  Browse the marketplace
                </Link>
              </div>
            ) : (
              (data ?? []).map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center gap-4 border-b border-border p-5 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{sub.employee.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {sub.employee.role_title}
                    </div>
                  </div>
                  <Badge variant="secondary" className="rounded-full text-[10px] uppercase">
                    {sub.status}
                  </Badge>
                  <div className="font-mono text-sm">${sub.price_monthly}/mo</div>
                </div>
              ))
            )}
          </div>

          <Button asChild variant="outline">
            <Link to="/my-employees">Manage seats</Link>
          </Button>
        </div>
      )}
    </AppShell>
  );
}
