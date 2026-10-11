import { useLocalSearchParams } from "expo-router";
import { NoticeContent } from "@/features/notices/NoticeContent";
import { getSafeReturnTo, goBackOrReplaceReturnTo } from "@/shared/navigation/backNavigation";
import { AppScreen } from "@/shared/ui/AppScreen";
import { formatNoticeBody } from "./noticePresentation";

export function NoticeScreen() {
  const params = useLocalSearchParams<{ returnTo?: string | string[]; noticeId?: string | string[] }>();
  const explicitBackTo = getSafeReturnTo(params.returnTo);
  const noticeId = Array.isArray(params.noticeId) ? params.noticeId[0] : params.noticeId;
  return <AppScreen backTo={explicitBackTo ?? "/(tabs)/profile"} title="공지사항" glassHeaderControls onBack={() => goBackOrReplaceReturnTo(explicitBackTo, "/(tabs)/profile")}>
    <NoticeContent noticeId={noticeId} formatBody={formatNoticeBody} />
  </AppScreen>;
}
