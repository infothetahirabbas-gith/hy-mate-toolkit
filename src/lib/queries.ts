import { queryOptions } from "@tanstack/react-query";
import { listEmployees, getEmployeeBySlug } from "./catalog.functions";
import {
  getDashboardOverview,
  getMySubscriptions,
  getBusinessProfile,
  getMyProfile,
  getReports,
  getEmployeeActivity,
} from "./account.functions";

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
