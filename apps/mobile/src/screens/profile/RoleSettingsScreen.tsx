import { useEffect, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import type { UserRole } from "@hypofit/contracts";
import { useAuth } from "@/features/auth/AuthProvider";
import { AppScreen } from "@/shared/ui/AppScreen";

type RoleOption = {
  description: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: UserRole;
};

const roleOptions: RoleOption[] = [
  {
    description: "고객 인터뷰를 모집하고 신청자를 선정해요.",
    icon: "briefcase",
    label: "창업자",
    value: "founder",
  },
  {
    description: "내 경험에 맞는 인터뷰에 신청해요.",
    icon: "user",
    label: "인터뷰어",
    value: "respondent",
  },
  {
    description: "창업자와 인터뷰어 역할을 모두 사용할 수 있어요.",
    icon: "users",
    label: "창업자 · 인터뷰어",
    value: "both",
  },
];

export function RoleSettingsScreen() {
  const { appUser, errorMessage, isSyncing, updateCurrentUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>(appUser?.role ?? "respondent");
  const [message, setMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedRole(appUser?.role ?? "respondent");
  }, [appUser?.role]);

  const hasChanged = Boolean(appUser && selectedRole !== appUser.role);

  const handleSave = async () => {
    if (!appUser || !hasChanged) {
      return;
    }

    setMessage(null);
    setLocalError(null);

    try {
      await updateCurrentUser({
        name: appUser.name,
        bio: appUser.bio,
        phone: appUser.phone,
        role: selectedRole,
      });
      setMessage("역할이 저장됐어요.");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "역할을 저장하지 못했어요.");
    }
  };

  return (
    <AppScreen backTo="/(tabs)/profile" title="역할 설정">
      <View className="gap-3 pt-2">
        <Text className="px-1 text-xs font-black text-[#8A9387]">사용할 역할</Text>
        <View>
          {roleOptions.map((option) => (
            <RoleOptionRow
              key={option.value}
              option={option}
              selected={option.value === selectedRole}
              onPress={() => {
                setSelectedRole(option.value);
                setMessage(null);
                setLocalError(null);
              }}
            />
          ))}
        </View>
      </View>

      {message || localError || errorMessage ? (
        <Text
          className={`px-1 text-xs font-bold leading-[19px] ${
            localError || errorMessage ? "text-hypo-danger" : "text-hypo-brand"
          }`}
        >
          {localError ?? errorMessage ?? message}
        </Text>
      ) : null}

      <View className="flex-row justify-end px-1">
        <Pressable
          accessibilityRole="button"
          disabled={!hasChanged || isSyncing}
          className={`min-h-10 min-w-[84px] items-center justify-center rounded-full px-4 ${
            hasChanged && !isSyncing ? "bg-hypo-brand" : "bg-hypo-brandSoft"
          }`}
          onPress={() => void handleSave()}
        >
          <Text className={`text-[13px] font-black ${hasChanged && !isSyncing ? "text-white" : "text-hypo-brand"}`}>
            {isSyncing ? "저장 중" : "저장"}
          </Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

function RoleOptionRow({
  onPress,
  option,
  selected,
}: {
  onPress: () => void;
  option: RoleOption;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className="min-h-[66px] flex-row items-center gap-3 py-2.5"
      onPress={onPress}
    >
      <View className={`size-9 items-center justify-center rounded-full ${selected ? "bg-hypo-brandSoft" : "bg-hypo-surface"}`}>
        <Feather color={selected ? "#176B5D" : "#1D2522"} name={option.icon} size={18} strokeWidth={2.4} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-black text-hypo-text">{option.label}</Text>
        <Text className="mt-1 text-xs font-bold leading-[18px] text-hypo-muted">{option.description}</Text>
      </View>
      {selected ? <Feather color="#176B5D" name="check" size={18} strokeWidth={2.8} /> : null}
    </Pressable>
  );
}
