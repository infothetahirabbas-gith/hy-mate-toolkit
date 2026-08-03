import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/app/AppShell";
import { businessProfileQuery } from "@/lib/queries";
import { saveBusinessProfile } from "@/lib/account.functions";

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
  country: string;
  goals: string;
  brand_info: string;
};

const EMPTY: Form = {
  business_name: "",
  website: "",
  industry: "",
  target_customer: "",
  country: "",
  goals: "",
  brand_info: "",
};

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(businessProfileQuery);
  const [form, setForm] = useState<Form | null>(null);

  const values: Form = form ?? {
    ...EMPTY,
    ...(data
      ? {
          business_name: data.business_name ?? "",
          website: data.website ?? "",
          industry: data.industry ?? "",
          target_customer: data.target_customer ?? "",
          country: data.country ?? "",
          goals: data.goals ?? "",
          brand_info: data.brand_info ?? "",
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
      navigate({ to: "/dashboard" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

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
        <form
          className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-border bg-card p-7 shadow-soft"
          onSubmit={(event) => {
            event.preventDefault();
            if (!values.business_name.trim()) {
              toast.error("Business name is required");
              return;
            }
            save.mutate();
          }}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business name *</Label>
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
                placeholder="B2B SaaS"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Primary market</Label>
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
            <Label htmlFor="target_customer">Who is your ideal customer?</Label>
            <Textarea
              id="target_customer"
              maxLength={600}
              rows={3}
              value={values.target_customer}
              onChange={(event) => set("target_customer", event.target.value)}
              placeholder="Operations leads at 20–200 person companies who manage vendor spend."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goals">What are your goals for the next 90 days?</Label>
            <Textarea
              id="goals"
              maxLength={800}
              rows={3}
              value={values.goals}
              onChange={(event) => set("goals", event.target.value)}
              placeholder="Double organic signups and launch a weekly content engine."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand_info">Brand voice and anything else we should know</Label>
            <Textarea
              id="brand_info"
              maxLength={800}
              rows={3}
              value={values.brand_info}
              onChange={(event) => set("brand_info", event.target.value)}
              placeholder="Direct, practical, no hype. We never use exclamation marks."
            />
          </div>

          <Button type="submit" variant="hero" size="lg" disabled={save.isPending}>
            {save.isPending ? <Loader2 className="animate-spin" /> : null}
            Save and continue
            <ArrowRight />
          </Button>
        </form>
      )}
    </AppShell>
  );
}
