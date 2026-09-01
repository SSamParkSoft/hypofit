export function AuthFooterLinks() {
  return (
    <footer className="mt-6 grid justify-items-center gap-2 text-[11px] text-hypo-text-soft">
      <nav
        aria-label="로그인 페이지 안내"
        className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 font-semibold"
      >
        <a className="underline-offset-4 hover:text-hypo-text hover:underline" href="/legal/terms">
          이용약관
        </a>
        <a
          className="font-bold text-hypo-text-muted underline-offset-4 hover:text-hypo-text hover:underline"
          href="/legal/privacy"
        >
          개인정보처리방침
        </a>
        <a className="underline-offset-4 hover:text-hypo-text hover:underline" href="/support">
          고객센터
        </a>
      </nav>
      <p className="font-medium">© 2026 contentruck</p>
    </footer>
  );
}
