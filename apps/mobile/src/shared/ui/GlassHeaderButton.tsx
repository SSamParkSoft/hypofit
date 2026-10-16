import { Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { FunctionalGlassBackground } from "@/shared/ui/FunctionalGlassBackground";

interface GlassHeaderButtonProps {
  accessibilityLabel: string;
  icon: "chevron-left" | "plus";
  onPress: () => void;
}

export function GlassHeaderButton({
  accessibilityLabel,
  icon,
  onPress,
}: GlassHeaderButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      className="h-11 w-11 items-center justify-center overflow-hidden rounded-full"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
    >
      <FunctionalGlassBackground radius={22} />
      <Feather color="#1D2522" name={icon} size={icon === "plus" ? 21 : 23} />
    </Pressable>
  );
}
