import type { LucideIcon, LucideProps } from "lucide-react";
import { forwardRef, type ReactNode, type SVGAttributes } from "react";

import { cn } from "./cn";

type AppIconName =
  | "back"
  | "calendar"
  | "chat"
  | "chevron-right"
  | "close"
  | "home"
  | "interviews"
  | "logout"
  | "map"
  | "notification"
  | "profile"
  | "settings"
  | "users";

type AppIconVariant = "Linear" | "Bold";

interface AppIconProps extends Omit<SVGAttributes<SVGSVGElement>, "color"> {
  active?: boolean;
  name: AppIconName;
  size?: number | string;
  variant?: AppIconVariant;
}

export const AppIcon = forwardRef<SVGSVGElement, AppIconProps>(function AppIcon(
  { active = false, className, name, size = 24, strokeWidth, variant, ...svgProps },
  ref,
) {
  const lineWidth = strokeWidth ?? (active || variant === "Bold" ? 2 : 1.5);

  return (
    <svg
      {...svgProps}
      ref={ref}
      className={cn("shrink-0", className)}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {renderIconPaths(name, lineWidth)}
    </svg>
  );
});

function renderIconPaths(name: AppIconName, strokeWidth: number | string): ReactNode {
  const shared = {
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth,
  };

  switch (name) {
    case "back":
      return <path {...shared} d="M15 19.92 8.48 13.4a1.98 1.98 0 0 1 0-2.8L15 4.08" />;
    case "chevron-right":
      return <path {...shared} d="m8.91 19.92 6.52-6.52a1.98 1.98 0 0 0 0-2.8L8.91 4.08" />;
    case "calendar":
      return (
        <>
          <path {...shared} d="M8 2v3M16 2v3M3.5 9.09h17M21 8.5V17c0 3-1.5 5-5 5H8c-3.5 0-5-2-5-5V8.5c0-3 1.5-5 5-5h8c3.5 0 5 2 5 5Z" />
          <path {...shared} d="M12 13.7h.01M8.3 13.7h.01M8.3 16.7h.01" strokeWidth={2} />
        </>
      );
    case "interviews":
      return (
        <>
          <path {...shared} d="M8 12.2h7M8 16.2h4.38M10 6h4c2 0 2-1 2-2s-1-2-2-2h-4C9 2 8 2 8 4s1 2 2 2Z" />
          <path {...shared} d="M16 4.02C19.33 4.2 21 5.43 21 10v6c0 4-1 6-6 6H9c-5 0-6-2-6-6v-6c0-4.56 1.67-5.8 5-5.98" />
        </>
      );
    case "close":
      return <path {...shared} d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10ZM9.17 14.83l5.66-5.66M14.83 14.83 9.17 9.17" />;
    case "home":
      return (
        <>
          <path {...shared} d="M10.07 2.82 3.14 8.37c-.78.62-1.28 1.93-1.11 2.91l1.33 7.96c.24 1.42 1.6 2.57 3.04 2.57h11.2c1.43 0 2.8-1.16 3.04-2.57l1.33-7.96c.16-.98-.34-2.29-1.11-2.91l-6.93-5.54c-1.07-.86-2.8-.86-3.86-.01Z" />
          <path {...shared} d="M12 15.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
        </>
      );
    case "map":
      return (
        <>
          <path {...shared} d="M12 13.43a3.12 3.12 0 1 0 0-6.24 3.12 3.12 0 0 0 0 6.24Z" />
          <path {...shared} d="M3.62 8.49c1.97-8.66 14.8-8.65 16.76.01 1.15 5.08-2.01 9.38-4.78 12.04a5.19 5.19 0 0 1-7.21 0C5.63 17.88 2.47 13.57 3.62 8.49Z" />
        </>
      );
    case "logout":
      return <path {...shared} d="m17.44 14.62 2.56-2.56-2.56-2.56M9.76 12.06h10.17M11.76 20c-4.42 0-8-3-8-8s3.58-8 8-8" />;
    case "chat":
      return (
        <>
          <path {...shared} d="M17.98 10.79v4c0 .26-.01.51-.04.75-.23 2.7-1.82 4.04-4.75 4.04h-.4c-.25 0-.49.12-.64.32l-1.2 1.6c-.53.71-1.39.71-1.92 0l-1.2-1.6a.92.92 0 0 0-.64-.32h-.4C3.6 19.58 2 18.79 2 14.79v-4c0-2.93 1.35-4.52 4.04-4.75.24-.03.49-.04.75-.04h6.4c3.19 0 4.79 1.6 4.79 4.79Z" />
          <path {...shared} d="M21.98 6.79v4c0 2.94-1.35 4.52-4.04 4.75.03-.24.04-.49.04-.75v-4C17.98 7.6 16.38 6 13.19 6h-6.4c-.26 0-.51.01-.75.04C6.27 3.35 7.86 2 10.79 2h6.4c3.19 0 4.79 1.6 4.79 4.79Z" />
          <path {...shared} d="M13.5 13.25h.01M10 13.25h.01M6.5 13.25h.01" strokeWidth={2} />
        </>
      );
    case "notification":
      return (
        <>
          <path {...shared} d="M12 6.44v3.33M12.02 2a6.66 6.66 0 0 0-6.66 6.66v2.1c0 .68-.28 1.7-.63 2.28l-1.27 2.12c-.78 1.31-.24 2.77 1.2 3.25a23.34 23.34 0 0 0 14.73 0 2.22 2.22 0 0 0 1.2-3.25l-1.27-2.12c-.35-.58-.63-1.61-.63-2.28v-2.1A6.68 6.68 0 0 0 12.02 2Z" />
          <path {...shared} d="M15.33 18.82A3.34 3.34 0 0 1 12 22.15a3.3 3.3 0 0 1-2.35-.98 3.3 3.3 0 0 1-.98-2.35" />
        </>
      );
    case "users":
      return <path {...shared} d="M18 7.16h-.19a2.58 2.58 0 1 1 .19 0ZM16.97 14.44c1.37.23 2.88-.01 3.94-.72 1.41-.94 1.41-2.48 0-3.42-1.07-.71-2.6-.95-3.97-.71M5.97 7.16h.19a2.58 2.58 0 1 0-.19 0ZM7 14.44c-1.37.23-2.88-.01-3.94-.72-1.41-.94-1.41-2.48 0-3.42 1.07-.71 2.6-.95 3.97-.71M12 14.63h-.19a2.58 2.58 0 1 1 .19 0ZM9.09 17.78c-1.41.94-1.41 2.48 0 3.42 1.6 1.07 4.22 1.07 5.82 0 1.41-.94 1.41-2.48 0-3.42-1.59-1.06-4.22-1.06-5.82 0Z" />;
    case "profile":
      return <path {...shared} d="M12.16 10.87h-.33a4.42 4.42 0 1 1 .33 0ZM7.16 14.56c-2.42 1.62-2.42 4.26 0 5.87 2.75 1.84 7.26 1.84 10.01 0 2.42-1.62 2.42-4.26 0-5.87-2.74-1.83-7.25-1.83-10.01 0Z" />;
    case "settings":
      return (
        <>
          <path {...shared} d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path {...shared} d="M2 12.88v-1.76c0-1.04.85-1.9 1.9-1.9 1.81 0 2.55-1.28 1.64-2.85-.52-.9-.21-2.07.7-2.59l1.73-.99c.79-.47 1.81-.19 2.28.6l.11.19c.9 1.57 2.38 1.57 3.29 0l.11-.19c.47-.79 1.49-1.07 2.28-.6l1.73.99c.91.52 1.22 1.69.7 2.59-.91 1.57-.17 2.85 1.64 2.85 1.04 0 1.9.85 1.9 1.9v1.76c0 1.04-.85 1.9-1.9 1.9-1.81 0-2.55 1.28-1.64 2.85.52.91.21 2.07-.7 2.59l-1.73.99c-.79.47-1.81.19-2.28-.6l-.11-.19c-.9-1.57-2.38-1.57-3.29 0l-.11.19c-.47.79-1.49 1.07-2.28.6l-1.73-.99a1.9 1.9 0 0 1-.7-2.59c.91-1.57.17-2.85-1.64-2.85-1.05 0-1.9-.86-1.9-1.9Z" />
        </>
      );
  }
}

function createLucideCompatIcon(name: AppIconName, displayName: string): LucideIcon {
  const CompatIcon = forwardRef<
    SVGSVGElement,
    Omit<LucideProps, "ref"> & { "data-active"?: boolean | "true" | "false" }
  >(function CompatIcon({ size = 24, "data-active": dataActive, ...svgProps }, ref) {
    const active = dataActive === true || dataActive === "true";
    return <AppIcon {...svgProps} ref={ref} active={active} name={name} size={size} />;
  });

  CompatIcon.displayName = displayName;
  return CompatIcon as LucideIcon;
}

export const HomeNavIcon = createLucideCompatIcon("home", "HomeNavIcon");
export const InterviewsNavIcon = createLucideCompatIcon("interviews", "InterviewsNavIcon");
export const MapNavIcon = createLucideCompatIcon("map", "MapNavIcon");
export const ChatNavIcon = createLucideCompatIcon("chat", "ChatNavIcon");
export const ProfileNavIcon = createLucideCompatIcon("profile", "ProfileNavIcon");
