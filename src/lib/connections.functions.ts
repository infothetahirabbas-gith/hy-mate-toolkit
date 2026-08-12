import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CONNECTORS, connectorById } from "@/lib/connectors";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";

function clientKeyEnv(connectorId: string) {
  return `${connectorId.toUpperCase()}_APP_USER_CONNECTOR_CLIENT_API_KEY`;
}

export const listConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_integrations")
      .select("provider, connector_id, status, account_label, connected_at, last_error")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);

    return CONNECTORS.map((connector) => {
      const row = (data ?? []).find(
        (r) => r.connector_id === connector.connectorId || r.provider === connector.name,
      );
      return {
        connectorId: connector.connectorId,
        name: connector.name,
        category: connector.category,
        description: connector.description,
        operations: connector.operations,
        configured: Boolean(process.env[clientKeyEnv(connector.connectorId)]),
        connected: row?.status === "connected",
        accountLabel: row?.account_label ?? null,
        connectedAt: row?.connected_at ?? null,
        lastError: row?.last_error ?? null,
      };
    });
  });

export const startConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ connectorId: z.string().min(1).max(60) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const connector = connectorById(data.connectorId);
    if (!connector) throw new Error("Unknown connector.");

    const clientAPIKey = process.env[clientKeyEnv(connector.connectorId)];
    if (!clientAPIKey) {
      throw new Error(
        `${connector.name} is not set up yet. A workspace admin needs to add the ${connector.name} connector client.`,
      );
    }

    const request = getRequest();
    if (!request) throw new Error("Connections must be started from the app.");
    const returnUrl = new URL(`/oauth/${connector.connectorId}/return`, request.url).toString();

    const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const existing = await getConnectionKeyForUser(context.userId, connector.connectorId);

    const { authorizeAppUserOAuth } = await import("@/integrations/lovable/appUserConnector");
    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: connector.connectorId,
      appUserId: context.userId,
      clientAPIKey,
      returnUrl,
      connectionAPIKey: existing ?? undefined,
      ...(connector.scopes.length ? { credentialsConfiguration: { scopes: connector.scopes } } : {}),
    });

    return { authorizationUrl };
  });

export const completeConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ code: z.string().min(1).max(600), connectorId: z.string().min(1).max(60) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const connector = connectorById(data.connectorId);
    if (!connector) throw new Error("Unknown connector.");

    const { exchangeAppUserOAuthCode } = await import("@/integrations/lovable/appUserConnector");
    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(
      GATEWAY_BASE_URL,
      data.code,
    );
    if (connectorId !== connector.connectorId) {
      throw new Error("OAuth completion returned the wrong connector.");
    }

    const { saveConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    await saveConnectionKeyForUser(context.userId, connectorId, connectionAPIKey);

    await context.supabase.from("user_integrations").upsert(
      {
        user_id: context.userId,
        provider: connector.name,
        connector_id: connector.connectorId,
        category: connector.category,
        status: "connected",
        scopes: connector.scopes,
        last_error: null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    );

    await context.supabase.from("audit_logs").insert({
      user_id: context.userId,
      actor_type: "user",
      action: "connection.connected",
      resource_type: "connector",
      resource_id: connector.connectorId,
      metadata: { name: connector.name },
      result: "success",
    });

    return { ok: true };
  });

export const disconnectConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ connectorId: z.string().min(1).max(60) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const connector = connectorById(data.connectorId);
    if (!connector) throw new Error("Unknown connector.");

    const { getConnectionKeyForUser, deleteConnectionKeyForUser } = await import(
      "@/server/appUserConnections.server"
    );
    const connectionAPIKey = await getConnectionKeyForUser(context.userId, connector.connectorId);
    if (connectionAPIKey) {
      const { disconnectAppUser } = await import("@/integrations/lovable/appUserConnector");
      try {
        await disconnectAppUser({
          gatewayBaseUrl: GATEWAY_BASE_URL,
          connectionAPIKey,
          connectorId: connector.connectorId,
        });
      } catch {
        /* gateway already dropped it — still clear local state */
      }
      await deleteConnectionKeyForUser(context.userId, connector.connectorId);
    }

    await context.supabase
      .from("user_integrations")
      .delete()
      .eq("user_id", context.userId)
      .eq("provider", connector.name);

    await context.supabase.from("audit_logs").insert({
      user_id: context.userId,
      actor_type: "user",
      action: "connection.disconnected",
      resource_type: "connector",
      resource_id: connector.connectorId,
      metadata: { name: connector.name },
      result: "success",
    });

    return { ok: true };
  });
