import type { MouseEventHandler } from "react";

import { cn } from "../../../../shared/ui/cn";
import {
  getSocialProviderDefinition,
  type SocialProviderId,
} from "../model/providerRegistry";

interface SocialLoginButtonProps {
  disabled?: boolean;
  isBusy?: boolean;
  isLastUsed?: boolean;
  provider: SocialProviderId;
  onClick: MouseEventHandler<HTMLButtonElement>;
}

export function SocialLoginButton({
  disabled = false,
  isBusy = false,
  isLastUsed = false,
  provider,
  onClick,
}: SocialLoginButtonProps) {
  const definition = getSocialProviderDefinition(provider);

  return (
    <div className="relative">
      <button
        aria-busy={isBusy || undefined}
        aria-label={`${definition.actionLabel}${isLastUsed ? ", 최근 사용" : ""}`}
        className={cn(
          "relative flex h-[52px] w-full items-center justify-center rounded-[12px] border px-14 text-[14px] font-semibold leading-5 transition-[background-color,border-color,opacity] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-offset-hypo-bg",
          definition.buttonClassName,
          disabled && "cursor-not-allowed opacity-60",
        )}
        disabled={disabled}
        type="button"
        onClick={onClick}
      >
        <img
          alt=""
          aria-hidden="true"
          className={cn("pointer-events-none absolute object-contain", definition.iconClassName)}
          draggable={false}
          height={44}
          src={definition.iconPath}
          width={44}
        />
        <span className="truncate text-center">
          <span style={{ fontFamily: getProviderFontFamily(provider) }}>
            {isBusy ? `${definition.label} 연결 중` : definition.actionLabel}
          </span>
        </span>
      </button>
      {isLastUsed ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-0 z-10 -translate-y-[38%] rounded-full bg-hypo-brand px-2.5 py-1 text-[10px] font-bold leading-4 text-white shadow-[0_3px_10px_rgba(23,107,93,0.22)] after:absolute after:right-3 after:top-full after:border-x-[4px] after:border-t-[5px] after:border-x-transparent after:border-t-hypo-brand after:content-['']"
        >
          최근 사용
        </span>
      ) : null}
    </div>
  );
}

function getProviderFontFamily(provider: SocialProviderId) {
  if (provider === "google") {
    return '"Google Sans", Roboto, Arial, sans-serif';
  }

  return '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
}
