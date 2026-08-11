import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenPlaceholderProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function ScreenPlaceholder({ title, description, children }: ScreenPlaceholderProps) {
  return (
    <SafeAreaView className="flex-1 bg-hypo-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          alwaysBounceVertical={false}
          contentContainerClassName="flex-grow"
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 gap-3 px-6 py-6">
            <Text className="text-xs font-bold text-hypo-brand">Hypofit Native</Text>
            <Text className="text-[28px] font-extrabold text-hypo-text">{title}</Text>
            <Text className="text-[15px] leading-[22px] text-hypo-muted">{description}</Text>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
