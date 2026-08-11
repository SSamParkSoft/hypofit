export interface KakaoLatLng {
  getLat: () => number;
  getLng: () => number;
}

export interface KakaoMap {
  relayout: () => void;
  getCenter: () => KakaoLatLng;
  getBounds: () => KakaoLatLngBounds;
  setCenter: (latLng: KakaoLatLng) => void;
  setLevel: (level: number) => void;
}

export interface KakaoLatLngBounds {
  getNorthEast: () => KakaoLatLng;
  getSouthWest: () => KakaoLatLng;
}

export interface KakaoCustomOverlay {
  setMap: (map: KakaoMap | null) => void;
}

export interface KakaoKeywordSearchResult {
  address_name?: string;
  road_address_name?: string;
  place_name?: string;
  x: string;
  y: string;
}

export interface KakaoMapsGlobal {
  maps: {
    load: (callback: () => void) => void;
    LatLng: new (lat: number, lng: number) => KakaoLatLng;
    Map: new (
      container: HTMLElement,
      options: { center: KakaoLatLng; level: number },
    ) => KakaoMap;
    CustomOverlay: new (options: {
      clickable?: boolean;
      content: HTMLElement | string;
      map?: KakaoMap;
      position: KakaoLatLng;
      xAnchor?: number;
      yAnchor?: number;
      zIndex?: number;
    }) => KakaoCustomOverlay;
    event: {
      addListener: (target: KakaoMap, type: string, callback: () => void) => void;
      removeListener: (target: KakaoMap, type: string, callback: () => void) => void;
    };
    services: {
      Places: new () => {
        keywordSearch: (
          keyword: string,
          callback: (
            result: KakaoKeywordSearchResult[],
            status: string,
          ) => void,
        ) => void;
      };
      Status: {
        OK: string;
      };
    };
  };
}

declare global {
  interface Window {
    kakao?: KakaoMapsGlobal;
  }
}

let kakaoMapsPromise: Promise<KakaoMapsGlobal> | null = null;

export function loadKakaoMaps(appKey: string) {
  if (!appKey) {
    return Promise.reject(new Error("Missing Kakao Maps app key"));
  }

  if (window.kakao?.maps) {
    return new Promise<KakaoMapsGlobal>((resolve) => {
      window.kakao?.maps.load(() => resolve(window.kakao as KakaoMapsGlobal));
    });
  }

  if (kakaoMapsPromise) {
    return kakaoMapsPromise;
  }

  kakaoMapsPromise = new Promise<KakaoMapsGlobal>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-hypofit-kakao-map="true"]',
    );

    const handleLoad = () => {
      if (!window.kakao?.maps) {
        reject(new Error("Kakao Maps SDK did not initialize"));
        return;
      }

      window.kakao.maps.load(() => resolve(window.kakao as KakaoMapsGlobal));
    };

    if (existingScript) {
      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load Kakao Maps SDK")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.dataset.hypofitKakaoMap = "true";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`;
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Failed to load Kakao Maps SDK")),
      { once: true },
    );
    document.head.appendChild(script);
  });

  return kakaoMapsPromise;
}
