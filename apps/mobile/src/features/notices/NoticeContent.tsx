import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { apiRequest } from "@/shared/api/client";
import { GlassActionButton } from "@/shared/ui/GlassActionButton";

interface Notice { id: string; type: string; title: string; body: string; published_at: string | null; }

export function NoticeContent({ noticeId, formatBody = (body) => body }: { noticeId?: string; formatBody?: (body: string, type: string) => string }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true); setHasLoadError(false); setNotices([]);
    const path = noticeId ? `/api/v1/notices/${encodeURIComponent(noticeId)}` : "/api/v1/notices";
    apiRequest<Notice | Notice[]>(path, { signal: controller.signal })
      .then((value) => { if (!controller.signal.aborted) setNotices(Array.isArray(value) ? value : [value]); })
      .catch(() => { if (!controller.signal.aborted) setHasLoadError(true); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [noticeId, attempt]);
  return <View className="gap-3">
    {isLoading ? <Text accessibilityLiveRegion="polite" className="py-4 text-center text-sm text-hypo-textMetadata">공지사항을 불러오는 중이에요.</Text> : null}
    {notices.map((notice) => <View key={notice.id} className="gap-2 rounded-[16px] bg-hypo-surface p-4" style={{ borderCurve: "continuous" }}>
      <Text className="text-[12px] font-medium leading-[18px] text-hypo-textMetadata">{formatDate(notice.published_at)}</Text>
      <Text accessibilityRole="header" className="text-[16px] font-semibold leading-[24px] text-hypo-text">{notice.title}</Text>
      <Text className="text-[14px] font-normal leading-[22px] text-hypo-textSecondary">{formatBody(notice.body, notice.type)}</Text>
    </View>)}
    {!isLoading && hasLoadError ? <View className="items-center py-10">
      <Text className="text-center text-[14px] font-bold text-hypo-text">공지사항을 불러오지 못했어요.</Text>
      <Text className="mt-1 text-center text-[13px] font-medium text-hypo-muted">네트워크 상태를 확인한 뒤 다시 시도해 주세요.</Text>
      <GlassActionButton accessibilityLabel="공지사항 다시 불러오기" className="mt-4" size="compact" onPress={() => setAttempt((value) => value + 1)}>다시 시도</GlassActionButton>
    </View> : null}
    {!isLoading && !hasLoadError && !notices.length ? <View className="py-10"><Text className="text-center text-[14px] font-bold text-hypo-muted">새로운 공지사항이 없어요.</Text></View> : null}
  </View>;
}

function formatDate(value: string | null) {
  if (!value) return "공지";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "공지";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
