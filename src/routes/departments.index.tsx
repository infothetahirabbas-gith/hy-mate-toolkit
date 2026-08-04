import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Users } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { departmentsQuery, employeesQuery } from "@/lib/queries";

export const Route = createFileRoute("/departments/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(departmentsQuery),
      context.queryClient.ensureQueryData(employeesQuery),
    ]);
  },
  head: () => ({
    meta: [
      { title: "AI Employees by Department — Build a Full AI Org Chart" },
      {
        name: "description",
        content:
          "Browse AI employees by department: Executive, Sales, Marketing, Support, Operations, Finance, HR, Analytics, Administration and industry specialists.",
      },
      { property: "og:title", content: "AI Employees by Department" },
      {
        property: "og:description",
        content: "Ten departments. 400 AI employees. Staff every function of your business.",
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
  notFoundComponent: () => <div className="p-10 text-center">No departments yet.</div>,
  component: DepartmentsPage,
});

function DepartmentsPage() {
  const { data: departments } = useSuspenseQuery(departmentsQuery);
  const { data: employees } = useSuspenseQuery(employeesQuery);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
              The AI org chart
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tighter sm:text-5xl">
              Hire AI employees by department
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              {departments.length} departments. {employees.length} AI employees. Staff sales,
              marketing, finance, support and operations — or go deep with industry specialists.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-14">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((department) => {
              const team = employees.filter((e) => e.department_slug === department.slug);
              const from = team.length ? Math.min(...team.map((e) => e.price_monthly)) : 0;
              return (
                <Link
                  key={department.id}
                  to="/departments/$slug"
                  params={{ slug: department.slug }}
                  className="group flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-all duration-500 hover:border-primary/30 hover:shadow-lift"
                >
                  <h2 className="text-lg font-bold tracking-tight">{department.name}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {department.tagline ?? department.description}
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
