export function AuthFooterLinks() {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold text-hypo-text-soft">
      <a className="underline-offset-4 hover:text-hypo-text hover:underline" href="/legal/terms">
        이용약관
      </a>
      <a
        className="underline-offset-4 hover:text-hypo-text hover:underline"
        href="/legal/privacy"
      >
        개인정보처리방침
      </a>
      <a className="underline-offset-4 hover:text-hypo-text hover:underline" href="/support">
        문의하기
      </a>
    </div>
  );
}
