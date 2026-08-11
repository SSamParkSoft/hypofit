import type { MouseEventHandler } from "react";

import { cn } from "../../../../shared/ui/cn";
import {
  getSocialProviderDefinition,
  type SocialProviderId,
} from "../model/providerRegistry";

interface SocialLoginButtonProps {
  disabled?: boolean;
  isBusy?: boolean;
  provider: SocialProviderId;
  onClick: MouseEventHandler<HTMLButtonElement>;
}

export function SocialLoginButton({
  disabled = false,
  isBusy = false,
  provider,
  onClick,
}: SocialLoginButtonProps) {
  const definition = getSocialProviderDefinition(provider);

  return (
    <button
      aria-busy={isBusy || undefined}
      aria-label={definition.actionLabel}
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
  );
}

function getProviderFontFamily(provider: SocialProviderId) {
  if (provider === "google") {
    return '"Google Sans", Roboto, Arial, sans-serif';
  }

  return '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
}
