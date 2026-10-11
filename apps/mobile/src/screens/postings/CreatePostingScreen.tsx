import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { Compensation, InterviewPost, PostingType } from "@hypofit/contracts";
import { postingTypeLabels } from "@hypofit/contracts";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  serializePostingCreationDraft,
  type CreationStep,
  type PostingCreationDraft,
} from "@/features/postings/postingCreationDraft";
import { useCreatePosting } from "@/features/postings/useCreatePosting";
import {
  getPostingStepIssues,
  getPostingDraftIssue,
  toggleBetaPlatform,
} from "@/features/postings/postingCreationMethod";
import {
  getCreatablePostingTypes,
  getPostingCreationCapabilityError,
} from "@/features/postings/postingCreationCapability";
import {
  usePostingCreationCapabilities,
  useUpdatePosting,
} from "@/features/postings/usePostings";
import { serializePostingEditDraft } from "@/features/postings/postingCreationPayload";
import { StateMessage } from "@/shared/ui/StateMessage";
import { goBackOrReplaceFallback, resolveReturnTo } from "@/shared/navigation/backNavigation";
import {
  getApiValidationField,
  getPublishErrorMessage,
  getStepForValidationField,
  resolveAttentionField,
} from "./creation/creationValidation";
import { CreationHeader, ProgressIndicator } from "./creation/CreationNavigation";
import { stepTitle } from "./creation/creationStepContent";
import { InlineError } from "./creation/CreationFormControls";
import { CreationTypeStep } from "./creation/CreationTypeStep";
import { CreationContentStep } from "./creation/CreationContentStep";
import { CreationMethodStep } from "./creation/CreationMethodStep";
import { CreationConditionsStep } from "./creation/CreationConditionsStep";
import { CreationReviewStep } from "./creation/CreationReviewStep";
import { usePostingDraft } from "./creation/usePostingDraft";
import { removeLocalPostingImage, uploadPostingDraftImages } from "@/features/postings/postingImageFiles";
import { postingImagesApi } from "@/features/postings/postingImagesApi";
import type { PostingDraftImage } from "@/features/postings/postingCreationDraft";

export function CreatePostingScreen({ initialPost }: { initialPost?: InterviewPost } = {}) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return (
    <PostingCreationForm
      key={`${userId ?? "signed-out"}:${initialPost?.id ?? "new"}`}
      initialPost={initialPost}
      userId={userId}
    />
  );
}

