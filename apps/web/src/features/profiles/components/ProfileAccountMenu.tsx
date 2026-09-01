import { useEffect, useId, useRef, useState } from "react";

import type { AppUser } from "../../../shared/api/types";
import { Avatar } from "../../../shared/ui/avatar";
import { cn } from "../../../shared/ui/cn";
import { AppIcon } from "../../../shared/ui/icon";
import { useAuth } from "../../auth/useAuth";
import { useSignOutToLanding } from "../../auth/useSignOutToLanding";

interface ProfileAccountMenuProps {
  appUser: AppUser | null;
  className?: string;
}

const accountMenuItemClassName =
  "grid min-h-10 w-full grid-cols-[17px_minmax(0,1fr)_15px] items-center gap-2.5 rounded-hypo-md px-2.5 text-left text-sm font-bold leading-5 text-hypo-text-muted transition-colors hover:bg-hypo-surface-muted/80 hover:text-hypo-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-hypo-brand/20";

export function ProfileAccountMenu({ appUser, className }: ProfileAccountMenuProps) {
  const { user } = useAuth();
  const signOutToLanding = useSignOutToLanding();
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
      await signOutToLanding();
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
          className="size-8 border border-hypo-text/35 ring-0"
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
            className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-hypo-lg border border-hypo-border-strong bg-hypo-surface p-1.5 shadow-hypo-floating"
          >
            <div className="flex items-center gap-2.5 px-2.5 pb-2.5 pt-2">
              <Avatar
                alt={`${displayName} 프로필 사진`}
                className="size-11 border border-hypo-border/80 ring-0"
                shape="circle"
                src={profileImageUrl}
              />
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-sm font-bold leading-5 text-hypo-text">
                  {displayName}
                </strong>
                <p className="mt-0.5 truncate text-[11px] font-medium leading-4 text-hypo-text-soft">
                  {email}
                </p>
              </div>
            </div>

            <div className="border-t border-hypo-border/60 pt-2">
              <a
                ref={firstMenuItemRef}
                aria-label="프로필 설정"
                className={cn(accountMenuItemClassName, "group")}
                href="/profile"
                onClick={closeMenu}
              >
                <AppIcon aria-hidden="true" name="settings" size={16} />
                <span>프로필 설정</span>
                <AppIcon
                  aria-hidden="true"
                  className="text-hypo-text-soft transition-transform group-hover:translate-x-0.5"
                  name="chevron-right"
                  size={15}
                />
              </a>
              <button
                className={cn(
                  accountMenuItemClassName,
                  "disabled:cursor-wait disabled:opacity-60",
                )}
                disabled={isSigningOut}
                type="button"
                onClick={() => void handleSignOut()}
              >
                <AppIcon
                  aria-hidden="true"
                  className="text-hypo-danger"
                  name="logout"
                  size={16}
                />
                <span className="text-[13.5px] font-bold leading-5 text-hypo-danger">
                  {isSigningOut ? "로그아웃 중" : "로그아웃"}
                </span>
                <span aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
