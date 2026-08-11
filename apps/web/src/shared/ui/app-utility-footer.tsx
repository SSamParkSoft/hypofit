import { cn } from "./cn";

interface AppUtilityFooterProps {
  className?: string;
}

const utilityLinks = [
  { href: "/legal/privacy", label: "개인정보처리방침" },
  { href: "/legal/terms", label: "이용약관" },
  { href: "/support", label: "문의하기" },
] as const;

export function AppUtilityFooter({ className }: AppUtilityFooterProps) {
  return (
    <footer
      className={cn("hidden w-full min-[1200px]:block", className)}
      data-app-utility-footer="true"
    >
      <div className="mx-auto w-full max-w-[1480px] px-[var(--app-page-x)] pb-5 pt-2">
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-hypo-border px-1 pt-4 text-xs text-hypo-text-soft">
          <nav aria-label="법적 고지와 고객지원" className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {utilityLinks.map((link) => (
              <a
                key={link.href}
                className="rounded-hypo-sm font-semibold transition-colors hover:text-hypo-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
                href={link.href}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <p className="shrink-0 font-medium">© 2026 contentruck. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
