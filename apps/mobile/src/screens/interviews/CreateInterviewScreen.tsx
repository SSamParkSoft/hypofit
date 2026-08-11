import { useMemo, useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, type Href, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type {
  CreateInterviewPostInput,
  InterviewMode,
  LocationPrecision,
  LocationSource,
} from "@hypofit/contracts";
import { canUseFounderTools, interviewModeLabels } from "@hypofit/contracts";
import { useCreateInterviewPost } from "@/features/interview-posts/useCreateInterviewPost";
import { usePlaceSearch } from "@/features/places/usePlaceSearch";
import { useAuth } from "@/features/auth/AuthProvider";
import type { PlaceSearchResult } from "@/shared/api/places";
import { StateMessage } from "@/screens/home/HomeScreen";
import { goBackOrReplaceFallback, resolveReturnTo } from "@/shared/navigation/backNavigation";

interface FormValues {
  durationMinutes: string;
  interviewMode: InterviewMode;
  location: string;
  locationAddress: string;
  locationDetail: string;
  locationLatitude: number | null;
  locationLongitude: number | null;
  locationPlaceName: string;
  locationPrecision: LocationPrecision;
  locationSource: LocationSource | null;
  recruitCount: string;
  rewardAmount: string;
  scheduleOptions: string;
  serviceSummary: string;
  targetDescription: string;
  title: string;
}

const initialValues: FormValues = {
  durationMinutes: "30",
  interviewMode: "online",
  location: "",
  locationAddress: "",
  locationDetail: "",
  locationLatitude: null,
  locationLongitude: null,
  locationPlaceName: "",
  locationPrecision: "nearby",
  locationSource: null,
  recruitCount: "0",
  rewardAmount: "15000",
  scheduleOptions: "평일 저녁\n주말 오전",
  serviceSummary: "",
  targetDescription: "",
  title: "",
};

export function CreateInterviewScreen() {
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const backTo = resolveReturnTo(params.returnTo, "/(tabs)/interviews");
  const { accessToken, appUser } = useAuth();
  const createInterviewPost = useCreateInterviewPost(accessToken);
  const canCreatePost = canUseFounderTools(appUser?.role);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [placeQuery, setPlaceQuery] = useState("");
  const [submittedPlaceQuery, setSubmittedPlaceQuery] = useState<string | null>(null);
  const [placeSearchError, setPlaceSearchError] = useState<string | null>(null);
  const quickScheduleOptions = useMemo(() => buildQuickScheduleOptions(), []);

  const placeSearch = usePlaceSearch(submittedPlaceQuery ? { query: submittedPlaceQuery, limit: 5 } : null);
  const placeResults = placeSearch.data ?? [];
  const locationPreview = buildLocationPreview(values);

  const requiresNativeLocation = values.interviewMode !== "online";

  if (!accessToken || !canCreatePost) {
    return (
      <SafeAreaView className="flex-1 bg-hypo-bg">
        <View className="flex-1 px-4 pt-3">
          <Header backTo={backTo} />
          <StateMessage
            title="모집글을 만들 수 없는 계정입니다."
            description="창업자 역할을 켜면 인터뷰 모집글을 만들 수 있어요."
          />
        </View>
      </SafeAreaView>
    );
  }

  const updateValue = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleInterviewModeChange = (mode: InterviewMode) => {
    setValidationError(null);
    updateValue("interviewMode", mode);
  };

  const handlePlaceSearch = () => {
    const query = placeQuery.trim();

    if (query.length < 2) {
      setPlaceSearchError("장소 이름을 2자 이상 입력하세요.");
      setSubmittedPlaceQuery(null);
      return;
    }

    setPlaceSearchError(null);
    setSubmittedPlaceQuery(query);
  };

  const handlePlaceSelect = (place: PlaceSearchResult) => {
    const placeName = place.name.trim();
    const locationText = buildLocationText(placeName, values.locationPrecision, values.locationDetail);
    const address = (place.road_address ?? place.address ?? "").trim();

    setValues((current) => ({
      ...current,
      location: locationText,
      locationAddress: address,
      locationLatitude: place.latitude,
      locationLongitude: place.longitude,
      locationPlaceName: placeName,
      locationSource: "kakao_place",
    }));
    setPlaceQuery(placeName);
    setSubmittedPlaceQuery(null);
    setPlaceSearchError(null);
    setValidationError(null);
  };

  const handleLocationPrecisionChange = (precision: LocationPrecision) => {
    setValues((current) => {
      const placeName = current.locationPlaceName.trim();

      return {
        ...current,
        locationPrecision: precision,
        location: placeName ? buildLocationText(placeName, precision, current.locationDetail) : current.location,
      };
    });
    setValidationError(null);
  };

  const handleLocationDetailChange = (detail: string) => {
    setValues((current) => {
      const placeName = current.locationPlaceName.trim();

      return {
        ...current,
        locationDetail: detail,
        location: placeName ? buildLocationText(placeName, current.locationPrecision, detail) : current.location,
      };
    });
  };

  const addScheduleOption = (option: string) => {
    setValues((current) => {
      const existingOptions = current.scheduleOptions
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);

      if (existingOptions.includes(option)) {
        return current;
      }

      return {
        ...current,
        scheduleOptions: [...existingOptions, option].join("\n"),
      };
    });
  };

  const handleSubmit = () => {
    const nextValidationError = validatePostCreation(values);
    if (nextValidationError) {
      setValidationError(nextValidationError);
      return;
    }

    setValidationError(null);
    createInterviewPost.mutate(toCreateInterviewPostInput(values), {
      onSuccess: () =>
        router.replace({
          pathname: "/(tabs)/interviews/my-interviews",
          params: { returnTo: "/(tabs)/interviews" },
        }),
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-hypo-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 px-4 pt-3">
          <Header backTo={backTo} />

          <ScrollView contentContainerClassName="gap-4 pb-8 pt-3" keyboardShouldPersistTaps="handled">
            <FormSection title="무엇을 검증하나요">
              <Field
                label="제목"
                placeholder="예: 1인 가구 식재료 낭비 문제 인터뷰"
                value={values.title}
                onChangeText={(value) => updateValue("title", value)}
              />
              <Field
                multiline
                label="서비스 설명"
                placeholder="검증하려는 서비스와 문제 상황을 짧게 설명하세요."
                value={values.serviceSummary}
                onChangeText={(value) => updateValue("serviceSummary", value)}
              />
              <Field
                multiline
                label="찾는 응답자 조건"
                placeholder="예: 최근 3개월 내 직접 장을 보고 남은 식재료를 버린 경험이 있는 1인 가구"
                value={values.targetDescription}
                onChangeText={(value) => updateValue("targetDescription", value)}
              />
            </FormSection>

            <FormSection title="인터뷰 조건">
              <View className="flex-row gap-2">
                <Field
                  containerClassName="flex-1"
                  keyboardType="number-pad"
                  label="사례비"
                  placeholder="15000"
                  suffix="원"
                  value={values.rewardAmount}
                  onChangeText={(value) => updateValue("rewardAmount", value)}
                />
                <Field
                  containerClassName="flex-1"
                  keyboardType="number-pad"
                  label="예상 시간"
                  placeholder="30"
                  suffix="분"
                  value={values.durationMinutes}
                  onChangeText={(value) => updateValue("durationMinutes", value)}
                />
              </View>
              <View className="flex-row items-end gap-2">
                <Field
                  containerClassName="w-[128px]"
                  keyboardType="number-pad"
                  label="모집 인원"
                  placeholder="0"
                  suffix="명"
                  value={values.recruitCount}
                  onChangeText={(value) => updateValue("recruitCount", value)}
                />
                <Text className="mb-3 flex-1 text-xs font-bold leading-[18px] text-hypo-muted">
                  미정이면 0명으로 두세요.
                </Text>
              </View>
              <PickerRow label="진행 방식">
                {(["online", "offline", "both"] as const).map((mode) => (
                  <OptionChip
                    key={mode}
                    isSelected={values.interviewMode === mode}
                    label={interviewModeLabels[mode]}
                    onPress={() => handleInterviewModeChange(mode)}
                  />
                ))}
              </PickerRow>
            </FormSection>

            {requiresNativeLocation ? (
              <FormSection title="장소">
                <View className="gap-2">
                  <View className="flex-row gap-2">
                    <TextInput
                      accessibilityLabel="장소 검색"
                      autoCapitalize="none"
                      autoCorrect={false}
                      blurOnSubmit={false}
                      className="h-[50px] flex-1 rounded-xl border border-hypo-border bg-hypo-bg px-3 py-0 text-sm font-bold text-hypo-text"
                      placeholder="장소, 역, 학교를 검색해요"
                      placeholderTextColor="#98A196"
                      returnKeyType="search"
                      style={{ includeFontPadding: false, paddingVertical: 0 }}
                      textAlignVertical="center"
                      value={placeQuery}
                      onChangeText={(value) => {
                        setPlaceQuery(value);
                        setPlaceSearchError(null);
                      }}
                      onSubmitEditing={handlePlaceSearch}
                    />
                    <Pressable
                      accessibilityRole="button"
                      className={`min-h-[50px] justify-center rounded-xl px-4 ${
                        placeSearch.isFetching ? "bg-hypo-brand/70" : "bg-hypo-brand"
                      }`}
                      disabled={placeSearch.isFetching}
                      onPress={handlePlaceSearch}
                    >
                      <Text className="text-xs font-black text-white">
                        {placeSearch.isFetching ? "검색 중" : "검색"}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                  {placeSearchError ? (
                    <Text className="text-xs font-extrabold leading-[18px] text-hypo-danger">
                      {placeSearchError}
                    </Text>
                  ) : null}

                  {submittedPlaceQuery && placeSearch.isError ? (
                    <Text className="text-xs font-extrabold leading-[18px] text-hypo-danger">
                      장소 검색을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
                    </Text>
                  ) : null}

                  {submittedPlaceQuery && !placeSearch.isFetching && !placeSearch.isError ? (
                    placeResults.length ? (
                      <View className="gap-1.5 rounded-[14px] border border-hypo-border bg-hypo-surface p-2">
                        {placeResults.map((place) => (
                          <PlaceResultRow
                            key={`${place.id}-${place.latitude}-${place.longitude}`}
                            place={place}
                            onPress={() => handlePlaceSelect(place)}
                          />
                        ))}
                      </View>
                    ) : (
                      <Text className="text-xs font-bold leading-[18px] text-hypo-muted">
                        검색 결과가 없어요. 역, 학교, 동네 이름으로 다시 찾아보세요.
                      </Text>
                    )
                  ) : null}

                  {values.locationLatitude !== null &&
                  values.locationLongitude !== null &&
                  values.locationPlaceName.trim() ? (
                    <View className="rounded-[14px] border border-hypo-border bg-hypo-bg p-3">
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="min-w-0 flex-1 gap-1">
                          <Text className="text-[12px] font-black text-hypo-brand">선택한 장소</Text>
                          <Text className="text-sm font-black text-hypo-text" numberOfLines={1}>
                            {values.locationPlaceName}
                          </Text>
                          <Text className="text-xs font-semibold leading-[18px] text-hypo-muted" numberOfLines={2}>
                            {values.locationAddress || "주소 정보 없음"}
                          </Text>
                        </View>
                        <View className="rounded-full bg-hypo-brandSoft px-2.5 py-1">
                          <Text className="text-[11px] font-black text-hypo-brand">등록됨</Text>
                        </View>
                      </View>

                      <View className="mt-3 flex-row flex-wrap gap-2">
                        <OptionChip
                          isSelected={values.locationPrecision === "nearby"}
                          label="동네만 공개"
                          onPress={() => handleLocationPrecisionChange("nearby")}
                        />
                        <OptionChip
                          isSelected={values.locationPrecision === "exact"}
                          label="정확한 장소"
                          onPress={() => handleLocationPrecisionChange("exact")}
                        />
                      </View>

                      <View className="mt-3 gap-2">
                        <Field
                          label="상세 주소"
                          placeholder="예: 3층 라운지, 2번 출구 앞"
                          value={values.locationDetail}
                          onChangeText={handleLocationDetailChange}
                        />
                        {locationPreview ? (
                          <Text className="text-xs font-bold leading-[18px] text-hypo-muted">
                            {locationPreview}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ) : (
                    <Text className="text-xs font-bold leading-[18px] text-hypo-muted">
                      장소를 선택하면 선택한 장소와 좌표가 저장돼요.
                    </Text>
                  )}
              </FormSection>
            ) : null}

            <FormSection title="가능 시간">
              <View className="flex-row flex-wrap gap-2">
                {quickScheduleOptions.map((option) => (
                  <OptionChip
                    key={option}
                    isSelected={values.scheduleOptions
                      .split("\n")
                      .map((item) => item.trim())
                      .includes(option)}
                    label={option}
                    onPress={() => addScheduleOption(option)}
                  />
                ))}
              </View>
              <Field
                multiline
                label="직접 입력"
                placeholder="한 줄에 하나씩 입력하세요."
                value={values.scheduleOptions}
                onChangeText={(value) => updateValue("scheduleOptions", value)}
              />
            </FormSection>

            {validationError || createInterviewPost.error ? (
              <Text className="text-xs font-extrabold leading-[18px] text-hypo-danger">
                {validationError ??
                  (createInterviewPost.error instanceof Error
                    ? createInterviewPost.error.message
                    : "모집글을 저장하지 못했습니다.")}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={createInterviewPost.isPending}
              className="min-h-[52px] items-center justify-center rounded-[14px] bg-hypo-brand"
              style={{ opacity: createInterviewPost.isPending ? 0.45 : 1 }}
              onPress={handleSubmit}
            >
              <Text className="text-base font-black text-white">
                {createInterviewPost.isPending ? "올리는 중" : "모집글 올리기"}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header({ backTo = "/(tabs)/interviews" }: { backTo?: Href }) {
  return (
    <View className="min-h-11 flex-row items-center gap-2">
      <Pressable
        accessibilityLabel="뒤로가기"
        accessibilityRole="button"
        hitSlop={12}
        className="h-10 w-10 items-center justify-center"
        onPress={() => goBackOrReplaceFallback(backTo)}
      >
        <Text className="text-[34px] font-semibold leading-9 text-hypo-text">‹</Text>
      </Pressable>
      <Text className="flex-1 text-lg font-black text-hypo-text">모집글 만들기</Text>
      <View className="w-10" />
    </View>
  );
}

function FormSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <View className="gap-3 rounded-[14px] border border-hypo-border bg-hypo-surface p-3">
      <Text className="text-[15px] font-black text-hypo-text">{title}</Text>
      {children}
    </View>
  );
}

function Field({
  containerClassName = "",
  keyboardType,
  label,
  multiline,
  onChangeText,
  placeholder,
  suffix,
  value,
}: {
  containerClassName?: string;
  keyboardType?: "default" | "number-pad";
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  suffix?: string;
  value: string;
}) {
  return (
    <View className={`gap-2 ${containerClassName}`.trim()}>
      <Text className="text-[13px] font-black text-hypo-text">{label}</Text>
      <View
        className={`flex-row rounded-xl border border-hypo-border bg-hypo-bg px-3 ${
          multiline ? "min-h-[108px] items-start py-0" : "h-[50px] items-center py-0"
        }`}
      >
        <TextInput
          accessibilityLabel={label}
          keyboardType={keyboardType}
          multiline={multiline}
          placeholder={placeholder}
          placeholderTextColor="#98A196"
          className={`flex-1 text-sm font-bold text-hypo-text ${
            multiline ? "min-h-[108px] py-3 leading-5" : "h-[48px] py-0"
          }`}
          style={{ paddingVertical: multiline ? 12 : 0 }}
          textAlignVertical={multiline ? "top" : "center"}
          value={value}
          onChangeText={onChangeText}
        />
        {suffix ? (
          <Text className="ml-2 text-sm font-black text-hypo-muted">{suffix}</Text>
        ) : null}
      </View>
    </View>
  );
}

function PickerRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <View className="gap-2">
      <Text className="text-[13px] font-black text-hypo-text">{label}</Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
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
      className={`min-h-11 items-center justify-center rounded-full border px-[13px] ${
        isSelected ? "border-hypo-brand bg-hypo-brand" : "border-hypo-border bg-hypo-surface"
      }`}
      onPress={onPress}
    >
      <Text className={`text-[13px] font-black ${isSelected ? "text-white" : "text-hypo-muted"}`}>{label}</Text>
    </Pressable>
  );
}

function PlaceResultRow({ place, onPress }: { place: PlaceSearchResult; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      className="gap-0.5 rounded-[12px] px-3 py-2.5"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? "#EEF3EA" : "transparent",
      })}
    >
      <Text className="text-sm font-black text-hypo-text" numberOfLines={1}>
        {place.name}
      </Text>
      <Text className="text-xs font-semibold leading-[18px] text-hypo-muted" numberOfLines={2}>
        {place.road_address ?? place.address ?? "주소 정보 없음"}
      </Text>
    </Pressable>
  );
}

function validatePostCreation(values: FormValues): string | null {
  const rewardAmount = Number(values.rewardAmount);
  const durationMinutes = Number(values.durationMinutes);
  const recruitCount = Number(values.recruitCount);

  if (!values.title.trim()) return "모집글 제목을 입력하세요.";
  if (!values.serviceSummary.trim()) return "검증하려는 서비스와 문제 상황을 입력하세요.";
  if (!values.targetDescription.trim()) return "찾는 응답자 조건을 구체적으로 입력하세요.";
  if (!Number.isFinite(rewardAmount) || rewardAmount < 0) return "사례비는 0원 이상의 숫자로 입력하세요.";
  if (!Number.isFinite(durationMinutes) || durationMinutes < 10) return "예상 소요 시간은 10분 이상으로 입력하세요.";
  if (!Number.isInteger(recruitCount) || recruitCount < 0 || recruitCount > 999) {
    return "모집 인원은 0명 이상 999명 이하로 입력하세요.";
  }
  if (
    values.interviewMode !== "online" &&
    (!values.location.trim() ||
      values.locationLatitude === null ||
      values.locationLongitude === null ||
      !values.locationSource)
  ) {
    return "대면 인터뷰 장소를 선택하세요.";
  }

  return null;
}

function toCreateInterviewPostInput(values: FormValues): CreateInterviewPostInput {
  const locationText =
    values.interviewMode === "online"
      ? null
      : buildLocationText(values.locationPlaceName || values.location, values.locationPrecision, values.locationDetail);
  const locationAddress =
    values.interviewMode === "online"
      ? null
      : buildLocationAddress(values.locationAddress, values.locationDetail, values.locationPrecision);

  return {
    title: values.title.trim(),
    service_summary: values.serviceSummary.trim(),
    target_description: values.targetDescription.trim(),
    reward_amount: Number(values.rewardAmount),
    duration_minutes: Number(values.durationMinutes),
    recruit_count: Number(values.recruitCount),
    interview_mode: values.interviewMode,
    location: locationText || null,
    location_text: locationText || null,
    location_address: locationAddress || null,
    location_place_name: values.interviewMode === "online" ? null : values.locationPlaceName.trim() || null,
    location_latitude: values.interviewMode === "online" ? null : values.locationLatitude,
    location_longitude: values.interviewMode === "online" ? null : values.locationLongitude,
    location_precision: values.interviewMode === "online" ? null : values.locationPrecision,
    location_source: values.interviewMode === "online" ? null : values.locationSource,
    schedule_options: values.scheduleOptions
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean),
    status: "open",
  };
}

