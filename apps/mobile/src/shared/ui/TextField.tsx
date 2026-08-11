import { Text, TextInput, View } from "react-native";
import type { KeyboardTypeOptions, TextInputProps, TextStyle } from "react-native";

interface TextFieldProps extends TextInputProps {
  label: string;
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

export function TextField({ accessibilityLabel, label, style, ...props }: TextFieldProps) {
  return (
    <View className="gap-2">
      <Text className="text-[13px] font-bold text-hypo-text">{label}</Text>
      <TextInput
        accessibilityLabel={accessibilityLabel ?? label}
        autoCapitalize="none"
        placeholderTextColor="#A3ABA0"
        className="h-[52px] rounded-[14px] border border-hypo-border bg-hypo-surface px-4 py-0 text-hypo-text"
        style={[inputStyle, style]}
        textAlignVertical="center"
        {...props}
      />
    </View>
  );
}
