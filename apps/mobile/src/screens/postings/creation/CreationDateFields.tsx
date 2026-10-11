import { Feather } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Keyboard, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/shared/theme/tokens";
import { formatDate, formatDateTime, isIsoDate } from "./creationDateFormatting";
import { InlineError } from "./CreationFormControls";

export function DateField({
  label,
  value,
  error,
  onChange,
  containerClassName = "",
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  containerClassName?: string;
}) {
  const [pickerDate, setPickerDate] = useState<Date | null>(null);
  const insets = useSafeAreaInsets();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const openPicker = () => {
    Keyboard.dismiss();
    const selectedDate = isIsoDate(value) ? new Date(`${value}T12:00:00`) : new Date();
    setPickerDate(selectedDate < today ? today : selectedDate);
  };
  const closePicker = () => setPickerDate(null);
  const handleChange = (event: DateTimePickerEvent, nextDate?: Date) => {
    if (event.type !== "set") {
      closePicker();
      return;
    }
    if (Platform.OS === "ios") {
      if (nextDate) setPickerDate(nextDate);
    } else {
      closePicker();
      if (nextDate) onChange(formatDate(nextDate));
    }
  };

  return (
    <View className={`gap-2 ${containerClassName}`.trim()}>
      <Text className="text-[12px] font-medium text-hypo-text-secondary">
        {label}
      </Text>
      <Pressable
        accessibilityLabel={`${label}, ${value || "미선택"}, 달력 열기`}
        accessibilityRole="button"
        accessibilityState={{ expanded: pickerDate !== null }}
        className="min-h-[52px] flex-row items-center gap-2 rounded-[12px] border border-hypo-border bg-hypo-surface px-3 py-3"
        onPress={openPicker}
      >
        <Text
          className={`min-w-0 flex-1 text-[15px] font-medium ${value ? "text-hypo-text" : "text-hypo-text-soft"}`}
        >
          {value || "날짜 선택"}
        </Text>
        <Feather color={colors.textMetadata} name="calendar" size={17} />
      </Pressable>
      {pickerDate && Platform.OS === "ios" ? (
        <Modal transparent visible onRequestClose={closePicker}>
          <View
            className="flex-1 justify-end bg-black/35"
            style={{ paddingTop: insets.top }}
          >
            <Pressable
              accessible={false}
              className="absolute inset-0"
              onPress={closePicker}
            />
            <View
              accessibilityViewIsModal
              onAccessibilityEscape={closePicker}
              className="max-h-full rounded-t-[16px] bg-hypo-surface"
              style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            >
              <View className="min-h-[60px] flex-row items-center gap-3 px-4 py-2">
                <Text
                  accessibilityRole="header"
                  className="min-w-0 flex-1 text-[18px] font-semibold text-hypo-text"
                >
                  {label} 선택
                </Text>
                <Pressable
                  accessibilityLabel="날짜 선택 취소"
                  accessibilityRole="button"
                  className="h-11 w-11 items-center justify-center"
                  onPress={closePicker}
                >
                  <Feather name="x" size={22} color={colors.textMetadata} />
                </Pressable>
              </View>
              <ScrollView
                className="shrink"
                contentContainerClassName="items-center pb-3"
                bounces={false}
              >
                <DateTimePicker
                  accessibilityLabel={`${label} 달력`}
                  display="inline"
                  minimumDate={today}
                  mode="date"
                  themeVariant="light"
                  accentColor={colors.brand}
                  value={pickerDate}
                  onChange={handleChange}
                />
              </ScrollView>
              <Pressable
                accessibilityLabel={`${label} ${formatDate(pickerDate)} 선택`}
                accessibilityRole="button"
                className="mx-4 min-h-[52px] items-center justify-center rounded-[12px] bg-hypo-brand px-4 py-3"
                onPress={() => {
                  onChange(formatDate(pickerDate));
                  closePicker();
                }}
              >
                <Text className="text-[15px] font-semibold text-white">날짜 선택</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : pickerDate ? (
        <DateTimePicker
          display="default"
          minimumDate={today}
          mode="date"
          value={pickerDate}
          onChange={handleChange}
        />
      ) : null}
      {error ? <InlineError message={error} /> : null}
    </View>
  );
}

export function DeadlineSettingRow({
  enabled,
  deadline,
  error,
  onChange,
}: {
  enabled: boolean;
  deadline: string;
  error?: string;
  onChange: (deadline: string) => void;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const selectedDate = isIsoDate(deadline)
    ? new Date(`${deadline}T12:00:00`)
    : new Date();
  const openPicker = () => setIsPickerOpen(true);
  const handleChange = (_event: DateTimePickerEvent, nextDate?: Date) => {
    if (Platform.OS !== "ios") setIsPickerOpen(false);
    if (nextDate) onChange(formatDate(nextDate));
  };

  return (
    <View>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: enabled }}
        className={`min-h-[64px] flex-row items-center gap-3 border-b border-hypo-border py-3 ${enabled ? "bg-hypo-brandSoft/50" : ""}`}
        onPress={openPicker}
        style={({ pressed }) => ({ opacity: pressed ? 0.76 : 1 })}
      >
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-[15px] font-semibold text-hypo-text">
            마감일 설정
          </Text>
          <Text className="text-[13px] leading-5 text-hypo-text-secondary">
            {enabled && deadline
              ? `${deadline}까지 참여할 수 있어요.`
              : "참여할 수 있는 마지막 날짜를 정해요."}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="마감일 달력 열기"
          accessibilityRole="button"
          className="h-11 w-11 items-center justify-center"
          onPress={openPicker}
        >
          <Feather color={colors.textMetadata} name="calendar" size={17} />
        </Pressable>
        <View
          className={`h-5 w-5 items-center justify-center rounded-full border ${enabled ? "border-hypo-brand bg-hypo-brand" : "border-hypo-border bg-hypo-surface"}`}
        >
          {enabled ? <Feather color="white" name="check" size={13} /> : null}
        </View>
      </Pressable>
      {isPickerOpen ? (
        <DateTimePicker
          display={Platform.OS === "ios" ? "inline" : "default"}
          minimumDate={new Date()}
          mode="date"
          value={selectedDate}
          onChange={handleChange}
        />
      ) : null}
      {error ? <InlineError message={error} /> : null}
    </View>
  );
}

