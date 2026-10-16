import { BottomTabBar, type BottomTabBarProps } from "expo-router/tabs";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";
import { motion } from "@/shared/theme/tokens";
import { getBottomTabBarHeight, getBottomTabBarHideDistance } from "./tabBarStyle";

export function ScrollAnimatedTabBar({
  hidden,
  bottomInset,
  ...props
}: BottomTabBarProps & { hidden: boolean; bottomInset: number }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(true);
  const hideDistance = getBottomTabBarHideDistance(bottomInset);

  useEffect(() => {
    let active = true;
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    }).catch(() => {});
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const destination = hidden ? hideDistance : 0;
    if (reduceMotion) {
      translateY.setValue(destination);
      return;
    }
    const animation = Animated.timing(translateY, {
      toValue: destination,
      duration: motion.standard,
      easing: hidden ? Easing.in(Easing.quad) : Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [hidden, hideDistance, reduceMotion, translateY]);

  return (
    <Animated.View
      className="absolute inset-x-0 bottom-0 z-[1]"
      pointerEvents={hidden ? "none" : "box-none"}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
      style={{ height: getBottomTabBarHeight(bottomInset), transform: [{ translateY }] }}
    >
      {/* Keep scroll motion separate from BottomTabBar's keyboard animation. */}
      <BottomTabBar {...props} />
    </Animated.View>
  );
}
