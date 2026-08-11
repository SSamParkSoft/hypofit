import type { ReactNode } from "react";
import { Pressable, Text } from "react-native";

interface InlineLinkProps {
  children: ReactNode;
  compact?: boolean;
  disabled?: boolean;
  muted?: boolean;
  onPress: () => void;
}

export function InlineLink({ children, compact, disabled, muted, onPress }: InlineLinkProps) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityState={{ disabled }}
      className={`self-center ${compact ? "py-1" : "py-2"}`}
      disabled={disabled}
      onPress={onPress}
    >
      <Text
        className={`${compact ? "text-[13px] leading-5" : "text-sm"} ${
          disabled ? "text-hypo-text-soft" : muted ? "text-hypo-muted" : "font-bold text-hypo-brand"
        }`}
        style={{ fontFamily: muted ? "HypofitSansMedium" : "HypofitSansBold" }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
