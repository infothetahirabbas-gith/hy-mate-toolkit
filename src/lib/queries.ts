import { queryOptions } from "@tanstack/react-query";
import { listEmployees, getEmployeeBySlug } from "./catalog.functions";
import { listCategories } from "./categories.functions";
import { getTasks, getAnalytics, listIntegrations } from "./insights.functions";
import {
  listKnowledge,
  listMemories,
  getAgentConversation,
  getWorkforcePerformance,
} from "./agent-os.functions";
import {
  getDashboardOverview,
  getMySubscriptions,
  getBusinessProfile,
  getMyProfile,
  getReports,
  getEmployeeActivity,
} from "./account.functions";

export const knowledgeQuery = queryOptions({
  queryKey: ["knowledge"],
  queryFn: () => listKnowledge(),
});

export const memoriesQuery = queryOptions({
  queryKey: ["memories"],
  queryFn: () => listMemories(),
});

export const performanceQuery = queryOptions({
  queryKey: ["performance"],
  queryFn: () => getWorkforcePerformance(),
});

export const agentConversationQuery = (slug: string) =>
  queryOptions({
    queryKey: ["agent-conversation", slug],
    queryFn: () => getAgentConversation({ data: { slug } }),
  });



export const tasksQuery = queryOptions({
  queryKey: ["tasks"],
  queryFn: () => getTasks(),
});

export const analyticsQuery = queryOptions({
  queryKey: ["analytics"],
  queryFn: () => getAnalytics(),
});

export const integrationsQuery = queryOptions({
  queryKey: ["integrations"],
  queryFn: () => listIntegrations(),
});


export const employeesQuery = queryOptions({
  queryKey: ["employees"],
  queryFn: () => listEmployees(),
  staleTime: 5 * 60 * 1000,
});

export const employeeQuery = (slug: string) =>
  queryOptions({
    queryKey: ["employee", slug],
    queryFn: () => getEmployeeBySlug({ data: { slug } }),
    staleTime: 5 * 60 * 1000,
  });

export const dashboardQuery = queryOptions({
  queryKey: ["dashboard"],
  queryFn: () => getDashboardOverview(),
});

export const mySubscriptionsQuery = queryOptions({
  queryKey: ["my-subscriptions"],
  queryFn: () => getMySubscriptions(),
});

export const businessProfileQuery = queryOptions({
  queryKey: ["business-profile"],
  queryFn: () => getBusinessProfile(),
});

export const myProfileQuery = queryOptions({
  queryKey: ["my-profile"],
  queryFn: () => getMyProfile(),
});

export const reportsQuery = queryOptions({
  queryKey: ["reports"],
  queryFn: () => getReports(),
});

export const employeeActivityQuery = (slug: string) =>
  queryOptions({
    queryKey: ["employee-activity", slug],
    queryFn: () => getEmployeeActivity({ data: { slug } }),
  });

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: () => listCategories(),
  staleTime: 10 * 60 * 1000,
});
