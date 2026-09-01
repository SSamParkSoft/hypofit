import { useEffect, useState } from "react";

import { LandingDesktop } from "../features/landing/LandingDesktop";
import { MobileLanding } from "../features/landing/MobileLanding";

interface LandingPageProps {
  isAuthenticated?: boolean;
  showWebEntry?: boolean;
}

export function LandingPage({
  isAuthenticated = false,
  showWebEntry = true,
}: LandingPageProps) {
  const isDesktopLanding = useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    document.documentElement.classList.add("landing-scroll-smooth");

    const themeColor = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    const previousThemeColor = themeColor?.content;
    themeColor?.setAttribute("content", "#f7faf7");

    return () => {
      document.documentElement.classList.remove("landing-scroll-smooth");
      if (themeColor && previousThemeColor) {
        themeColor.setAttribute("content", previousThemeColor);
      }
    };
  }, []);

  useEffect(() => {
    const revealElements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-landing-reveal]"),
    );
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      revealElements.forEach((element) => {
        element.dataset.landingRevealVisible = "true";
      });
      return undefined;
    }

    document.documentElement.classList.add("landing-reveal-ready");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const element = entry.target as HTMLElement;
          element.dataset.landingRevealVisible = "true";
          observer.unobserve(element);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("landing-reveal-ready");
    };
  }, [isDesktopLanding]);

  return (
    <div className="min-h-dvh bg-landing-bg text-landing-foreground selection:bg-landing-soft-mint selection:text-landing-primary-hover">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-hypo-md bg-hypo-text px-4 py-2 text-sm font-black text-white transition-transform focus:translate-y-0"
      >
        본문으로 바로가기
      </a>

      {isDesktopLanding ? (
        <LandingDesktop
          isAuthenticated={isAuthenticated}
          showWebEntry={showWebEntry}
        />
      ) : (
        <MobileLanding />
      )}
    </div>
  );
}

function useMediaQuery(query: string) {
  const getMatches = () =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false;

  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) =>
      setMatches(event.matches);

    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}
