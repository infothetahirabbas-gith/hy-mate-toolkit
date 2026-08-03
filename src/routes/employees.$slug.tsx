import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import { employeeQuery } from "@/lib/queries";
import type { CatalogEmployee } from "@/lib/catalog.functions";
import { hireEmployee } from "@/lib/account.functions";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/employees/$slug")({
  loader: async ({ context, params }) => {
    const employee = await context.queryClient.ensureQueryData(employeeQuery(params.slug));
    if (!employee) throw notFound();
    return { employee };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "AI employee unavailable" }, { name: "robots", content: "noindex" }],
      };
    }
    const { employee } = loaderData;
    const title = `${employee.name} — ${employee.role_title} | AI Employee Marketplace`;
    return {
      meta: [
        { title },
        { name: "description", content: employee.tagline },
        { property: "og:title", content: title },
        { property: "og:description", content: employee.tagline },
      ],
    };
  },
  component: EmployeeDetailPage,
});

function EmployeeDetailPage() {
  const { employee } = Route.useLoaderData();
  const { data } = useSuspenseQuery(employeeQuery(employee.slug));
  const detail = (data ?? employee) as CatalogEmployee;
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const hire = useMutation({
    mutationFn: () => hireEmployee({ data: { slug: detail.slug } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries();
      toast.success(`${detail.name} joined your team`);
      navigate({ to: result.needsOnboarding ? "/onboarding" : "/my-employees" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-border bg-muted/40">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16 lg:flex-row lg:items-start">
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <EmployeeAvatar name={detail.name} accent={detail.accent} className="size-16 text-xl" />
                <div>
                  <Badge variant="secondary" className="rounded-full">
                    {detail.category}
                  </Badge>
                  <h1 className="mt-2 text-3xl font-extrabold tracking-tighter sm:text-4xl">
                    {detail.name}
                  </h1>
                  <p className="text-muted-foreground">{detail.role_title}</p>
                </div>
              </div>

              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                {detail.description}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {detail.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <aside className="w-full rounded-2xl border border-border bg-card p-7 shadow-lift lg:w-80">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight">
                  ${detail.price_monthly}
                </span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Cancel or pause this seat at any time.
              </p>

              {loading ? null : session ? (
                <Button
                  variant="hero"
                  size="lg"
                  className="mt-6 w-full"
                  disabled={hire.isPending}
                  onClick={() => hire.mutate()}
                >
                  {hire.isPending ? "Hiring…" : `Hire ${detail.name}`}
                  <ArrowRight />
                </Button>
              ) : (
                <Button asChild variant="hero" size="lg" className="mt-6 w-full">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Sign up to hire
                    <ArrowRight />
                  </Link>
                </Button>
              )}

              <ul className="mt-6 space-y-2.5 border-t border-border pt-6">
                {detail.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                    <span className="text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Sparkles className="size-4" />
              What the workspace looks like
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">
              {detail.workspace_input_label}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              After hiring, you get a dedicated workspace for {detail.name}. You brief them with
              something like “{detail.workspace_input_placeholder}” and receive a structured summary,
              key metrics, findings, opportunities and a prioritised action plan.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/marketplace">See other specialists</Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
