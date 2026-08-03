import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, Plug } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { integrationsQuery } from "@/lib/queries";
import { toggleIntegration } from "@/lib/insights.functions";

export const Route = createFileRoute("/_authenticated/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — AI Employee Marketplace" },
      {
        name: "description",
        content: "Connect analytics, CRM, communication and ecommerce tools to your AI workforce.",
      },
      { property: "og:title", content: "AI Workforce Integrations" },
      {
        property: "og:description",
        content: "Connect analytics, CRM, communication and ecommerce tools to your AI workforce.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IntegrationsPage,
});

const CATALOG = [
  {
    category: "Marketing",
    items: [
      { provider: "Google Analytics", detail: "Traffic, conversions and audience data" },
      { provider: "Search Console", detail: "Rankings, clicks and indexing health" },
      { provider: "Meta Ads", detail: "Campaign spend and creative performance" },
    ],
  },
  {
    category: "CRM",
    items: [
      { provider: "HubSpot", detail: "Contacts, deals and pipeline stages" },
      { provider: "GoHighLevel", detail: "Funnels, leads and automations" },
    ],
  },
  {
    category: "Communication",
    items: [
      { provider: "Gmail", detail: "Send and draft outreach on your behalf" },
      { provider: "Slack", detail: "Post updates and daily summaries" },
      { provider: "WhatsApp", detail: "Reply to customer conversations" },
    ],
  },
  {
    category: "Ecommerce",
    items: [
      { provider: "Shopify", detail: "Products, orders and storefront content" },
      { provider: "WooCommerce", detail: "Catalogue and order data" },
    ],
  },
];

function IntegrationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(integrationsQuery);
  const toggle = useServerFn(toggleIntegration);

  const mutation = useMutation({
    mutationFn: (input: { provider: string; category: string; connect: boolean }) =>
      toggle({ data: input }),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success(vars.connect ? `${vars.provider} connected` : `${vars.provider} disconnected`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const connected = new Set((data ?? []).map((row) => row.provider));

  return (
    <AppShell
      title="Integrations"
      description="Give your AI employees access to the tools your business already runs on"
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-10">
          {CATALOG.map((group) => (
            <section key={group.category}>
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                {group.category}
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {group.items.map((item) => {
                  const isConnected = connected.has(item.provider);
                  return (
                    <article
                      key={item.provider}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft"
                    >
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                        <Plug className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{item.provider}</h3>
                        <p className="truncate text-sm text-muted-foreground">{item.detail}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={isConnected ? "outline" : "default"}
                        disabled={mutation.isPending}
                        onClick={() =>
                          mutation.mutate({
                            provider: item.provider,
                            category: group.category,
                            connect: !isConnected,
                          })
                        }
                      >
                        {isConnected ? (
                          <>
                            <Check />
                            Connected
                          </>
                        ) : (
                          "Connect"
                        )}
                      </Button>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}
