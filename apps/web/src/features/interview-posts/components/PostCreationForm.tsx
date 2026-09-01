import { type FormEvent, useState } from "react";

import { loadKakaoMaps, type KakaoKeywordSearchResult } from "../../../shared/map/kakaoMapLoader";
import { Button } from "../../../shared/ui/button";
import { cn } from "../../../shared/ui/cn";
import { Field, SelectInput, TextareaInput, TextInput } from "../../../shared/ui/field";
import { type PostCreationFormValues, validatePostCreation } from "./postCreationValidation";

interface PostCreationFormProps {
  errorMessage?: string | null;
  hideCancelAction?: boolean;
  hideHeader?: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: PostCreationFormValues) => void;
}

const initialValues: PostCreationFormValues = {
  durationMinutes: "30",
  interviewMode: "online",
  location: "",
  locationAddress: "",
  locationLatitude: null,
  locationLongitude: null,
  locationPlaceName: "",
  locationPrecision: "nearby",
  locationSource: null,
  rewardAmount: "15000",
  scheduleOptions: "평일 저녁\n주말 오전",
  serviceSummary: "",
  status: "open",
  targetDescription: "",
  title: "",
};

export function PostCreationForm({
  errorMessage,
  hideCancelAction,
  hideHeader,
  isSubmitting,
  onCancel,
  onSubmit,
}: PostCreationFormProps) {
  const [values, setValues] = useState<PostCreationFormValues>(initialValues);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<KakaoKeywordSearchResult[]>([]);
  const [placeSearchError, setPlaceSearchError] = useState<string | null>(null);
  const [isPlaceSearching, setIsPlaceSearching] = useState(false);
  const errorFor = (message: string) => (validationError === message ? message : null);
  const requiresLocation = values.interviewMode !== "online";

  function updateValue<K extends keyof PostCreationFormValues>(
    key: K,
    value: PostCreationFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function searchPlaces() {
    const query = placeQuery.trim();

    if (!query) {
      setPlaceSearchError("검색할 장소를 입력하세요.");
      return;
    }

    const appKey = import.meta.env.VITE_KAKAO_MAP_APP_KEY as string | undefined;

    if (!appKey) {
      setPlaceSearchError("Kakao Maps 키가 설정되지 않았습니다.");
      return;
    }

    setIsPlaceSearching(true);
    setPlaceSearchError(null);

    try {
      const kakaoMaps = await loadKakaoMaps(appKey);
      const places = new kakaoMaps.maps.services.Places();
      places.keywordSearch(query, (results, status) => {
        setIsPlaceSearching(false);
        if (status !== kakaoMaps.maps.services.Status.OK || !results.length) {
          setPlaceResults([]);
          setPlaceSearchError("검색 결과가 없습니다. 역, 학교, 동네 이름으로 다시 찾아보세요.");
          return;
        }

        setPlaceResults(results.slice(0, 5));
      });
    } catch {
      setIsPlaceSearching(false);
      setPlaceResults([]);
      setPlaceSearchError("장소 검색을 불러오지 못했습니다.");
    }
  }

  function selectPlace(place: KakaoKeywordSearchResult) {
    const latitude = Number(place.y);
    const longitude = Number(place.x);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setPlaceSearchError("선택한 장소의 좌표를 확인하지 못했습니다.");
      return;
    }

    const placeName = place.place_name ?? placeQuery.trim();
    const address = place.road_address_name || place.address_name || "";

    setValues((current) => ({
      ...current,
      location: current.locationPrecision === "exact" ? placeName : `${placeName} 근처`,
      locationAddress: address,
      locationLatitude: latitude,
      locationLongitude: longitude,
      locationPlaceName: placeName,
      locationSource: "kakao_place",
    }));
    setPlaceQuery(placeName);
    setPlaceResults([]);
    setPlaceSearchError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextValidationError = validatePostCreation(values);

    if (nextValidationError) {
      setValidationError(nextValidationError);
      return;
    }

    setValidationError(null);
    onSubmit(values);
  }

  return (
    <form
      className="rounded-hypo-lg bg-hypo-surface px-4 py-5 sm:border sm:border-hypo-border sm:px-6 sm:py-6 sm:shadow-hypo-panel"
      onSubmit={handleSubmit}
    >
      {hideHeader ? null : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold leading-7 text-hypo-text">모집글 만들기</h2>
            <p className="mt-1 text-sm leading-6 text-hypo-text-muted">
              찾는 고객, 사례비, 진행 방식, 가능한 시간을 명확히 적어야 응답자가 빠르게 판단할 수
              있습니다.
            </p>
          </div>
          {hideCancelAction ? null : (
            <Button variant="ghost" onClick={onCancel}>
              닫기
            </Button>
          )}
        </div>
      )}

      <div className={hideHeader ? "grid gap-x-4 gap-y-5 lg:grid-cols-2" : "mt-6 grid gap-x-4 gap-y-5 lg:grid-cols-2"}>
        <Field className="lg:col-span-2" label="제목" error={errorFor("모집글 제목을 입력하세요.")}>
          <TextInput
            required
            value={values.title}
            placeholder="예: 1인 가구 식재료 낭비 문제 인터뷰"
            onChange={(event) => updateValue("title", event.target.value)}
          />
        </Field>

        <Field
          className="lg:col-span-2"
          label="서비스 설명"
          error={errorFor("검증하려는 서비스와 문제 상황을 입력하세요.")}
        >
          <TextareaInput
            required
            value={values.serviceSummary}
            placeholder="검증하려는 서비스와 문제 상황을 짧게 설명하세요."
            onChange={(event) => updateValue("serviceSummary", event.target.value)}
          />
        </Field>

        <Field
          className="lg:col-span-2"
          label="찾는 응답자 조건"
          error={errorFor("찾는 응답자 조건을 구체적으로 입력하세요.")}
        >
          <TextareaInput
            required
            value={values.targetDescription}
            placeholder="예: 최근 3개월 내 직접 장을 보고 남은 식재료를 버린 경험이 있는 1인 가구"
            onChange={(event) => updateValue("targetDescription", event.target.value)}
          />
        </Field>

        <Field label="사례비" error={errorFor("사례비는 0원 이상의 숫자로 입력하세요.")}>
          <div className="relative">
            <TextInput
              required
              className="pr-12"
              inputMode="numeric"
              min={0}
              type="number"
              value={values.rewardAmount}
              onChange={(event) => updateValue("rewardAmount", event.target.value)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-sm font-bold text-hypo-text-muted">
              원
            </span>
          </div>
        </Field>

        <Field
          label="예상 소요 시간"
          error={errorFor("예상 소요 시간은 5분 이상으로 입력하세요.")}
        >
          <div className="relative">
            <TextInput
              required
              className="pr-12"
              inputMode="numeric"
              min={5}
              type="number"
              value={values.durationMinutes}
              onChange={(event) => updateValue("durationMinutes", event.target.value)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-sm font-bold text-hypo-text-muted">
              분
            </span>
          </div>
        </Field>

        <Field label="진행 방식">
          <SelectInput
            value={values.interviewMode}
            onChange={(event) =>
              updateValue(
                "interviewMode",
                event.target.value as PostCreationFormValues["interviewMode"],
              )
            }
          >
            <option value="online">화상</option>
            <option value="offline">대면</option>
            <option value="both">대면/화상</option>
          </SelectInput>
        </Field>

        {requiresLocation ? (
          <div className="grid gap-3 lg:col-span-2">
            <Field label="장소 검색" error={errorFor("대면 인터뷰 장소를 선택하세요.")}>
              <div className="flex gap-2">
                <TextInput
                  value={placeQuery}
                  placeholder="장소, 역, 학교를 검색해요"
                  onChange={(event) => setPlaceQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void searchPlaces();
                    }
                  }}
                />
                <Button
                  className="min-h-11 shrink-0 px-4 text-xs"
                  disabled={isPlaceSearching}
                  type="button"
                  variant="secondary"
                  onClick={() => void searchPlaces()}
                >
                  {isPlaceSearching ? "검색 중" : "검색"}
                </Button>
              </div>
            </Field>

            {placeSearchError ? (
              <p className="rounded-hypo-md bg-hypo-danger/10 px-3 py-2 text-xs font-bold text-hypo-danger">
                {placeSearchError}
              </p>
            ) : null}

            {placeResults.length ? (
              <div className="grid gap-1 rounded-hypo-lg border border-hypo-border bg-hypo-surface p-1">
                {placeResults.map((place) => (
                  <button
                    key={`${place.place_name}-${place.x}-${place.y}`}
                    className="rounded-hypo-md px-3 py-2 text-left transition-colors hover:bg-hypo-bg"
                    type="button"
                    onClick={() => selectPlace(place)}
                  >
                    <span className="block text-sm font-semibold leading-5 text-hypo-text">
                      {place.place_name ?? "검색 장소"}
                    </span>
                    <span className="mt-0.5 block text-xs font-medium leading-[18px] text-hypo-text-muted">
                      {place.road_address_name || place.address_name || "주소 정보 없음"}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {values.locationLatitude !== null && values.locationLongitude !== null ? (
              <div className="rounded-hypo-lg border border-hypo-border bg-hypo-bg px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold leading-[18px] text-hypo-brand">선택한 장소</p>
                    <p className="mt-1 truncate text-sm font-semibold leading-5 text-hypo-text">
                      {values.locationPlaceName || values.location}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs font-medium leading-[18px] text-hypo-text-muted">
                      {values.locationAddress || "지도 좌표가 저장됩니다."}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-hypo-lg border border-hypo-border bg-hypo-surface px-2.5 py-1 text-[11px] font-semibold leading-4 text-hypo-text-muted">
                    등록됨
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    { label: "동네만 공개", value: "nearby" as const },
                    { label: "정확한 장소", value: "exact" as const },
                  ].map((option) => (
                    <button
                      key={option.value}
                      className={cn(
                        "min-h-10 rounded-hypo-lg border px-3 text-xs font-semibold leading-[18px] transition-colors",
                        values.locationPrecision === option.value
                          ? "border-hypo-brand bg-hypo-brand text-white"
                          : "border-hypo-border bg-hypo-surface text-hypo-text-muted hover:border-hypo-brand/35 hover:text-hypo-text",
                      )}
                      type="button"
                      onClick={() => {
                        setValues((current) => ({
                          ...current,
                          locationPrecision: option.value,
                          location:
                            option.value === "exact"
                              ? current.locationPlaceName || current.location
                              : `${current.locationPlaceName || current.location.replace(/\s*근처$/g, "")} 근처`,
                        }));
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <Field className="lg:col-span-2" label="가능 시간">
          <TextareaInput
            value={values.scheduleOptions}
            placeholder="한 줄에 하나씩 입력하세요."
            onChange={(event) => updateValue("scheduleOptions", event.target.value)}
          />
        </Field>
      </div>

      {errorMessage ? (
        <p className="mt-4 text-sm font-bold text-hypo-danger" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-hypo-border pt-5">
        {hideCancelAction ? null : (
          <Button variant="secondary" onClick={onCancel}>
            취소
          </Button>
        )}
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "저장 중" : "모집글 저장"}
        </Button>
      </div>
    </form>
  );
}
