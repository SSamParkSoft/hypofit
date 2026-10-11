import { ActivityIndicator, Text, View } from "react-native";
import { colors } from "@/shared/theme/tokens";

export function StateMessage({
  description,
  loading,
  title,
}: {
  description?: string;
  loading?: boolean;
  title: string;
}) {
  return (
    <View className="min-h-40 items-center justify-center gap-2 rounded-[14px] bg-hypo-bg p-4">
      {loading ? <ActivityIndicator color={colors.brand} /> : null}
      <Text className="text-center text-[15px] font-black text-hypo-text" style={{ fontFamily: "HypofitSansBold" }}>{title}</Text>
      {description ? <Text className="text-center text-[13px] font-bold leading-5 text-hypo-muted">{description}</Text> : null}
    </View>
  );
}
