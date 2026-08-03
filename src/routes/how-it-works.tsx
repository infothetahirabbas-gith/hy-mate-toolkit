import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — AI Employee Marketplace" },
      {
        name: "description",
        content:
          "See how hiring an AI employee works: browse the marketplace, onboard your business once, assign tasks and collect reports.",
      },
      { property: "og:title", content: "How Hiring An AI Employee Works" },
      {
        property: "og:description",
        content: "From signup to your first deliverable in under five minutes.",
      },
    ],
  }),
  component: HowItWorksPage,
});

const PHASES = [
  {
    step: "01",
    title: "Create your workspace",
    detail:
      "Sign up with email or Google. Your workspace holds your business profile, your AI roster and every deliverable they produce.",
  },
  {
    step: "02",
    title: "Onboard your business",
    detail:
      "Answer a short set of questions: what you sell, who you sell to, your goals and your brand voice. This becomes shared memory for every AI employee you hire.",
  },
  {
    step: "03",
    title: "Hire your first specialist",
    detail:
      "Pick an AI employee from the marketplace. The seat activates immediately — no contracts, no onboarding period.",
  },
  {
    step: "04",
    title: "Brief them in the workspace",
    detail:
      "Open the employee's workspace and describe the job in plain language. They reply with a structured plan, findings, opportunities and next actions.",
  },
  {
    step: "05",
    title: "Track results and export reports",
    detail:
      "Every task is logged. Reports collect in your dashboard so you can review progress, share with your team and prove the return.",
  },
];

function HowItWorksPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-border bg-muted/40">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h1 className="max-w-3xl text-4xl font-extrabold tracking-tighter sm:text-5xl">
              How hiring an AI employee actually works
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              No prompt engineering, no integrations to configure. Five steps from signup to real
              output.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-16">
          <ol className="relative space-y-10 border-l border-border pl-8">
            {PHASES.map((phase) => (
              <li key={phase.step} className="relative">
                <span className="absolute -left-[41px] inline-flex size-8 items-center justify-center rounded-full bg-gradient-primary font-mono text-xs font-bold text-primary-foreground">
                  {phase.step}
                </span>
                <h2 className="text-xl font-bold tracking-tight">{phase.title}</h2>
                <p className="mt-2 leading-relaxed text-muted-foreground">{phase.detail}</p>
              </li>
            ))}
          </ol>

          <div className="mt-14 rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
            <h2 className="text-2xl font-bold tracking-tight">Ready to meet the team?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Browse the marketplace or start your workspace right now.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild variant="hero" size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Start free trial
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/marketplace">Browse marketplace</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
