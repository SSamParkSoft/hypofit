import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type ScrollViewProps,
} from "react-native";
import { router, type Href } from "expo-router";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { goBackOrReplaceFallback } from "@/shared/navigation/backNavigation";

interface AppScreenProps {
  backTo?: Href;
  title: string;
  bottomPaddingClassName?: string;
  contentClassName?: string;
  scrollContentContainerStyle?: ScrollViewProps["contentContainerStyle"];
  eyebrow?: string;
  description?: string;
  showHeader?: boolean;
  showBackButton?: boolean;
  children: ReactNode;
  scroll?: boolean;
  safeAreaEdges?: Edge[];
  onBack?: () => void;
  keyboardAvoiding?: boolean;
  keyboardVerticalOffset?: number;
  right?: ReactNode;
}

export function AppScreen({
  backTo,
  bottomPaddingClassName = "pb-24",
  children,
  contentClassName,
  description,
  eyebrow,
  right,
  showBackButton = true,
  showHeader = true,
  scroll = true,
  scrollContentContainerStyle,
  safeAreaEdges,
  title,
  onBack,
  keyboardAvoiding = false,
  keyboardVerticalOffset = 0,
}: AppScreenProps) {
  const bodyClassName = ["gap-4 px-4 pt-3", bottomPaddingClassName, contentClassName]
    .filter(Boolean)
    .join(" ");
  const body = (
    <View className={bodyClassName}>
      {showHeader ? (
        <View className="min-h-11 flex-row items-center gap-2">
          {showBackButton ? (
            <Pressable
              accessibilityLabel="뒤로가기"
              accessibilityRole="button"
              hitSlop={12}
              className="h-10 w-10 items-center justify-center"
              onPress={onBack ?? (() => {
                if (backTo) {
                  goBackOrReplaceFallback(backTo);
                  return;
                }

                router.replace("/(tabs)/home");
              })}
            >
              <Text className="text-[32px] font-semibold leading-10 text-hypo-text">‹</Text>
            </Pressable>
          ) : null}
          <View className="min-w-0 flex-1 justify-center">
            {eyebrow ? <Text className="text-[11px] font-semibold text-hypo-brand">{eyebrow}</Text> : null}
            <Text numberOfLines={1} className="text-lg font-bold leading-10 text-hypo-text">
              {title}
            </Text>
          </View>
          {right}
        </View>
      ) : null}
      {description ? <Text className="px-1 text-sm font-medium leading-[21px] text-hypo-muted">{description}</Text> : null}
      {children}
    </View>
  );
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={scrollContentContainerStyle}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {body}
    </ScrollView>
  ) : (
    body
  );

  return (
    <SafeAreaView className="flex-1 bg-hypo-bg" edges={safeAreaEdges}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function SectionCard({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <View className="gap-2">
      {title ? <Text className="px-1 text-xs font-semibold text-hypo-textSoft">{title}</Text> : null}
      <View className="overflow-hidden rounded-[16px] border border-hypo-border bg-hypo-surface">{children}</View>
    </View>
  );
}
