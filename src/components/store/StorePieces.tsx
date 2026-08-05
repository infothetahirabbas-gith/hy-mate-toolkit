import { Check, Circle, Clock, Lock, Plug } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function StoreSection({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border py-12 first:border-t-0">
      {eyebrow ? (
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      ) : null}
      <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-7">{children}</div>
    </section>
  );
}

export function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-extrabold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const LEVEL_WIDTH: Record<string, string> = {
  Expert: "w-full",
  Advanced: "w-4/5",
  Proficient: "w-3/5",
};

export function SkillChip({ name, level }: { name: string; level: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{name}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {level}
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-muted">
        <div className={`h-1.5 rounded-full bg-primary ${LEVEL_WIDTH[level] ?? "w-1/2"}`} />
      </div>
    </div>
  );
}

const TOOL_ICON: Record<string, typeof Check> = {
  Connected: Check,
  Optional: Circle,
  Premium: Lock,
  "Coming soon": Clock,
};

export function ToolPill({ name, status }: { name: string; status: string }) {
  const Icon = TOOL_ICON[status] ?? Plug;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <span className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-primary" />
        {name}
      </span>
      <Badge
        variant={status === "Connected" ? "secondary" : "outline"}
        className="rounded-full text-[10px] font-semibold uppercase tracking-wider"
      >
        {status}
      </Badge>
    </div>
  );
}
