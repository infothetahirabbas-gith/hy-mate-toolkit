import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Bot,
  Brain,
  Gauge,

  CreditCard,
  FileText,
  Landmark,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Network,
  Wrench,
  Workflow,
  BrainCircuit,
  Plug,
  Settings,
  ShieldCheck,
  Store,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/app/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile } from "@/lib/account.functions";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "My AI Employees", to: "/my-employees", icon: Users },
  { label: "Marketplace", to: "/marketplace", icon: Store },
  { label: "Tasks", to: "/tasks", icon: ListChecks },
  { label: "Team Projects", to: "/teams", icon: Network },
  { label: "Workflows", to: "/workflows", icon: Workflow },
  { label: "Finance Department", to: "/finance", icon: Landmark },
  { label: "Reports", to: "/reports", icon: FileText },
  { label: "Knowledge & Memory", to: "/knowledge", icon: Brain },
  { label: "Memory Control", to: "/memory", icon: BrainCircuit },
  { label: "Performance", to: "/performance", icon: Gauge },
  { label: "Analytics", to: "/analytics", icon: BarChart3 },
  { label: "Billing", to: "/billing", icon: CreditCard },
  { label: "Tool Registry", to: "/tools", icon: Wrench },
  { label: "Integrations", to: "/integrations", icon: Plug },
  { label: "Settings", to: "/settings", icon: Settings },
] as const;



export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => getMyProfile(),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const items = data?.isAdmin
    ? [...NAV, { label: "Admin", to: "/admin", icon: ShieldCheck } as const]
    : NAV;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={cn(
          "surface-ink fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform duration-300 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 px-5 font-bold tracking-tight">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
            <Bot className="size-4" />
          </span>
          AI Employee
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-ink-muted hover:bg-sidebar-accent/60 hover:text-ink-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-ink-border p-3">
          <div className="truncate px-2 pb-2 text-xs text-ink-muted">
            {data?.profile?.email ?? "Signed in"}
          </div>
          <Button variant="onInk" size="sm" className="w-full" onClick={signOut}>
            <LogOut />
            Sign out
          </Button>
        </div>
      </aside>

      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-ink/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-5 backdrop-blur-xl">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border lg:hidden"
          >
            <Menu className="size-4" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">{title}</h1>
            {description ? (
              <p className="hidden truncate text-xs text-muted-foreground sm:block">{description}</p>
            ) : null}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {actions}
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-8">
          <div className="mx-auto w-full max-w-6xl animate-fade">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function CloseIcon() {
  return <X className="size-4" />;
}
