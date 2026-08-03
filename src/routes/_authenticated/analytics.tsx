import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, Clock, FileText, Loader2, TrendingUp, Users } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { analyticsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — AI Employee Marketplace" },
      { name: "description", content: "Measure output, success rate and time saved by your AI workforce." },
      { property: "og:title", content: "AI Workforce Analytics" },
      { property: "og:description", content: "Measure output, success rate and time saved by your AI workforce." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnalyticsPage;
});

function AnalyticsPage() {
  return null;
}
