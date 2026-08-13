import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { AlertTriangle, Landmark, Send, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { FINANCE_ORG, money, pct, monthLabel, AUTONOMY_COPY, type AutonomyLevel } from "@/lib/finance";
import {
  askFinanceCfo,
  getFinanceOverview,
  runFinanceScan,
  seedFinanceDemo,
} from "@/lib/finance.functions";

export const Route = createFileRoute("/_authenticated/finance")({
  component: FinancePage,
  head: () => ({
    meta: [
      { title: "AI Finance Department | AI Employee Marketplace" },
      {
        name: "description",
        content:
          "Run an AI CFO-led finance department: live financial dashboards, anomaly detection, forecasting, approvals and audit-ready reporting.",
      },
      { property: "og:title", content: "AI Finance Department" },
      { property: "og:description", content: "An AI CFO, finance managers and specialists running your books with human oversight." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type ChatTurn = { role: "user" | "assistant"; content: string };

function FinancePage() {
  const queryClient = useQueryClient();
  const overviewFn = useServerFn(getFinanceOverview);
  const seedFn = useServerFn(seedFinanceDemo);
  const scanFn = useServerFn(runFinanceScan);
  const askFn = useServerFn(askFinanceCfo);

  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);

  const { data, isLoading } = useQuery({ queryKey: ["finance", "overview"], queryFn: () => overviewFn() });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["finance"] });

  const seed = useMutation({
    mutationFn: () => seedFn(),
    onSuccess: () => {
      toast.success("Demo finance company loaded.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const scan = useMutation({
    mutationFn: () => scanFn(),
    onSuccess: (r) => {
      toast.success(`Analysis complete — ${r.created} findings.`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ask = useMutation({
    mutationFn: (q: string) => askFn({ data: { question: q, history: turns.slice(-8) } }),
    onSuccess: (r, q) => setTurns((prev) => [...prev, { role: "user", content: q }, { role: "assistant", content: r.answer }]),
    onError: (e: Error) => toast.error(e.message),
  });

  const k = data?.kpis;
  const autonomy = (data?.settings?.autonomy_level ?? "assisted") as AutonomyLevel;

  return (
    <AppShell
      title="AI Finance Department"
      description="AI CFO → finance managers → specialists. Every figure below is computed from your recorded financial data."
      actions={
        <div className="flex gap-2">
          {!data?.hasData && (
            <Button variant="outline" onClick={() => seed.mutate()} disabled={seed.isPending}>
              {seed.isPending ? "Loading…" : "Load demo company"}
            </Button>
          )}
          <Button onClick={() => scan.mutate()} disabled={scan.isPending || !data?.hasData}>
            <Sparkles className="mr-2 h-4 w-4" />
            {scan.isPending ? "Analysing…" : "Run finance analysis"}
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your financial position…</p>
      ) : !data?.hasData ? (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <Landmark className="mx-auto h-8 w-8 text-primary" />
            <h2 className="text-lg font-semibold">No financial data yet</h2>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Load a realistic 12-month demo company to see the AI finance department at work, or start recording
              accounts and transactions yourself.
            </p>
            <Button onClick={() => seed.mutate()} disabled={seed.isPending}>Load demo company</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label={`Revenue — ${monthLabel(k!.month)}`} value={money(k!.revenue)} delta={k!.revenueChangePct} good />
            <Kpi label="Operating expenses" value={money(k!.expenses)} delta={k!.expenseChangePct} good={false} />
            <Kpi label="Net profit" value={money(k!.profit)} hint={`${k!.grossMargin.toFixed(1)}% margin`} />
            <Kpi
              label="Cash position"
              value={money(k!.cashBalance)}
              hint={k!.runwayMonths ? `${k!.runwayMonths.toFixed(1)} months runway` : "Cash-flow positive"}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">Findings & opportunities</CardTitle>
                <Badge variant="outline">{AUTONOMY_COPY[autonomy].label}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {(data.insights ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Run the finance analysis to have the AI Risk Analyst and Financial Analyst review your books.
                  </p>
                ) : (
                  data.insights.map((insight) => (
                    <div key={insight.id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={insight.source === "rule" ? "default" : "secondary"}>
                          {insight.source === "rule" ? "Verified fact" : "AI recommendation"}
                        </Badge>
                        <Badge variant="outline">{insight.kind}</Badge>
                        <Badge variant="outline">{insight.severity}</Badge>
                        {Number(insight.impact_amount) > 0 && (
                          <span className="text-xs font-medium text-muted-foreground">
                            ~{money(insight.impact_amount)} / year
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm font-medium">{insight.title}</p>
                      <p className="text-sm text-muted-foreground">{insight.detail}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Working capital</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Receivables outstanding" value={money(k!.arOutstanding)} />
                <Row label="Overdue receivables" value={`${money(k!.overdueArAmount)} (${k!.overdueArCount})`} />
                <Row label="Payables outstanding" value={money(k!.apOutstanding)} />
                <Row label="Expenses awaiting approval" value={String(k!.pendingExpenses)} />
                <Row label="Flagged transactions" value={String(k!.anomalies)} />
                {k!.anomalies > 0 && (
                  <p className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Anomalies detected by rule-based checks. Review before any payment run.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ask the AI CFO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {turns.map((turn, i) => (
                  <div
                    key={i}
                    className={
                      turn.role === "user"
                        ? "rounded-lg bg-muted p-3 text-sm"
                        : "prose prose-sm max-w-none rounded-lg border p-3"
                    }
                  >
                    {turn.role === "user" ? turn.content : <ReactMarkdown>{turn.content}</ReactMarkdown>}
                  </div>
                ))}
              </div>
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Where can we cut 15% of operating costs without touching payroll?"
                rows={3}
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  The AI CFO answers only from your recorded data and never executes actions without your approval.
                </p>
                <Button
                  onClick={() => {
                    const q = question.trim();
                    if (!q) return;
                    setQuestion("");
                    ask.mutate(q);
                  }}
                  disabled={ask.isPending}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {ask.isPending ? "Thinking…" : "Ask"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your finance org</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {FINANCE_ORG.map((role) => (
                <div key={role.key} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{role.title}</p>
                    <Badge variant="outline" className="capitalize">{role.level}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{role.mandate}</p>
                  <p className="mt-2 text-xs font-medium text-primary">{AUTONOMY_COPY[role.autonomy].label}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function Kpi({
  label,
  value,
  delta,
  hint,
  good,
}: {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  good?: boolean;
}) {
  const positive = (delta ?? 0) >= 0;
  const favourable = good === undefined ? positive : good ? positive : !positive;
  return (
    <Card>
      <CardContent className="space-y-1 py-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
        {delta !== undefined ? (
          <p className={`flex items-center gap-1 text-xs ${favourable ? "text-emerald-600" : "text-rose-600"}`}>
            {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {pct(delta)} vs prior month
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
