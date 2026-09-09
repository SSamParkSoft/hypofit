import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Pressable, Text, View } from "react-native";
import { useAuth } from "@/features/auth/AuthProvider";
import { surveyParticipationsApi } from "@/shared/api/surveyParticipations";
import { buildAuthQueryKey, resolveAuthUserId } from "@/shared/query/authQuery";

const labels = { opened: "참여 중", submitted: "제출 확인 대기", confirmed: "참여 완료", withdrawn: "참여 취소" };

export function SurveyOwnerParticipants({ postId }: { postId: string }) {
  const { accessToken, appUser, user } = useAuth();
  const cache = useQueryClient();
  const queryKey = buildAuthQueryKey("survey-owner-participants", resolveAuthUserId(appUser?.id, user?.id), postId);
  const query = useQuery({ queryKey, enabled: Boolean(accessToken),
    queryFn: () => surveyParticipationsApi.participants(postId, accessToken), staleTime: 0 });
  const confirm = useMutation({
    mutationFn: (participantId: string) => surveyParticipationsApi.confirm(postId, participantId, accessToken),
    onSuccess: () => cache.invalidateQueries({ queryKey }),
  });
  return <View className="mt-6 gap-4">
    <Text accessibilityRole="header" className="text-lg font-semibold text-hypo-text">설문 참여 현황</Text>
    <Pressable accessibilityRole="button" disabled={query.isFetching} onPress={() => void query.refetch()} className="min-h-[44px] justify-center">
      <Text className="text-hypo-brand">{query.isFetching ? "불러오는 중" : "새로고침"}</Text>
    </Pressable>
    {query.isError && <Text accessibilityRole="alert" className="text-hypo-text">참여 현황을 불러오지 못했어요. 다시 시도해 주세요.</Text>}
    {confirm.isError && <Text accessibilityRole="alert" className="text-hypo-text">제출을 확인하지 못했어요. 다시 시도해 주세요.</Text>}
    {!query.isPending && !query.isError && !query.data?.length && <Text className="text-hypo-text-secondary">아직 설문에 참여한 사람이 없어요.</Text>}
    {query.data?.map((item) => <View key={item.id} className="gap-2 border-b border-hypo-border py-3">
      <Text className="text-base font-semibold text-hypo-text">{item.participant?.name || "참여자"}</Text>
      <Text className="text-hypo-text-secondary">{labels[item.status]}</Text>
      {item.status === "submitted" && item.participant?.id && <Pressable accessibilityRole="button"
        disabled={confirm.isPending} className="min-h-[44px] justify-center"
        onPress={() => Alert.alert("제출을 확인할까요?", "외부 설문에서 응답을 확인한 뒤 처리해 주세요.", [
          { text: "취소", style: "cancel" },
          { text: "제출 확인", onPress: () => { if (!confirm.isPending) confirm.mutate(item.participant!.id); } },
        ])}>
        <Text className="font-semibold text-hypo-brand">{confirm.isPending ? "처리 중" : "제출 확인"}</Text>
      </Pressable>}
    </View>)}
  </View>;
}
