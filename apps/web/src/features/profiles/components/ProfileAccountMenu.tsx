import { LogOut, Settings } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import type { AppUser } from "../../../shared/api/types";
import { Avatar } from "../../../shared/ui/avatar";
import { cn } from "../../../shared/ui/cn";
import { useAuth } from "../../auth/useAuth";

interface ProfileAccountMenuProps {
  appUser: AppUser | null;
  className?: string;
}

export function ProfileAccountMenu({ appUser, className }: ProfileAccountMenuProps) {
  const { signOut, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLAnchorElement>(null);
  const displayName = appUser?.name ?? user?.email?.split("@")[0] ?? "사용자";
  const email = appUser?.email ?? user?.email ?? "계정 정보를 확인하고 있어요";
  const profileImageUrl = appUser?.profile_image_url ?? null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusTimer = window.requestAnimationFrame(() => {
      firstMenuItemRef.current?.focus();
    });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      setIsOpen(false);
      triggerRef.current?.focus();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(focusTimer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    setIsOpen(false);

    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className={cn("relative shrink-0", className)}>
      <button
        ref={triggerRef}
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        aria-label="계정 메뉴"
        className="grid size-10 place-items-center rounded-full transition-colors hover:bg-hypo-bg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        <Avatar
          alt={`${displayName} 프로필 사진`}
          borderTone="strong"
          className="size-8"
          shape="circle"
          src={profileImageUrl}
        />
      </button>

      {isOpen ? (
        <>
          <button
            aria-label="계정 메뉴 닫기"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            type="button"
            onClick={closeMenu}
          />
          <div
            id={menuId}
            aria-label="계정 메뉴"
            className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-hypo-lg border border-hypo-border bg-hypo-surface shadow-hypo-floating"
          >
            <div className="flex items-center gap-3 px-4 py-4">
              <Avatar
                alt={`${displayName} 프로필 사진`}
                className="size-11 rounded-hypo-lg"
                src={profileImageUrl}
              />
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-sm font-bold text-hypo-text">
                  {displayName}
                </strong>
                <p className="mt-0.5 truncate text-xs text-hypo-text-soft">{email}</p>
              </div>
            </div>

            <div className="border-t border-hypo-border py-1">
              <a
                ref={firstMenuItemRef}
                className="flex min-h-11 items-center gap-3 px-4 text-sm font-semibold text-hypo-text-muted transition-colors hover:bg-hypo-surface-muted hover:text-hypo-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-hypo-brand/20"
                href="/profile"
                onClick={closeMenu}
              >
                <Settings aria-hidden="true" size={17} />
                프로필 설정
              </a>
              <button
                className="flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm font-semibold text-hypo-danger transition-colors hover:bg-hypo-danger-soft focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-hypo-danger/20 disabled:cursor-wait disabled:opacity-60"
                disabled={isSigningOut}
                type="button"
                onClick={() => void handleSignOut()}
              >
                <LogOut aria-hidden="true" size={17} />
                {isSigningOut ? "로그아웃 중" : "로그아웃"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
