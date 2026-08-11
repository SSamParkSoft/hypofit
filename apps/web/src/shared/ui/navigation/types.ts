import type { LucideIcon } from "lucide-react";

export type AppDestination = "home" | "interviews" | "map" | "chat" | "profile";

export type AppShellActiveDestination = AppDestination | null | undefined;

export interface AppShellNavItem {
  href: string;
  icon: LucideIcon;
  id: AppDestination;
  label: string;
  mobileLabel?: string;
}
