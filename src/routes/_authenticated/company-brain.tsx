import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  businessProfileQuery,
  companyBrainQuery,
  competitorsQuery,
  knowledgeQuery,
  integrationsQuery,
} from "@/lib/queries";
import {
  saveCompanyBrainProfile,
  addCompetitor,
  deleteCompetitor,
  type CompanyBrainProfile,
} from "@/lib/company-brain.functions";

export const Route = createFileRoute("/_authenticated/company-brain")({
  head: () => ({
    meta: [
      { title: "Company Brain — Hy-Mate" },
      {
        name: "description",
        content: "The shared business intelligence layer every AI employee reads from.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CompanyBrainPage,
});

const EMPTY: CompanyBrainProfile = {
  business_model: "",
  products: "",
  services: "",
  locations: "",
  pricing: "",
  target_markets: "",
  logo_url: "",
  brand_voice: "",
  brand_messaging: "",
  brand_positioning: "",
  brand_style_guidelines: "",
  brand_colors: "",
  target_customer: "",
  customer_personas: "",
  pain_points: "",
  customer_journeys: "",
  revenue_target: "",
  lead_target: "",
  marketing_target: "",
  growth_target: "",
};

const REQUIRED_INTEGRATIONS = [
  { label: "Google Analytics", match: "Google Analytics", available: true },
  { label: "Google Search Console", match: "Search Console", available: true },
  { label: "Shopify", match: "Shopify", available: true },
  { label: "WordPress", match: "WordPress", available: false },
  { label: "Google Ads", match: "Google Ads", available: false },
  { label: "Meta Ads", match: "Meta Ads", available: true },
  { label: "HubSpot", match: "HubSpot", available: true },
];

function CompanyBrainPage() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading: profileLoading } = useQuery(businessProfileQuery);
  const { data: brain, isLoading: brainLoading, isError: brainError } = useQuery(companyBrainQuery);
  const { data: competitors, isLoading: competitorsLoading } = useQuery(competitorsQuery);
  const { data: documents } = useQuery(knowledgeQuery);
  const { data: connectedIntegrations } = useQuery(integrationsQuery);

  const save = useServerFn(saveCompanyBrainProfile);
  const createCompetitor = useServerFn(addCompetitor);
  const removeCompetitor = useServerFn(deleteCompetitor);

  const [form, setForm] = useState<CompanyBrainProfile | null>(null);
  const [competitorForm, setCompetitorForm] = useState({ name: "", website: "", notes: "" });

  const values: CompanyBrainProfile = form ?? {
    ...EMPTY,
    ...(brain
      ? {
          business_model: brain.business_model ?? "",
          products: brain.products ?? "",
          services: brain.services ?? "",
          locations: brain.locations ?? "",
          pricing: brain.pricing ?? "",
          target_markets: brain.target_markets ?? "",
          logo_url: brain.logo_url ?? "",
          brand_voice: brain.brand_voice ?? "",
          brand_messaging: brain.brand_messaging ?? "",
          brand_positioning: brain.brand_positioning ?? "",
          brand_style_guidelines: brain.brand_style_guidelines ?? "",
          brand_colors: brain.brand_colors ?? "",
          target_customer: brain.target_customer ?? "",
          customer_personas: brain.customer_personas ?? "",
          pain_points: brain.pain_points ?? "",
          customer_journeys: brain.customer_journeys ?? "",
          revenue_target: brain.revenue_target ?? "",
          lead_target: brain.lead_target ?? "",
          marketing_target: brain.marketing_target ?? "",
          growth_target: brain.growth_target ?? "",
        }
      : {}),
  };

  function set(key: keyof CompanyBrainProfile, value: string) {
    setForm({ ...values, [key]: value });
  }

  const saveMutation = useMutation({
    mutationFn: () => save({ data: values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-brain"] });
      toast.success("Company Brain updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addCompetitorMutation = useMutation({
    mutationFn: () => createCompetitor({ data: competitorForm }),
    onSuccess: () => {
      setCompetitorForm({ name: "", website: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["competitors"] });
      toast.success("Competitor added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteCompetitorMutation = useMutation({
    mutationFn: (id: string) => removeCompetitor({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["competitors"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const connectedNames = new Set((connectedIntegrations ?? []).map((row: { provider: string }) => row.provider));

  return (
    <AppShell
      title="Company Brain"
      description="The shared business intelligence layer every AI employee reads from"
    >
      {profileLoading || brainLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : brainError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Could not load Company Brain right now. Please refresh the page to try again.
        </div>
      ) : (
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="flex h-auto flex-wrap gap-1">
            <TabsTrigger value="profile">Business Profile</TabsTrigger>
            <TabsTrigger value="brand">Brand Knowledge</TabsTrigger>
            <TabsTrigger value="audience">Audience</TabsTrigger>
            <TabsTrigger value="competitors">Competitors</TabsTrigger>
            <TabsTrigger value="goals">Business Goals</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
            <TabsTrigger value="connected">Connected Data</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Business profile</CardTitle>
                <CardDescription>
                  Core identity fields (company name, website, industry, target audience) are
                  managed on the{" "}
                  <Link to="/onboarding" className="font-medium underline">
                    onboarding page
                  </Link>
                  . Add the rest of your business profile here.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Company</p>
                    <p className="font-medium">{profile?.business_name || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Website</p>
                    <p className="font-medium">{profile?.website || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Industry</p>
                    <p className="font-medium">{profile?.industry || "Not set"}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Business model" value={values.business_model} onChange={(v) => set("business_model", v)} placeholder="Subscription SaaS, marketplace, agency..." />
                  <Field label="Pricing" value={values.pricing} onChange={(v) => set("pricing", v)} placeholder="Plans, price points, discounts" />
                </div>
                <FieldArea label="Products" value={values.products} onChange={(v) => set("products", v)} placeholder="What you sell" />
                <FieldArea label="Services" value={values.services} onChange={(v) => set("services", v)} placeholder="What you deliver" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Locations" value={values.locations} onChange={(v) => set("locations", v)} placeholder="Where you operate" />
                  <Field label="Target markets" value={values.target_markets} onChange={(v) => set("target_markets", v)} placeholder="Regions or verticals you sell into" />
                </div>
                <SaveBar mutation={saveMutation} onSave={() => saveMutation.mutate()} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="brand">
            <Card>
              <CardHeader>
                <CardTitle>Brand knowledge</CardTitle>
                <CardDescription>How every AI employee should sound and present your brand.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Logo URL" value={values.logo_url} onChange={(v) => set("logo_url", v)} placeholder="https://.../logo.png" />
                  <Field label="Brand colors" value={values.brand_colors} onChange={(v) => set("brand_colors", v)} placeholder="#111827, #7C3AED" />
                </div>
                <FieldArea label="Brand voice" value={values.brand_voice} onChange={(v) => set("brand_voice", v)} placeholder="Direct, warm, no jargon..." />
                <FieldArea label="Messaging" value={values.brand_messaging} onChange={(v) => set("brand_messaging", v)} placeholder="Key messages and phrases to reuse" />
                <FieldArea label="Positioning" value={values.brand_positioning} onChange={(v) => set("brand_positioning", v)} placeholder="How you differ from alternatives" />
                <FieldArea label="Style guidelines" value={values.brand_style_guidelines} onChange={(v) => set("brand_style_guidelines", v)} placeholder="Formatting, tone and visual rules" rows={4} />
                <p className="text-xs text-muted-foreground">
                  Logo file upload is not built yet — paste a hosted image URL for now. Full upload infrastructure is coming soon.
                </p>
                <SaveBar mutation={saveMutation} onSave={() => saveMutation.mutate()} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audience">
            <Card>
              <CardHeader>
                <CardTitle>Audience</CardTitle>
                <CardDescription>
                  Who you sell to and how they experience your business. Target audience summary is
                  set on the{" "}
                  <Link to="/onboarding" className="font-medium underline">
                    onboarding page
                  </Link>
                  .
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Target audience</p>
                  <p className="font-medium">{profile?.target_audience || "Not set yet"}</p>
                </div>
                <FieldArea label="Target customer (ideal buyer)" value={values.target_customer} onChange={(v) => set("target_customer", v)} placeholder="Who makes the buying decision and why" />
                <FieldArea label="Customer personas" value={values.customer_personas} onChange={(v) => set("customer_personas", v)} placeholder="Named personas with role, goals, context" rows={4} />
                <FieldArea label="Pain points" value={values.pain_points} onChange={(v) => set("pain_points", v)} placeholder="Problems your customers are trying to solve" />
                <FieldArea label="Customer journeys" value={values.customer_journeys} onChange={(v) => set("customer_journeys", v)} placeholder="How they discover, evaluate and buy" rows={4} />
                <SaveBar mutation={saveMutation} onSave={() => saveMutation.mutate()} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="competitors">
            <Card>
              <CardHeader>
                <CardTitle>Competitors</CardTitle>
                <CardDescription>Track who you compete with and how you position against them.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form
                  className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (competitorForm.name.trim().length < 1) {
                      toast.error("Competitor name is required");
                      return;
                    }
                    addCompetitorMutation.mutate();
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="comp-name">Name *</Label>
                    <Input
                      id="comp-name"
                      value={competitorForm.name}
                      maxLength={160}
                      onChange={(e) => setCompetitorForm({ ...competitorForm, name: e.target.value })}
                      placeholder="Acme Inc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comp-website">Website</Label>
                    <Input
                      id="comp-website"
                      value={competitorForm.website}
                      maxLength={300}
                      onChange={(e) => setCompetitorForm({ ...competitorForm, website: e.target.value })}
                      placeholder="https://acme.com"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="comp-notes">Notes / market positioning</Label>
                    <Textarea
                      id="comp-notes"
                      rows={3}
                      maxLength={1000}
                      value={competitorForm.notes}
                      onChange={(e) => setCompetitorForm({ ...competitorForm, notes: e.target.value })}
                      placeholder="How they position, pricing, strengths and weaknesses"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" disabled={addCompetitorMutation.isPending}>
                      {addCompetitorMutation.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
                      Add competitor
                    </Button>
                  </div>
                </form>

                {competitorsLoading ? (
                  <div className="flex h-24 items-center justify-center text-muted-foreground">
                    <Loader2 className="size-5 animate-spin" />
                  </div>
                ) : competitors && competitors.length > 0 ? (
                  <ul className="space-y-3">
                    {competitors.map((c: { id: string; name: string; website: string | null; notes: string | null }) => (
                      <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 rounded-xl border border-border p-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{c.name}</h3>
                            {c.website ? (
                              <a href={c.website} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                                {c.website}
                              </a>
                            ) : null}
                          </div>
                          {c.notes ? <p className="mt-1 text-sm text-muted-foreground">{c.notes}</p> : null}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={"Delete " + c.name}
                          disabled={deleteCompetitorMutation.isPending}
                          onClick={() => deleteCompetitorMutation.mutate(c.id)}
                        >
                          <Trash2 />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No competitors added yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals">
            <Card>
              <CardHeader>
                <CardTitle>Business goals</CardTitle>
                <CardDescription>
                  High-level targets your AI workforce should optimize toward. For detailed, tracked
                  goals with deadlines and tasks, the full Goal Management feature is coming in a
                  later phase.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Revenue target" value={values.revenue_target} onChange={(v) => set("revenue_target", v)} placeholder="e.g. $50k MRR by Q4" />
                  <Field label="Lead target" value={values.lead_target} onChange={(v) => set("lead_target", v)} placeholder="e.g. 100 qualified leads / month" />
                  <Field label="Marketing target" value={values.marketing_target} onChange={(v) => set("marketing_target", v)} placeholder="e.g. +30% organic traffic" />
                  <Field label="Growth target" value={values.growth_target} onChange={(v) => set("growth_target", v)} placeholder="e.g. 20% MoM growth" />
                </div>
                <SaveBar mutation={saveMutation} onSave={() => saveMutation.mutate()} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="knowledge">
            <Card>
              <CardHeader>
                <CardTitle>Knowledge base</CardTitle>
                <CardDescription>
                  Documents every AI employee reads before starting work. Managed on the dedicated
                  Knowledge & Memory page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
                  <div>
                    <p className="text-sm font-medium">{(documents?.length ?? 0)} document(s) saved</p>
                    <p className="text-xs text-muted-foreground">Website info, brand guidelines, product details, FAQs and more.</p>
                  </div>
                  <Button asChild variant="outline">
                    <Link to="/knowledge">
                      Manage knowledge base
                      <ArrowRight />
                    </Link>
                  </Button>
                </div>
                {documents && documents.length > 0 ? (
                  <ul className="space-y-2">
                    {documents.slice(0, 5).map((doc: { id: string; title: string; doc_type: string }) => (
                      <li key={doc.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-2 text-sm">
                        <span className="truncate font-medium">{doc.title}</span>
                        <Badge variant="secondary" className="rounded-full font-normal">{doc.doc_type}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No documents yet. Add website info, brand guidelines or product details from the Knowledge & Memory page.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  PDF, DOCX and file upload infrastructure is coming soon — for now, knowledge is added as pasted text or a source URL.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="connected">
            <Card>
              <CardHeader>
                <CardTitle>Connected data</CardTitle>
                <CardDescription>
                  Business tools your AI workforce can read from. Managed on the dedicated
                  Integrations page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {REQUIRED_INTEGRATIONS.map((item) => {
                    const isConnected = connectedNames.has(item.match);
                    return (
                      <div key={item.label} className="flex items-center justify-between rounded-xl border border-border p-4">
                        <span className="text-sm font-medium">{item.label}</span>
                        {!item.available ? (
                          <Badge variant="secondary" className="rounded-full font-normal">Coming soon</Badge>
                        ) : isConnected ? (
                          <Badge className="rounded-full font-normal">Connected</Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-full font-normal">Not connected</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
                <Button asChild variant="outline">
                  <Link to="/integrations">
                    Manage integrations
                    <ArrowRight />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const id = "field-" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} maxLength={600} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function FieldArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const id = "field-" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} rows={rows} maxLength={1500} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function SaveBar({
  mutation,
  onSave,
}: {
  mutation: { isPending: boolean };
  onSave: () => void;
}) {
  return (
    <div className="flex justify-end border-t border-border pt-4">
      <Button type="button" disabled={mutation.isPending} onClick={onSave}>
        {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
        Save changes
      </Button>
    </div>
  );
}
