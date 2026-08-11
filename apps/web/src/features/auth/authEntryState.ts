import { getAppRouteAccess, isInternalNavigationPath } from "../../shared/navigation/appRoutes";

export const AUTH_BOOTSTRAP_STATUS_DELAY_MS = 1_000;
export const AUTH_BOOTSTRAP_TIMEOUT_MS = 8_000;
export const DEFAULT_POST_AUTH_PATH = "/app";

export type AuthBootstrapState =
  | "idle"
  | "checking"
  | "delayed"
  | "offline"
  | "recoverable-error";

interface RequestedPathParts {
  hash?: string;
  pathname: string;
  search?: string;
}

interface AuthBootstrapStateInput {
  elapsedMs: number;
  hasError: boolean;
  isChecking: boolean;
  isOnline: boolean;
}

export function buildRequestedPath({ hash = "", pathname, search = "" }: RequestedPathParts) {
  return `${pathname}${search}${hash}`;
}

export function resolvePostAuthPath({ hash = "", pathname, search = "" }: RequestedPathParts) {
  const candidate = buildRequestedPath({ hash, pathname, search });

  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return DEFAULT_POST_AUTH_PATH;
  }

  const parsedCandidate = new URL(candidate, "https://hypofit.local");
  const access = getAppRouteAccess(parsedCandidate.pathname);

  if (
    parsedCandidate.origin !== "https://hypofit.local" ||
    !isInternalNavigationPath(parsedCandidate.pathname) ||
    access === "public"
  ) {
    return DEFAULT_POST_AUTH_PATH;
  }

  return buildRequestedPath({
    hash: parsedCandidate.hash,
    pathname: parsedCandidate.pathname,
    search: parsedCandidate.search,
  });
}

export function getAuthBootstrapState({
  elapsedMs,
  hasError,
  isChecking,
  isOnline,
}: AuthBootstrapStateInput): AuthBootstrapState {
  if (!isOnline) {
    return "offline";
  }

  if (hasError || elapsedMs >= AUTH_BOOTSTRAP_TIMEOUT_MS) {
    return "recoverable-error";
  }

  if (!isChecking) {
    return "idle";
  }

  if (elapsedMs >= AUTH_BOOTSTRAP_STATUS_DELAY_MS) {
    return "delayed";
  }

  return "checking";
}
