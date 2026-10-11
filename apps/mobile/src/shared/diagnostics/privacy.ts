import type { Breadcrumb, Event } from "@sentry/react-native";

const allowedContextKeys = new Set([
  "app_build", "app_version", "build_number", "api_code", "candidate_route",
  "can_ask_again", "code", "has_app_user", "has_session",
  "is_configured", "is_loading", "is_syncing", "kind", "method", "nextRoute",
  "path", "phase", "permission_status", "platform",
  "provider_code", "provider_name", "provider_status", "requires_role_onboarding",
  "request_id", "retryable", "route", "source", "status",
  "target_type", "type",
]);
const routeContextKeys = new Set(["candidate_route", "nextRoute", "path", "route"]);

export type DiagnosticValue = string | number | boolean | null;
export type DiagnosticContext = Record<string, DiagnosticValue>;

export function sanitizeContext(context?: Record<string, unknown>): DiagnosticContext | undefined {
  if (!context) return undefined;

  const safeContext: DiagnosticContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (!allowedContextKeys.has(key)) continue;

    if (typeof value === "string") {
      const text = routeContextKeys.has(key) ? value.split(/[?#]/, 1)[0] : value;
      safeContext[key] = text.slice(0, 180);
    } else if (typeof value === "number" || typeof value === "boolean" || value === null) {
      safeContext[key] = value;
    }
  }

  return Object.keys(safeContext).length ? safeContext : undefined;
}

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  // SDK HTTP, console and navigation breadcrumbs can contain query data or tokens.
  if (breadcrumb.category !== "hypofit.startup") return null;

  return {
    ...breadcrumb,
    message: breadcrumb.message && /^[a-z0-9_]+$/.test(breadcrumb.message)
      ? breadcrumb.message
      : "[redacted]",
    data: sanitizeContext(breadcrumb.data),
  };
}

export function scrubDiagnosticEvent<T extends Event>(event: T): T {
  event.user = undefined;
  event.request = undefined;
  event.extra = sanitizeContext(event.extra);
  event.message = event.message ? "[redacted]" : event.message;
  // Repeat filtering here because native breadcrumbs can bypass beforeBreadcrumb.
  event.breadcrumbs = event.breadcrumbs?.flatMap((breadcrumb) => {
    const safe = scrubBreadcrumb(breadcrumb);
    return safe ? [safe] : [];
  });

  if (event.exception?.values?.length) {
    event.exception.values = event.exception.values.map((value) => ({
      ...value,
      value: value.type ? `${value.type} details redacted` : "details redacted",
    }));
  }

  return event;
}
