import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

interface ListSectionProps {
  chrome?: "card" | "plain";
  children: ReactNode;
  className?: string;
  surface?: "surface" | "background";
}

interface ListRowProps {
  appearance?: "default" | "flat";
  accessibilityHint?: string;
  accessibilityLabel?: string;
  children: ReactNode;
  className?: string;
  isSelected?: boolean;
  isViewed?: boolean;
  onPress?: () => void;
  size?: "default" | "comfortable";
}

interface SelectionPanelProps {
  children: ReactNode;
  className?: string;
}

export function ListSection({ children, chrome = "card", className = "", surface = "surface" }: ListSectionProps) {
  const chromeClassName = chrome === "plain" ? "" : "overflow-hidden rounded-[16px]";
  const surfaceClassName = surface === "background" ? "bg-hypo-bg" : "bg-hypo-surface";

  return <View className={`${chromeClassName} ${surfaceClassName} ${className}`.trim()}>{children}</View>;
}

export function ListRow({
  appearance = "default",
  accessibilityHint,
  accessibilityLabel,
  children,
  className = "",
  isSelected,
  isViewed,
  onPress,
  size = "default",
}: ListRowProps) {
  const rowClassName = `${getListRowClassName({ appearance, isSelected, isViewed, size })} ${className}`.trim();

  if (!onPress) {
    return <View className={rowClassName}>{children}</View>;
  }

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={isSelected ? { selected: true } : undefined}
      className={rowClassName}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
    >
      {children}
    </Pressable>
  );
}

export function SelectionPanel({ children, className = "" }: SelectionPanelProps) {
  return <View className={`rounded-[12px] border border-hypo-border bg-hypo-surfaceMuted p-3 ${className}`}>{children}</View>;
}

function getListRowClassName({
  appearance,
  isSelected,
  isViewed,
  size,
}: {
  appearance: "default" | "flat";
  isSelected?: boolean;
  isViewed?: boolean;
  size: "default" | "comfortable";
}) {
  const spacingClassName = size === "comfortable" ? "px-3.5 py-[18px]" : "px-3.5 py-3";

  if (appearance === "flat") {
    if (isSelected) {
      return `bg-transparent ${spacingClassName}`;
    }

    return `border-b border-hypo-border bg-transparent ${spacingClassName}`;
  }

  if (isSelected) {
    return `rounded-[14px] bg-hypo-brandSoft ${spacingClassName}`;
  }

  if (isViewed) {
    return `border-b border-[#E5EAE3] bg-[#F8F8F4] ${spacingClassName}`;
  }

  return `border-b border-hypo-border bg-transparent ${spacingClassName}`;
}
