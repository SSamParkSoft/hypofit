import { useEffect } from "react";

interface RouteMetadataOptions {
  canonical?: string;
  description?: string;
  robots?: string;
}

export function useRouteMetadata({ canonical, description, robots }: RouteMetadataOptions) {
  useEffect(() => {
    const cleanups = [
      updateMeta("description", description),
      updateMeta("robots", robots),
      updateCanonical(canonical),
    ];

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [canonical, description, robots]);
}

function updateMeta(name: string, content?: string) {
  const existing = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!content) {
    return () => undefined;
  }

  const element = existing ?? document.createElement("meta");
  const previousContent = existing?.content;
  if (!existing) {
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = content;

  return () => {
    if (existing) {
      existing.content = previousContent ?? "";
    } else {
      element.remove();
    }
  };
}

function updateCanonical(href?: string) {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!href) {
    return () => undefined;
  }

  const element = existing ?? document.createElement("link");
  const previousHref = existing?.href;
  if (!existing) {
    element.rel = "canonical";
    document.head.appendChild(element);
  }
  element.href = href;

  return () => {
    if (existing) {
      existing.href = previousHref ?? "";
    } else {
      element.remove();
    }
  };
}
