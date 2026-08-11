import * as Sentry from "@sentry/react-native";
import * as Application from "expo-application";

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const sentryEnabled = Boolean(sentryDsn);
const allowedContextKeys = new Set([
  "app_build",
  "app_version",
  "build_number",
  "api_code",
  "candidate_route",
  "can_ask_again",
  "code",
  "fingerprint",
  "has_app_user",
  "has_session",
  "is_configured",
  "is_loading",
  "is_syncing",
  "kind",
  "method",
  "nextRoute",
  "notification_id",
  "path",
  "phase",
  "permission_status",
  "platform",
  "provider_code",
  "provider_name",
  "provider_status",
  "requires_role_onboarding",
  "request_id",
  "retryable",
  "route",
  "source",
  "status",
  "target_id",
  "target_type",
  "type",
  "accuracy",
]);
const tagContextKeys = new Set([
  "app_build",
  "app_version",
  "build_number",
  "code",
  "phase",
  "provider_code",
  "provider_status",
  "request_id",
  "source",
  "status",
]);

type DiagnosticValue = string | number | boolean | null;
type DiagnosticContext = Record<string, DiagnosticValue>;

function sanitizeContext(context?: DiagnosticContext): DiagnosticContext | undefined {
  if (!context) {
    return undefined;
  }

  const safeContext: DiagnosticContext = {};

  for (const [key, value] of Object.entries(context)) {
    if (!allowedContextKeys.has(key)) {
      continue;
    }

    if (typeof value === "string") {
      safeContext[key] = value.slice(0, 180);
      continue;
    }

    safeContext[key] = value;
  }

  return Object.keys(safeContext).length ? safeContext : undefined;
}

function scrubEventText<T extends Sentry.Event>(event: T): T {
  event.user = undefined;
  event.message = event.message ? "[redacted]" : event.message;

  if (event.exception?.values?.length) {
    event.exception.values = event.exception.values.map((value) => ({
      ...value,
      value: value.type ? `${value.type} details redacted` : "details redacted",
    }));
  }

  return event;
}

Sentry.init({
  dsn: sentryDsn,
  enabled: sentryEnabled,
  environment: __DEV__ ? "development" : "production",
  tracesSampleRate: 0,
  sendDefaultPii: false,
  beforeSend(event) {
    return scrubEventText(event);
  },
});

if (sentryEnabled) {
  Sentry.setTag("app_version", Application.nativeApplicationVersion ?? "unknown");
  Sentry.setTag("app_build", Application.nativeBuildVersion ?? "unknown");
}

export function getAppDiagnostics() {
  const buildNumber = Application.nativeBuildVersion ?? "unknown";
  return {
    app_build: buildNumber,
    app_version: Application.nativeApplicationVersion ?? "unknown",
    build_number: buildNumber,
  };
}

export function addAppBreadcrumb(message: string, data?: DiagnosticContext) {
  if (!sentryEnabled) return;

  Sentry.addBreadcrumb({
    category: "hypofit.startup",
    data: sanitizeContext(data),
    level: "info",
    message,
  });
}

export function captureAppError(error: unknown, context?: DiagnosticContext) {
  if (!sentryEnabled) return;

  const safeContext = sanitizeContext(context);

  Sentry.captureException(error, (scope) => {
    if (safeContext) {
      scope.setExtras(safeContext);

      for (const [key, value] of Object.entries(safeContext)) {
        if (tagContextKeys.has(key) && value !== null) {
          scope.setTag(key, String(value));
        }
      }
    }

    return scope;
  });
}

export const wrapWithSentry = Sentry.wrap;
