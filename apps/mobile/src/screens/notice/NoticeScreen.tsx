import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { getSafeReturnTo, goBackOrReplaceReturnTo } from "@/shared/navigation/backNavigation";
import { AppScreen } from "@/shared/ui/AppScreen";
import { apiGet } from "@/shared/api/client";
import { mobileEnv } from "@/shared/api/env";

interface Notice { id: string; title: string; body: string; published_at: string | null; }

export function NoticeScreen() {
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const explicitBackTo = getSafeReturnTo(params.returnTo);
  const backTo = explicitBackTo ?? "/(tabs)/profile";
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [loadErrorCode, setLoadErrorCode] = useState<string | null>(null);

  const loadNotices = () => {
    let mounted = true;
    setIsLoading(true);
    setHasLoadError(false);
    setLoadErrorCode(null);
    apiGet<Notice[]>("/api/v1/notices")
      .then((value) => { if (mounted) setNotices(value); })
      .catch((error: unknown) => {
        if (!mounted) return;
        setHasLoadError(true);
        setLoadErrorCode(
          error && typeof error === "object" && "code" in error && typeof error.code === "string"
            ? error.code
            : error instanceof Error
              ? error.name
              : "unknown_error",
        );
      })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  };

  useEffect(() => {
    return loadNotices();
  }, []);

  return (
    <AppScreen
      backTo={backTo}
      title="공지사항"
      onBack={() => goBackOrReplaceReturnTo(explicitBackTo, "/(tabs)/profile")}
    >
      <View className="border-t border-hypo-border">
        {notices.map((notice) => (
          <View key={notice.id} className="border-b border-hypo-border py-4">
            <Text className="text-[11px] font-black text-hypo-muted">{formatDate(notice.published_at)}</Text>
            <Text className="mt-1 text-[15px] font-black leading-[22px] text-hypo-text">{notice.title}</Text>
            <Text className="mt-1.5 text-[13px] font-bold leading-5 text-hypo-muted">{notice.body}</Text>
          </View>
        ))}
        {!isLoading && hasLoadError ? (
          <View className="items-center py-10">
            <Text className="text-center text-[14px] font-bold text-hypo-text">공지사항을 불러오지 못했어요.</Text>
            <Text className="mt-1 text-center text-[13px] font-medium text-hypo-muted">네트워크 상태를 확인한 뒤 다시 시도해 주세요.</Text>
            {__DEV__ && loadErrorCode ? (
              <Text className="mt-2 text-center text-[12px] font-medium text-hypo-muted">
                개발 오류: {loadErrorCode}{"\n"}API: {mobileEnv.apiBaseUrl}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="공지사항 다시 불러오기"
              className="mt-4 min-h-11 items-center justify-center rounded-xl border border-hypo-border px-4"
              onPress={loadNotices}
            >
              <Text className="text-[14px] font-bold text-hypo-brand">다시 시도</Text>
            </Pressable>
          </View>
        ) : null}
        {!isLoading && !hasLoadError && notices.length === 0 ? (
          <View className="py-10"><Text className="text-center text-[14px] font-bold text-hypo-muted">새로운 공지사항이 없어요.</Text></View>
        ) : null}
      </View>
    </AppScreen>
  );
}

function formatDate(value: string | null) {
  if (!value) return "공지";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "공지";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
