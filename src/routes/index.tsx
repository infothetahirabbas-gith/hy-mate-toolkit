import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  Clock,
  Rocket,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { EmployeeCard } from "@/components/EmployeeCard";
import { employeesQuery } from "@/lib/queries";
import { PLANS } from "@/lib/plans";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(employeesQuery),
  head: () => ({
    meta: [
      { title: "AI Employee Marketplace — Hire AI Employees For Your Business" },
      {
        name: "description",
        content:
          "Hire AI employees for SEO, content, ads and support on a monthly subscription. Onboard your business once and get real deliverables in minutes.",
      },
      { property: "og:title", content: "AI Employee Marketplace — Hire AI Employees For Your Business" },
      {
        property: "og:description",
        content:
          "Hire AI employees for SEO, content, ads and support on a monthly subscription. Onboard your business once and get real deliverables in minutes.",
      },
    ],
  }),
  component: HomePage,
});

const STEPS = [
  {
    icon: Sparkles,
    title: "Browse the marketplace",
    detail:
      "Every AI employee has a persona, a specialty and a clear monthly price. Pick the role your business needs first.",
  },
  {
    icon: BrainCircuit,
    title: "Onboard your business once",
    detail:
      "Tell us your business, audience and goals. Every AI employee you hire inherits that context automatically.",
  },
  {
    icon: Workflow,
    title: "Assign work, get deliverables",
    detail:
      "Open the workspace, describe the job and your AI employee returns a structured plan, findings and next actions.",
  },
];

const BENEFITS = [
  {
    icon: Clock,
    title: "Output in minutes, not weeks",
    detail: "No job posts, no interviews, no ramp-up time. Your AI employee starts on day zero.",
  },
  {
    icon: BarChart3,
    title: "Every task tracked",
    detail: "Tasks, results and reports are logged in your dashboard so you can prove the ROI.",
  },
  {
    icon: ShieldCheck,
    title: "Your data stays yours",
    detail: "Business knowledge is scoped to your account and never shared between workspaces.",
  },
  {
    icon: Rocket,
    title: "Scale a department, not headcount",
    detail: "Hire one AI employee or build a full team. Pause or cancel any seat at any time.",
  },
];

const FAQS = [
  {
    q: "What exactly is an AI employee?",
    a: "A persona-driven AI worker with a defined role, a workspace and memory of your business. You brief it like a teammate and it returns structured, usable work.",
  },
  {
    q: "Do I need technical skills?",
    a: "No. You complete a short business onboarding, then describe tasks in plain language. Everything else happens in the dashboard.",
  },
  {
    q: "Can I hire more than one?",
    a: "Yes. Most teams start with one AI employee and add specialists as they see results. Each seat is billed monthly.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Pause or cancel any AI employee from your billing page. Access continues until the end of the current cycle.",
  },
];

