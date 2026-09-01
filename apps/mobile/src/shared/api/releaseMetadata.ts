export const CLIENT_VERSION_HEADER = "X-Client-Version";
export const CLIENT_BUILD_HEADER = "X-Client-Build";
export const CLIENT_REVISION_HEADER = "X-Client-Revision";

export interface ClientReleaseMetadata {
  build?: number | string | null;
  revision?: number | string | null;
  version?: number | string | null;
}

function normalizeReleaseMetadataValue(value: number | string | null | undefined): string | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue ? normalizedValue : null;
}

export function buildClientReleaseHeaders(
  metadata: ClientReleaseMetadata,
): Record<string, string> {
  const version = normalizeReleaseMetadataValue(metadata.version);
  const build = normalizeReleaseMetadataValue(metadata.build);
  const revision = normalizeReleaseMetadataValue(metadata.revision);

  return {
    ...(version ? { [CLIENT_VERSION_HEADER]: version } : {}),
    ...(build ? { [CLIENT_BUILD_HEADER]: build } : {}),
    ...(revision ? { [CLIENT_REVISION_HEADER]: revision } : {}),
  };
}
