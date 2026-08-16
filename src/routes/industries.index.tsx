import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Users } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { categoriesQuery, employeesQuery } from "@/lib/queries";

export const Route = createFileRoute("/industries/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(categoriesQuery),
      context.queryClient.ensureQueryData(employeesQuery),
    ]);
  },
  head: () => ({
    meta: [
      { title: "AI Employees by Industry — 50 Industries, 400 Specialists" },
      {
        name: "description",
        content:
          "Browse AI employees organised by industry: SEO, ecommerce, real estate, SaaS, healthcare, legal, finance and 13 more. Five specialists in every industry.",
      },
      { property: "og:title", content: "AI Employees by Industry" },
      {
        property: "og:description",
        content: "50 industries. 400 AI employees. Hire the specialist your business actually needs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-10 text-center text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-10 text-center">No industries yet.</div>,
  component: IndustriesPage,
});

function IndustriesPage() {
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const { data: employees } = useSuspenseQuery(employeesQuery);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
              The workforce directory
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tighter sm:text-5xl">
              Hire AI employees by industry
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              {categories.length} industries. {employees.length} specialised AI employees. Each one
              comes with a defined role, personality, daily tasks and business outcomes.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-14">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const team = employees.filter((e) => e.category === category.name);
              const from = team.length
                ? Math.min(...team.map((e) => e.price_monthly))
                : 0;
              return (
                <Link
                  key={category.id}
                  to="/industries/$slug"
                  params={{ slug: category.slug }}
                  className="group flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-all duration-500 hover:border-primary/30 hover:shadow-lift"
                >
                  <h2 className="text-lg font-bold tracking-tight">{category.name}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {category.tagline ?? category.description}
                  </p>
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Users className="size-4" />
                      {team.length} AI employees
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-primary">
                      From ${from}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
