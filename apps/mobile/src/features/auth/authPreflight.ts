import NetInfo from "@react-native-community/netinfo";
import {
  buildAuthFailure,
  captureAuthFailure,
  toUserFacingAuthError,
  type NormalizedAuthError,
} from "@/features/auth/authErrors";
import { addAppBreadcrumb } from "@/shared/diagnostics/sentry";
import { mobileEnv, readSupabaseEnv } from "@/shared/api/env";

interface AuthPreflightOptions {
  includeApi?: boolean;
}

const preflightTimeoutMs = 5_000;

export async function runAuthPreflight(options: AuthPreflightOptions = {}) {
  addAppBreadcrumb("auth_preflight_start", { include_api: Boolean(options.includeApi) });

  const networkError = await checkNetworkState();
  if (networkError) {
    captureAuthFailure(networkError);
    throwAuthPreflightError(networkError);
  }

  const supabaseError = await checkSupabaseAuthHealth();
  if (supabaseError) {
    captureAuthFailure(supabaseError);
    throwAuthPreflightError(supabaseError);
  }

  if (options.includeApi) {
    const apiError = await checkApiReadiness();
    if (apiError) {
      captureAuthFailure(apiError);
      throwAuthPreflightError(apiError);
    }
  }

  addAppBreadcrumb("auth_preflight_done", { include_api: Boolean(options.includeApi) });
}

function throwAuthPreflightError(error: NormalizedAuthError): never {
  throw toUserFacingAuthError(error);
}

async function checkNetworkState() {
  try {
    const state = await NetInfo.fetch();
    const isReachable = state.isInternetReachable;

    if (state.isConnected === false && isReachable === false) {
      return buildAuthFailure({
        code: "auth_network_unreachable",
        phase: "network_preflight",
        providerName: "NetInfo",
        supportMessage: `netinfo:${state.type}:${String(state.isConnected)}:${String(isReachable)}`,
      });
    }

    if (state.isConnected === false || isReachable === false) {
      addAppBreadcrumb("auth_preflight_netinfo_inconclusive", {
        connected: state.isConnected,
        reachable: isReachable,
        type: state.type,
      });
    }
  } catch {
    return null;
  }

  return null;
}

async function checkSupabaseAuthHealth() {
  let supabaseUrl: string;
  let supabaseAnonKey: string;

  try {
    ({ supabaseUrl, supabaseAnonKey } = readSupabaseEnv());
  } catch {
    return buildAuthFailure({
      code: "auth_supabase_unexpected",
      phase: "network_preflight",
      providerName: "supabase_env",
      supportMessage: "missing_supabase_public_env",
    });
  }

  return checkHealthEndpoint({
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
    providerName: "supabase_auth_health",
    url: `${supabaseUrl}/auth/v1/health`,
  });
}

async function checkApiReadiness() {
  return checkHealthEndpoint({
    headers: { Accept: "application/json" },
    providerName: "hypofit_api_readiness",
    url: `${mobileEnv.apiBaseUrl}/api/v1/health/ready`,
  });
}

async function checkHealthEndpoint(input: {
  headers: Record<string, string>;
  providerName: string;
  url: string;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), preflightTimeoutMs);

  try {
    const response = await fetch(input.url, {
      headers: input.headers,
      method: "GET",
      signal: controller.signal,
    });

    if (response.ok) {
      addAppBreadcrumb("auth_preflight_health_ok", { source: input.providerName, status: response.status });
      return null;
    }

    if (input.providerName === "supabase_auth_health" && response.status === 401) {
      // Supabase Auth health can reject lightweight probes depending on gateway
      // auth handling. Do not block real signIn/signUp when the network path is
      // reachable but this probe is unauthorized.
      addAppBreadcrumb("auth_preflight_health_probe_unauthorized", {
        source: input.providerName,
        status: response.status,
      });
      return null;
    }

    return buildAuthFailure({
      code: response.status >= 500 ? "auth_supabase_service_unavailable" : "auth_supabase_unexpected",
      phase: "network_preflight",
      providerName: input.providerName,
      providerStatus: response.status,
      supportMessage: `${input.providerName}:${response.status}`,
    });
  } catch (error) {
    const code = error instanceof Error && error.name === "AbortError" ? "auth_timeout" : "auth_dns_or_tls_failed";

    return buildAuthFailure({
      code,
      phase: "network_preflight",
      providerName: input.providerName,
      supportMessage: `${input.providerName}:${error instanceof Error ? error.name : "unknown"}`,
    });
  } finally {
    clearTimeout(timeout);
  }
}
