export const BUSINESS_GOALS = [
  { id: "get_customers", label: "Get more customers", categories: ["Marketing", "Sales"] },
  { id: "improve_seo", label: "Improve SEO", categories: ["Marketing"] },
  { id: "automate_support", label: "Automate support", categories: ["Support"] },
  { id: "increase_sales", label: "Increase sales", categories: ["Sales", "Ecommerce"] },
] as const;

export type BusinessGoalId = (typeof BUSINESS_GOALS)[number]["id"];

export function goalLabel(id: string): string {
  return BUSINESS_GOALS.find((goal) => goal.id === id)?.label ?? "";
}

/** Rank catalog employees for a chosen goal + industry, best match first. */
export function recommendEmployees<T extends { category: string }>(
  employees: T[],
  goalId: string,
  industry?: string | null,
): T[] {
  const goal = BUSINESS_GOALS.find((g) => g.id === goalId);
  const preferred = goal ? [...goal.categories] : [];
  const industryText = (industry ?? "").toLowerCase();
  if (industryText.includes("ecommerce") || industryText.includes("e-commerce")) {
    preferred.push("Ecommerce");
  }

  const score = (employee: T) => {
    const index = preferred.findIndex(
      (category) => category.toLowerCase() === employee.category.toLowerCase(),
    );
    return index === -1 ? preferred.length + 1 : index;
  };

  return [...employees].sort((a, b) => score(a) - score(b)).slice(0, 3);
}
