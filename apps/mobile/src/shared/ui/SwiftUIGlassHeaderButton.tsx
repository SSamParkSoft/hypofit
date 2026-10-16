import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { colors } from "@/shared/theme/tokens";

type Props = {
  glassAvailable: boolean;
  label: string;
  systemImage: "folder" | "plus" | "list.bullet";
  accessibilityLabel?: string;
  onPress: () => void;
  primary?: boolean;
};

export function SwiftUIGlassHeaderButton({ label, systemImage, onPress, primary = false, accessibilityLabel }: Props) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? (primary ? "공고 만들기" : "내 활동 보기")}
      accessibilityRole="button"
      hitSlop={12}
      className="shrink-0"
      onPress={onPress}
    >
      {({ pressed }) => (
        <View
          className={`${systemImage === "list.bullet" ? "h-12 px-4" : "h-11 px-2.5"} flex-row items-center justify-center gap-1 rounded-full border ${primary ? "border-hypo-brand bg-hypo-brand" : "border-hypo-border/80 bg-hypo-surface"}`}
          style={pressed ? { opacity: 0.88 } : undefined}
        >
          <Feather color={primary ? colors.surface : colors.textMuted} name={systemImage === "list.bullet" ? "list" : systemImage} size={14} />
          <Text numberOfLines={1} className={`text-[13px] font-semibold ${primary ? "text-white" : "text-hypo-muted"}`}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
