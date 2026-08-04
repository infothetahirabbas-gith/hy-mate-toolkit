import { queryOptions } from "@tanstack/react-query";
import { listEmployees, getEmployeeBySlug } from "./catalog.functions";
import { listCategories } from "./categories.functions";
import { listDepartments } from "./departments.functions";

export const departmentsQuery = queryOptions({
  queryKey: ["departments"],
  queryFn: () => listDepartments(),
  staleTime: 5 * 60 * 1000,
});
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
import {
  getWorkforceOverview,
  listWorkforceTasks,
  listNotifications,
  getActivationState,
} from "./workforce.functions";
import { getMemoryCenter } from "./memory.functions";
import { getToolRegistry } from "./tools.functions";
import { listProjects, getProject } from "./projects.functions";
import { listWorkflows } from "./workflows.functions";

export const memoryCenterQuery = queryOptions({
  queryKey: ["memory-center"],
  queryFn: () => getMemoryCenter(),
});

export const toolRegistryQuery = queryOptions({
  queryKey: ["tool-registry"],
  queryFn: () => getToolRegistry(),
});

export const projectsQuery = queryOptions({
  queryKey: ["projects"],
  queryFn: () => listProjects(),
});

export const projectQuery = (id: string) =>
  queryOptions({
    queryKey: ["project", id],
    queryFn: () => getProject({ data: { id } }),
  });

export const workflowsQuery = queryOptions({
  queryKey: ["workflows"],
  queryFn: () => listWorkflows(),
});

export const workforceQuery = queryOptions({
  queryKey: ["workforce"],
  queryFn: () => getWorkforceOverview(),
});


export const workforceTasksQuery = queryOptions({
  queryKey: ["workforce-tasks"],
  queryFn: () => listWorkforceTasks(),
});

export const notificationsQuery = queryOptions({
  queryKey: ["notifications"],
  queryFn: () => listNotifications(),
  refetchInterval: 60_000,
});

export const activationQuery = (slug: string) =>
  queryOptions({
    queryKey: ["activation", slug],
    queryFn: () => getActivationState({ data: { slug } }),
  });



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
