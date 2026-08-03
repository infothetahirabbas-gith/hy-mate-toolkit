import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/app/AppShell";
import { myProfileQuery } from "@/lib/queries";
import { updateMyProfile } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AI Employee Marketplace" },
      { name: "description", content: "Update your account details and business context." },
      { property: "og:title", content: "Account Settings" },
      { property: "og:description", content: "Update your account details." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data, isLoading } = useQuery(myProfileQuery);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<{ name: string; company: string; industry: string } | null>(null);

  const values = form ?? {
    name: data?.profile?.name ?? "",
    company: data?.profile?.company ?? "",
    industry: data?.profile?.industry ?? "",
  };

  const save = useMutation({
    mutationFn: () => updateMyProfile({ data: values }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Profile updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell title="Settings" description="Your account details">
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="mx-auto max-w-xl space-y-6">
          <form
            className="space-y-5 rounded-2xl border border-border bg-card p-7 shadow-soft"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={data?.profile?.email ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                maxLength={120}
                value={values.name}
                onChange={(event) => setForm({ ...values, name: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                maxLength={120}
                value={values.company}
                onChange={(event) => setForm({ ...values, company: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                maxLength={120}
                value={values.industry}
                onChange={(event) => setForm({ ...values, industry: event.target.value })}
              />
            </div>
            <Button type="submit" variant="hero" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="animate-spin" /> : null}
              Save changes
            </Button>
          </form>

          <div className="rounded-2xl border border-border bg-card p-7 shadow-soft">
            <h2 className="font-semibold">Business profile</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This is the shared context every AI employee uses.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/onboarding">Edit business profile</Link>
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
