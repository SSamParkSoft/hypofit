import { Pressable, Text } from "react-native";
import { FunctionalGlassBackground } from "@/shared/ui/FunctionalGlassBackground";

export interface GlassActionButtonProps {
  accessibilityLabel?: string;
  busy?: boolean;
  children: string;
  className?: string;
  disabled?: boolean;
  onPress: () => void;
  size?: "compact" | "regular";
  tone?: "primary" | "secondary" | "danger";
}

const toneClasses = {
  primary: { border: "border-hypo-brand/25", text: "text-hypo-brandStrong" },
  secondary: { border: "border-hypo-border", text: "text-hypo-textSecondary" },
  danger: { border: "border-hypo-danger/25", text: "text-hypo-danger" },
} as const;

export function GlassActionButtonFallback({
  accessibilityLabel,
  busy = false,
  children,
  className = "",
  disabled = false,
  onPress,
  size = "regular",
  tone = "primary",
}: GlassActionButtonProps) {
  const toneClassName = toneClasses[tone];
  const blocked = disabled || busy;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: blocked }}
      className={`items-center justify-center overflow-hidden rounded-[14px] border px-4 ${size === "compact" ? "min-h-11" : "min-h-[52px]"} ${toneClassName.border} ${className}`.trim()}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => ({ borderCurve: "continuous", opacity: blocked ? 0.45 : pressed ? 0.72 : 1 })}
    >
      <FunctionalGlassBackground radius={14} softBrandTint={tone === "primary"} />
      <Text className={`text-[15px] font-semibold ${toneClassName.text}`}>{children}</Text>
    </Pressable>
  );
}
