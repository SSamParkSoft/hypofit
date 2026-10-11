import { useCallback, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Modal, Pressable, Text, View } from "react-native";
import { colors } from "@/shared/theme/tokens";
import { PrimaryButton } from "@/shared/ui/PrimaryButton";
import {
  findUnseenImportantNotice,
  markImportantNoticeSeen,
  type PublishedNotice,
} from "./importantNotice";

export function EntryNotices({ memberId }: { memberId: string | null }) {
  const params = useLocalSearchParams<{ welcome?: string }>();
  const [welcomeOpen, setWelcomeOpen] = useState(params.welcome === "1");
  const [importantNotice, setImportantNotice] = useState<PublishedNotice | null>(null);
  const dismissWelcome = () => {
    setWelcomeOpen(false);
    router.setParams({ welcome: undefined });
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!memberId) {
        setImportantNotice(null);
        return () => { active = false; };
      }

      void findUnseenImportantNotice(memberId)
        .then((notice) => {
          if (active) setImportantNotice(notice);
        })
        .catch(() => {
          // Notice lookup must not block posting discovery.
        });

      return () => { active = false; };
    }, [memberId]),
  );

  const dismissImportantNotice = () => {
    if (!importantNotice || !memberId) return;
    setImportantNotice(null);
    void markImportantNoticeSeen(memberId, importantNotice.id);
  };

  return (
    <>
      <Modal animationType="fade" transparent visible={welcomeOpen} onRequestClose={dismissWelcome}>
        <View className="flex-1 justify-center bg-black/35 px-6">
          <Pressable className="absolute inset-0" onPress={dismissWelcome} />
          <View className="rounded-[24px] bg-[#FFFEFB] px-5 py-5">
            <Text className="text-[22px] leading-[30px] text-hypo-text" style={{ fontFamily: "HypofitSansBold" }}>
              회원가입이 완료됐어요
            </Text>
            <Text className="mt-2 text-[13px] leading-5 text-hypo-muted" style={{ fontFamily: "HypofitSansMedium" }}>
              이제 필요한 공고를 확인하고 바로 참여할 수 있어요.
            </Text>
            <View className="mt-5">
              <PrimaryButton onPress={dismissWelcome}>공고 둘러보기</PrimaryButton>
            </View>
          </View>
        </View>
      </Modal>
      <Modal animationType="fade" transparent visible={Boolean(importantNotice) && !welcomeOpen} onRequestClose={dismissImportantNotice}>
        <View className="flex-1 justify-center bg-black/40 px-5">
          <Pressable className="absolute inset-0" onPress={dismissImportantNotice} />
          {importantNotice ? (
            <View className="w-full max-w-[380px] self-center rounded-[24px] bg-hypo-surface px-6 py-6">
              <View className="flex-row items-center gap-2">
                <Feather accessibilityElementsHidden color={colors.brand} name="alert-circle" size={18} />
                <Text className="text-[14px] font-semibold text-hypo-brand">중요 안내</Text>
              </View>
              <Text numberOfLines={2} className="mt-5 text-[22px] font-bold leading-[30px] text-hypo-text">
                {importantNotice.title}
              </Text>
              <Text numberOfLines={3} className="mt-2 text-[15px] leading-6 text-hypo-text-secondary">
                {importantNotice.body}
              </Text>
              <View className="mt-6">
                <PrimaryButton onPress={() => {
                  dismissImportantNotice();
                  router.push({ pathname: "/notice", params: { returnTo: "/(tabs)/interviews" } });
                }}>공지 확인하기</PrimaryButton>
                <Pressable
                  accessibilityLabel="중요 공지 나중에 보기"
                  accessibilityRole="button"
                  className="mt-2 min-h-[44px] items-center justify-center"
                  onPress={dismissImportantNotice}
                >
                  <Text className="text-[15px] font-semibold text-hypo-text-secondary">나중에</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}
