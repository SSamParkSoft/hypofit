import { Text, View } from "react-native";
import { useApiHealth } from "./useApiHealth";

export function ApiHealthCard() {
  const health = useApiHealth();

  const label = health.isPending
    ? "API 연결 확인 중"
    : health.isError
      ? "API 연결 실패"
      : "API 연결됨";

  const detail = health.isPending
    ? "앱이 백엔드 상태를 확인하고 있어요."
    : health.isError
      ? "EXPO_PUBLIC_API_BASE_URL 또는 서버 상태를 확인해야 해요."
      : `응답: ${health.data.status ?? (health.data.ok ? "ok" : "unknown")}`;

  return (
    <View className="gap-1 rounded-[14px] border border-hypo-border bg-hypo-surface p-4">
      <Text className="text-[15px] font-bold text-hypo-text">{label}</Text>
      <Text className="text-[13px] leading-[19px] text-hypo-muted">{detail}</Text>
    </View>
  );
}
