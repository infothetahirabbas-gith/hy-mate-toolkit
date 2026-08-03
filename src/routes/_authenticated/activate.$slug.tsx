import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Loader2, Plug, Rocket } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { activationQuery } from "@/lib/queries";
import { activateEmployee } from "@/lib/workforce.functions";
import { recommendedTools } from "@/lib/tools";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/activate/$slug")({
  head: () => ({
    meta: [
      { title: "Activate AI employee — AI Employee Marketplace" },
      { name: "description", content: "Set up and activate your new AI employee in five steps." },
      { property: "og:title", content: "Activate your AI employee" },
      { property: "og:description", content: "Train, connect and activate your new AI hire." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ActivationPage,
});

const STEPS = ["Welcome", "Business", "Tools", "Training", "Activate"];

function ActivationPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(activationQuery(slug));

  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [brandVoice, setBrandVoice] = useState("");
  const [instructions, setInstructions] = useState("");
  const [workingPreferences, setWorkingPreferences] = useState("");
  const [firstTask, setFirstTask] = useState("");

  const employee = data?.employee;
  const tools = useMemo(() => (employee ? recommendedTools(employee.category) : []), [employee]);
  const connected = new Set((data?.integrations ?? []).map((i) => i.provider.toLowerCase()));

  const activate = useMutation({
    mutationFn: () =>
      activateEmployee({
        data: {
          slug,
          displayName: displayName.trim(),
          brandVoice: brandVoice.trim(),
          instructions: instructions.trim(),
          workingPreferences: workingPreferences.trim(),
          firstTaskName: firstTask.trim(),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success(`${displayName || employee?.name} is now active`);
      navigate({ to: "/workspace/$slug", params: { slug } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading || !employee) {
    return (
      <AppShell title="Activation">
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      </AppShell>
    );
  }

  const business = data?.business;

  return (
    <AppShell
      title={`Activate ${employee.name}`}
      description={`${employee.role_title} · ${employee.department || employee.category}`}
    >
      <div className="mx-auto max-w-3xl space-y-8">
        <ol className="flex flex-wrap items-center gap-2">
          {STEPS.map((label, index) => (
            <li
              key={label}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
                index === step
                  ? "border-primary bg-primary text-primary-foreground"
                  : index < step
                    ? "border-primary/30 bg-primary-soft text-primary"
                    : "border-border text-muted-foreground",
              )}
            >
              {index < step ? <Check className="size-3" /> : <span>{index + 1}</span>}
              {label}
            </li>
          ))}
        </ol>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
          {step === 0 ? (
            <div className="space-y-5 text-center">
              <div className="flex justify-center">
                <EmployeeAvatar name={employee.name} accent={employee.accent} className="size-16" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Welcome {employee.name} to your team
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {employee.tagline ||
                    `${employee.name} works as your ${employee.role_title.toLowerCase()}.`}
                </p>
              </div>
              <div className="grid gap-2 text-left sm:grid-cols-2">
                {(employee.skills ?? []).slice(0, 6).map((skill: string) => (
                  <div
                    key={skill}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <Check className="size-4 text-primary" />
                    {skill}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-bold tracking-tight">Business information</h2>
              <p className="text-sm text-muted-foreground">
                {business?.business_name
                  ? `${employee.name} will use your saved business profile for ${business.business_name}.`
                  : "You haven't completed your business profile yet. Your AI employee produces much better work with it."}
              </p>
              {business?.business_name ? (
                <dl className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["Business", business.business_name],
                    ["Industry", business.industry],
                    ["Website", business.website],
                    ["Target customer", business.target_customer],
                    ["Goals", business.goals],
                  ]
                    .filter(([, value]) => value)
                    .map(([label, value]) => (
                      <div key={label as string} className="rounded-lg border border-border p-3">
                        <dt className="text-xs text-muted-foreground">{label}</dt>
                        <dd className="mt-0.5 text-sm font-medium">{value as string}</dd>
                      </div>
                    ))}
                </dl>
              ) : null}
              <Button asChild variant="outline" size="sm">
                <Link to="/onboarding">
                  {business?.business_name ? "Update business profile" : "Complete business profile"}
                </Link>
              </Button>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-bold tracking-tight">Connect the tools they need</h2>
              <p className="text-sm text-muted-foreground">
                {employee.name} works best with access to these tools. You can connect them now or
                later.
              </p>
              <div className="space-y-2">
                {tools.map((tool) => {
                  const isConnected = connected.has(tool.name.toLowerCase());
                  return (
                    <div
                      key={tool.id}
                      className="flex items-center gap-3 rounded-lg border border-border p-3"
                    >
                      <Plug className="size-4 text-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{tool.name}</div>
                        <p className="truncate text-xs text-muted-foreground">{tool.description}</p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          isConnected
                            ? "bg-primary-soft text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {isConnected ? "Connected" : "Not connected"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/integrations">Manage integrations</Link>
              </Button>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-bold tracking-tight">Train your AI employee</h2>
              <div className="space-y-2">
                <Label htmlFor="display-name">Give them a name (optional)</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  maxLength={80}
                  placeholder={employee.name}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-voice">Brand voice</Label>
                <Textarea
                  id="brand-voice"
                  rows={3}
                  maxLength={400}
                  value={brandVoice}
                  onChange={(e) => setBrandVoice(e.target.value)}
                  placeholder="Confident, plain-spoken, never salesy."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instructions">Special instructions</Label>
                <Textarea
                  id="instructions"
                  rows={4}
                  maxLength={1200}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Always reference our pricing page, avoid competitor comparisons, prioritise UK market."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="working-prefs">Working preferences</Label>
                <Input
                  id="working-prefs"
                  maxLength={400}
                  value={workingPreferences}
                  onChange={(e) => setWorkingPreferences(e.target.value)}
                  placeholder="Weekly reports on Monday, ask before publishing anything."
                />
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-bold tracking-tight">Ready to start work</h2>
              <p className="text-sm text-muted-foreground">
                Activating creates {displayName || employee.name}'s first task so they can start
                immediately.
              </p>
              <div className="space-y-2">
                <Label htmlFor="first-task">First task</Label>
                <Input
                  id="first-task"
                  maxLength={140}
                  value={firstTask}
                  onChange={(e) => setFirstTask(e.target.value)}
                  placeholder={`Complete initial ${employee.category.toLowerCase()} audit`}
                />
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              <ArrowLeft />
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button variant="hero" onClick={() => setStep((s) => s + 1)}>
                Continue
                <ArrowRight />
              </Button>
            ) : (
              <Button
                variant="hero"
                disabled={activate.isPending}
                onClick={() => activate.mutate()}
              >
                {activate.isPending ? <Loader2 className="animate-spin" /> : <Rocket />}
                Activate {displayName || employee.name}
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