function HomePage() {
  const { data: employees } = useSuspenseQuery(employeesQuery);
  const featured = employees.slice(0, 6);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute inset-0 bg-hero" aria-hidden="true" />
          <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-20 lg:pb-28 lg:pt-28">
            <div className="mx-auto max-w-4xl text-center animate-rise">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary-soft px-3 py-1 text-sm font-medium tracking-tight text-primary">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                Now hiring: 6 AI specialists
              </span>

              <h1 className="mt-6 text-balance text-5xl font-bold leading-[0.95] tracking-tight sm:text-6xl md:text-7xl">
                Hire AI employees for{" "}
                <span className="text-primary">your business.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-pretty text-xl leading-relaxed text-muted-foreground">
                Your digital workforce for marketing, sales, support and operations — AI specialists
                that already know your business and deliver in minutes.
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-4 pt-2 sm:flex-row">
                <Button asChild size="xl" variant="hero">
                  <Link to="/marketplace">
                    Browse AI Employees
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="xl" variant="outline">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Start Free Trial
                  </Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                No credit card required · Cancel any seat anytime
              </p>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-3">
              {[
                { value: "6", label: "AI specialists available" },
                { value: "< 5 min", label: "From signup to first deliverable" },
                { value: "24/7", label: "Your AI team never sleeps" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft"
                >
                  <div className="font-display text-3xl font-bold tracking-tight text-foreground">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              A new way to staff your company
            </h2>
            <p className="mt-4 text-muted-foreground">
              Three steps between you and a working AI department.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.title} className="rounded-2xl border border-border bg-card p-7 shadow-soft">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-secondary text-foreground">
                    <step.icon className="size-5" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Marketplace preview */}
        <section className="border-y border-border bg-muted/40">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Meet the team</h2>
                <p className="mt-4 text-muted-foreground">
                  Each AI employee has a specialty, a workspace and a monthly rate.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link to="/marketplace">
                  View all
                  <ArrowRight />
                </Link>
              </Button>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((employee) => (
                <EmployeeCard key={employee.id} employee={employee} />
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Cheaper than a hire. Faster than an agency.
              </h2>
              <p className="mt-4 text-muted-foreground">
                A junior marketer costs thousands per month and takes weeks to onboard. An AI employee
                starts today, works around the clock and never needs a handover document.
              </p>
              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                {BENEFITS.map((benefit) => (
                  <div key={benefit.title}>
                    <benefit.icon className="size-5 text-primary" />
                    <h3 className="mt-3 font-semibold">{benefit.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {benefit.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="surface-ink rounded-3xl p-8 shadow-lift">
              <div className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Cost comparison
              </div>
              <div className="mt-6 space-y-5">
                {[
                  { label: "In-house marketing hire", value: "$4,200/mo", muted: true },
                  { label: "Freelance agency retainer", value: "$2,500/mo", muted: true },
                  { label: "AI employee", value: "$49/mo", muted: false },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-4">
                    <span className={row.muted ? "text-sm text-ink-muted" : "text-sm font-semibold"}>
                      {row.label}
                    </span>
                    <span
                      className={
                        row.muted
                          ? "font-mono text-sm text-ink-muted line-through"
                          : "font-mono text-lg font-bold text-accent"
                      }
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-8 border-t border-ink-border pt-6">
                <ul className="space-y-3">
                  {[
                    "No onboarding period",
                    "No payroll or benefits",
                    "Scales up and down instantly",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-ink-muted">
                      <Check className="size-4 text-accent" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="border-t border-border bg-muted/40">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple monthly plans</h2>
              <p className="mt-4 text-muted-foreground">
                Start with one AI employee. Grow into a full department when you're ready.
              </p>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={
                    plan.highlight
                      ? "relative rounded-2xl border-2 border-primary bg-card p-7 shadow-lift"
                      : "rounded-2xl border border-border bg-card p-7 shadow-soft"
                  }
                >
                  {plan.highlight ? (
                    <Badge className="absolute -top-3 left-7 rounded-full">Most popular</Badge>
                  ) : null}
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{plan.tagline}</p>
                  <div className="mt-6">
                    <span className="text-4xl font-extrabold tracking-tight">${plan.price}</span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                        <span className="text-foreground/80">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className="mt-7 w-full"
                    variant={plan.highlight ? "hero" : "outline"}
                  >
                    <Link to="/auth" search={{ mode: "signup" }}>
                      Get started
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-5 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently asked questions
          </h2>
          <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-card">
            {FAQS.map((faq) => (
              <div key={faq.q} className="p-6">
                <h3 className="font-semibold">{faq.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-5 pb-8">
          <div className="surface-ink relative overflow-hidden rounded-3xl px-8 py-16 text-center shadow-lift">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Your first AI employee starts today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-muted">
              Create your workspace, onboard your business and put an AI specialist to work in under
              five minutes.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="xl" variant="accent">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Start free trial
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="xl" variant="onInk">
                <Link to="/marketplace">Browse AI employees</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
