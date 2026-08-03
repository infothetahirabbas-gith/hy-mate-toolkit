import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/app/AppShell";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import { businessProfileQuery, employeesQuery } from "@/lib/queries";
import { hireEmployee, saveBusinessProfile } from "@/lib/account.functions";
import { BUSINESS_GOALS, recommendEmployees } from "@/lib/recommendations";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Business Onboarding — AI Employee Marketplace" },
      {
        name: "description",
        content: "Tell your AI employees about your business so they produce work that fits.",
      },
      { property: "og:title", content: "Business Onboarding" },
      { property: "og:description", content: "Give your AI team the context they need." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPage,
});

type Form = {
  business_name: string;
  website: string;
  industry: string;
  target_customer: string;
  target_audience: string;
  country: string;
  goals: string;
  brand_info: string;
  primary_goal: string;
};

const EMPTY: Form = {
  business_name: "",
  website: "",
  industry: "",
  target_customer: "",
  target_audience: "",
  country: "",
  goals: "",
  brand_info: "",
  primary_goal: "",
};

const STEPS = ["Your business", "Your goal", "Recommended team"];

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(businessProfileQuery);
  const { data: employees = [] } = useQuery(employeesQuery);
  const [form, setForm] = useState<Form | null>(null);
  const [step, setStep] = useState(0);

  const values: Form = form ?? {
    ...EMPTY,
    ...(data
      ? {
          business_name: data.business_name ?? "",
          website: data.website ?? "",
          industry: data.industry ?? "",
          target_customer: data.target_customer ?? "",
          target_audience: data.target_audience ?? "",
          country: data.country ?? "",
          goals: data.goals ?? "",
          brand_info: data.brand_info ?? "",
          primary_goal: data.primary_goal ?? "",
        }
      : {}),
  };

  function set(key: keyof Form, value: string) {
    setForm({ ...values, [key]: value });
  }

  const save = useMutation({
    mutationFn: () => saveBusinessProfile({ data: values }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Business profile saved");
      setStep(2);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const hire = useMutation({
    mutationFn: (slug: string) => hireEmployee({ data: { slug, plan: "starter" } }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("AI employee activated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const recommended = recommendEmployees(employees, values.primary_goal, values.industry);

  return (
    <AppShell
      title="Business onboarding"
      description="Shared context for every AI employee you hire"
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="mx-auto max-w-2xl space-y-6">
          <ol className="flex items-center gap-2 text-xs font-medium">
            {STEPS.map((label, index) => (
              <li
                key={label}
                className={`flex flex-1 items-center gap-2 rounded-full border px-3 py-2 ${
                  index === step
                    ? "border-primary bg-primary/5 text-primary"
                    : index < step
                      ? "border-border text-muted-foreground"
                      : "border-dashed border-border text-muted-foreground"
                }`}
              >
                {index < step ? <Check className="size-3.5" /> : <span>{index + 1}</span>}
                <span className="truncate">{label}</span>
              </li>
            ))}
          </ol>

          {step === 0 && (
            <form
              className="space-y-6 rounded-2xl border border-border bg-card p-7 shadow-soft"
              onSubmit={(event) => {
                event.preventDefault();
                if (!values.business_name.trim()) {
                  toast.error("Business name is required");
                  return;
                }
                setStep(1);
              }}
            >
              <div>
                <h2 className="text-lg font-bold tracking-tight">Tell us about your business</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Every AI employee uses this as shared context.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="business_name">Company name *</Label>
                  <Input
                    id="business_name"
                    required
                    maxLength={120}
                    value={values.business_name}
                    onChange={(event) => set("business_name", event.target.value)}
                    placeholder="Northwind Studio"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    maxLength={200}
                    value={values.website}
                    onChange={(event) => set("website", event.target.value)}
                    placeholder="https://northwind.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    maxLength={120}
                    value={values.industry}
                    onChange={(event) => set("industry", event.target.value)}
                    placeholder="Ecommerce"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    maxLength={120}
                    value={values.country}
                    onChange={(event) => set("country", event.target.value)}
                    placeholder="United States"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_audience">Target audience</Label>
                <Textarea
                  id="target_audience"
                  maxLength={600}
                  rows={2}
                  value={values.target_audience}
                  onChange={(event) => set("target_audience", event.target.value)}
                  placeholder="Operations leads at 20–200 person companies."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand_info">Brand information</Label>
                <Textarea
                  id="brand_info"
                  maxLength={800}
                  rows={3}
                  value={values.brand_info}
                  onChange={(event) => set("brand_info", event.target.value)}
                  placeholder="Direct, practical, no hype."
                />
              </div>

              <Button type="submit" variant="hero" size="lg">
                Continue
                <ArrowRight />
              </Button>
            </form>
          )}

          {step === 1 && (
            <div className="space-y-6 rounded-2xl border border-border bg-card p-7 shadow-soft">
              <div>
                <h2 className="text-lg font-bold tracking-tight">Choose your goal</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  We use this to recommend the right AI employees.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {BUSINESS_GOALS.map((goal) => (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => set("primary_goal", goal.id)}
                    className={`rounded-xl border p-4 text-left transition ${
                      values.primary_goal === goal.id
                        ? "border-primary bg-primary/5 shadow-soft"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span className="text-sm font-semibold">{goal.label}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {goal.categories.join(" · ")}
                    </span>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="goals">Anything specific for the next 90 days?</Label>
                <Textarea
                  id="goals"
                  maxLength={800}
                  rows={3}
                  value={values.goals}
                  onChange={(event) => set("goals", event.target.value)}
                  placeholder="Double organic signups and launch a weekly content engine."
                />
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(0)}>
                  <ArrowLeft />
                  Back
                </Button>
                <Button
                  type="button"
                  variant="hero"
                  disabled={save.isPending}
                  onClick={() => {
                    if (!values.primary_goal) {
                      toast.error("Pick a goal to continue");
                      return;
                    }
                    save.mutate();
                  }}
                >
                  {save.isPending ? <Loader2 className="animate-spin" /> : null}
                  See recommendations
                  <ArrowRight />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 rounded-2xl border border-border bg-card p-7 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Sparkles className="size-4" />
                Recommended for {values.business_name || "your business"}
              </div>

              <div className="space-y-3">
                {recommended.map((employee) => (
                  <div
                    key={employee.slug}
                    className="flex items-center gap-4 rounded-xl border border-border p-4"
                  >
                    <EmployeeAvatar name={employee.name} accent={employee.accent} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {employee.name} — {employee.role_title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{employee.tagline}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={hire.isPending}
                      onClick={() => hire.mutate(employee.slug)}
                    >
                      Activate
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft />
                  Back
                </Button>
                <Button variant="hero" onClick={() => navigate({ to: "/dashboard" })}>
                  Go to dashboard
                  <ArrowRight />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
