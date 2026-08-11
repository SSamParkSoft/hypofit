import { Share, Smartphone, SquarePlus } from "lucide-react";
import type { ReactNode } from "react";

import { BackLink } from "../shared/ui/back-link";

export function InstallPage() {
  return (
    <main className="min-h-dvh bg-hypo-bg px-4 pb-[calc(var(--app-safe-bottom)+1.25rem)] pt-[calc(var(--app-safe-top)+1.25rem)] text-hypo-text sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-3xl gap-5">
        <header className="flex items-center gap-2.5">
          <BackLink />
          <div className="min-w-0">
            <h1 className="text-xl font-black leading-7 sm:text-2xl">홈 화면에 추가</h1>
          </div>
        </header>

        <section className="rounded-hypo-lg border border-hypo-border bg-hypo-surface p-5 shadow-hypo-panel">
          <div className="flex items-center gap-3">
            <img
              alt=""
              aria-hidden="true"
              className="size-12 shrink-0 rounded-hypo-lg object-cover"
              src="/icons/icon-512.png"
            />
            <div className="min-w-0">
              <h2 className="text-lg font-black leading-6">Hypofit</h2>
              <p className="mt-1 text-sm leading-5 text-hypo-text-muted">
                앱처럼 홈 화면에서 바로 열 수 있어요.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3">
          <InstallStep
            icon={<Share size={18} />}
            title="iPhone Safari"
            body="Safari에서 공유 버튼을 누른 뒤 홈 화면에 추가를 선택하세요."
          />
          <InstallStep
            icon={<SquarePlus size={18} />}
            title="Android Chrome"
            body="Chrome 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택하세요."
          />
          <InstallStep
            icon={<Smartphone size={18} />}
            title="설치 후 사용"
            body="홈 화면의 Hypofit 아이콘을 누르면 브라우저 주소창 없이 열립니다."
          />
        </section>
      </div>
    </main>
  );
}

function InstallStep({
  body,
  icon,
  title,
}: {
  body: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <article className="flex gap-3 rounded-hypo-lg border border-hypo-border bg-hypo-surface p-4 shadow-hypo-panel">
      <div className="grid size-9 shrink-0 place-items-center rounded-hypo-pill bg-hypo-brand-soft text-hypo-brand">
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-black text-hypo-text">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-hypo-text-muted">{body}</p>
      </div>
    </article>
  );
}