function buildLocationText(placeName: string, precision: LocationPrecision, detail = "") {
  const normalizedPlaceName = placeName.trim();
  const normalizedDetail = detail.trim();

  if (!normalizedPlaceName) {
    return "";
  }

  if (precision === "exact" && normalizedDetail) {
    return `${normalizedPlaceName} · ${normalizedDetail}`;
  }

  return precision === "exact" ? normalizedPlaceName : `${normalizedPlaceName} 근처`;
}

function buildLocationAddress(address: string, detail: string, precision: LocationPrecision) {
  const normalizedAddress = address.trim();
  const normalizedDetail = detail.trim();

  if (precision !== "exact" || !normalizedDetail) {
    return normalizedAddress;
  }

  return [normalizedAddress, normalizedDetail].filter(Boolean).join(" ");
}

function buildLocationPreview(values: FormValues) {
  const placeName = values.locationPlaceName.trim();

  if (!placeName) {
    return null;
  }

  if (values.locationPrecision === "exact") {
    const displayText = buildLocationText(placeName, "exact", values.locationDetail);
    return `모집글에는 “${displayText}”처럼 보여요.`;
  }

  return `모집글에는 “${placeName} 근처”처럼 보여요. 상세 주소는 공개하지 않아요.`;
}

function buildQuickScheduleOptions() {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const dayAfterTomorrow = addDays(today, 2);

  return [`${formatMonthDay(tomorrow)} 저녁`, `${formatMonthDay(dayAfterTomorrow)} 오후`, "평일 저녁", "주말 오전"];
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatMonthDay(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
