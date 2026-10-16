import * as Sentry from "@sentry/react-native";
import * as Application from "expo-application";
import { sanitizeContext, scrubBreadcrumb, scrubDiagnosticEvent, type DiagnosticContext } from "./privacy";

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const sentryEnabled = Boolean(sentryDsn);
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

Sentry.init({
  dsn: sentryDsn,
  enabled: sentryEnabled,
  environment: __DEV__ ? "development" : "production",
  tracesSampleRate: 0,
  sendDefaultPii: false,
  beforeBreadcrumb: scrubBreadcrumb,
  beforeSend(event) {
    return scrubDiagnosticEvent(event);
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
