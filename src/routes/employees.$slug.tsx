import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Check,
  GitCompare,
  Globe,
  Heart,
  ListChecks,
  Play,
  Share2,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import { MetricCard, SkillChip, StoreSection, ToolPill } from "@/components/store/StorePieces";
import { employeeQuery, teamContextQuery } from "@/lib/queries";
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
    const title = `Hire ${employee.name} — ${employee.role_title} | AI Employee Marketplace`;
    const description = `${employee.tagline} Rated ${employee.rating}/5 by ${employee.review_count} businesses. From $${employee.price_monthly}/month.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
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
  component: EmployeeStorePage,
});

const ENTERPRISE_FEATURES = [
  "Team & department collaboration",
  "Workflow automation",
  "Custom knowledge base",
  "API access",
  "Advanced analytics",
  "SSO & security review",
  "Priority support",
  "Dedicated success manager",
];

const ONBOARDING_STEPS = [
  { title: "Business setup", detail: "Tell us your company, industry and goals." },
  { title: "Connect tools", detail: "Link the accounts this AI employee should work in." },
  { title: "Train the AI", detail: "Upload brand guidelines, docs and past work." },
  { title: "Activate", detail: "Confirm permissions and approval rules." },
  { title: "First task", detail: "Brief the first piece of work in the workspace." },
  { title: "First report", detail: "Receive a structured deliverable with an action plan." },
];

function money(value: number) {
  return `$${value.toLocaleString()}`;
}

function EmployeeStorePage() {
  const { employee } = Route.useLoaderData();
  const { data } = useSuspenseQuery(employeeQuery(employee.slug));
  const detail = (data ?? employee) as CatalogEmployee;
  if (typeof window !== "undefined") (window as any).__d = detail;
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [reviewSort, setReviewSort] = useState<"newest" | "highest" | "helpful">("newest");
  const [saved, setSaved] = useState(false);
  const [demoAsked, setDemoAsked] = useState(false);

  const teamCtx = useQuery({
    ...teamContextQuery(detail.team_slug ?? "", detail.slug),
    enabled: Boolean(detail.team_slug),
  });
  const team = teamCtx.data?.team ?? null;
  const teammates = teamCtx.data?.teammates ?? [];

  const yearly = Math.round(detail.price_monthly * 10);
  const compatibility = 88 + (detail.integrations.length % 10);

  const reviews = useMemo(() => {
    const list = [...detail.reviews];
    if (reviewSort === "highest") list.sort((a, b) => b.rating - a.rating);
    if (reviewSort === "helpful") list.sort((a, b) => b.body.length - a.body.length);
    return list;
  }, [detail.reviews, reviewSort]);

  const hire = useMutation({
    mutationFn: () => hireEmployee({ data: { slug: detail.slug, plan: "starter" } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries();
      toast.success(`${detail.name} joined your workforce`);
      navigate({ to: result.needsOnboarding ? "/onboarding" : "/my-employees" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const share = async () => {
    const url = typeof window === "undefined" ? "" : window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied");
    } catch {
      toast.error("Couldn’t copy the link");
    }
  };

  const hireButton =
    loading ? null : session ? (
      <Button
        variant="hero"
        size="lg"
        className="w-full"
        disabled={hire.isPending}
        onClick={() => hire.mutate()}
      >
        {hire.isPending ? "Processing…" : `Hire ${detail.name}`}
        <ArrowRight />
      </Button>
    ) : (
      <Button asChild variant="hero" size="lg" className="w-full">
        <Link to="/auth" search={{ mode: "signup" }}>
          Hire {detail.name}
          <ArrowRight />
        </Link>
      </Button>
    );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-muted/40">
          <div className="mx-auto max-w-6xl px-5 py-12">
            <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Link to="/marketplace" className="hover:text-foreground">
                Marketplace
              </Link>
              <span>/</span>
              {detail.department_slug ? (
                <>
                  <Link
                    to="/departments/$slug"
                    params={{ slug: detail.department_slug }}
                    className="hover:text-foreground"
                  >
                    {detail.department}
                  </Link>
                  <span>/</span>
                </>
              ) : null}
              <span className="text-foreground">{detail.name}</span>
            </nav>

            <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
              <div>
                <div className="flex flex-wrap items-start gap-5">
                  <EmployeeAvatar
                    name={detail.name}
                    accent={detail.accent}
                    className="size-20 text-2xl"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-3xl font-extrabold tracking-tighter sm:text-4xl">
                        {detail.name}
                      </h1>
                      {detail.verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                          <BadgeCheck className="size-3.5" />
                          Verified
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-lg text-muted-foreground">{detail.role_title}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="rounded-full">
                        {detail.department}
                      </Badge>
                      {team ? (
                        <Badge variant="outline" className="rounded-full font-normal">
                          {team.name}
                        </Badge>
                      ) : null}
                      <Badge variant="outline" className="rounded-full font-normal">
                        {detail.category}
                      </Badge>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                        <Star className="size-4 fill-amber-400 text-amber-400" />
                        {detail.rating.toFixed(1)}
                        <span className="font-normal text-muted-foreground">
                          ({detail.review_count} reviews)
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="size-4" />
                        {detail.businesses_served.toLocaleString()} businesses
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Globe className="size-4" />
                        {detail.languages.length} languages
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-accent" />
                        Available now
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      {detail.version} · Updated{" "}
                      {new Date(detail.last_updated_on).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                  {detail.tagline}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Play />
                        Try demo
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Demo · {detail.name}</DialogTitle>
                        <DialogDescription>{detail.intro_line}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div className="rounded-xl bg-muted p-4 text-sm">
                          <p className="font-semibold">You</p>
                          <p className="mt-1 text-muted-foreground">
                            {detail.workspace_input_placeholder}
                          </p>
                        </div>
                        {demoAsked ? (
                          <div className="rounded-xl border border-border p-4 text-sm">
                            <p className="flex items-center gap-1.5 font-semibold">
                              <Bot className="size-4 text-primary" />
                              {detail.name}
                            </p>
                            <ul className="mt-2 space-y-2 text-muted-foreground">
                              {detail.daily_tasks.slice(0, 3).map((task) => (
                                <li key={task} className="flex items-start gap-2">
                                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                                  {task}
                                </li>
                              ))}
                            </ul>
                            <p className="mt-3 text-xs text-muted-foreground">
                              This is a limited preview. Hire {detail.name} to run the full analysis
                              on your own data with metrics, findings and a prioritised action plan.
                            </p>
                          </div>
                        ) : (
                          <Button className="w-full" onClick={() => setDemoAsked(true)}>
                            Run the demo brief
                          </Button>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setSaved((value) => !value);
                      toast.success(saved ? "Removed from wishlist" : "Saved to wishlist");
                    }}
                  >
                    <Heart className={saved ? "fill-primary text-primary" : ""} />
                    {saved ? "Saved" : "Save"}
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/marketplace">
                      <GitCompare />
                      Compare
                    </Link>
                  </Button>
                  <Button variant="ghost" onClick={share}>
                    <Share2 />
                    Share
                  </Button>
                </div>
              </div>

              {/* Buy box */}
              <aside
                id="hire"
                className="h-fit w-full scroll-mt-24 rounded-2xl border border-border bg-card p-6 shadow-lift lg:sticky lg:top-24"
              >
                <div className="flex rounded-full bg-muted p-1 text-xs font-semibold">
                  {(["monthly", "yearly"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setCycle(option)}
                      className={`flex-1 rounded-full py-1.5 capitalize transition ${
                        cycle === option ? "bg-card shadow-soft" : "text-muted-foreground"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">
                    {money(cycle === "monthly" ? detail.price_monthly : yearly)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    /{cycle === "monthly" ? "month" : "year"}
                  </span>
                </div>
                {cycle === "yearly" ? (
                  <p className="mt-1 text-xs font-medium text-accent">Two months free</p>
                ) : null}

                <div className="mt-5">{hireButton}</div>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Cancel any time. No contracts.
                </p>

                <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    Compatibility
                  </p>
                  <p className="mt-1 text-2xl font-extrabold tracking-tight">
                    {compatibility}% match
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Works with {detail.integrations.slice(0, 2).join(" and ")}, and is built for{" "}
                    {detail.target_customers[0]?.toLowerCase() ?? "growing businesses"}.
                  </p>
                </div>

                <ul className="mt-5 space-y-2.5 border-t border-border pt-5">
                  {detail.business_benefits.slice(0, 5).map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                      <span className="text-foreground/80">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-5">
          <StoreSection
            eyebrow="Overview"
            title={`About ${detail.name}`}
            description={detail.description}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Experience"
                value={`${detail.experience_years} yrs`}
                hint="Equivalent human experience"
              />
              <MetricCard
                label="Hours saved"
                value={`${detail.hours_saved_monthly}/mo`}
                hint="Typical for this role"
              />
              <MetricCard
                label="Cost saved"
                value={`${money(detail.cost_savings_monthly)}/mo`}
                hint="Versus in-house hiring"
              />
              <MetricCard
                label="Ideal for"
                value={detail.target_customers.length ? "SMB → Enterprise" : "All sizes"}
                hint={detail.target_customers[0] ?? ""}
              />
            </div>
            <p className="mt-6 rounded-2xl bg-muted p-5 text-sm leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Main responsibility: </span>
              {detail.main_responsibility}
            </p>
          </StoreSection>

          <StoreSection
            eyebrow="Capabilities"
            title="Skills & proficiency"
            description="Every skill is graded so you know exactly where this AI employee is strongest."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {detail.skill_levels.map((skill) => (
                <SkillChip key={skill.name} name={skill.name} level={skill.level} />
              ))}
            </div>
            {detail.personality.length ? (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Working style
                </span>
                {detail.personality.map((trait) => (
                  <span
                    key={trait}
                    className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            ) : null}
          </StoreSection>

          <StoreSection
            eyebrow="Day to day"
            title="Responsibilities"
            description="What lands on this AI employee’s desk every day."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {detail.daily_tasks.map((task) => (
                <div
                  key={task}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm"
                >
                  <ListChecks className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-foreground/80">{task}</span>
                </div>
              ))}
            </div>
          </StoreSection>

          <StoreSection
            eyebrow="Integrations"
            title="Connected tools"
            description="Connect your accounts during onboarding and work starts immediately."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {detail.tool_status.map((tool) => (
                <ToolPill key={tool.name} name={tool.name} status={tool.status} />
              ))}
            </div>
          </StoreSection>

          <StoreSection
            eyebrow="Track record"
            title="Performance metrics"
            description="Aggregated across every business currently employing this AI specialist."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Businesses served"
                value={detail.businesses_served.toLocaleString()}
              />
              <MetricCard label="Tasks completed" value={detail.tasks_completed.toLocaleString()} />
              <MetricCard label="Success rate" value={`${detail.success_rate}%`} />
              <MetricCard label="Satisfaction" value={`${detail.satisfaction}/5`} />
              <MetricCard label="Avg. completion" value={`${detail.avg_completion_minutes} min`} />
              <MetricCard label="Hours saved / mo" value={`${detail.hours_saved_monthly}`} />
              <MetricCard
                label="Reports generated"
                value={Math.round(detail.tasks_completed / 6).toLocaleString()}
              />
              <MetricCard
                label="Automation runs"
                value={Math.round(detail.tasks_completed / 3).toLocaleString()}
              />
            </div>
          </StoreSection>

          <StoreSection
            eyebrow="Sample work"
            title="Portfolio"
            description="Preview the kind of output you receive before you hire."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {detail.portfolio.map((item) => (
                <Dialog key={item.title}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="rounded-2xl border border-border bg-card p-5 text-left transition-all duration-300 hover:border-primary/30 hover:shadow-lift"
                    >
                      <Badge variant="secondary" className="rounded-full text-[10px] uppercase">
                        {item.type}
                      </Badge>
                      <p className="mt-3 font-semibold tracking-tight">{item.title}</p>
                      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                        {item.summary}
                      </p>
                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                        Preview output <ArrowRight className="size-4" />
                      </span>
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{item.title}</DialogTitle>
                      <DialogDescription>{item.type} · sample deliverable</DialogDescription>
                    </DialogHeader>
                    <p className="text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
                    <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                      Every deliverable arrives with a summary, key metrics, findings, opportunities
                      and a prioritised action plan you can assign back to {detail.name}.
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </StoreSection>

          <StoreSection
            eyebrow="Reviews"
            title={`Rated ${detail.rating.toFixed(1)} by ${detail.review_count} businesses`}
          >
            <div className="mb-5 flex flex-wrap gap-2">
              {(
                [
                  ["newest", "Newest"],
                  ["highest", "Highest rated"],
                  ["helpful", "Most helpful"],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  size="sm"
                  variant={reviewSort === value ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setReviewSort(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {reviews.map((review) => (
                <div key={review.author} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: review.rating }).map((_, index) => (
                      <Star key={index} className="size-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/80">“{review.body}”</p>
                  <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{review.author}</span> ·{" "}
                    {review.title}
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 font-semibold text-accent">
                      <BadgeCheck className="size-3" />
                      Verified customer
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </StoreSection>

          <StoreSection
            eyebrow="Pricing"
            title="Hire one, or hire the whole team"
            description="Every level shares the same workspace, memory and reporting."
          >
            <div className="grid gap-4 lg:grid-cols-4">
              {[
                {
                  name: "Single employee",
                  price: money(detail.price_monthly),
                  detail: `Just ${detail.name}`,
                  features: ["1 AI employee", "Dedicated workspace", "Reports & memory"],
                  highlight: true,
                },
                {
                  name: "AI team",
                  price: team ? money(team.price_monthly) : "—",
                  detail: team?.name ?? "Team pricing",
                  features: ["Whole team hired together", "Shared workspace", "One onboarding"],
                },
                {
                  name: "AI department",
                  price: "From $699",
                  detail: detail.department,
                  features: ["All teams in the department", "Department dashboard", "Shared workflows"],
                },
                {
                  name: "Complete workforce",
                  price: "Custom",
                  detail: "Every department",
                  features: ["Unlimited AI employees", "Cross-team collaboration", "Dedicated support"],
                },
              ].map((tier) => (
                <div
                  key={tier.name}
                  className={`rounded-2xl border p-6 ${
                    tier.highlight
                      ? "border-primary bg-primary/5 shadow-lift"
                      : "border-border bg-card"
                  }`}
                >
                  <p className="text-sm font-bold tracking-tight">{tier.name}</p>
                  <p className="mt-2 text-2xl font-extrabold tracking-tight">{tier.price}</p>
                  <p className="text-xs text-muted-foreground">{tier.detail}</p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                        <span className="text-foreground/80">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </StoreSection>

          {teammates.length ? (
            <StoreSection
              eyebrow="Bundles"
              title="Businesses hiring this role also hire"
              description={`Add teammates from the ${team?.name ?? "same team"} and they collaborate automatically.`}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {teammates.map((mate) => (
                  <div
                    key={mate.id}
                    className="flex flex-col rounded-2xl border border-border bg-card p-5"
                  >
                    <EmployeeAvatar name={mate.name} accent={mate.accent} className="size-11" />
                    <p className="mt-3 font-semibold tracking-tight">{mate.name}</p>
                    <p className="text-xs text-muted-foreground">{mate.role_title}</p>
                    <p className="mt-2 text-sm font-semibold">{money(mate.price_monthly)}/mo</p>
                    <Button asChild size="sm" variant="outline" className="mt-4">
                      <Link to="/employees/$slug" params={{ slug: mate.slug }}>
                        Add to workforce
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </StoreSection>
          ) : null}

          <StoreSection
            eyebrow="Onboarding"
            title="What happens after you hire"
            description="Six short steps from checkout to your first delivered report."
          >
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ONBOARDING_STEPS.map((step, index) => (
                <li key={step.title} className="rounded-2xl border border-border bg-card p-5">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <p className="mt-3 font-semibold tracking-tight">{step.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
                </li>
              ))}
            </ol>
          </StoreSection>

          <StoreSection
            eyebrow="Enterprise"
            title="Built for larger organisations"
            description="Available on Business and Enterprise plans."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {ENTERPRISE_FEATURES.map((feature) => (
                <div
                  key={feature}
                  className="flex items-start gap-2 rounded-xl border border-border bg-card p-4 text-sm"
                >
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-foreground/80">{feature}</span>
                </div>
              ))}
            </div>
          </StoreSection>

          <StoreSection eyebrow="FAQ" title="Frequently asked questions">
            <Accordion type="single" collapsible className="w-full">
              {detail.faqs.map((faq, index) => (
                <AccordionItem key={faq.q} value={`faq-${index}`}>
                  <AccordionTrigger className="text-left text-base font-semibold">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </StoreSection>

          <section className="border-t border-border py-14">
            <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
              <h2 className="text-2xl font-bold tracking-tight">
                Ready to put {detail.name} to work?
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                Hire in under two minutes, connect your tools and receive a first deliverable the
                same day.
              </p>
              <div className="mx-auto mt-6 max-w-xs">{hireButton}</div>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
