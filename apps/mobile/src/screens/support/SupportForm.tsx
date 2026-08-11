import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { router, type Href, useLocalSearchParams } from "expo-router";
import type {
  SupportTicket,
  SupportTicketCategory,
  SupportTicketKind,
  SupportTicketTargetType,
} from "@hypofit/contracts";
import { useAuth } from "@/features/auth/AuthProvider";
import { useCreateSupportTicket, useUpdateSupportTicket } from "@/features/support/useSupportTicket";
import { getSafeReturnTo, goBackOrReplaceReturnTo } from "@/shared/navigation/backNavigation";
import { AppScreen, SectionCard } from "@/shared/ui/AppScreen";
import { PrimaryButton } from "@/shared/ui/PrimaryButton";
import { TextField } from "@/shared/ui/TextField";
import { supportEmail } from "@/screens/profile/profileUtils";

const inquiryCategories: Array<{ label: string; value: SupportTicketCategory }> = [
  { label: "계정", value: "account" },
  { label: "모집글", value: "interview_post" },
  { label: "신청과 선정", value: "application" },
  { label: "채팅", value: "chat" },
  { label: "사례비", value: "reward" },
  { label: "개인정보", value: "privacy" },
  { label: "기타", value: "other" },
];

const reportCategories: Array<{ label: string; value: SupportTicketCategory }> = [
  { label: "모집글", value: "interview_post" },
  { label: "채팅", value: "chat" },
  { label: "개인정보", value: "privacy" },
  { label: "부적절한 내용", value: "abuse" },
  { label: "노쇼", value: "no_show" },
  { label: "기타", value: "other" },
];

interface SupportFormProps {
  backTo?: Href;
  initialTicket?: SupportTicket;
  mode: "feedback" | "inquiry" | "report";
  onCancel?: () => void;
  onSubmitted?: () => void;
}

