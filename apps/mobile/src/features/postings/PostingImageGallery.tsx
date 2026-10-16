import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PostingImage } from "@hypofit/contracts";

export function PostingImageGallery({ images = [], onRefresh }: {
  images?: PostingImage[]; onRefresh: () => void;
}) {
  const { width } = useWindowDimensions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const selected = images.find(image => image.id === selectedId);
  if (!images.length) return null;
  const refresh = () => { setFailedUrls([]); onRefresh(); };
  return (
    <View className="mb-6 gap-2">
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {images.map((image, index) => (
          <Pressable key={image.id} accessibilityRole="button" accessibilityLabel={`${image.alt_text || `공고 이미지 ${index + 1}`} 크게 보기`}
            className="h-[220px] items-center justify-center rounded-xl bg-hypo-surface"
            style={{ width: Math.max(1, width - 32) }} onPress={() => image.url && !failedUrls.includes(image.url) ? setSelectedId(image.id) : refresh()}>
            {image.url && !failedUrls.includes(image.url) ? <Image source={{ uri: image.url }} resizeMode="contain" className="h-full w-full"
              onError={() => setFailedUrls(current => [...current, image.url!])} /> :
              <Text className="text-[14px] text-hypo-text-secondary">이미지 다시 불러오기</Text>}
          </Pressable>
        ))}
      </ScrollView>
      {images.length > 1 ? <Text className="text-[12px] text-hypo-text-metadata">이미지 {images.length}장 · 옆으로 넘겨 보세요</Text> : null}
      <Modal visible={Boolean(selected)} animationType="fade" onRequestClose={() => setSelectedId(null)}>
        <SafeAreaView className="flex-1 bg-hypo-bg">
          <View className="items-end px-4">
            <Pressable accessibilityRole="button" accessibilityLabel="이미지 닫기" className="min-h-11 justify-center px-3" onPress={() => setSelectedId(null)}>
              <Text className="text-[15px] font-semibold text-hypo-brand">닫기</Text>
            </Pressable>
          </View>
          <ScrollView maximumZoomScale={3} minimumZoomScale={1} contentContainerClassName="items-center">
            {selected?.url ? <Image source={{ uri: selected.url }} accessibilityLabel={selected.alt_text || "공고 이미지"}
              resizeMode="contain" style={{ width, height: width * selected.height / selected.width }} /> : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
