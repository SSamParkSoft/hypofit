import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { colors } from "@/shared/theme/tokens";

export function FunctionalGlassBackground({ radius, softBrandTint = false }: { radius: number; softBrandTint?: boolean }) {
  const [reduceTransparency, setReduceTransparency] = useState(true);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let active = true;
    const subscription = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setReduceTransparency,
    );
    void AccessibilityInfo.isReduceTransparencyEnabled()
      .then((enabled) => {
        if (active) setReduceTransparency(enabled);
      })
      .catch(() => {});
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const useGlass =
    Platform.OS === "ios" &&
    !reduceTransparency &&
    isGlassEffectAPIAvailable() &&
    isLiquidGlassAvailable();
  const useBlur = Platform.OS === "ios" && !reduceTransparency && !useGlass;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      className="absolute inset-0"
      style={{ borderRadius: radius }}
    >
      {useGlass ? (
        <GlassView
          glassEffectStyle="regular"
          tintColor={softBrandTint ? colors.brandSoft : undefined}
          style={{ flex: 1, borderRadius: radius }}
        />
      ) : useBlur ? (
        <View className="flex-1 overflow-hidden" style={{ borderRadius: radius }}>
          <BlurView intensity={70} tint="systemMaterialLight" className="absolute inset-0" />
          {softBrandTint ? <View className="flex-1 bg-hypo-brandSoft/50" /> : null}
        </View>
      ) : (
        <View
          className={`flex-1 border-hypo-border ${softBrandTint ? "bg-hypo-brandSoft" : "bg-hypo-surface"}`}
          style={{
            borderRadius: radius,
            borderWidth: StyleSheet.hairlineWidth,
          }}
        />
      )}
    </View>
  );
}
