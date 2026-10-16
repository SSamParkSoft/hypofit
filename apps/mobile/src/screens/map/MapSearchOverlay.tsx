import { type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { GlassView } from "expo-glass-effect";
import type { PlaceSearchResult } from "@/features/places/placesApi";
import { SearchField } from "@/shared/ui/SearchField";
import { colors } from "@/shared/theme/tokens";
import type { MapModeFilter } from "./mapTypes";

const mapModeFilters: Array<{ label: string; value: MapModeFilter }> = [
  { label: "전체", value: "all" },
  { label: "대면", value: "offline" },
  { label: "대면/화상", value: "both" },
];

export function MapBanner({ title }: { title: string }) {
  return (
    <View className="rounded-[14px] border border-hypo-border bg-hypo-surface px-3 py-2">
      <Text className="text-center text-xs font-bold leading-4 text-hypo-muted">{title}</Text>
    </View>
  );
}

export function MapControlSurface({
  children,
  glassAvailable,
  selected = false,
  radius = 999,
}: {
  children: ReactNode;
  glassAvailable: boolean;
  selected?: boolean;
  radius?: number;
}) {
  return (
    <View>
      <View
        className="absolute inset-0"
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {glassAvailable ? (
          <GlassView
            glassEffectStyle="regular"
            colorScheme="light"
            isInteractive
            tintColor={selected ? colors.brand : undefined}
            style={{ flex: 1, borderRadius: radius }}
          />
        ) : (
          <View
            className={`flex-1 border ${selected ? "border-hypo-brand bg-hypo-brand" : "border-hypo-border bg-hypo-surface"}`}
            style={{ borderRadius: radius }}
          />
        )}
      </View>
      {children}
    </View>
  );
}

export function MapSearchOverlay({
  activeFilter,
  glassAvailable,
  isDropdownOpen,
  isCurrentLocationBusy,
  isSearching,
  onFilterChange,
  onCurrentLocationPress,
  onFocus,
  onQueryChange,
  onResultPress,
  onSubmit,
  query,
  results,
  selectedPlaceId,
  searchError,
  showEmptyResult,
  topInset,
}: {
  activeFilter: MapModeFilter;
  glassAvailable: boolean;
  isDropdownOpen: boolean;
  isCurrentLocationBusy: boolean;
  isSearching: boolean;
  onFilterChange: (filter: MapModeFilter) => void;
  onCurrentLocationPress: () => void;
  onFocus: () => void;
  onQueryChange: (value: string) => void;
  onResultPress: (place: PlaceSearchResult) => void;
  onSubmit: () => void;
  query: string;
  results: PlaceSearchResult[];
  selectedPlaceId: string | null;
  searchError: string | null;
  showEmptyResult: boolean;
  topInset: number;
}) {
  const shouldShowDropdown = isDropdownOpen && (
    Boolean(searchError) ||
    isSearching ||
    showEmptyResult ||
    results.length > 0
  );

  return (
    <View className="absolute left-4 right-4 z-30 gap-2" style={{ top: topInset + 8 }}>
      <MapControlSurface glassAvailable={glassAvailable} radius={14}>
        <SearchField
          accessibilityLabel="지역, 역, 학교 검색"
          blurOnSubmit
          containerClassName="h-[52px] rounded-[14px] border-0 bg-transparent"
          iconColor={colors.textMuted}
          placeholder="지역, 역, 학교 검색"
          returnKeyType="search"
          value={query}
          onChangeText={onQueryChange}
          onFocus={onFocus}
          onSubmitEditing={onSubmit}
        />
      </MapControlSurface>

      <View className="flex-row items-center gap-2">
        <ScrollView
          horizontal
          className="min-w-0 flex-1"
          style={{ overflow: "visible" }}
          contentContainerClassName="gap-1.5"
          showsHorizontalScrollIndicator={false}
        >
          {mapModeFilters.map((filter) => {
            const isActive = filter.value === activeFilter;

            return (
              <Pressable
                key={filter.value}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => onFilterChange(filter.value)}
                style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
              >
                <MapControlSurface glassAvailable={glassAvailable} selected={isActive}>
                  <View className="min-h-11 justify-center px-3">
                    <Text className={`text-[12px] font-semibold ${isActive ? "text-white" : "text-hypo-text"}`}>
                      {filter.label}
                    </Text>
                  </View>
                </MapControlSurface>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          accessibilityLabel="내 주변 보기"
          accessibilityRole="button"
          accessibilityState={{ disabled: isCurrentLocationBusy }}
          disabled={isCurrentLocationBusy}
          hitSlop={6}
          onPress={onCurrentLocationPress}
          style={({ pressed }) => ({
            opacity: isCurrentLocationBusy ? 0.48 : pressed ? 0.76 : 1,
          })}
        >
          <MapControlSurface glassAvailable={glassAvailable}>
            <View className="h-11 w-11 items-center justify-center">
              <Feather color={colors.brand} name="crosshair" size={18} />
            </View>
          </MapControlSurface>
        </Pressable>
      </View>

      {shouldShowDropdown ? (
        <View className="overflow-hidden rounded-[14px] border border-hypo-border bg-hypo-surface/95">
          {searchError ? (
            <PlaceSuggestionStatus
              icon="alert-circle"
              title={searchError}
              tone="danger"
            />
          ) : null}

          {!searchError && isSearching ? (
            <PlaceSuggestionStatus
              icon="loader"
              title="지역을 찾고 있어요"
              tone="brand"
            />
          ) : null}

          {!searchError && !isSearching && showEmptyResult ? (
            <PlaceSuggestionStatus
              icon="map-pin"
              title="검색 결과가 없어요"
              body="다른 지역명이나 역 이름으로 검색해보세요"
              tone="muted"
            />
          ) : null}

          {results.map((place) => (
            <PlaceSuggestionRow
              key={place.id}
              isSelected={place.id === selectedPlaceId}
              place={place}
              onPress={() => onResultPress(place)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function PlaceSuggestionStatus({
  body,
  icon,
  title,
  tone,
}: {
  body?: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  tone: "brand" | "danger" | "muted";
}) {
  const iconColor = tone === "danger" ? "#B42318" : tone === "brand" ? colors.brand : "#69716C";
  const titleColor = tone === "danger" ? "text-hypo-danger" : tone === "brand" ? "text-hypo-brand" : "text-hypo-muted";

  return (
    <View className="min-h-[54px] flex-row items-center gap-2.5 px-3 py-2.5">
      <Feather color={iconColor} name={icon} size={16} />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className={`text-xs font-black leading-5 ${titleColor}`}>
          {title}
        </Text>
        {body ? (
          <Text numberOfLines={1} className="text-[11px] font-bold leading-4 text-hypo-muted">
            {body}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function PlaceSuggestionRow({
  isSelected,
  onPress,
  place,
}: {
  isSelected: boolean;
  onPress: () => void;
  place: PlaceSearchResult;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      className="min-h-[56px] flex-row items-center gap-2.5 border-t border-hypo-border/70 px-3 py-2.5"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed || isSelected ? "#E7F1EE" : "transparent",
      })}
    >
      <View className="h-8 w-8 items-center justify-center rounded-full bg-[#EEF3EF]">
        <Feather color={isSelected ? colors.brand : "#69716C"} name="map-pin" size={15} />
      </View>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-[13px] font-black leading-5 text-hypo-text">
          {place.name}
        </Text>
        <Text numberOfLines={1} className="text-[11px] font-bold leading-4 text-hypo-muted">
          {place.road_address || place.address || "좌표로 이동합니다"}
        </Text>
      </View>
    </Pressable>
  );
}
