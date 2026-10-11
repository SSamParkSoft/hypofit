import { Feather } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { ActionSheetIOS, Alert, Platform, Pressable, Text, TextInput, View } from "react-native";
import { type DurationUnit } from "@/features/postings/postingCreationDraft";
import { colors } from "@/shared/theme/tokens";
import { betaDurationUnits, durationUnits } from "./creationDurationOptions";

export type FeatherIconName = ComponentProps<typeof Feather>["name"];

export function FieldAnchor({
  field,
  onFieldLayout,
  children,
}: {
  field: string;
  onFieldLayout: (field: string, view: View | null) => void;
  children: ReactNode;
}) {
  const anchorRef = useRef<View>(null);
  useEffect(() => () => onFieldLayout(field, null), [field, onFieldLayout]);
  return (
    <View
      ref={anchorRef}
      collapsable={false}
      onLayout={() => onFieldLayout(field, anchorRef.current)}
    >
      {children}
    </View>
  );
}

export function FormField({
  inputRef,
  label,
  value,
  placeholder,
  onChangeText,
  multiline,
  helper,
  suffix,
  containerClassName = "",
  keyboardType,
  autoCapitalize,
  editable = true,
  error,
  maxLength,
  onBlur,
}: {
  inputRef?: (input: TextInput | null) => void;
  label: string;
  value: string;
  placeholder: string;
  onChangeText?: (value: string) => void;
  multiline?: boolean;
  helper?: string;
  suffix?: string;
  containerClassName?: string;
  keyboardType?: "default" | "number-pad" | "url";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable?: boolean;
  error?: string;
  maxLength?: number;
  onBlur?: () => void;
}) {
  return (
    <View className={`gap-2 ${containerClassName}`.trim()}>
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Text className="text-[13px] font-semibold text-hypo-text">
          {label}
        </Text>
        {maxLength ? (
          <Text className="text-[12px] text-hypo-text-soft">
            {value.length}/{maxLength}
          </Text>
        ) : null}
      </View>
      <View
        className={`rounded-[12px] border bg-hypo-surface px-4 ${error ? "border-hypo-danger" : "border-hypo-border"} ${multiline ? "min-h-[116px]" : "min-h-[52px] flex-row items-center"}`}
      >
        <TextInput
          accessibilityLabel={label}
          autoCapitalize={autoCapitalize}
          editable={editable}
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          placeholder={placeholder}
          placeholderTextColor={colors.textSoft}
          ref={inputRef}
          className={`min-w-0 flex-1 text-[15px] text-hypo-text ${multiline ? "min-h-[114px] py-3 leading-[22px]" : "min-h-[50px] py-3"} ${editable ? "" : "text-hypo-text-secondary"}`}
          style={{ textAlignVertical: multiline ? "top" : "center" }}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
        />
        {suffix ? (
          <Text className="ml-2 text-[14px] font-medium text-hypo-text-secondary">
            {suffix}
          </Text>
        ) : null}
      </View>
      {helper ? (
        <Text className="text-[12px] leading-[18px] text-hypo-text-secondary">
          {helper}
        </Text>
      ) : null}
      {error ? <InlineError message={error} /> : null}
    </View>
  );
}

