import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import type { CatalogEmployee } from "@/lib/catalog.functions";

export function EmployeeCard({ employee }: { employee: CatalogEmployee }) {
  const reviews = employee.reviews ?? [];
  const rating = reviews.length
    ? reviews.reduce((sum, review) => sum + (review.rating ?? 5), 0) / reviews.length
    : 0;

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
          <p className="line-clamp-2 text-sm text-muted-foreground">{employee.role_title}</p>
          {rating > 0 ? (
        <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Star className="size-3.5 fill-accent text-accent" />
              <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
              <span>({reviews.length})</span>
              <span aria-hidden="true">·</span>
              <span className="">{employee.category}</span>
            </p>
          ) : null}
        </div>
        <Badge variant="secondary" className="shrink-0 rounded-full font-normal">
          {employee.department}
        </Badge>
      </div>


      {employee.personality.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {employee.personality.slice(0, 4).map((trait) => (
            <span
              key={trait}
              className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              {trait}
            </span>
          ))}
        </div>
      ) : null}

      <ul className="mt-4 space-y-2">
        {employee.skills.slice(0, 3).map((skill) => (
          <li key={skill} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="text-foreground/80">{skill}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto border-t border-border pt-5 [margin-block-start:1.5rem]">
        <div className="flex items-end justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              From
            </span>
            <div>
              <span className="text-2xl font-bold tracking-tight">${employee.price_monthly}</span>
              <span className="text-sm text-muted-foreground">/mo</span>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/employees/$slug" params={{ slug: employee.slug }}>
              View Profile
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/employees/$slug" params={{ slug: employee.slug }} hash="hire">
              Hire
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
