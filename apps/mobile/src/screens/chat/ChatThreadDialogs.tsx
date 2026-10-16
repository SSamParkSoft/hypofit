import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { ChatRoom } from "@hypofit/contracts";
import { formatAnswerLabel } from "@/features/applications/applicationReadModels";

export function ReviewModal({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (input: { comment?: string | null; rating: number; tags: string[] }) => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setRating(5);
      setComment("");
    }
  }, [isOpen]);

  return (
    <Modal animationType="fade" transparent visible={isOpen} onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/35 px-4">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="rounded-[18px] bg-hypo-surface p-5">
          <Text className="text-[19px] text-hypo-text" style={{ fontFamily: "HypofitSansBold" }}>
            후기를 남겨주세요
          </Text>
          <Text className="mt-2 text-[13px] leading-5 text-hypo-muted" style={{ fontFamily: "HypofitSansMedium" }}>
            비방이나 욕설이 담긴 후기는 제한될 수 있고, 별점은 모집자 평판에 반영될 수 있어요.
          </Text>

          <StarRating rating={rating} onChange={setRating} />

          <TextInput
            multiline
            maxLength={500}
            placeholder="남기고 싶은 내용을 적어주세요"
            placeholderTextColor="#98A196"
            className="mt-4 min-h-[96px] rounded-xl border border-hypo-border bg-hypo-bg px-3 py-3 text-[14px] leading-5 text-hypo-text"
            style={{ fontFamily: "HypofitSansMedium" }}
            textAlignVertical="top"
            value={comment}
            onChangeText={setComment}
          />

          <View className="mt-4 flex-row justify-end gap-2">
            <Pressable accessibilityRole="button" className="min-h-11 justify-center rounded-[11px] bg-hypo-bg px-4" onPress={onClose}>
              <Text className="text-sm text-hypo-muted" style={{ fontFamily: "HypofitSansBold" }}>취소</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              className="min-h-11 justify-center rounded-[11px] bg-hypo-brand px-4"
              style={{ opacity: isSubmitting ? 0.45 : 1 }}
              onPress={() => onSubmit({ comment: comment.trim() || null, rating, tags: [] })}
            >
              <Text className="text-sm text-white" style={{ fontFamily: "HypofitSansBold" }}>후기 남기기</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function StarRating({
  onChange,
  rating,
}: {
  onChange: (rating: number) => void;
  rating: number;
}) {
  return (
    <View className="mt-4">
      <View className="flex-row items-center justify-between rounded-[14px] border border-hypo-border bg-hypo-bg px-3 py-2.5">
        {[1, 2, 3, 4, 5].map((value) => {
          const isSelected = value <= rating;
          return (
            <Pressable
              key={value}
              accessibilityLabel={`별점 ${value}점`}
              accessibilityRole="button"
              accessibilityState={{ selected: rating === value }}
              hitSlop={8}
              className="h-11 flex-1 items-center justify-center"
              onPress={() => onChange(value)}
            >
              <Text
                className={`text-[28px] leading-9 ${isSelected ? "text-hypo-brand" : "text-[#D2D8D0]"}`}
                style={{ fontFamily: "HypofitSansBold" }}
              >
                {isSelected ? "★" : "☆"}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ApplicationReviewModal({
  application,
  isOpen,
  onClose,
  applicantName,
}: {
  application: ChatRoom["application"];
  isOpen: boolean;
  onClose: () => void;
  applicantName?: string;
}) {
  if (!application) return null;

  const answers = Object.entries(application.answers);
  const availableTimes = application.available_times;

  return (
    <Modal animationType="fade" transparent visible={isOpen} onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/35 px-4">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="max-h-[78%] rounded-[18px] bg-hypo-surface p-5">
          <Text className="text-[19px] font-black text-hypo-text">신청자 답변</Text>
          <Text className="mt-1.5 text-[13px] font-bold leading-5 text-hypo-muted">
            {applicantName ?? "신청자"}님이 남긴 경험과 가능한 시간이에요.
          </Text>
          <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
            {answers.length ? (
              <View className="gap-2.5">
                {answers.map(([key, value]) => (
                  <View key={key} className="rounded-[12px] bg-hypo-bg p-3">
                    <Text className="text-xs font-black text-hypo-text">{formatAnswerLabel(key)}</Text>
                    <Text className="mt-1.5 text-[13px] font-bold leading-5 text-hypo-muted">{value}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="rounded-[12px] bg-hypo-bg p-3 text-[13px] font-bold leading-5 text-hypo-muted">
                아직 작성된 답변이 없어요.
              </Text>
            )}

            <View className="mt-4 rounded-[12px] bg-hypo-bg p-3">
              <Text className="text-xs font-black text-hypo-text">가능 시간</Text>
              {availableTimes.length ? (
                <View className="mt-2 gap-1.5">
                  {availableTimes.map((time) => (
                    <Text key={time} className="text-[13px] font-bold leading-5 text-hypo-muted">
                      {time}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text className="mt-1.5 text-[13px] font-bold leading-5 text-hypo-muted">가능 시간이 아직 없어요.</Text>
              )}
            </View>
          </ScrollView>
          <Pressable accessibilityRole="button" className="mt-4 min-h-11 items-center justify-center rounded-[12px] bg-hypo-brand" onPress={onClose}>
            <Text className="text-sm font-black text-white">확인</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function RejectApplicationModal({
  applicationId,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  applicationId?: string;
  isOpen: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (rejectionReason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const normalizedReason = reason.trim();
  const canSubmit = Boolean(applicationId && normalizedReason.length >= 2 && !isSubmitting);

  useEffect(() => {
    if (!isOpen) {
      setReason("");
    }
  }, [isOpen]);

  return (
    <Modal animationType="fade" transparent visible={isOpen} onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/35 px-4">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="rounded-[18px] bg-hypo-surface p-5">
          <Text className="text-[19px] font-black text-hypo-text">반려 사유를 입력해주세요</Text>
          <Text className="mt-2 text-[13px] font-bold leading-5 text-hypo-muted">
            입력한 사유는 신청자에게 안내되고 채팅 기록에도 남아요.
          </Text>
          <TextInput
            multiline
            maxLength={500}
            placeholder="예: 이번 모집 조건과 경험이 조금 달라서 아쉽지만 다음 모집에서 다시 신청해주세요."
            placeholderTextColor="#98A196"
            className="mt-3 min-h-[120px] rounded-xl border border-hypo-border bg-hypo-bg px-3 py-2.5 text-sm font-bold leading-5 text-hypo-text"
            textAlignVertical="top"
            value={reason}
            onChangeText={setReason}
          />
          <Text className="mt-1.5 self-end text-[11px] font-bold text-hypo-muted">{normalizedReason.length}/500</Text>
          <View className="mt-3 flex-row justify-end gap-2">
            <Pressable
              accessibilityRole="button"
              className="min-h-11 justify-center rounded-[11px] bg-hypo-bg px-4"
              onPress={() => {
                setReason("");
                onClose();
              }}
            >
              <Text className="text-sm font-black text-hypo-muted">취소</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!canSubmit}
              className="min-h-11 justify-center rounded-[11px] bg-hypo-brand px-4"
              style={{ opacity: canSubmit ? 1 : 0.45 }}
              onPress={() => {
                if (!canSubmit) return;
                onSubmit(normalizedReason);
              }}
            >
              <Text className="text-sm font-black text-white">반려하기</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
