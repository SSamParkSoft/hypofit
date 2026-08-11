import type { ReactNode } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface AuthScreenFrameProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  cardDescription?: string;
  cardTitle?: string;
  footer?: ReactNode;
  onBack?: () => void;
  stepLabel?: string;
}

export function AuthScreenFrame({
  cardDescription,
  cardTitle,
  children,
  description,
  eyebrow,
  footer,
  onBack,
  stepLabel,
  title,
}: AuthScreenFrameProps) {
  return (
    <SafeAreaView className="flex-1 bg-hypo-bg">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView
          alwaysBounceVertical={false}
          contentContainerClassName="flex-grow px-5 pb-6 pt-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 justify-center">
            <View className="mx-auto w-full max-w-[420px] gap-4">
              <View className="items-center px-2">
                <Image
                  accessibilityIgnoresInvertColors
                  accessibilityLabel="Hypofit"
                  className="h-[74px] w-[74px]"
                  resizeMode="contain"
                  source={require("../../../assets/hypofit-mark.png")}
                />
                <View className="mt-3 items-center">
                  <Text className="text-center text-[31px] font-black leading-[38px] text-hypo-brand">
                    {title}
                  </Text>
                  <Text
                    className="mt-3 text-center text-xs text-hypo-muted"
                    style={{ fontFamily: "HypofitSansBold" }}
                  >
                    {eyebrow}
                  </Text>
                  {description ? (
                    <Text
                      className="mt-2 text-center text-[14px] leading-[21px] text-hypo-muted"
                      style={{ fontFamily: "HypofitSansMedium" }}
                    >
                      {description}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View className="rounded-[24px] border border-[#E2DFD6] bg-[#FFFEFB] px-4 py-4 shadow-sm">
                {cardTitle || onBack || stepLabel ? (
                  <View className={`mb-5 ${onBack ? "gap-3" : "gap-2"}`}>
                    {onBack && cardTitle ? (
                      <View className="flex-row items-center justify-between gap-3">
                        <Pressable
                          accessibilityLabel="이전으로"
                          accessibilityRole="button"
                          hitSlop={12}
                          className="size-9 items-center justify-center rounded-[12px] bg-hypo-brandSoft"
                          onPress={onBack}
                        >
                          <Text
                            className="text-[24px] leading-7 text-hypo-brand"
                            style={{ fontFamily: "HypofitSansBold" }}
                          >
                            ‹
                          </Text>
                        </Pressable>
                        <Text
                          className="min-w-0 flex-1 text-[20px] leading-[27px] text-hypo-text"
                          numberOfLines={1}
                          style={{ fontFamily: "HypofitSansBold" }}
                        >
                          {cardTitle}
                        </Text>
                        {stepLabel ? (
                          <View className="rounded-full bg-hypo-bg px-3 py-1.5">
                            <Text
                              className="text-[11px] text-hypo-muted"
                              style={{ fontFamily: "HypofitSansBold" }}
                            >
                              {stepLabel}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                    {cardTitle && !onBack ? (
                      <View className={stepLabel && !onBack ? "flex-row items-start justify-between gap-3" : undefined}>
                        <View className="min-w-0 flex-1">
                          <Text
                            className="text-[23px] leading-[31px] text-hypo-text"
                            style={{ fontFamily: "HypofitSansBold" }}
                          >
                            {cardTitle}
                          </Text>
                          {cardDescription ? (
                            <Text
                              className="mt-1.5 text-[13px] leading-5 text-hypo-muted"
                              style={{ fontFamily: "HypofitSansMedium" }}
                            >
                              {cardDescription}
                            </Text>
                          ) : null}
                        </View>
                        {stepLabel && !onBack ? (
                          <View className="mt-1 rounded-full bg-hypo-bg px-3 py-1.5">
                            <Text
                              className="text-[11px] text-hypo-muted"
                              style={{ fontFamily: "HypofitSansBold" }}
                            >
                              {stepLabel}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                    {cardDescription && onBack ? (
                      <Text
                        className="text-[13px] leading-5 text-hypo-muted"
                        style={{ fontFamily: "HypofitSansMedium" }}
                      >
                        {cardDescription}
                      </Text>
                    ) : null}
                    {stepLabel && !cardTitle && !onBack ? (
                      <View className="flex-row items-center justify-between gap-3">
                        <View />
                        <View className="rounded-full bg-hypo-bg px-3 py-1.5">
                          <Text
                            className="text-[11px] text-hypo-muted"
                            style={{ fontFamily: "HypofitSansBold" }}
                          >
                            {stepLabel}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                ) : null}
                {children}
              </View>

              {footer ? <View className="px-1">{footer}</View> : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
