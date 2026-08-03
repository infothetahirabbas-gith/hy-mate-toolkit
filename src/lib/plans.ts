export type Plan = {
  id: string;
  name: string;
  price: number;
  tagline: string;
  features: string[];
  highlight?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    tagline: "For founders testing their first AI hire.",
    features: [
      "1 AI employee seat",
      "25 AI tasks per month",
      "Business onboarding profile",
      "Standard reports",
      "Email support",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: 149,
    tagline: "For growing teams running a small AI department.",
    features: [
      "Up to 4 AI employee seats",
      "250 AI tasks per month",
      "Full workspace + memory",
      "Unlimited reports & exports",
      "Priority support",
    ],
    highlight: true,
  },
  {
    id: "business",
    name: "Business",
    price: 499,
    tagline: "For companies replacing whole workflows with AI.",
    features: [
      "Unlimited AI employee seats",
      "Unlimited AI tasks",
      "Custom personas & knowledge",
      "Admin analytics & usage tracking",
      "Dedicated onboarding",
    ],
  },
];
