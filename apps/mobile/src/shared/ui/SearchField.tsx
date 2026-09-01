import type { ReactNode } from "react";
import { TextInput, View } from "react-native";
import type { TextInputProps, TextStyle } from "react-native";
import { Feather } from "@expo/vector-icons";

interface SearchFieldProps extends TextInputProps {
  containerClassName?: string;
  iconColor?: string;
  rightAccessory?: ReactNode;
}

const inputStyle: TextStyle = {
  fontFamily: "HypofitSansMedium",
  fontSize: 14,
  includeFontPadding: false,
  paddingBottom: 0,
  paddingTop: 0,
  paddingVertical: 0,
  textAlignVertical: "center",
};

export function SearchField({
  containerClassName = "",
  iconColor = "#657069",
  placeholderTextColor = "#87918B",
  rightAccessory,
  style,
  ...props
}: SearchFieldProps) {
  return (
    <View className={`h-11 flex-row items-center gap-2 rounded-xl border border-hypo-border bg-hypo-surface px-3 ${containerClassName}`.trim()}>
      <Feather color={iconColor} name="search" size={17} />
      <View className="h-full min-w-0 flex-1 justify-center">
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={placeholderTextColor}
          className="h-full w-full py-0 text-hypo-text"
          style={[inputStyle, style]}
          {...props}
        />
      </View>
      {rightAccessory}
    </View>
  );
}
