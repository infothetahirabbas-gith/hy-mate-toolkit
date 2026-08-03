import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).catch("login"),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Log In or Sign Up — AI Employee Marketplace" },
      {
        name: "description",
        content:
          "Access your AI employee workspace. Log in or create an account to hire AI specialists for your business.",
      },
      { property: "og:title", content: "Log In — AI Employee Marketplace" },
      { property: "og:description", content: "Access your AI employee workspace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">(search.mode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const destination =
    search.redirect && search.redirect.startsWith("/") && !search.redirect.startsWith("//")
      ? search.redirect
      : "/dashboard";

  useEffect(() => {
    if (!loading && session) navigate({ to: destination, replace: true });
  }, [loading, session, destination, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }

    setPending(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}${destination}`,
            data: { name: name.trim().slice(0, 120) },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setEmailSent(true);
          toast.success("Check your email to confirm your account");
          return;
        }
        toast.success("Workspace created");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast.success("Welcome back");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  async function handleGoogle() {
    setPending(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setPending(false);
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: destination, replace: true });
  }

  async function handleReset() {
    const parsed = credentialsSchema.shape.email.safeParse(email);
    if (!parsed.success) {
      toast.error("Enter your email first");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-5 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
              <Bot className="size-4" />
            </span>
            AI Employee
          </Link>

          <h1 className="mt-10 text-2xl font-bold tracking-tight">
            {mode === "signup" ? "Create your workspace" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Start hiring AI employees in under five minutes."
              : "Log in to manage your AI team."}
          </p>

          {emailSent ? (
            <div className="mt-8 rounded-xl border border-border bg-card p-6 text-sm">
              <p className="font-semibold">Confirm your email</p>
              <p className="mt-2 text-muted-foreground">
                We sent a confirmation link to {email}. Click it to activate your workspace.
              </p>
            </div>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="mt-8 w-full"
                size="lg"
                disabled={pending}
                onClick={handleGoogle}
              >
                Continue with Google
              </Button>

              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or use email
                <span className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" ? (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      maxLength={120}
                      placeholder="Alex Rivera"
                      autoComplete="name"
                    />
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    maxLength={255}
                    placeholder="you@company.com"
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "login" ? (
                      <button
                        type="button"
                        onClick={handleReset}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    ) : null}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    maxLength={72}
                    placeholder="At least 8 characters"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                </div>

                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={pending}>
                  {pending ? <Loader2 className="animate-spin" /> : null}
                  {mode === "signup" ? "Create workspace" : "Log in"}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "signup" ? "login" : "signup")}
                  className="font-semibold text-primary hover:underline"
                >
                  {mode === "signup" ? "Log in" : "Create an account"}
                </button>
              </p>
            </>
          )}
        </div>
      </div>

      <div className="surface-ink relative hidden flex-col justify-center px-12 lg:flex">
        <div className="max-w-md">
          <h2 className="text-3xl font-bold tracking-tight">
            Your AI department, staffed in minutes
          </h2>
          <p className="mt-4 text-ink-muted">
            Onboard your business once and every AI employee you hire inherits your context, goals
            and brand voice.
          </p>
          <ul className="mt-8 space-y-4 text-sm text-ink-muted">
            {[
              "Six specialists across SEO, content, ads and support",
              "Structured deliverables, not chat transcripts",
              "Every task and report tracked in your dashboard",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
