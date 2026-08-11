import { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import type { Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/features/auth/AuthProvider";
import { useChatRoom } from "@/features/chat/useChat";
import { useCreateSession } from "@/features/sessions/useSessionMutations";
import { StateMessage } from "@/screens/home/HomeScreen";
import { getSafeReturnTo, goBackOrReplaceFallback } from "@/shared/navigation/backNavigation";
import { PrimaryButton } from "@/shared/ui/PrimaryButton";

type MeetingType = "offline" | "online";

interface FormValues {
  date: string;
  time: string;
  meetingType: MeetingType;
  meetingUrl: string;
  place: string;
}

export function ScheduleSessionScreen() {
  const params = useLocalSearchParams<{
    applicationId?: string | string[];
    returnTo?: string | string[];
    roomId?: string | string[];
  }>();
  const roomId = readParam(params.roomId);
  const applicationId = readParam(params.applicationId);
  const returnTo = getSafeReturnTo(params.returnTo) ?? (roomId ? (`/(tabs)/chat/${roomId}` as Href) : "/(tabs)/chat");
  const { accessToken } = useAuth();
  const { data: room, isError, isLoading } = useChatRoom(roomId, accessToken);
  const createSession = useCreateSession(accessToken);
  const [values, setValues] = useState<FormValues>(() => getInitialValues());
  const [validationError, setValidationError] = useState<string | null>(null);
  const resolvedApplicationId = applicationId ?? room?.application_id ?? null;

  const interviewTitle = room?.interview_post?.title ?? "인터뷰";
  const isSubmitting = createSession.isPending;
  const submitLabel = isSubmitting ? "확정하는 중" : "일정 확정";

  const meetingDetailLabel = useMemo(
    () => (values.meetingType === "online" ? "화상 링크" : "장소"),
    [values.meetingType],
  );

  const updateValue = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setValidationError(null);
  };

  const handleSubmit = () => {
    if (!resolvedApplicationId || !roomId) {
      setValidationError("채팅방 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }

    const scheduledAt = buildScheduledAt(values.date, values.time);
    if (!scheduledAt) {
      setValidationError("날짜와 시간을 다시 확인해 주세요.");
      return;
    }

    if (values.meetingType === "online" && !values.meetingUrl.trim()) {
      setValidationError("화상 인터뷰 링크를 입력해 주세요.");
      return;
    }

    if (values.meetingType === "offline" && !values.place.trim()) {
      setValidationError("만날 장소를 입력해 주세요.");
      return;
    }

    createSession.mutate(
      {
        roomId,
        input: {
          application_id: resolvedApplicationId,
          scheduled_at: scheduledAt,
          meeting_type: values.meetingType,
          meeting_url: values.meetingType === "online" ? values.meetingUrl.trim() : null,
          place: values.meetingType === "offline" ? values.place.trim() : null,
        },
      },
      {
        onError: () => {
          Alert.alert("일정을 확정하지 못했어요", "이미 일정이 있거나 상태가 바뀌었을 수 있어요.");
        },
        onSuccess: () => {
          router.replace({ pathname: "/(tabs)/chat/[roomId]", params: { roomId, returnTo: "/(tabs)/chat" } });
        },
      },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-hypo-bg">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <View className="flex-1 px-4 pt-3">
          <Header title="일정 확정" backTo={returnTo} />

          {isLoading ? <StateMessage title="채팅방을 불러오는 중입니다." loading /> : null}
          {isError ? (
            <StateMessage title="채팅방을 불러오지 못했어요." description="네트워크 상태를 확인한 뒤 다시 시도해 주세요." />
          ) : null}

          {!isLoading && !isError ? (
            <ScrollView
              contentContainerClassName="gap-4 pb-8 pt-3"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View className="gap-1 px-1">
                <Text className="text-[13px] font-bold text-hypo-brand">선정된 인터뷰</Text>
                <Text className="text-[20px] font-black leading-7 text-hypo-text">{interviewTitle}</Text>
                <Text className="text-[13px] font-bold leading-5 text-hypo-muted">
                  확정한 일정은 상대에게 바로 안내돼요.
                </Text>
              </View>

              <View className="gap-3 rounded-[16px] border border-hypo-border bg-hypo-surface p-3">
                <View className="flex-row gap-2">
                  <Field
                    label="날짜"
                    placeholder="YYYY-MM-DD"
                    value={values.date}
                    onChangeText={(value) => updateValue("date", value)}
                  />
                  <Field
                    label="시간"
                    placeholder="HH:mm"
                    value={values.time}
                    onChangeText={(value) => updateValue("time", value)}
                  />
                </View>

                <View className="gap-2">
                  <Text className="text-[13px] font-bold text-hypo-text">진행 방식</Text>
                  <View className="flex-row gap-2">
                    <OptionChip
                      isSelected={values.meetingType === "online"}
                      label="화상"
                      onPress={() => updateValue("meetingType", "online")}
                    />
                    <OptionChip
                      isSelected={values.meetingType === "offline"}
                      label="대면"
                      onPress={() => updateValue("meetingType", "offline")}
                    />
                  </View>
                </View>

                <Field
                  label={meetingDetailLabel}
                  placeholder={values.meetingType === "online" ? "예: Zoom 또는 Google Meet 링크" : "예: 안산 중앙역 근처 카페"}
                  value={values.meetingType === "online" ? values.meetingUrl : values.place}
                  onChangeText={(value) =>
                    updateValue(values.meetingType === "online" ? "meetingUrl" : "place", value)
                  }
                />
              </View>

              {validationError ? (
                <Text className="px-1 text-[13px] font-bold leading-5 text-hypo-danger">{validationError}</Text>
              ) : null}

              <PrimaryButton disabled={isSubmitting} onPress={handleSubmit}>
                {submitLabel}
              </PrimaryButton>
            </ScrollView>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header({ backTo, title }: { backTo: Href; title: string }) {
  return (
    <View className="min-h-11 flex-row items-center gap-2">
      <Pressable
        accessibilityLabel="뒤로가기"
        accessibilityRole="button"
        hitSlop={12}
        className="h-10 w-10 items-center justify-center"
        onPress={() => goBackOrReplaceFallback(backTo)}
      >
        <Text className="text-[32px] font-semibold leading-10 text-hypo-text">‹</Text>
      </Pressable>
      <Text className="text-lg font-black leading-10 text-hypo-text">{title}</Text>
    </View>
  );
}

function Field({
  label,
  onChangeText,
  placeholder,
  value,
}: {
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View className="min-w-0 flex-1 gap-2">
      <Text className="text-[13px] font-bold text-hypo-text">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        className="h-[50px] rounded-[14px] border border-hypo-border bg-hypo-bg px-3 text-[15px] text-hypo-text"
        placeholder={placeholder}
        placeholderTextColor="#A3ABA0"
        style={{
          fontFamily: "HypofitSansMedium",
          includeFontPadding: false,
          paddingBottom: 0,
          paddingTop: 0,
          textAlignVertical: "center",
        }}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

function OptionChip({
  isSelected,
  label,
  onPress,
}: {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityState={{ selected: isSelected }}
      accessibilityRole="button"
      className={`min-h-11 flex-1 items-center justify-center rounded-[12px] border px-3 ${
        isSelected ? "border-hypo-brand bg-hypo-brandSoft" : "border-hypo-border bg-hypo-bg"
      }`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
    >
      <Text className={`text-[13px] font-black ${isSelected ? "text-hypo-brand" : "text-hypo-text"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function getInitialValues(): FormValues {
  const next = new Date(Date.now() + 24 * 60 * 60 * 1000);
  next.setMinutes(0, 0, 0);
  if (next.getHours() < 10) {
    next.setHours(19);
  }

  return {
    date: [
      next.getFullYear(),
      String(next.getMonth() + 1).padStart(2, "0"),
      String(next.getDate()).padStart(2, "0"),
    ].join("-"),
    time: `${String(next.getHours()).padStart(2, "0")}:00`,
    meetingType: "online",
    meetingUrl: "",
    place: "",
  };
}

function buildScheduledAt(dateValue: string, timeValue: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || !/^\d{2}:\d{2}$/.test(timeValue)) {
    return null;
  }

  const date = new Date(`${dateValue}T${timeValue}:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function readParam(value?: string | string[]) {
  const next = Array.isArray(value) ? value[0] : value;
  return typeof next === "string" && next.trim() ? next.trim() : null;
}
