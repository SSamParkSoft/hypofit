import type { Region } from "react-native-maps";

export const defaultRegion: Region = {
  latitude: 37.296513,
  longitude: 126.83708,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

const minimumMapRadiusM = 800;

const maximumMapRadiusM = 20000;

const minimumSearchAreaMoveM = 250;

type MapPostCoordinates = {
  location_latitude: number;
  location_longitude: number;
};

export function getPostsInMapRegion<T extends MapPostCoordinates>(posts: T[], region: Region): T[] {
  const halfLatitude = Math.abs(region.latitudeDelta) / 2;
  const halfLongitude = Math.abs(region.longitudeDelta) / 2;

  return posts.filter((post) => {
    const latitudeDistance = Math.abs(post.location_latitude - region.latitude);
    const longitudeDistance = Math.abs(
      ((post.location_longitude - region.longitude + 540) % 360) - 180,
    );

    return latitudeDistance <= halfLatitude && longitudeDistance <= halfLongitude;
  });
}

export function getRegionSearchRadiusM(region: Region) {
  const latitudeMeters = Math.abs(region.latitudeDelta) * 111_320 * 0.5;
  const longitudeMeters = Math.abs(region.longitudeDelta) * 111_320 * Math.cos(toRadians(region.latitude)) * 0.5;
  const diagonalRadius = Math.sqrt(latitudeMeters ** 2 + longitudeMeters ** 2);

  return Math.round(clampNumber(diagonalRadius * 1.15, minimumMapRadiusM, maximumMapRadiusM));
}

export function hasMeaningfulRegionChange(next: Region, lastSearched: Region) {
  const centerDistanceM = getCoordinateDistanceM(
    next.latitude,
    next.longitude,
    lastSearched.latitude,
    lastSearched.longitude,
  );
  const minimumCenterDistanceM = Math.max(minimumSearchAreaMoveM, getRegionSearchRadiusM(lastSearched) * 0.2);
  const zoomChanged =
    Math.abs(next.latitudeDelta - lastSearched.latitudeDelta) / Math.max(lastSearched.latitudeDelta, 0.0001) > 0.18 ||
    Math.abs(next.longitudeDelta - lastSearched.longitudeDelta) / Math.max(lastSearched.longitudeDelta, 0.0001) > 0.18;

  return centerDistanceM >= minimumCenterDistanceM || zoomChanged;
}

function clampNumber(value: number, lower: number, upper: number) {
  if (!Number.isFinite(value)) {
    return lower;
  }

  return Math.max(lower, Math.min(value, upper));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getCoordinateDistanceM(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number) {
  const latitudeMeters = (latitudeA - latitudeB) * 111_320;
  const longitudeMeters = (longitudeA - longitudeB) * 111_320 * Math.cos(toRadians((latitudeA + latitudeB) / 2));

  return Math.sqrt(latitudeMeters ** 2 + longitudeMeters ** 2);
}