export function DateTimeSlotPicker({ onAdd }: { onAdd: (value: string) => void }) {
  const [value, setValue] = useState(new Date());
  const [pickerMode, setPickerMode] = useState<
    "date" | "time" | "datetime" | null
  >(null);
  const handleChange = (event: DateTimePickerEvent, nextDate?: Date) => {
    if (event.type === "dismissed") {
      setPickerMode(null);
      return;
    }
    if (!nextDate) return;

    if (Platform.OS === "android" && pickerMode === "date") {
      setValue(nextDate);
      setPickerMode("time");
      return;
    }
    setValue(nextDate);
    if (Platform.OS === "android") setPickerMode(null);
  };
  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        <Pressable
          accessibilityLabel="날짜와 시간 선택"
          accessibilityRole="button"
          className="h-[52px] min-w-0 flex-1 flex-row items-center justify-between rounded-[12px] border border-hypo-border bg-hypo-surface px-4"
          onPress={() =>
            setPickerMode(Platform.OS === "ios" ? "datetime" : "date")
          }
        >
          <Text className="text-[15px] text-hypo-text">
            {formatDateTime(value)}
          </Text>
          <Feather color={colors.textMetadata} name="calendar" size={17} />
        </Pressable>
        <Pressable
          accessibilityLabel="선택한 날짜와 시간 추가"
          accessibilityRole="button"
          className="h-[52px] justify-center rounded-[12px] bg-hypo-surfaceMuted px-4"
          onPress={() => onAdd(formatDateTime(value))}
        >
          <Text className="font-semibold text-hypo-text">추가</Text>
        </Pressable>
      </View>
      {pickerMode ? (
        <DateTimePicker
          display={Platform.OS === "ios" ? "compact" : "default"}
          mode={pickerMode}
          minimumDate={
            pickerMode === "date" || pickerMode === "datetime"
              ? new Date()
              : undefined
          }
          value={value}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}
