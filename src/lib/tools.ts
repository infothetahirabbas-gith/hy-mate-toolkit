export type ToolDef = { id: string; name: string; category: string; description: string };

export const TOOL_LIBRARY: ToolDef[] = [
  // Marketing
  { id: "google-analytics", name: "Google Analytics", category: "Marketing", description: "Traffic, conversion and audience data." },
  { id: "search-console", name: "Google Search Console", category: "Marketing", description: "Keyword rankings, impressions and indexing." },
  { id: "website-crawler", name: "Website Crawler", category: "Marketing", description: "Crawls your site for technical SEO issues." },
  { id: "seo-api", name: "SEO API", category: "Marketing", description: "Keyword volume, difficulty and backlink data." },
  { id: "meta-ads", name: "Meta Ads", category: "Marketing", description: "Campaign performance and ad spend." },
  // Sales
  { id: "gmail", name: "Gmail", category: "Sales", description: "Send and analyse outreach email." },
  { id: "crm", name: "CRM", category: "Sales", description: "Pipeline, deals and contact records." },
  { id: "calendar", name: "Calendar", category: "Sales", description: "Meetings, availability and follow-ups." },
  { id: "linkedin", name: "LinkedIn", category: "Sales", description: "Prospect research and social selling." },
  // Ecommerce
  { id: "shopify", name: "Shopify", category: "Ecommerce", description: "Products, orders and storefront data." },
  { id: "woocommerce", name: "WooCommerce", category: "Ecommerce", description: "Catalogue and order history." },
  { id: "stripe", name: "Stripe", category: "Ecommerce", description: "Payments, refunds and revenue." },
  // Communication
  { id: "slack", name: "Slack", category: "Communication", description: "Post updates to your team channels." },
  { id: "whatsapp", name: "WhatsApp", category: "Communication", description: "Customer messaging." },
  { id: "email", name: "Email", category: "Communication", description: "Transactional and support email." },
  // Data
  { id: "google-sheets", name: "Google Sheets", category: "Data", description: "Read and write structured data." },
  { id: "notion", name: "Notion", category: "Data", description: "Docs, wikis and knowledge." },
];

export const TOOL_CATEGORIES = [...new Set(TOOL_LIBRARY.map((t) => t.category))];

export function toolByName(name: string) {
  return TOOL_LIBRARY.find((t) => t.name === name || t.id === name);
}

/** Tools an AI employee typically needs, based on its department / category. */
export function recommendedTools(category: string): ToolDef[] {
  const key = category.toLowerCase();
  const pick = (ids: string[]) => TOOL_LIBRARY.filter((t) => ids.includes(t.id));

  if (key.includes("market") || key.includes("seo") || key.includes("content"))
    return pick(["website-crawler", "google-analytics", "search-console", "seo-api"]);
  if (key.includes("sales") || key.includes("real estate"))
    return pick(["gmail", "crm", "calendar"]);
  if (key.includes("ecommerce") || key.includes("retail"))
    return pick(["shopify", "woocommerce", "google-analytics"]);
  if (key.includes("support") || key.includes("service") || key.includes("hr"))
    return pick(["email", "slack", "whatsapp"]);
  if (key.includes("finance") || key.includes("account"))
    return pick(["stripe", "google-sheets"]);
  return pick(["google-analytics", "email", "google-sheets"]);
}