export function DurationField({
  inputRef,
  label,
  value,
  unit,
  error,
  units = durationUnits,
  onChangeValue,
  onChangeUnit,
  onBlur,
}: {
  inputRef?: (input: TextInput | null) => void;
  label: string;
  value: string;
  unit: DurationUnit;
  error?: string;
  units?: Array<{ value: DurationUnit; label: string }>;
  onChangeValue: (value: string) => void;
  onChangeUnit: (unit: DurationUnit) => void;
  onBlur?: () => void;
}) {
  const unitLabel =
    betaDurationUnits.find((option) => option.value === unit)?.label ?? "분";
  const chooseUnit = () => {
    const options = units.map((option) => option.label);
    const select = (index: number) => {
      const next = units[index];
      if (next) onChangeUnit(next.value);
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options, "취소"],
          cancelButtonIndex: options.length,
          title: "시간 단위",
        },
        select,
      );
      return;
    }

    Alert.alert("시간 단위", undefined, [
      ...units.map((option, index) => ({
        text: option.label,
        onPress: () => select(index),
      })),
      { text: "취소", style: "cancel" },
    ]);
  };

  return (
    <View className="gap-2">
      <SectionLabel>{label}</SectionLabel>
      <View
        className={`h-[52px] flex-row items-center rounded-[12px] border bg-hypo-surface px-4 ${error ? "border-hypo-danger" : "border-hypo-border"}`}
      >
        <Text className="mr-2 text-[15px] text-hypo-text-secondary">약</Text>
        <TextInput
          accessibilityLabel={label}
          className="h-[50px] min-w-0 flex-1 py-0 text-[17px] font-semibold text-hypo-text"
          keyboardType="number-pad"
          placeholder="30"
          placeholderTextColor={colors.textSoft}
          ref={inputRef}
          value={value}
          maxLength={3}
          onChangeText={(next) => onChangeValue(next.replace(/[^0-9]/g, ""))}
          onBlur={onBlur}
        />
        <Pressable
          accessibilityLabel={`${label} 단위: ${unitLabel}`}
          accessibilityRole="button"
          className="-mr-2 min-h-[44px] flex-row items-center gap-1 rounded-[8px] px-2"
          onPress={chooseUnit}
        >
          <Text className="text-[15px] font-semibold text-hypo-brand">
            {unitLabel}
          </Text>
          <Feather color={colors.brand} name="chevron-down" size={16} />
        </Pressable>
      </View>
      {error ? <InlineError message={error} /> : null}
    </View>
  );
}

export function SelectableRow({
  label,
  description,
  isSelected,
  onPress,
  icon,
}: {
  label: string;
  description?: string;
  isSelected: boolean;
  onPress: () => void;
  icon?: FeatherIconName;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected, checked: isSelected }}
      className={`${description ? "min-h-[64px]" : "min-h-[48px]"} flex-row items-center gap-3 border-b border-hypo-border py-3 ${isSelected ? "bg-hypo-brandSoft/50" : ""}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.76 : 1 })}
    >
      {icon ? (
        <Feather
          color={isSelected ? colors.brand : colors.textMetadata}
          name={icon}
          size={18}
        />
      ) : null}
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-[15px] font-semibold text-hypo-text">
          {label}
        </Text>
        {description ? <Text className="text-[13px] leading-5 text-hypo-text-secondary">
          {description}
        </Text> : null}
      </View>
      <View
        className={`h-5 w-5 items-center justify-center rounded-full border ${isSelected ? "border-hypo-brand bg-hypo-brand" : "border-hypo-border bg-hypo-surface"}`}
      >
        {isSelected ? <Feather color="white" name="check" size={13} /> : null}
      </View>
    </Pressable>
  );
}

export function ChoiceChip({
  label,
  isSelected,
  onPress,
  compact,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      className={`${compact ? "px-2" : "px-3"} min-h-[44px] items-center justify-center rounded-[10px] border py-2 ${isSelected ? "border-hypo-brand bg-hypo-brandSoft" : "border-hypo-border bg-hypo-surface"}`}
      onPress={onPress}
    >
      <Text
        className={`${compact ? "text-[12px]" : "text-[13px]"} font-medium ${isSelected ? "text-hypo-brand" : "text-hypo-text-secondary"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipField({
  label,
  options,
  selected,
  error,
  onToggle,
}: {
  label?: string;
  options: string[];
  selected: string[];
  error?: string;
  onToggle: (value: string) => void;
}) {
  return (
    <View className="gap-2">
      {label ? <SectionLabel>{label}</SectionLabel> : null}
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => (
          <ChoiceChip
            key={option}
            isSelected={selected.includes(option)}
            label={option}
            onPress={() => onToggle(option)}
          />
        ))}
      </View>
      {error ? <InlineError message={error} /> : null}
    </View>
  );
}

export function RemovableValue({
  value,
  onRemove,
}: {
  value: string;
  onRemove: () => void;
}) {
  return (
    <View className="min-h-[42px] flex-row items-center justify-between gap-3 border-b border-hypo-border">
      <Text className="min-w-0 flex-1 text-[14px] text-hypo-text-secondary">
        {value}
      </Text>
      <Pressable
        accessibilityLabel={`${value} 삭제`}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onRemove}
      >
        <Feather color={colors.textMetadata} name="x" size={18} />
      </Pressable>
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-[13px] font-semibold text-hypo-text">{children}</Text>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <Text
      accessibilityLiveRegion="polite"
      className="text-[13px] leading-5 text-hypo-danger"
    >
      {message}
    </Text>
  );
}
