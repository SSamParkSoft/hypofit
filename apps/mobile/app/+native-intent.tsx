export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  const normalizedPath = path.replace(/\/+$/, "");

  if (normalizedPath === "--" || normalizedPath === "/--") {
    return "/";
  }

  return path;
}
