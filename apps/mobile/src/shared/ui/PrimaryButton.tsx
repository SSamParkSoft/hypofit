import type { ReactNode } from "react";
import { Pressable, Text } from "react-native";

interface PrimaryButtonProps {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  onPress: () => void;
}

export function PrimaryButton({ children, className = "", disabled, variant = "primary", onPress }: PrimaryButtonProps) {
  const buttonClassName =
    variant === "secondary"
      ? "min-h-[52px] items-center justify-center rounded-[12px] border border-hypo-border bg-hypo-surface px-4"
      : "min-h-[52px] items-center justify-center rounded-[12px] bg-hypo-brand px-4";
  const labelClassName =
    variant === "secondary" ? "text-[15px] font-semibold text-hypo-text" : "text-[15px] font-semibold text-white";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`${buttonClassName} ${className}`.trim()}
      style={({ pressed }) => ({
        opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
      })}
    >
      <Text className={labelClassName}>{children}</Text>
    </Pressable>
  );
}
