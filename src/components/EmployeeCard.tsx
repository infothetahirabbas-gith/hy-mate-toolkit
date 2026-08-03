import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import type { CatalogEmployee } from "@/lib/catalog.functions";

export function EmployeeCard({ employee }: { employee: CatalogEmployee }) {
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lift">
      <div className="flex items-start gap-4">
        <EmployeeAvatar name={employee.name} accent={employee.accent} />
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold">{employee.name}</h3>
          <p className="truncate text-sm text-muted-foreground">{employee.role_title}</p>
        </div>
        <Badge variant="secondary" className="ml-auto shrink-0 rounded-full">
          {employee.category}
        </Badge>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{employee.tagline}</p>

      <ul className="mt-5 space-y-2">
        {employee.features.slice(0, 4).map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-accent" />
            <span className="text-foreground/80">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-end justify-between border-t border-border pt-5">
        <div>
          <span className="text-2xl font-bold tracking-tight">${employee.price_monthly}</span>
          <span className="text-sm text-muted-foreground">/month</span>
        </div>
        <Button asChild size="sm">
          <Link to="/employees/$slug" params={{ slug: employee.slug }}>
            Hire {employee.name}
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </article>
  );
}
