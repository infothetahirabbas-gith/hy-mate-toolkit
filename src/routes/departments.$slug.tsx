import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { EmployeeCard } from "@/components/EmployeeCard";
import { Button } from "@/components/ui/button";
import { departmentsQuery, employeesQuery } from "@/lib/queries";

export const Route = createFileRoute("/departments/$slug")({
  loader: async ({ context, params }) => {
    const [departments] = await Promise.all([
      context.queryClient.ensureQueryData(departmentsQuery),
      context.queryClient.ensureQueryData(employeesQuery),
    ]);
    const department = departments.find((d) => d.slug === params.slug);
    if (!department) throw notFound();
    return { department };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Department unavailable" }, { name: "robots", content: "noindex" }] };
    }
    const { department } = loaderData;
    const title = `${department.name} AI Employees — Hire Your ${department.name} Team`;
    const description = `${department.tagline ?? department.description ?? ""}`.trim();
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
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
      That department doesn’t exist.{" "}
      <Link to="/departments" className="text-primary underline">
        Browse all departments
      </Link>
    </div>
  ),
  component: DepartmentPage,
});

function DepartmentPage() {
  const { department } = Route.useLoaderData();
  const { data: employees } = useSuspenseQuery(employeesQuery);
  const team = employees.filter((employee) => employee.department_slug === department.slug);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <Button asChild variant="ghost" size="sm" className="-ml-2 mb-6">
              <Link to="/departments">
                <ArrowLeft />
                All departments
              </Link>
            </Button>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
              Department
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tighter sm:text-5xl">
              {department.name}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              {department.description ?? department.tagline}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {team.length} AI employees in this department.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-14">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {team.map((employee) => (
              <EmployeeCard key={employee.id} employee={employee} />
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
