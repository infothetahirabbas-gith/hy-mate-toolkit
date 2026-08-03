import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { EmployeeCard } from "@/components/EmployeeCard";
import { categoriesQuery, employeesQuery } from "@/lib/queries";

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

  const { data: categoryRows } = useQuery(categoriesQuery);

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set([
          ...(categoryRows ?? []).map((c) => c.name),
          ...employees.map((e) => e.category),
        ]),
      ),
    ],
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
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              The AI employee marketplace
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Every specialist below is ready to work today. Pick a role, hire the seat and brief
              them in your dashboard.
            </p>

            <div className="mt-8 space-y-4">
              <div className="relative w-full sm:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search AI Employees..."
                  maxLength={80}
                  className="h-12 pl-9"
                  aria-label="Search AI employees"
                />
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Category
                </span>
                {categories.map((item) => (
                  <Button
                    key={item}
                    size="sm"
                    variant={item === category ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </Button>
                ))}
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Price
                </span>
                {PRICE_FILTERS.map((item) => (
                  <Button
                    key={item.label}
                    size="sm"
                    variant={item.label === price ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => setPrice(item.label)}
                  >
                    {item.label}
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
