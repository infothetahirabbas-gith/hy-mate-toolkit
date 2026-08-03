import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { EmployeeCard } from "@/components/EmployeeCard";
import { employeesQuery } from "@/lib/queries";

export const Route = createFileRoute("/marketplace")({
  loader: ({ context }) => context.queryClient.ensureQueryData(employeesQuery),
  head: () => ({
    meta: [
      { title: "AI Employee Marketplace — Browse AI Specialists" },
      {
        name: "description",
        content:
          "Browse AI employees for SEO, content, ads, support and operations. Compare specialties, features and monthly pricing.",
      },
      { property: "og:title", content: "Browse AI Employees" },
      {
        property: "og:description",
        content: "Compare AI specialists for marketing, sales and support and hire in minutes.",
      },
    ],
  }),
  component: MarketplacePage,
});

const PRICE_FILTERS = [
  { label: "Any price", test: () => true },
  { label: "Under $50", test: (price: number) => price < 50 },
  { label: "$50–$100", test: (price: number) => price >= 50 && price <= 100 },
  { label: "Enterprise", test: (price: number) => price > 100 },
] as const;

function MarketplacePage() {
  const { data: employees } = useSuspenseQuery(employeesQuery);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [price, setPrice] = useState("Any price");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(employees.map((e) => e.category)))],
    [employees],
  );

  const priceFilter = PRICE_FILTERS.find((item) => item.label === price) ?? PRICE_FILTERS[0];

  const filtered = employees.filter((employee) => {
    const matchesCategory = category === "All" || employee.category === category;
    const matchesPrice = priceFilter.test(employee.price_monthly);
    const haystack = `${employee.name} ${employee.role_title} ${employee.tagline}`.toLowerCase();
    return matchesCategory && matchesPrice && haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-border bg-muted/40">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl">
              The AI employee marketplace
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Every specialist below is ready to work today. Pick a role, hire the seat and brief
              them in your dashboard.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by role or skill"
                  maxLength={80}
                  className="pl-9"
                  aria-label="Search AI employees"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((item) => (
                  <Button
                    key={item}
                    size="sm"
                    variant={item === category ? "default" : "outline"}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-14">
          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              No AI employees match that search yet.
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((employee) => (
                <EmployeeCard key={employee.id} employee={employee} />
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