function PostingCreationForm({ initialPost, userId }: { initialPost?: InterviewPost; userId: string | null }) {
  const params = useLocalSearchParams<{
    returnTo?: string | string[];
    draftAction?: "new" | "resume" | string[];
  }>();
  const backTo = resolveReturnTo(params.returnTo, "/(tabs)/interviews");
  const shouldRestoreDraft = params.draftAction === "resume";
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const isEditing = Boolean(initialPost);
  const createPost = useCreatePosting(accessToken);
  const updatePost = useUpdatePosting(accessToken);
  const [isPreparingImages, setIsPreparingImages] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const isSubmitting = isUploadingImages || (isEditing ? updatePost.isPending : createPost.isPending);
  const isBusy = isPreparingImages || isSubmitting;
  const creationCapabilities = usePostingCreationCapabilities(accessToken);
  const [step, setStep] = useState<CreationStep>(1);
  const submitLock = useRef(false);
  const isActive = useRef(true);
  const onRestoreExit = useCallback(() => goBackOrReplaceFallback(backTo), [backTo]);
  const {
    completeDraft, draft, draftStatus, editBaseline, isDraftReady,
    persistDraft, setDraft, setDraftStatus,
  } = usePostingDraft({ initialPost, onRestoreExit, shouldRestoreDraft, userId });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationField, setValidationField] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const fieldViews = useRef<Record<string, View | null>>({});
  const pendingAttentionField = useRef<string | null>(null);
  const shouldFocusValidation = useRef(false);
  const focusTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isActive.current = true;
    return () => { isActive.current = false; };
  }, []);
  const enabledTypes = getCreatablePostingTypes(creationCapabilities.data);
  const directParticipationTypes: PostingType[] =
    enabledTypes.includes("survey") &&
    creationCapabilities.data?.direct_participation_recruitment_types.includes("survey")
      ? ["survey"]
      : [];
  const capabilityError = isEditing ? null : getPostingCreationCapabilityError(draft, creationCapabilities.data);
  useEffect(
    () => () => {
      if (focusTimeout.current) clearTimeout(focusTimeout.current);
    },
    [],
  );

  const updateDraft = (patch: Partial<PostingCreationDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setValidationError(null);
    setValidationField(null);
  };
  const scrollToValidationField = useCallback((field: string | null) => {
    const attentionField = resolveAttentionField(field);
    if (!attentionField) return;

    const fieldView = fieldViews.current[attentionField];
    const contentNode = scrollViewRef.current?.getInnerViewNode();
    if (!fieldView || !contentNode) {
      pendingAttentionField.current = attentionField;
      return;
    }

    pendingAttentionField.current = null;
    fieldView.measureLayout(contentNode, (_x, y) => {
      scrollViewRef.current?.scrollTo({ animated: true, y: Math.max(y - 24, 0) });
      const input = inputRefs.current[attentionField];
      if (!input) return;
      if (focusTimeout.current) clearTimeout(focusTimeout.current);
      focusTimeout.current = setTimeout(() => input.focus(), 140);
    });
  }, []);
  const registerFieldLayout = useCallback((field: string, view: View | null) => {
    fieldViews.current[field] = view;
    if (pendingAttentionField.current === field) {
      requestAnimationFrame(() => scrollToValidationField(field));
    }
  }, [scrollToValidationField]);
  const registerInputRef = useCallback(
    (field: string) => (input: TextInput | null) => {
      inputRefs.current[field] = input;
    },
    [],
  );
  useEffect(() => {
    if (!validationField || !shouldFocusValidation.current) return;
    const frame = requestAnimationFrame(() =>
      scrollToValidationField(validationField),
    );
    return () => cancelAnimationFrame(frame);
  }, [scrollToValidationField, step, validationField]);
  const validateField = (field: string) => {
    shouldFocusValidation.current = false;
    const issue = getPostingStepIssues(step, draft, isEditing ? editBaseline : undefined)
      .find((candidate) => candidate.field === field);
    if (issue || validationField === field) {
      setValidationField(issue?.field ?? null);
      setValidationError(issue?.message ?? null);
    }
  };
  const toggle = (
    field: "betaPlatforms" | "recurringWindows",
    value: string,
  ) => {
    setDraft((current) => ({
      ...current,
      [field]: field === "betaPlatforms" ? toggleBetaPlatform(current.betaPlatforms, value) : current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
    setValidationError(null);
    setValidationField(null);
  };
  const chooseType = (type: PostingType) =>
    updateDraft({
      type,
      entryMode: directParticipationTypes.includes(type)
        ? draft.entryMode
        : "application_required",
      interviewMode: type === "interview" || type === "research_experiment" ? draft.interviewMode : "online",
      ...((type === "interview" || type === "research_experiment") && draft.scheduleMode === "none"
        ? { scheduleMode: "negotiated" as const } : {}),
      ...(type === "interview" && draft.recruitmentLimitMode === "unlimited"
        ? { recruitmentLimitMode: "limited", recruitmentCount: "10" }
        : type !== "interview" &&
            draft.type === "interview" &&
            draft.recruitmentLimitMode === "limited" &&
            draft.recruitmentCount === "10"
          ? { recruitmentLimitMode: "unlimited", recruitmentCount: "" }
          : {}),
    });
  const addSlot = (value: string) => {
    if (!value || draft.fixedSlots.includes(value)) return;
    updateDraft({ fixedSlots: [...draft.fixedSlots, value] });
  };
  const updateCompensation = (index: number, patch: Partial<Compensation>) => {
    setDraft((current) => ({
      ...current,
      compensations: current.compensations.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
    setValidationError(null);
    setValidationField(null);
  };
  const next = () => {
    if (capabilityError) {
      setStep(1);
      return;
    }
    const issue = getPostingStepIssues(step, draft, initialPost ? editBaseline : undefined)[0];
    if (issue) {
      shouldFocusValidation.current = true;
      setValidationError(issue.message);
      setValidationField(issue.field);
      scrollToValidationField(issue.field);
      return;
    }
    setValidationError(null);
    setValidationField(null);
    setStep((current) => Math.min(current + 1, 5) as CreationStep);
  };
  const changeImages = (images: PostingDraftImage[]) => {
    const removed = (draft.images ?? []).filter(image => !images.some(next => next.localId === image.localId));
    const snapshot = { ...draft, images };
    updateDraft({ images });
    void persistDraft(snapshot).then(async () => {
      for (const image of removed) {
        removeLocalPostingImage(image, userId!);
        const assetId = image.imageId ?? image.uploadId;
        if (assetId && accessToken && !initialPost?.images?.some(existing => existing.id === assetId)) {
          await postingImagesApi.cancel(assetId, accessToken).catch(() => undefined);
        }
      }
    }).catch(() => setDraftStatus("failed"));
  };
  const publish = async () => {
    if (capabilityError) {
      setStep(1);
      return;
    }
    if (!userId || !accessToken || isBusy || submitLock.current) return;
    const issue = getPostingDraftIssue(draft, initialPost ? editBaseline : undefined);
    if (issue) {
      shouldFocusValidation.current = true;
      setValidationError(issue.message);
      setValidationField(issue.field);
      setStep(issue.step);
      return;
    }
    const onError = (error: Error) => {
      submitLock.current = false;
      const field = getApiValidationField(error);
      shouldFocusValidation.current = true;
      setValidationError(getPublishErrorMessage(error));
      setValidationField(field);
      const issueStep = getStepForValidationField(field);
      if (issueStep) setStep(issueStep);
    };
    submitLock.current = true;
    setIsUploadingImages(true);
    let preparedDraft = draft;
    try {
      await persistDraft(draft);
      if (draft.images?.some(image => !image.imageId) && !creationCapabilities.data?.posting_images_enabled) {
        throw new Error("이미지 기능을 사용할 수 없어요. 이미지를 제거하거나 잠시 후 다시 시도해 주세요.");
      }
      const images = await uploadPostingDraftImages(draft.images ?? [], accessToken, async images => {
        preparedDraft = { ...draft, images: images.map(image => ({ ...image })) };
        setDraft(preparedDraft);
        await persistDraft(preparedDraft);
      });
      preparedDraft = { ...draft, images };
      setDraft(preparedDraft);
      await persistDraft(preparedDraft);
    } catch (error) {
      submitLock.current = false;
      setValidationError(error instanceof Error ? error.message : "이미지를 업로드하지 못했어요. 다시 시도해 주세요.");
      setValidationField(null);
      setStep(2);
      setIsUploadingImages(false);
      return;
    }
    setIsUploadingImages(false);
    const finishDraft = async () => {
      await completeDraft();
      for (const image of preparedDraft.images) {
        try { removeLocalPostingImage(image, userId); } catch { /* The saved posting is unaffected by local cache cleanup. */ }
      }
    };
    if (initialPost) {
      const input = serializePostingEditDraft(preparedDraft, editBaseline);
      if (!Object.keys(input).length) {
        await finishDraft();
        goBackOrReplaceFallback(backTo);
        return;
      }
      updatePost.mutate({ postId: initialPost.id, input }, {
          onSuccess: async () => {
            await finishDraft();
            if (isActive.current) goBackOrReplaceFallback(backTo);
          },
          onError,
      });
      return;
    }
    createPost.mutate(serializePostingCreationDraft(preparedDraft), {
      onSuccess: async (post) => {
        await finishDraft();
        if (isActive.current) {
          router.replace({
            pathname: "/interviews/[postId]",
            params: { postId: post.id },
          });
        }
      },
      onError,
    });
  };
  const back = () => {
    if (isBusy || submitLock.current) return;
    if (step > 1) {
      setValidationError(null);
      setStep((current) => (current - 1) as CreationStep);
    } else {
      submitLock.current = true;
      void persistDraft().then(() => goBackOrReplaceFallback(backTo)).catch(() => {
        setDraftStatus("failed");
        Alert.alert("작성 내용을 저장하지 못했어요", "입력한 내용은 화면에 남아 있어요. 다시 나가기를 눌러 저장을 재시도해 주세요.");
      }).finally(() => { submitLock.current = false; });
    }
  };
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      back();
      return true;
    });
    return () => subscription.remove();
  });
  const primaryLabel =
    step === 5 ? isEditing ? "수정 내용 저장" : "공고 올리기" : step === 4 ? "검토하기" : "다음";
  const primaryDisabled = isBusy || !isDraftReady || (!isEditing && creationCapabilities.isPending);
  const displayedPrimaryLabel = isPreparingImages
    ? "이미지 준비 중"
    : isSubmitting ? isEditing ? "저장 중" : "게시 중" : primaryLabel;

  if (!accessToken || !userId)
    return (
      <SafeAreaView className="flex-1 bg-hypo-bg">
        <View className="flex-1 px-4 pt-3">
          <CreationHeader
            draftStatus="saved"
            onBack={() => goBackOrReplaceFallback(backTo)}
          />
          <StateMessage
            title="로그인이 필요해요."
            description="공고를 만들려면 먼저 로그인해 주세요."
          />
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView
      className="flex-1 bg-hypo-bg"
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1">
          <View className="px-4 pt-2">
            <CreationHeader title={isEditing ? "공고 수정" : "공고 만들기"} draftStatus={draftStatus} onBack={back} />
            <ProgressIndicator step={step} />
          </View>
          <ScrollView
            ref={scrollViewRef}
            className="flex-1"
            contentContainerClassName="gap-6 px-4 pb-7 pt-5"
            keyboardShouldPersistTaps="handled"
            pointerEvents={isBusy || !isDraftReady ? "none" : "auto"}
          >
            <View className="gap-1">
              <Text className="text-[24px] font-bold leading-8 text-hypo-text">
                {isEditing && step === 1 ? "공고 유형을 확인해 주세요" : stepTitle(step, draft.type).heading}
              </Text>
              {!(isEditing && step === 1) && stepTitle(step, draft.type).description && <Text className="text-[15px] leading-[22px] text-hypo-text-secondary">
                {isEditing && step === 5 ? "변경한 내용을 확인한 뒤 저장해 주세요." : stepTitle(step, draft.type).description}
              </Text>}
            </View>
            {step === 1 && isEditing ? (
              <View className="gap-4">
                <Text className="text-[18px] font-semibold text-hypo-text">{postingTypeLabels[draft.type]}</Text>
                <Text className="text-[16px] text-hypo-text">{draft.entryMode === "direct" ? "바로 참여" : "신청 후 참여"}</Text>
                <Text className="text-[15px] text-hypo-text-secondary">공고 유형과 참여 방식은 수정할 수 없어요.</Text>
              </View>
            ) : null}
            {step === 1 && !isEditing ? (
              <View className="gap-3">
              {creationCapabilities.isPending ? (
                <Text accessibilityLiveRegion="polite" className="text-[15px] text-hypo-text-secondary">
                  공고 유형을 확인하고 있어요.
                </Text>
              ) : capabilityError ? (
                <InlineError message={capabilityError} />
              ) : null}
              {creationCapabilities.isError ? (
                <Pressable
                  accessibilityRole="button"
                  className="min-h-[44px] justify-center"
                  disabled={creationCapabilities.isFetching}
                  onPress={() => void creationCapabilities.refetch()}
                >
                  <Text className="text-[15px] font-semibold text-hypo-brand">공고 유형 다시 확인</Text>
                </Pressable>
              ) : null}
              <CreationTypeStep
                draft={draft}
                enabledTypes={enabledTypes}
                directParticipationTypes={directParticipationTypes}
                onChooseType={chooseType}
                onUpdate={updateDraft}
              />
              </View>
            ) : null}
            {step === 2 ? (
              <CreationContentStep
                draft={draft}
                imagesEnabled={Boolean(creationCapabilities.data?.posting_images_enabled || draft.images?.length)}
                userId={userId}
                onImageBusyChange={setIsPreparingImages}
                validationError={validationError}
                validationField={validationField}
                onFieldLayout={registerFieldLayout}
                registerInputRef={registerInputRef}
                onFieldBlur={validateField}
                onUpdate={updateDraft}
                onImagesChange={changeImages}
              />
            ) : null}
            {step === 3 ? (
              <CreationMethodStep
                draft={draft}
                preserveExternalUrl={isEditing && !editBaseline.externalUrl}
                validationError={validationError}
                validationField={validationField}
                onFieldLayout={registerFieldLayout}
                registerInputRef={registerInputRef}
                onFieldBlur={validateField}
                onAddSlot={addSlot}
                onRemoveSlot={(value) =>
                  updateDraft({
                    fixedSlots: draft.fixedSlots.filter(
                      (slot) => slot !== value,
                    ),
                  })
                }
                onToggle={toggle}
                onUpdate={updateDraft}
              />
            ) : null}
            {step === 4 ? (
              <CreationConditionsStep
                draft={draft}
                validationError={validationError}
                validationField={validationField}
                onFieldLayout={registerFieldLayout}
                registerInputRef={registerInputRef}
                onFieldBlur={validateField}
                onAddCompensation={() =>
                  updateDraft({
                    compensations: [
                      ...draft.compensations.filter(
                        (item) => item.type !== "none",
                      ),
                      { type: "cash", amount: null, currency: "KRW" },
                    ],
                  })
                }
                onRemoveCompensation={(index) =>
                  updateDraft({
                    compensations: draft.compensations.filter(
                      (_, current) => current !== index,
                    ),
                  })
                }
                onSetNoCompensation={() =>
                  updateDraft({ compensations: [{ type: "none" }] })
                }
                onUpdate={updateDraft}
                onUpdateCompensation={updateCompensation}
              />
            ) : null}
            {step === 5 ? <CreationReviewStep draft={draft} onEdit={setStep} /> : null}
            {validationError && !validationField ? (
              <InlineError message={validationError} />
            ) : null}
            {(isEditing ? updatePost.error : createPost.error) && !validationError ? (
              <InlineError message={isEditing ? "수정 내용을 저장하지 못했어요. 잠시 후 다시 시도해 주세요." : "공고를 올리지 못했어요. 잠시 후 다시 시도해 주세요."} />
            ) : null}
          </ScrollView>
          <View
            className="border-t border-hypo-border bg-hypo-bg px-4 pt-3"
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          >
            <Pressable
              accessibilityLabel={displayedPrimaryLabel}
              accessibilityRole="button"
              className="min-h-[54px] items-center justify-center rounded-[12px] bg-hypo-brand py-3"
              disabled={primaryDisabled}
              accessibilityState={{ disabled: primaryDisabled, busy: isBusy }}
              style={({ pressed }) => ({
                opacity: primaryDisabled ? 0.5 : pressed ? 0.84 : 1,
              })}
              onPress={step === 5 ? publish : next}
            >
              <Text className="text-[16px] font-semibold text-white">
                {displayedPrimaryLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
