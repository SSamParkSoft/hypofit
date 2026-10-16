import { Feather } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/shared/theme/tokens";
import {
  formatScheduleDate,
  formatScheduleTime,
} from "./scheduleSessionValidation";

export function ScheduleDateTimeField({
  mode,
  value,
  disabled,
  onChange,
}: {
  mode: "date" | "time";
  value: Date;
  disabled: boolean;
  onChange: (date: Date) => void;
}) {
  const [draft, setDraft] = useState<Date | null>(null);
  const insets = useSafeAreaInsets();
  const label = mode === "date" ? "날짜" : "시간";
  const displayValue =
    mode === "date" ? formatScheduleDate(value) : formatScheduleTime(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const close = () => setDraft(null);
  const change = (event: DateTimePickerEvent, next?: Date) => {
    if (event.type !== "set") {
      close();
      return;
    }
    if (Platform.OS === "ios") {
      if (next) setDraft(next);
    } else {
      close();
      if (next) onChange(next);
    }
  };
  return (
    <View className="gap-2">
      <Text className="text-[13px] font-medium text-hypo-text">{label}</Text>
      <Pressable
        accessibilityLabel={`${label} ${displayValue}, 선택`}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: draft !== null }}
        disabled={disabled}
        className="min-h-[50px] flex-row items-center gap-2 rounded-[12px] border border-hypo-border bg-hypo-bg px-3 py-3"
        onPress={() => {
          Keyboard.dismiss();
          setDraft(new Date(value));
        }}
      >
        <Text className="min-w-0 flex-1 text-[15px] font-medium text-hypo-text">
          {displayValue}
        </Text>
        <Feather
          name={mode === "date" ? "calendar" : "clock"}
          color={colors.textMetadata}
          size={18}
        />
      </Pressable>
      {draft && Platform.OS === "ios" ? (
        <Modal transparent visible onRequestClose={close}>
          <View
            className="flex-1 justify-end bg-black/35"
            style={{ paddingTop: insets.top }}
          >
            <Pressable
              accessible={false}
              className="absolute inset-0"
              onPress={close}
            />
            <View
              accessibilityViewIsModal
              onAccessibilityEscape={close}
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
                  accessibilityLabel={`${label} 선택 취소`}
                  accessibilityRole="button"
                  className="h-11 w-11 items-center justify-center"
                  onPress={close}
                >
                  <Feather name="x" color={colors.textMetadata} size={22} />
                </Pressable>
              </View>
              <ScrollView
                className="shrink"
                contentContainerClassName="items-center pb-3"
                bounces={false}
              >
                <DateTimePicker
                  mode={mode}
                  display={mode === "date" ? "inline" : "spinner"}
                  minimumDate={mode === "date" ? today : undefined}
                  value={draft}
                  themeVariant="light"
                  accentColor={colors.brand}
                  onChange={change}
                />
              </ScrollView>
              <Pressable
                accessibilityRole="button"
                className="mx-4 min-h-[52px] items-center justify-center rounded-[12px] bg-hypo-brand px-4 py-3"
                onPress={() => {
                  onChange(draft);
                  close();
                }}
              >
                <Text className="text-[15px] font-semibold text-white">
                  {label} 선택
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : draft ? (
        <DateTimePicker
          mode={mode}
          display="default"
          value={draft}
          minimumDate={mode === "date" ? today : undefined}
          onChange={change}
        />
      ) : null}
    </View>
  );
}
