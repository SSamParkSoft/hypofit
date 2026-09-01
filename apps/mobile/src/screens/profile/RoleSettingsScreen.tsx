import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { AppScreen } from "@/shared/ui/AppScreen";

export function RoleSettingsScreen() {
  return (
    <AppScreen backTo="/(tabs)/profile" title="계정 사용 안내">
      <View className="gap-4 pt-2">
        <View className="rounded-[18px] border border-hypo-border bg-hypo-surface px-4 py-4">
          <Text className="text-[15px] font-black text-hypo-text">이제 따로 고를 설정 없이 바로 시작할 수 있어요.</Text>
          <Text className="mt-1.5 text-xs font-bold leading-[19px] text-hypo-muted">
            모든 로그인 계정은 모집과 참여를 함께 사용할 수 있어요. 권한은 내가 만든 공고와 내가 참여한 진행 상태를 기준으로 확인해요.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          className="min-h-11 items-center justify-center rounded-full bg-hypo-brand px-4"
          onPress={() => router.replace("/(tabs)/profile")}
        >
          <Text className="text-[13px] font-black text-white">확인했어요</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}
