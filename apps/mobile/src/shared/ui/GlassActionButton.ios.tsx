import { useEffect, useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import { Button, Host, Text } from "@expo/ui/swift-ui";
import {
  accessibilityLabel as nativeAccessibilityLabel,
  accessibilityValue,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled as nativeDisabled,
  font,
  foregroundStyle,
  frame,
  padding,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { colors } from "@/shared/theme/tokens";
import { GlassActionButtonFallback, type GlassActionButtonProps } from "./GlassActionButtonFallback";

export function GlassActionButton(props: GlassActionButtonProps) {
  const [reduceTransparency, setReduceTransparency] = useState(true);

  useEffect(() => {
    let active = true;
    const subscription = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduceTransparency);
    void AccessibilityInfo.isReduceTransparencyEnabled().then((enabled) => {
      if (active) setReduceTransparency(enabled);
    }).catch(() => {});
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  if (reduceTransparency || !isGlassEffectAPIAvailable() || !isLiquidGlassAvailable()) {
    return <GlassActionButtonFallback {...props} />;
  }

  const { accessibilityLabel, busy = false, children, className = "", disabled = false, onPress, size = "regular", tone = "primary" } = props;
  const blocked = disabled || busy;
  const primary = tone === "primary";
  const labelColor = primary ? colors.brandStrong : tone === "danger" ? colors.danger : colors.textSecondary;

  return (
    <View className={className}>
      {/* A native Button owns both the glass material and its touch response. */}
      <Host
        colorScheme="light"
        matchContents={size === "compact" ? true : { vertical: true }}
        style={size === "compact" ? undefined : { width: "100%" }}
      >
        <Button
          role={tone === "danger" ? "destructive" : "default"}
          onPress={onPress}
          modifiers={[
            buttonStyle(primary ? "glassProminent" : "glass"),
            buttonBorderShape("roundedRectangle", 14),
            controlSize("regular"),
            frame({ minHeight: size === "compact" ? 44 : 52 }),
            tint(primary ? colors.brandSoft : labelColor),
            nativeDisabled(blocked),
            nativeAccessibilityLabel(accessibilityLabel ?? children),
            accessibilityValue(busy ? "처리 중" : ""),
          ]}
        >
          <Text
            modifiers={[
              font({ family: "SpoqaHanSansNeo-Bold", size: 15, textStyle: "body" }),
              foregroundStyle(labelColor),
              frame({ ...(size === "compact" ? {} : { maxWidth: Infinity }), minHeight: size === "compact" ? 20 : 28 }),
              padding({ vertical: 4, horizontal: 8 }),
            ]}
          >
            {children}
          </Text>
        </Button>
      </Host>
    </View>
  );
}
