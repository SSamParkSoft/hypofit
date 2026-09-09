import { Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMaintenance } from "./MaintenanceProvider";

export function MaintenanceScreen() {
  const { errorMessage, isRefreshing, refresh, status } = useMaintenance();
  const title = status.status === "VERIFYING" ? "정상 동작을 확인하고 있어요" : status.title ?? "서비스 점검 중이에요";
  const message = status.message ?? "안정적인 서비스 제공을 위해 시스템을 점검하고 있어요.";

  return (
    <SafeAreaView className="flex-1 bg-hypo-bg" edges={["top", "bottom"]}>
      <View className="flex-1 justify-between px-6 py-8">
        <View className="items-center pt-20">
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel="Hypofit"
            className="h-16 w-16"
            resizeMode="contain"
            source={require("../../../assets/hypofit-mark.png")}
          />
          <Text accessibilityRole="header" className="mt-7 text-center text-[25px] font-bold leading-[34px] text-hypo-text">
            {title}
          </Text>
          <Text className="mt-3 max-w-[300px] text-center text-[15px] leading-6 text-hypo-text-secondary">
            {message}
          </Text>
          {status.endsAt ? (
            <View className="mt-8 w-full rounded-hypo border border-hypo-border bg-hypo-surface px-5 py-4">
              <Text className="text-[13px] font-medium text-hypo-text-metadata">예상 점검 종료 시간</Text>
              <Text className="mt-1 text-[15px] font-semibold leading-6 text-hypo-text">{formatMaintenanceEnd(status.endsAt)}</Text>
              <Text className="mt-1 text-[13px] leading-5 text-hypo-text-secondary">점검이 일찍 끝나면 바로 이용할 수 있어요.</Text>
            </View>
          ) : null}
        </View>

        <View className="gap-3">
          {errorMessage ? <Text accessibilityLiveRegion="polite" className="text-center text-[13px] leading-5 text-hypo-text-secondary">{errorMessage}</Text> : null}
          <Pressable
            accessibilityLabel="점검 상태 다시 확인"
            accessibilityRole="button"
            disabled={isRefreshing}
            className={`min-h-[52px] items-center justify-center rounded-hypo ${isRefreshing ? "bg-hypo-brandSoft" : "bg-hypo-brand"}`}
            onPress={() => void refresh()}
            style={({ pressed }) => ({ opacity: pressed || isRefreshing ? 0.76 : 1 })}
          >
            <Text className={`text-[15px] font-semibold ${isRefreshing ? "text-hypo-text-secondary" : "text-white"}`}>
              {isRefreshing ? "확인 중" : "다시 확인"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function formatMaintenanceEnd(endsAt: string) {
  const ends = new Date(endsAt);
  if (Number.isNaN(ends.getTime())) {
    return "종료 예정 시간을 확인하고 있어요.";
  }

  const date = new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "long",
  }).format(ends);
  return `${date} 종료 예정`;
}
