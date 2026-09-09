import { useState, type ReactNode } from "react";
import { Text, TextInput, View } from "react-native";
import type { KeyboardTypeOptions, TextInputProps, TextStyle } from "react-native";

interface TextFieldProps extends TextInputProps {
  errorMessage?: string | null;
  inputRadiusClassName?: string;
  label: string;
  labelRight?: ReactNode;
  keyboardType?: KeyboardTypeOptions;
}

const inputStyle: TextStyle = {
  fontFamily: "HypofitSansRegular",
  fontSize: 16,
  includeFontPadding: false,
  paddingBottom: 0,
  paddingTop: 0,
  paddingVertical: 0,
  textAlignVertical: "center",
};

export function TextField({
  accessibilityLabel,
  errorMessage,
  inputRadiusClassName = "rounded-[12px]",
  label,
  labelRight,
  onBlur,
  onFocus,
  style,
  ...props
}: TextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-[13px] font-bold text-hypo-text">{label}</Text>
        {labelRight ? <View>{labelRight}</View> : null}
      </View>
      <TextInput
        accessibilityLabel={accessibilityLabel ?? label}
        autoCapitalize="none"
        placeholderTextColor="#87918B"
        className={`h-[52px] ${inputRadiusClassName} border bg-hypo-surface px-4 py-0 text-hypo-text ${
          errorMessage ? "border-hypo-danger" : isFocused ? "border-hypo-brand" : "border-hypo-border"
        }`}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        style={[inputStyle, style]}
        textAlignVertical="center"
        {...props}
      />
      {errorMessage ? <Text className="text-[12px] font-medium leading-[18px] text-hypo-danger">{errorMessage}</Text> : null}
    </View>
  );
}
