import { Link } from "@tanstack/react-router";
import { Bot } from "lucide-react";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Marketplace", to: "/marketplace" },
      { label: "How it works", to: "/how-it-works" },
      { label: "Pricing", to: "/pricing" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", to: "/auth" },
      { label: "Dashboard", to: "/dashboard" },
      { label: "Billing", to: "/billing" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="surface-ink mt-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 font-bold tracking-tight">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
              <Bot className="size-4" />
            </span>
            AI Employee Marketplace
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
            Hire AI employees for your business. Automate marketing, sales, support and operations
            with AI workers trained on your company.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h3 className="text-sm font-semibold">{column.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm text-ink-muted transition-colors hover:text-ink-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-ink-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} AI Employee Marketplace. All rights reserved.</span>
          <span>Built for teams that want output, not headcount.</span>
        </div>
      </div>
    </footer>
  );
}
