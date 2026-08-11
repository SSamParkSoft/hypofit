import { describe, expect, it } from "vitest";

import {
  APP_DESTINATION_DEFINITIONS,
  APP_ROUTE_DEFINITIONS,
  resolveAppRoute,
} from "../../shared/navigation/appRoutes";
import {
  APP_ROUTE_MANIFEST,
  getAppRouteManifestEntry,
  isRouteManifestDestinationEntry,
  isRouteManifestRouteEntry,
} from "./routeManifest";

describe("app route manifest", () => {
  it("registers every shared route id exactly once", () => {
    const manifestRouteIds = APP_ROUTE_MANIFEST.filter(
      isRouteManifestRouteEntry,
    ).map((entry) => entry.routeId);

    expect(sortStrings(manifestRouteIds)).toEqual(
      sortStrings(APP_ROUTE_DEFINITIONS.map((definition) => definition.id)),
    );
    expect(new Set(manifestRouteIds).size).toBe(manifestRouteIds.length);
  });

  it("keeps shell-rendered route entries aligned with shared shell metadata", () => {
    const manifestShellRouteIds = APP_ROUTE_MANIFEST.filter(
      isRouteManifestRouteEntry,
    )
      .filter((entry) => entry.layout === "shell")
      .map((entry) => entry.routeId);
    const sharedShellRouteIds = APP_ROUTE_DEFINITIONS.filter(
      (definition) => definition.shell,
    ).map((definition) => definition.id);

    expect(sortStrings(manifestShellRouteIds)).toEqual(
      sortStrings(sharedShellRouteIds),
    );
  });

  it("derives fallback destination registrations from the shared shell links", () => {
    const manifestDestinations = APP_ROUTE_MANIFEST.filter(
      isRouteManifestDestinationEntry,
    ).map((entry) => entry.destination);

    expect(sortStrings(manifestDestinations)).toEqual(
      sortStrings(APP_DESTINATION_DEFINITIONS.map((definition) => definition.id)),
    );
    expect(new Set(manifestDestinations).size).toBe(manifestDestinations.length);
  });

  it.each([
    ["/support/inquiries/new", "support-inbox-new", "shell", "shell"],
    ["/legal/privacy", "legal-privacy", "standalone", "standalone"],
    ["/auth/social/callback", "social-auth-callback", "standalone", "standalone"],
  ] as const)(
    "resolves %s through the registered manifest entry",
    (path, routeId, layout, loadingKind) => {
      const route = resolveAppRoute(path);
      const entry = getAppRouteManifestEntry(route, path);

      expect(entry).toMatchObject({
        kind: "route",
        layout,
        routeId,
      });
      expect(entry?.loading?.kind ?? null).toBe(loadingKind);
    },
  );

  it("falls back to the home destination entry when path matching misses", () => {
    const entry = getAppRouteManifestEntry(null, "/does-not-exist");

    expect(entry).not.toBeNull();
    expect(isRouteManifestDestinationEntry(entry!)).toBe(true);

    if (!entry || !isRouteManifestDestinationEntry(entry)) {
      return;
    }

    expect(entry.destination).toBe("home");
    expect(entry.layout).toBe("shell");
  });
});

function sortStrings(values: string[]) {
  return [...values].sort();
}
