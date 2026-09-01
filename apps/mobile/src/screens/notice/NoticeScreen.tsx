import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { getSafeReturnTo, goBackOrReplaceReturnTo } from "@/shared/navigation/backNavigation";
import { AppScreen } from "@/shared/ui/AppScreen";

const notices = [
  {
    date: "2026.05.28",
    title: "Hypofit 베타 테스트를 준비하고 있어요",
    body: "공고 모집, 신청, 채팅 흐름을 중심으로 모바일 앱 사용성을 다듬고 있어요.",
  },
];

export function NoticeScreen() {
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const explicitBackTo = getSafeReturnTo(params.returnTo);
  const backTo = explicitBackTo ?? "/(tabs)/profile";

  return (
    <AppScreen
      backTo={backTo}
      title="공지사항"
      onBack={() => goBackOrReplaceReturnTo(explicitBackTo, "/(tabs)/profile")}
    >
      <View className="border-t border-hypo-border">
        {notices.map((notice) => (
          <View key={notice.title} className="border-b border-hypo-border py-4">
            <Text className="text-[11px] font-black text-hypo-muted">{notice.date}</Text>
            <Text className="mt-1 text-[15px] font-black leading-[22px] text-hypo-text">{notice.title}</Text>
            <Text className="mt-1.5 text-[13px] font-bold leading-5 text-hypo-muted">{notice.body}</Text>
          </View>
        ))}
      </View>
    </AppScreen>
  );
}
