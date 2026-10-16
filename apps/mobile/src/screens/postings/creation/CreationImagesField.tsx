import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { PostingDraftImage } from "@/features/postings/postingCreationDraft";
import { prepareLocalPostingImage, removeLocalPostingImage } from "@/features/postings/postingImageFiles";
import { colors } from "@/shared/theme/tokens";

export function CreationImagesField({ images, userId, disabled, onChange, onBusyChange }: {
  images: PostingDraftImage[]; userId: string; disabled?: boolean; onChange: (images: PostingDraftImage[]) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function choose() {
    if (busy || disabled || images.length >= 3) return;
    setBusy(true);
    onBusyChange(true);
    const selected: PostingDraftImage[] = [];
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], allowsEditing: false, allowsMultipleSelection: true,
        selectionLimit: 3 - images.length, orderedSelection: true,
      });
      if (result.canceled) return;
      for (const asset of result.assets.slice(0, 3 - images.length)) selected.push(await prepareLocalPostingImage(asset, userId));
      onChange([...images, ...selected]);
    } catch (error) {
      selected.forEach(image => removeLocalPostingImage(image, userId));
      Alert.alert("이미지를 추가하지 못했어요", error instanceof Error ? error.message : "다시 선택해 주세요.");
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-[15px] font-semibold text-hypo-text">이미지 · 선택</Text>
        <Text className="text-[13px] text-hypo-text-secondary">{images.length} / 3</Text>
      </View>
      <Text className="text-[13px] leading-5 text-hypo-text-secondary">첫 번째 이미지가 대표 이미지예요. JPG·PNG, 한 장당 3MB까지 올릴 수 있어요.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
        {images.map((image, index) => (
          <View key={image.localId} className="w-[120px] gap-1">
            <Image source={{ uri: image.localUri ?? image.url }} resizeMode="contain"
              accessibilityLabel={image.altText || `공고 이미지 ${index + 1}`} className="h-[100px] w-[120px] rounded-xl bg-hypo-surface" />
            <Text className="text-[12px] text-hypo-text-secondary">{index === 0 ? "대표 이미지" : `이미지 ${index + 1}`}</Text>
            <View className="flex-row">
              {index > 0 ? <Pressable disabled={busy || disabled} accessibilityRole="button" className="min-h-11 flex-1 justify-center"
                onPress={() => onChange([image, ...images.filter(item => item.localId !== image.localId)])}>
                <Text className="text-[13px] text-hypo-brand">대표로</Text>
              </Pressable> : null}
              <Pressable disabled={busy || disabled} accessibilityRole="button" accessibilityLabel={`이미지 ${index + 1} 제거`}
                className="min-h-11 flex-1 justify-center" onPress={() => onChange(images.filter(item => item.localId !== image.localId))}>
                <Text className="text-[13px] text-hypo-text-secondary">제거</Text>
              </Pressable>
            </View>
            <TextInput accessibilityLabel={`이미지 ${index + 1} 설명`} placeholder="이미지 설명 (선택)" maxLength={200}
              editable={!busy && !disabled && !image.uploadId && !image.imageId} value={image.altText ?? ""} className="min-h-11 text-[13px] text-hypo-text"
              onChangeText={altText => onChange(images.map(item => item.localId === image.localId ? { ...item, altText } : item))} />
          </View>
        ))}
      </ScrollView>
      {images.length < 3 ? <Pressable accessibilityRole="button" disabled={busy || disabled} onPress={() => void choose()}
        className="min-h-11 items-center justify-center rounded-xl border border-hypo-border px-4"
        style={({ pressed }) => ({ opacity: pressed || busy || disabled ? 0.6 : 1 })}>
        {busy ? <ActivityIndicator color={colors.brand} /> : <Text className="text-[14px] font-medium text-hypo-brand">이미지 추가</Text>}
      </Pressable> : null}
    </View>
  );
}
