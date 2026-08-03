import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { EmployeeCard } from "@/components/EmployeeCard";
import { Button } from "@/components/ui/button";
import { categoriesQuery, employeesQuery } from "@/lib/queries";

export const Route = createFileRoute("/industries/$slug")({
  loader: async ({ context, params }) => {
    const [categories] = await Promise.all([
      context.queryClient.ensureQueryData(categoriesQuery),
      context.queryClient.ensureQueryData(employeesQuery),
    ]);
    const category = categories.find((c) => c.slug === params.slug);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Industry unavailable" }, { name: "robots", content: "noindex" }] };
    }
    const { category } = loaderData;
    const title = `${category.name} AI Employees — Hire Your Digital Team`;
    const description = `Five specialised AI employees for ${category.name.toLowerCase()} businesses. ${category.tagline ?? ""}`.trim();
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
      That industry doesn’t exist.{" "}
      <Link to="/industries" className="text-primary underline">
        Browse all industries
      </Link>
    </div>
  ),
  component: IndustryPage,
});

function IndustryPage() {
  const { category } = Route.useLoaderData();
  const { data: employees } = useSuspenseQuery(employeesQuery);
  const team = employees.filter((employee) => employee.category === category.name);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <Button asChild variant="ghost" size="sm" className="-ml-2 mb-6">
              <Link to="/industries">
                <ArrowLeft />
                All industries
              </Link>
            </Button>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
              Industry
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tighter sm:text-5xl">
              {category.name}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              {category.tagline ?? category.description}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {team.length} AI employees ready to hire in this industry.
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
