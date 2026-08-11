export interface PlaceSearchResult {
  id: string;
  name: string;
  address: string | null;
  road_address: string | null;
  category: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  source: "kakao" | string;
}
