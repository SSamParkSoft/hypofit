import { useEffect, useRef } from "react";
import { Keyboard } from "react-native";
import { HStack, Host, Image, Text, TextField, useNativeState } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  autocorrectionDisabled,
  font,
  foregroundStyle,
  frame,
  glassEffect,
  onSubmit,
  padding,
  submitLabel,
  textFieldStyle,
  textInputAutocapitalization,
} from "@expo/ui/swift-ui/modifiers";
import { colors } from "@/shared/theme/tokens";
import { SearchField } from "@/shared/ui/SearchField";

type Props = {
  glassAvailable: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
};

export function PostingSearchField({ glassAvailable, onChangeText, placeholder, value }: Props) {
  const nativeText = useNativeState(value);
  const lastNativeText = useRef(value);

  useEffect(() => {
    if (value === lastNativeText.current) return;
    lastNativeText.current = value;
    nativeText.set(value);
  }, [nativeText, value]);

  if (!glassAvailable) {
    return (
      <SearchField
        accessibilityLabel="공고 검색"
        containerClassName="h-12 flex-1"
        placeholder={placeholder}
        returnKeyType="search"
        value={value}
        onChangeText={onChangeText}
      />
    );
  }

  return (
    <Host colorScheme="light" seedColor={colors.brand} style={{ flex: 1, height: 48 }}>
      <HStack
        spacing={8}
        modifiers={[
          frame({ minHeight: 48 }),
          padding({ horizontal: 12 }),
          glassEffect({ shape: "roundedRectangle", cornerRadius: 12, glass: { variant: "regular" } }),
        ]}
      >
        <Image systemName="magnifyingglass" size={17} color={colors.textMuted} />
        <TextField
          text={nativeText}
          placeholder={placeholder}
          onTextChange={(nextValue) => {
            lastNativeText.current = nextValue;
            onChangeText(nextValue);
          }}
          modifiers={[
            textFieldStyle("plain"),
            font({ family: "SpoqaHanSansNeo-Medium", size: 14, textStyle: "subheadline" }),
            textInputAutocapitalization("never"),
            autocorrectionDisabled(),
            submitLabel("search"),
            onSubmit(() => Keyboard.dismiss()),
            accessibilityLabel("공고 검색"),
          ]}
        >
          <TextField.Placeholder>
            <Text modifiers={[foregroundStyle(colors.textSoft), font({ family: "SpoqaHanSansNeo-Medium", size: 14, textStyle: "subheadline" })]}>
              {placeholder}
            </Text>
          </TextField.Placeholder>
        </TextField>
      </HStack>
    </Host>
  );
}
