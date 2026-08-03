import { cn } from "@/lib/utils";

const PALETTE: Record<string, string> = {
  primary: "bg-gradient-primary text-primary-foreground",
  accent: "bg-accent text-accent-foreground",
};

export function EmployeeAvatar({
  name,
  accent = "primary",
  className,
}: {
  name: string;
  accent?: string;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-2xl font-bold tracking-tight shadow-soft",
        PALETTE[accent] ?? PALETTE["primary"],
        "size-12 text-base",
        className,
      )}
    >
      {initials}
    </span>
  );
}
