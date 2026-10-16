import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { floatingTabBar, getFloatingTabBarMaterial } from "./tabBarStyle";

export function FloatingTabBarBackground() {
  const [reduceTransparency, setReduceTransparency] = useState(true);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let active = true;
    const subscription = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setReduceTransparency,
    );
    void AccessibilityInfo.isReduceTransparencyEnabled().then((enabled) => {
      if (active) setReduceTransparency(enabled);
    }).catch(() => {});
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const material = getFloatingTabBarMaterial({
    platform: Platform.OS,
    reduceTransparency,
    liquidGlassAvailable: Platform.OS === "ios"
      && !reduceTransparency
      && isGlassEffectAPIAvailable()
      && isLiquidGlassAvailable(),
  });

  if (material === "liquidGlass") {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        className="absolute inset-0"
      >
        {/* Native glass owns its edge and shadow; opacity/tint overlays obscure it. */}
        <GlassView
          glassEffectStyle="regular"
          style={{ flex: 1, borderRadius: floatingTabBar.radius }}
        />
      </View>
    );
  }

  const useBlur = material === "blur";

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      className="absolute inset-0 shadow-sm shadow-black/5"
      style={{ borderRadius: floatingTabBar.radius }}
    >
      <View
        className={`flex-1 overflow-hidden ${useBlur ? "border-white/40 bg-white/20" : "border-hypo-border bg-hypo-surface"}`}
        style={{ borderRadius: floatingTabBar.radius, borderWidth: StyleSheet.hairlineWidth }}
      >
        {useBlur ? (
          <BlurView tint="systemMaterialLight" intensity={70} style={{ flex: 1 }} />
        ) : null}
      </View>
    </View>
  );
}
