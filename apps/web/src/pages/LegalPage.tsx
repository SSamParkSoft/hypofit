import { ArrowLeft, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { privacyIntro, privacySections, termsIntro, termsSections } from "@hypofit/contracts";

import { navigateBack } from "../shared/navigation/appNavigation";
import { cn } from "../shared/ui/cn";

interface LegalPageProps {
  type: "terms" | "privacy";
}

export function LegalPage({ type }: LegalPageProps) {
  const isTerms = type === "terms";
  const title = isTerms ? "이용약관" : "개인정보처리방침";
  const sections = isTerms ? termsSections : privacySections;
  const intro = isTerms ? termsIntro : privacyIntro;
  const sectionIds = sections.map((_, index) => getSectionId(type, index));
  const [activeSectionId, setActiveSectionId] = useState(sectionIds[0] ?? "");

  useEffect(() => {
    const nextSectionIds = sections.map((_, index) => getSectionId(type, index));
    setActiveSectionId(nextSectionIds[0] ?? "");

    if (typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((entry) => entry.isIntersecting);
        if (visibleEntry?.target.id) {
          setActiveSectionId(visibleEntry.target.id);
        }
      },
      { rootMargin: "-18% 0px -72%", threshold: 0 },
    );

    nextSectionIds.forEach((id) => {
      const heading = document.getElementById(id);
      if (heading) {
        observer.observe(heading);
      }
    });

    return () => observer.disconnect();
  }, [sections, type]);

  return (
    <div className="min-h-dvh bg-white text-hypo-text">
      <header className="sticky top-0 z-40 border-b border-hypo-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center justify-between gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
          <a
            className="inline-flex min-w-0 items-center gap-2 rounded-hypo-md py-1 pr-2 text-hypo-text transition-colors hover:text-hypo-brand focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
            href="/"
            aria-label="이전 화면"
            onClick={(event) => {
              if (
                event.defaultPrevented ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              ) {
                return;
              }

              event.preventDefault();
              navigateBack("/");
            }}
          >
            <ArrowLeft aria-hidden="true" className="shrink-0" size={18} />
            <span className="truncate text-sm font-semibold sm:text-base">{title}</span>
          </a>

          <a
            className="inline-flex shrink-0 items-center gap-2 rounded-hypo-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
            href="/"
            aria-label="Hypofit 처음으로"
          >
            <img
              src="/brand/hypofit-mark.svg"
              alt=""
              aria-hidden="true"
              className="size-7 object-contain sm:size-8"
            />
            <strong className="hidden font-brand text-base font-black text-hypo-text sm:inline">
              Hypofit
            </strong>
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] px-5 pb-[calc(var(--app-safe-bottom)+3rem)] pt-9 sm:px-6 sm:pb-16 sm:pt-12 lg:px-8 lg:pb-24 lg:pt-16">
        <header className="max-w-[740px] border-b border-hypo-border pb-7 sm:pb-9">
          <p className="text-xs font-semibold leading-[18px] text-hypo-brand">LEGAL</p>
          <h1 className="mt-3 text-[28px] font-bold leading-[1.35] text-hypo-text sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-sm font-normal leading-7 text-hypo-text-muted sm:text-[15px]">
            Hypofit 서비스의 {isTerms ? "이용 조건과 권리·의무" : "개인정보 처리 기준"}을 안내합니다.
          </p>
        </header>

        <div className="mt-8 grid min-w-0 gap-12 min-[1200px]:grid-cols-[minmax(0,740px)_minmax(220px,260px)] min-[1200px]:items-start min-[1200px]:justify-between min-[1200px]:gap-16">
          <article className="min-w-0">
            <section className="grid gap-3 text-sm leading-7 text-black sm:text-[15px] sm:leading-8">
              {intro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>

            <details className="group mt-8 border-y border-hypo-border min-[1200px]:hidden">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-semibold text-hypo-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-hypo-brand/20 [&::-webkit-details-marker]:hidden">
                이 페이지의 내용
                <ChevronDown
                  aria-hidden="true"
                  className="shrink-0 transition-transform group-open:rotate-180"
                  size={18}
                />
              </summary>
              <LegalTableOfContents
                activeSectionId={activeSectionId}
                className="border-t border-hypo-border pb-4 pt-3"
                onSelect={setActiveSectionId}
                sections={sections}
                type={type}
              />
            </details>

            <section className="mt-10 grid gap-10 sm:mt-12 sm:gap-12">
              {sections.map((section, index) => {
                const sectionId = getSectionId(type, index);

                return (
                  <section key={section.title} aria-labelledby={sectionId}>
                    <h2
                      id={sectionId}
                      className="scroll-mt-24 text-base font-bold leading-7 text-black sm:text-lg sm:leading-8"
                    >
                      {section.title}
                    </h2>
                    <div className="mt-3 grid gap-3 text-sm leading-7 text-black sm:text-[15px] sm:leading-8">
                      {section.body.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </section>
                );
              })}
            </section>
          </article>

          <aside className="sticky top-24 hidden max-h-[calc(100dvh-7rem)] overflow-y-auto min-[1200px]:block">
            <h2 className="text-sm font-semibold text-hypo-text">이 페이지의 내용</h2>
            <LegalTableOfContents
              activeSectionId={activeSectionId}
              className="mt-4 border-l border-hypo-border"
              onSelect={setActiveSectionId}
              sections={sections}
              type={type}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}

function LegalTableOfContents({
  activeSectionId,
  className,
  onSelect,
  sections,
  type,
}: {
  activeSectionId: string;
  className?: string;
  onSelect: (sectionId: string) => void;
  sections: ReadonlyArray<{ title: string }>;
  type: LegalPageProps["type"];
}) {
  return (
    <nav aria-label="약관 목차" className={cn("grid", className)}>
      {sections.map((section, index) => {
        const sectionId = getSectionId(type, index);
        const isActive = activeSectionId === sectionId;

        return (
          <a
            key={section.title}
            aria-current={isActive ? "location" : undefined}
            className={cn(
              "border-l-2 border-transparent py-2 pl-3 pr-2 text-[13px] font-semibold leading-5 text-hypo-text-muted transition-colors hover:text-hypo-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20",
              isActive && "border-hypo-brand font-semibold text-hypo-brand",
            )}
            href={`#${sectionId}`}
            onClick={() => onSelect(sectionId)}
          >
            {section.title}
          </a>
        );
      })}
    </nav>
  );
}

function getSectionId(type: LegalPageProps["type"], index: number) {
  return `${type}-section-${index + 1}`;
}
