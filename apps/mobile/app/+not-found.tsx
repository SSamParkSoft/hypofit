import { ScreenPlaceholder } from "@/shared/ui/ScreenPlaceholder";

export default function NotFoundScreen() {
  return (
    <ScreenPlaceholder
      title="화면을 찾을 수 없어요"
      description="주소가 바뀌었거나 아직 모바일 앱으로 옮기지 않은 화면입니다."
    />
  );
}
