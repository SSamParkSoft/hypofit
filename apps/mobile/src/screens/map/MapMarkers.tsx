import { memo, useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Marker } from "react-native-maps";
import { colors } from "@/shared/theme/tokens";

export const NativePostMarker = memo(function NativePostMarker({
  compensationLabel,
  id,
  latitude,
  longitude,
  onSelect,
  selected,
  viewed,
}: {
  compensationLabel: string;
  id: string;
  latitude: number;
  longitude: number;
  onSelect: (postId: string) => void;
  selected: boolean;
  viewed: boolean;
}) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const markerTone = selected ? "selected" : viewed ? "viewed" : "default";
  const markerFill = selected ? colors.brand : colors.surface;
  const markerBorder = selected ? colors.brand : colors.border;
  const markerText = selected ? colors.surface : colors.brandStrong;

  const handlePress = useCallback(() => {
    onSelect(id);
  }, [id, onSelect]);

  useEffect(() => {
    setTracksViewChanges(true);

    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, 360);

    return () => {
      clearTimeout(timer);
    };
  }, [compensationLabel, markerTone]);

  return (
    <Marker
      anchor={{ x: 0.5, y: 1 }}
      centerOffset={{ x: 0, y: -30 }}
      identifier={id}
      coordinate={{ latitude, longitude }}
      tracksViewChanges={tracksViewChanges}
      zIndex={selected ? 20 : 1}
      onPress={handlePress}
    >
      <View className="items-center p-1.5">
        <View
          className="min-h-8 min-w-[54px] items-center justify-center rounded-full px-2.5"
          style={{
            backgroundColor: markerFill,
            borderColor: markerBorder,
            borderWidth: 1,
            elevation: selected ? 3 : 1,
            shadowColor: colors.text,
            shadowOpacity: selected ? 0.14 : 0.08,
            shadowRadius: selected ? 5 : 3,
            shadowOffset: { width: 0, height: 2 },
            transform: [{ scale: selected ? 1.08 : 1 }],
          }}
        >
          <Text
            className="text-[11px] font-black leading-4"
            style={{ color: markerText }}
          >
            {compensationLabel}
          </Text>
        </View>
        <View
          style={{
            borderLeftColor: "transparent",
            borderLeftWidth: 6,
            borderRightColor: "transparent",
            borderRightWidth: 6,
            borderTopColor: markerFill,
            borderTopWidth: 7,
            height: 0,
            marginTop: -1,
            width: 0,
          }}
        />
      </View>
    </Marker>
  );
});

export const NativePostGroupMarker = memo(function NativePostGroupMarker({
  count,
  id,
  latitude,
  longitude,
  onSelect,
  selected,
}: {
  count: number;
  id: string;
  latitude: number;
  longitude: number;
  onSelect: (groupId: string) => void;
  selected: boolean;
}) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const markerFill = selected ? colors.brand : colors.surface;
  const markerBorder = selected ? colors.brand : colors.border;
  const markerText = selected ? colors.surface : colors.brandStrong;

  const handlePress = useCallback(() => {
    onSelect(id);
  }, [id, onSelect]);

  useEffect(() => {
    setTracksViewChanges(true);

    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, 360);

    return () => {
      clearTimeout(timer);
    };
  }, [count, selected]);

  return (
    <Marker
      anchor={{ x: 0.5, y: 1 }}
      centerOffset={{ x: 0, y: -16 }}
      coordinate={{ latitude, longitude }}
      identifier={id}
      tracksViewChanges={tracksViewChanges}
      zIndex={selected ? 20 : 1}
      onPress={handlePress}
    >
      <View className="items-center p-1.5">
        <View
          className="h-9 min-w-[52px] items-center justify-center rounded-full px-3"
          style={{
            backgroundColor: markerFill,
            borderColor: markerBorder,
            borderWidth: 1.5,
            elevation: selected ? 3 : 1,
            shadowColor: colors.text,
            shadowOpacity: selected ? 0.14 : 0.08,
            shadowRadius: selected ? 5 : 3,
            shadowOffset: { width: 0, height: 2 },
            transform: [{ scale: selected ? 1.05 : 1 }],
          }}
        >
          <Text className="text-[12px] font-black leading-4" style={{ color: markerText, fontFamily: "HypofitSansBold" }}>
            {count}
          </Text>
        </View>
        <View
          style={{
            borderLeftColor: "transparent",
            borderLeftWidth: 6,
            borderRightColor: "transparent",
            borderRightWidth: 6,
            borderTopColor: markerFill,
            borderTopWidth: 7,
            height: 0,
            marginTop: -1,
            width: 0,
          }}
        />
      </View>
    </Marker>
  );
});

export const NativeSearchPlaceMarker = memo(function NativeSearchPlaceMarker({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  return (
    <Marker
      anchor={{ x: 0.5, y: 0.5 }}
      coordinate={{ latitude, longitude }}
      identifier={`search-place-${latitude}-${longitude}`}
      tracksViewChanges={false}
    >
      <View className="h-9 w-9 items-center justify-center rounded-full border border-white bg-hypo-brand/15 shadow-lg">
        <View className="h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-hypo-brand">
          <View className="h-1.5 w-1.5 rounded-full bg-white" />
        </View>
      </View>
    </Marker>
  );
});