export function SupportForm({ backTo, initialTicket, mode, onCancel, onSubmitted }: SupportFormProps) {
  const params = useLocalSearchParams<{
    category?: SupportTicketCategory;
    counterpart_name?: string;
    interview_title?: string;
    target_id?: string;
    target_type?: SupportTicketTargetType;
    returnTo?: string | string[];
  }>();
  const { accessToken, appUser, user } = useAuth();
  const createTicket = useCreateSupportTicket(accessToken);
  const updateTicket = useUpdateSupportTicket(accessToken);
  const isReport = mode === "report";
  const isFeedback = mode === "feedback";
  const shouldShowContactEmail = isReport;
  const isEditing = Boolean(initialTicket);
  const categories = isReport ? reportCategories : inquiryCategories;
  const [category, setCategory] = useState<SupportTicketCategory>(() =>
    initialTicket?.category && categories.some((item) => item.value === initialTicket.category)
      ? initialTicket.category
      : categories.some((item) => item.value === params.category)
        ? (params.category as SupportTicketCategory)
      : isReport
        ? "abuse"
        : isFeedback
          ? "other"
          : "account",
  );
  const [subject, setSubject] = useState(initialTicket?.subject ?? "");
  const [body, setBody] = useState(initialTicket?.body ?? "");
  const [contactEmail, setContactEmail] = useState(initialTicket?.contact_email ?? appUser?.email ?? user?.email ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const contextLabel = useMemo(() => {
    const title = params.interview_title;
    const name = params.counterpart_name;
    if (title && name) return `${name} · ${title}`;
    return title ?? name ?? null;
  }, [params.counterpart_name, params.interview_title]);

  const copy = isReport
    ? {
        bodyLabel: "신고 내용",
        bodyPlaceholder: "어떤 문제가 있었는지, 관련 상황을 구체적으로 적어주세요.",
        description: "부적절한 모집글, 채팅, 개인정보 요구, 노쇼를 알려주세요.",
        kind: "report" as SupportTicketKind,
        success: "신고가 접수됐어요.",
        title: "신고하기",
      }
    : isFeedback
      ? {
          bodyLabel: "내용",
          bodyPlaceholder: "불편했던 점이나 더 좋아졌으면 하는 점을 적어주세요.",
          description: undefined,
          kind: "inquiry" as SupportTicketKind,
          success: "피드백이 접수됐어요.",
          title: "피드백 남기기",
        }
      : {
          bodyLabel: "문의 내용",
          bodyPlaceholder: "무엇이 불편했는지, 어떤 도움이 필요한지 적어주세요.",
          description: "계정, 신청, 모집글 문제를 남기면 확인 후 답변드릴게요.",
          kind: "inquiry" as SupportTicketKind,
          success: "문의가 접수됐어요.",
          title: isEditing ? "문의 수정" : "문의하기",
        };

  const submit = async () => {
    setMessage(null);
    setError(null);

    if (!accessToken) {
      setError(`로그인 후 접수할 수 있어요. 급한 경우 ${supportEmail}로 보내주세요.`);
      return;
    }

    if (body.trim().length < 5) {
      setError("내용을 5자 이상 입력해 주세요.");
      return;
    }

    if (shouldShowContactEmail && !contactEmail.trim()) {
      setError("답변 받을 이메일을 입력해 주세요.");
      return;
    }

    const normalizedContactEmail = contactEmail.trim() || appUser?.email || user?.email || supportEmail;

    try {
      if (initialTicket) {
        await updateTicket.mutateAsync({
          ticketId: initialTicket.id,
          input: {
            category: isFeedback ? "other" : category,
            subject: isFeedback ? null : subject.trim() || null,
            body: body.trim(),
            contact_email: normalizedContactEmail,
          },
        });
      } else {
        await createTicket.mutateAsync({
          kind: copy.kind,
          category: isFeedback ? "other" : category,
          subject: isFeedback ? null : subject.trim() || null,
          body: body.trim(),
          contact_email: normalizedContactEmail,
          target_type: params.target_type ?? null,
          target_id: params.target_id ?? null,
          metadata: {
            source: isReport ? "mobile_report" : isFeedback ? "mobile_feedback" : "mobile_support",
            counterpart_name: params.counterpart_name,
            interview_title: params.interview_title,
          },
        });
        setSubject("");
        setBody("");
      }
      setMessage(isEditing ? "문의가 수정됐어요." : copy.success);
      onSubmitted?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "접수하지 못했어요.");
    }
  };

  const explicitBackTo = getSafeReturnTo(params.returnTo);
  const resolvedBackTo = backTo ?? explicitBackTo ?? "/(tabs)/profile";
  const handleBack = onCancel ?? (() => goBackOrReplaceReturnTo(explicitBackTo, "/(tabs)/profile"));

  return (
    <AppScreen
      backTo={resolvedBackTo}
      keyboardAvoiding
      title={copy.title}
      description={copy.description}
      onBack={handleBack}
    >
      <SectionCard>
        <View className="gap-4 p-4">
          {contextLabel ? (
            <View className="rounded-[14px] bg-hypo-brandSoft px-3 py-2.5">
              <Text numberOfLines={2} className="text-xs font-black leading-5 text-hypo-brand">
                {contextLabel}
              </Text>
            </View>
          ) : null}

          {!isFeedback ? (
            <>
              <View className="gap-2">
                <Text className="text-[13px] font-bold text-hypo-text">유형</Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {categories.map((item) => {
                    const selected = item.value === category;
                    return (
                      <Pressable
                        key={item.value}
                        accessibilityState={{ selected }}
                        className={`min-h-11 items-center justify-center rounded-full border px-3 py-2 ${selected ? "border-hypo-brand bg-hypo-brandSoft" : "border-hypo-border bg-hypo-surface"}`}
                        onPress={() => setCategory(item.value)}
                      >
                        <Text className={`text-xs font-black ${selected ? "text-hypo-brand" : "text-hypo-muted"}`}>
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <TextField label="제목" maxLength={140} placeholder="선택 입력" value={subject} onChangeText={setSubject} />
            </>
          ) : null}
          <View className="gap-2">
            <Text className="text-[13px] font-bold text-hypo-text">{copy.bodyLabel}</Text>
            <TextInput
              accessibilityLabel={copy.bodyLabel}
              multiline
              maxLength={2000}
              placeholder={copy.bodyPlaceholder}
              placeholderTextColor="#A3ABA0"
              value={body}
              onChangeText={setBody}
              className="min-h-[132px] rounded-[14px] border border-hypo-border bg-hypo-surface px-4 py-3 text-base leading-6 text-hypo-text"
              textAlignVertical="top"
            />
          </View>
          {shouldShowContactEmail ? (
            <TextField label="답변 받을 이메일" keyboardType="email-address" value={contactEmail} onChangeText={setContactEmail} />
          ) : null}

          {message || error ? (
            <Text className={`rounded-[14px] px-3 py-2 text-xs font-black leading-5 ${error ? "bg-hypo-dangerSoft text-hypo-danger" : "bg-hypo-brandSoft text-hypo-brand"}`}>
              {error ?? message}
            </Text>
          ) : null}

          <View className="flex-row items-center justify-end gap-3">
            <Pressable
              accessibilityRole="button"
              disabled={createTicket.isPending || updateTicket.isPending}
              className="min-h-[48px] min-w-[92px] items-center justify-center rounded-[14px] border border-hypo-border bg-hypo-surface px-4"
              onPress={onCancel ?? (() => routerBackTo(resolvedBackTo))}
            >
              <Text className="text-[14px] font-black text-hypo-muted">취소</Text>
            </Pressable>
            <View className="min-w-[120px]">
              <PrimaryButton disabled={createTicket.isPending || updateTicket.isPending} onPress={() => void submit()}>
                {createTicket.isPending || updateTicket.isPending ? "저장 중" : isEditing ? "저장하기" : "제출하기"}
              </PrimaryButton>
            </View>
          </View>
        </View>
      </SectionCard>
    </AppScreen>
  );
}

function routerBackTo(backTo: Href) {
  router.replace(backTo);
}
