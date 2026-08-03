import { useState } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, ListChecks, Plug, Sparkles, Star, Target } from "lucide-react";
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
import { PLANS } from "@/lib/plans";

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
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  errorComponent: ({ error }) => (
    <div role="alert" className="p-10 text-center text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-10 text-center text-sm text-muted-foreground">
      That AI employee doesn’t exist.{" "}
      <Link to="/marketplace" className="text-primary underline">
        Browse the marketplace
      </Link>
    </div>
  ),
  component: EmployeeDetailPage,
});

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Check;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-7 shadow-soft">
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
        <Icon className="size-4 text-primary" />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmployeeDetailPage() {
  const { employee } = Route.useLoaderData();
  const { data } = useSuspenseQuery(employeeQuery(employee.slug));
  const detail = (data ?? employee) as CatalogEmployee;
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [plan, setPlan] = useState<"starter" | "professional" | "business">("starter");

  const hire = useMutation({
    mutationFn: () => hireEmployee({ data: { slug: detail.slug, plan } }),
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
                <EmployeeAvatar
                  name={detail.name}
                  accent={detail.accent}
                  className="size-16 text-xl"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="rounded-full">
                      {detail.category}
                    </Badge>
                    <Badge variant="outline" className="rounded-full font-normal">
                      {detail.department}
                    </Badge>
                  </div>
                  <h1 className="mt-2 text-3xl font-extrabold tracking-tighter sm:text-4xl">
                    {detail.name}
                  </h1>
                  <p className="text-muted-foreground">{detail.role_title}</p>
                </div>
              </div>

              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                {detail.description}
              </p>

              {detail.personality.length > 0 ? (
                <div className="mt-6">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Personality
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {detail.personality.map((trait) => (
                      <span
                        key={trait}
                        className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Skills
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
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
            </div>

            <aside
              id="hire"
              className="w-full scroll-mt-24 rounded-2xl border border-border bg-card p-7 shadow-lift lg:w-80"
            >
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight">
                  ${detail.price_monthly}
                </span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>

              <div className="mt-6 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Select a plan
                </p>
                {PLANS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setPlan(option.id as typeof plan)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                      plan === option.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span className="font-medium">{option.name}</span>
                    <span className="text-muted-foreground">${option.price}/mo</span>
                  </button>
                ))}
              </div>

              {loading ? null : session ? (
                <Button
                  variant="hero"
                  size="lg"
                  className="mt-6 w-full"
                  disabled={hire.isPending}
                  onClick={() => hire.mutate()}
                >
                  {hire.isPending ? "Processing…" : `Hire ${detail.name}`}
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

              <p className="mt-3 text-center text-xs text-muted-foreground">
                Cancel any time. No contracts.
              </p>

              <ul className="mt-6 space-y-2.5 border-t border-border pt-6">
                {detail.business_benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                    <span className="text-foreground/80">{benefit}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-14 lg:grid-cols-2">
          <Section icon={ListChecks} title="Daily tasks">
            <ul className="space-y-2.5">
              {detail.daily_tasks.map((task) => (
                <li key={task} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-foreground/80">{task}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section icon={Target} title="Who this AI employee is for">
            <ul className="space-y-2.5">
              {detail.target_customers.map((customer) => (
                <li key={customer} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-foreground/80">{customer}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 rounded-xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Main responsibility: </span>
              {detail.main_responsibility}
            </p>
          </Section>

          <Section icon={Plug} title="Integrations">
            <div className="flex flex-wrap gap-2">
              {detail.integrations.map((tool) => (
                <span
                  key={tool}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground/80"
                >
                  {tool}
                </span>
              ))}
            </div>
          </Section>

          <Section icon={Star} title="Customer reviews">
            <div className="space-y-4">
              {detail.reviews.map((review) => (
                <div key={review.author} className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: review.rating }).map((_, index) => (
                      <Star key={index} className="size-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/80">“{review.body}”</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {review.author} · {review.title}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <section className="mx-auto max-w-6xl px-5 pb-16">
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
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link to="/marketplace">See other specialists</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/industries">Browse by industry</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
