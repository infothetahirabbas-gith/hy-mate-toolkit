import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PLANS } from "@/lib/plans";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — AI Employee Marketplace" },
      {
        name: "description",
        content:
          "Simple monthly pricing for AI employees. Start at $49/month for one specialist or scale to an unlimited AI department.",
      },
      { property: "og:title", content: "AI Employee Pricing" },
      {
        property: "og:description",
        content: "Plans from $49/month. Hire one AI specialist or build a full AI department.",
      },
    ],
  }),
  component: PricingPage,
});

const FAQS = [
  {
    q: "How does billing work?",
    a: "Each plan is billed monthly. AI employee seats are included in your plan limits and can be added or removed at any time.",
  },
  {
    q: "What counts as a task?",
    a: "Every brief you send to an AI employee that returns a deliverable counts as one task. Reports generated from a task are free.",
  },
  {
    q: "Can I switch plans later?",
    a: "Yes. Upgrade or downgrade whenever you like — changes apply from your next billing cycle.",
  },
];

function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-border bg-muted/40">
          <div className="mx-auto max-w-6xl px-5 py-16 text-center">
            <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl">
              Pricing that beats a payroll line
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Every plan includes business onboarding, workspaces, memory and reporting.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={
                  plan.highlight
                    ? "relative rounded-2xl border-2 border-primary bg-card p-8 shadow-lift"
                    : "rounded-2xl border border-border bg-card p-8 shadow-soft"
                }
              >
                {plan.highlight ? (
                  <Badge className="absolute -top-3 left-8 rounded-full">Most popular</Badge>
                ) : null}
                <h2 className="text-lg font-bold">{plan.name}</h2>
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
                <Button asChild className="mt-8 w-full" variant={plan.highlight ? "hero" : "outline"}>
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Start with {plan.name}
                  </Link>
                </Button>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-16 max-w-3xl divide-y divide-border rounded-2xl border border-border bg-card">
            {FAQS.map((faq) => (
              <div key={faq.q} className="p-6">
                <h3 className="font-semibold">{faq.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
