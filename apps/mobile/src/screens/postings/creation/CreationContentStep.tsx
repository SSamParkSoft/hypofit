import { TextInput, View } from "react-native";
import { type PostingCreationDraft, type PostingDraftImage } from "@/features/postings/postingCreationDraft";
import { FieldAnchor, FormField } from "./CreationFormControls";
import { CreationImagesField } from "./CreationImagesField";

export function CreationContentStep({
  draft,
  validationError,
  validationField,
  onFieldLayout,
  registerInputRef,
  onFieldBlur,
  onUpdate,
  imagesEnabled,
  userId,
  onImageBusyChange,
  onImagesChange,
}: {
  draft: PostingCreationDraft;
  validationError: string | null;
  validationField: string | null;
  onFieldLayout: (field: string, view: View | null) => void;
  registerInputRef: (field: string) => (input: TextInput | null) => void;
  onFieldBlur: (field: string) => void;
  onUpdate: (patch: Partial<PostingCreationDraft>) => void;
  imagesEnabled: boolean;
  userId: string;
  onImageBusyChange: (busy: boolean) => void;
  onImagesChange: (images: PostingDraftImage[]) => void;
}) {
  return (
    <View className="gap-5">
      {imagesEnabled ? <CreationImagesField images={draft.images ?? []} userId={userId}
        onChange={onImagesChange} onBusyChange={onImageBusyChange} /> : null}
      <FieldAnchor field="title" onFieldLayout={onFieldLayout}>
        <FormField
          inputRef={registerInputRef("title")}
          label="제목"
          value={draft.title}
          placeholder={draft.type === "research_experiment" ? "예: 화면 속 도형 구분 과제 연구 참여자 모집" : "예: 1인 가구 식재료 관리 경험 인터뷰"}
          maxLength={120}
          onBlur={() => onFieldBlur("title")}
          error={validationField === "title" ? validationError ?? undefined : undefined}
          onChangeText={(title) => onUpdate({ title })}
        />
      </FieldAnchor>
      <FieldAnchor field="service_summary" onFieldLayout={onFieldLayout}>
        <FormField
          inputRef={registerInputRef("service_summary")}
          label="공고 설명"
          value={draft.description}
          onBlur={() => onFieldBlur("service_summary")}
          placeholder={draft.type === "research_experiment" ? "연구 목적과 참여자가 수행할 과제, 절차를 설명해 주세요." : "무엇을 확인하거나 테스트하려는지 간단히 설명해 주세요."}
          multiline
          maxLength={2000}
          helper="무엇을 확인하는지와 참여자가 하게 될 일을 자연스럽게 설명해 주세요."
          error={validationField === "service_summary" ? validationError ?? undefined : undefined}
          onChangeText={(description) => onUpdate({ description })}
        />
      </FieldAnchor>
      <FieldAnchor field="target_description" onFieldLayout={onFieldLayout}>
        <FormField
          inputRef={registerInputRef("target_description")}
          label="찾는 참여자"
          value={draft.targetParticipant}
          onBlur={() => onFieldBlur("target_description")}
          placeholder={draft.type === "research_experiment" ? "예: 노트북으로 60분간 과제에 참여할 수 있는 분" : "예: 최근 3개월 내 직접 장을 보고 남은 식재료를 버린 경험이 있는 1인 가구"}
          multiline
          maxLength={2000}
          helper="조건이 여러 개면 한 줄에 하나씩 적어 주세요. 더 잘 맞는 사람에게 닿을 수 있어요."
          error={validationField === "target_description" ? validationError ?? undefined : undefined}
          onChangeText={(targetParticipant) => onUpdate({ targetParticipant })}
        />
      </FieldAnchor>
    </View>
  );
}
