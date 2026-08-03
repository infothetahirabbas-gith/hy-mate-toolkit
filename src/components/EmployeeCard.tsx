import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import type { CatalogEmployee } from "@/lib/catalog.functions";

export function EmployeeCard({ employee }: { employee: CatalogEmployee }) {
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-all duration-500 hover:border-primary/25 hover:shadow-lift">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
        <EmployeeAvatar
          name={employee.name}
          accent={employee.accent}
          className="shrink-0 transition-transform duration-500 group-hover:scale-110"
        />
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold">{employee.name}</h3>
          <p className="truncate text-sm text-muted-foreground">{employee.role_title}</p>
        </div>
        <Badge variant="secondary" className="shrink-0 rounded-full font-normal">
          {employee.category}
        </Badge>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{employee.tagline}</p>

      <ul className="mt-5 space-y-2">
        {employee.features.slice(0, 3).map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="text-foreground/80">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-5 [margin-block-start:1.5rem]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            From
          </span>
          <div>
            <span className="text-2xl font-bold tracking-tight">${employee.price_monthly}</span>
            <span className="text-sm text-muted-foreground">/mo</span>
          </div>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/employees/$slug" params={{ slug: employee.slug }}>
            View Employee
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </article>
  );
}
