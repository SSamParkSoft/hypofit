import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { type PostingCreationDraft } from "@/features/postings/postingCreationDraft";
import { usePlaceSearch } from "@/features/places/usePlaceSearch";
import type { PlaceSearchResult } from "@/features/places/placesApi";
import { colors } from "@/shared/theme/tokens";
import { InlineError, SectionLabel, SelectableRow } from "./CreationFormControls";

export function CreationLocationChooser({
  draft,
  error,
  inputRef,
  onUpdate,
}: {
  draft: PostingCreationDraft;
  error?: string;
  inputRef?: (input: TextInput | null) => void;
  onUpdate: (patch: Partial<PostingCreationDraft>) => void;
}) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const placeSearch = usePlaceSearch(
    submittedQuery ? { query: submittedQuery, limit: 5 } : null,
  );
  const selectPlace = (place: PlaceSearchResult) =>
    onUpdate({
      location: place.name,
      locationPlaceName: place.name,
      locationAddress: place.road_address ?? place.address ?? "",
      locationLatitude: place.latitude,
      locationLongitude: place.longitude,
      locationSource: place.source,
    });
  return (
    <View className="gap-2">
      <SectionLabel>위치</SectionLabel>
      <View className="flex-row gap-2">
        <TextInput
          accessibilityLabel="장소 검색"
          className="h-[52px] min-w-0 flex-1 rounded-[12px] border border-hypo-border bg-hypo-surface px-4 text-[15px] text-hypo-text"
          placeholder="장소, 역, 학교를 검색해요"
          placeholderTextColor={colors.textSoft}
          ref={inputRef}
          returnKeyType="search"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => setSubmittedQuery(query.trim() || null)}
        />
        <Pressable
          accessibilityLabel="장소 검색"
          accessibilityRole="button"
          className="h-[52px] justify-center rounded-[12px] bg-hypo-surfaceMuted px-4"
          disabled={placeSearch.isFetching}
          onPress={() => setSubmittedQuery(query.trim() || null)}
        >
          <Text className="text-[14px] font-semibold text-hypo-text">검색</Text>
        </Pressable>
      </View>
      {submittedQuery && placeSearch.isError ? (
        <InlineError message="장소 검색을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." />
      ) : null}
      {submittedQuery && !placeSearch.isFetching && !placeSearch.isError ? (
        <View className="border-t border-hypo-border">
          {(placeSearch.data ?? []).map((place) => (
            <SelectableRow
              key={place.id}
              description={
                place.road_address ?? place.address ?? "주소 정보 없음"
              }
              isSelected={
                draft.locationLatitude === place.latitude &&
                draft.locationLongitude === place.longitude
              }
              label={place.name}
              onPress={() => selectPlace(place)}
            />
          ))}
          {!(placeSearch.data ?? []).length ? (
            <Text className="pt-2 text-[13px] text-hypo-text-secondary">
              검색 결과가 없어요. 다른 장소 이름으로 찾아보세요.
            </Text>
          ) : null}
        </View>
      ) : null}
      {draft.locationPlaceName ? (
        <Text className="text-[12px] leading-[18px] text-hypo-text-secondary">
          선택한 장소: {draft.locationPlaceName}
          {draft.locationAddress ? ` · ${draft.locationAddress}` : ""}
        </Text>
      ) : (
        <Text className="text-[12px] leading-[18px] text-hypo-text-secondary">
          대면 진행에는 지도에 표시할 장소를 선택해 주세요.
        </Text>
      )}
      {error ? <InlineError message={error} /> : null}
    </View>
  );
}
