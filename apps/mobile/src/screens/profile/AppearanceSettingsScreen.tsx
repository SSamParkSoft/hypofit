import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { AppScreen } from "@/shared/ui/AppScreen";

type AppearanceOption = {
  description: string;
  disabled?: boolean;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: "light" | "dark" | "system";
};

const appearanceOptions: AppearanceOption[] = [
  {
    description: "현재 앱 화면에 적용 중이에요.",
    icon: "sun",
    label: "라이트 모드",
    value: "light",
  },
  {
    description: "전체 색상 QA 후 제공할 예정이에요.",
    disabled: true,
    icon: "moon",
    label: "다크 모드",
    value: "dark",
  },
  {
    description: "기기 설정에 맞춰 자동으로 바뀌는 옵션이에요.",
    disabled: true,
    icon: "smartphone",
    label: "기기 설정 사용",
    value: "system",
  },
];

export function AppearanceSettingsScreen() {
  const selectedValue: AppearanceOption["value"] = "light";

  return (
    <AppScreen backTo="/(tabs)/profile" title="보기 설정">
      <View className="gap-3 pt-2">
        <Text className="px-1 text-xs font-black text-[#8A9387]">화면 모드</Text>
        <View>
          {appearanceOptions.map((option) => (
            <AppearanceOptionRow
              key={option.value}
              option={option}
              selected={option.value === selectedValue}
            />
          ))}
        </View>
      </View>
    </AppScreen>
  );
}

function AppearanceOptionRow({
  option,
  selected,
}: {
  option: AppearanceOption;
  selected: boolean;
}) {
  const muted = option.disabled;
  const iconColor = selected ? "#176B5D" : muted ? "#A0A99E" : "#1D2522";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: muted, selected }}
      className="min-h-[62px] flex-row items-center gap-3 py-2.5"
      disabled={muted}
    >
      <View
        className={`size-9 items-center justify-center rounded-full ${
          selected ? "bg-hypo-brandSoft" : "bg-hypo-surface"
        }`}
      >
        <Feather color={iconColor} name={option.icon} size={18} strokeWidth={2.4} />
      </View>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <Text className={`text-[15px] font-black ${muted ? "text-[#A0A99E]" : "text-hypo-text"}`}>
            {option.label}
          </Text>
          {option.disabled ? (
            <View className="rounded-full bg-hypo-surface px-2 py-0.5">
              <Text className="text-[10px] font-black text-hypo-muted">준비 중</Text>
            </View>
          ) : null}
        </View>
        <Text className={`mt-1 text-xs font-bold leading-[18px] ${muted ? "text-[#A0A99E]" : "text-hypo-muted"}`}>
          {option.description}
        </Text>
      </View>
      {selected ? <Feather color="#176B5D" name="check" size={18} strokeWidth={2.8} /> : null}
    </Pressable>
  );
}
