import { Button, HStack, Host, Image, Text } from "@expo/ui/swift-ui";
import {
  accessibilityLabel as nativeAccessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  font,
  frame,
  padding,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { colors } from "@/shared/theme/tokens";

type Props = {
  glassAvailable: boolean;
  label: string;
  systemImage: "folder" | "plus" | "list.bullet";
  accessibilityLabel?: string;
  onPress: () => void;
  primary?: boolean;
};

export function SwiftUIGlassHeaderButton({ glassAvailable, label, systemImage, onPress, primary = false, accessibilityLabel }: Props) {
  return (
    <Host colorScheme="light" matchContents seedColor={colors.brand}>
      <Button
        onPress={onPress}
        modifiers={[
          buttonStyle(glassAvailable
            ? primary ? "glassProminent" : "glass"
            : primary ? "borderedProminent" : "bordered"),
          buttonBorderShape("capsule"),
          controlSize("regular"),
          frame({ minHeight: systemImage === "list.bullet" ? 48 : 44 }),
          tint(colors.brand),
          nativeAccessibilityLabel(accessibilityLabel ?? (primary ? "공고 만들기" : "내 활동 보기")),
        ]}
      >
        <HStack spacing={4} modifiers={[padding({ vertical: 4 })]}>
          <Image systemName={systemImage} size={14} />
          <Text modifiers={[font({ textStyle: "caption", weight: "semibold" })]}>{label}</Text>
        </HStack>
      </Button>
    </Host>
  );
}
