import { router, type Href } from "expo-router";

const allowedReturnPrefixes = [
  "/(tabs)/home",
  "/(tabs)/interviews",
  "/(tabs)/map",
  "/(tabs)/chat",
  "/(tabs)/profile",
  "/(auth)",
  "/interviews",
  "/legal/",
  "/notice",
  "/notifications",
  "/support",
] as const;

export function getSafeReturnTo(value: unknown): Href | null {
  const path = Array.isArray(value) ? value[0] : value;

  if (typeof path !== "string") {
    return null;
  }

  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return null;
  }

  if (!allowedReturnPrefixes.some((prefix) => path.startsWith(prefix))) {
    return null;
  }

  return path as Href;
}

export function resolveReturnTo(value: unknown, fallback: Href): Href {
  return getSafeReturnTo(value) ?? fallback;
}

export function replaceToFallback(fallback: Href) {
  router.replace(fallback);
}

export function goBackOrReplaceFallback(fallback: Href) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}

export function goBackOrReplaceReturnTo(returnTo: Href | null | undefined, fallback: Href) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(returnTo ?? fallback);
}
