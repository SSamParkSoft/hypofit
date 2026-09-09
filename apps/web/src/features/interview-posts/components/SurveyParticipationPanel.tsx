import { useContext, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InterviewPost, SurveyParticipation } from "@hypofit/contracts";
import { AuthContext } from "../../auth/AuthProvider";
import { surveyParticipationsApi } from "../../../shared/api/surveyParticipations";
import { getProtectedQueryUserId, PROTECTED_QUERY_SCOPE, resolveStableAuthUserId } from "../../../shared/api/queryAuth";
import { getApiErrorMessage } from "../../../shared/api/errorPresentation";
import { Button } from "../../../shared/ui/button";
import { ConfirmActionButton } from "../../../shared/ui/confirm-action";

export function SurveyParticipationPanel({ post }: { post: InterviewPost }) {
  const auth = useContext(AuthContext);
  const userId = resolveStableAuthUserId(auth?.appUser?.id, auth?.user?.id);
  const token = auth?.accessToken;
  const owner = userId === post.founder_id;
  const cache = useQueryClient();
  const [linkError, setLinkError] = useState<string | null>(null);
  const key = ["survey-participation", getProtectedQueryUserId(userId), PROTECTED_QUERY_SCOPE, post.id];
  const current = useQuery({ queryKey: key, enabled: Boolean(token && !owner),
    queryFn: () => surveyParticipationsApi.current(post.id, token!), staleTime: 0, retry: false });
  const mutation = useMutation({
    mutationFn: (action: "open" | "submit" | "withdraw") => surveyParticipationsApi.act(post.id, action, token!),
    onSuccess: (result, action) => {
      const { external_url: url, ...participation } = result;
      cache.setQueryData<SurveyParticipation>(key, participation);
      setLinkError(null);
      if (action === "open") {
        try {
          const target = new URL(url);
          if (target.protocol !== "https:" || !(target.hostname === "forms.gle" ||
            (target.hostname === "docs.google.com" && target.pathname.startsWith("/forms/")))) throw new Error();
          window.location.assign(target.href);
        } catch { setLinkError("설문 링크를 열 수 없어요. 다시 시도해 주세요."); }
      }
    },
  });
  if (owner) return <p className="text-sm text-hypo-text-muted">내가 만든 설문이에요.</p>;
  if (!token) return <p className="text-sm text-hypo-text-muted">로그인 후 참여할 수 있어요.</p>;
  if (current.isPending) return <p role="status">참여 상태를 불러오는 중이에요.</p>;
  if (current.isError) return <div role="alert"><p>참여 상태를 불러오지 못했어요.</p><Button onClick={() => void current.refetch()}>다시 시도</Button></div>;
  const state = current.data?.status;
  const unavailable = post.status !== "open" || post.external_action_available === false;
  return <section className="grid gap-3">
    <p className="text-sm text-hypo-text-muted">Google Forms에서 진행돼요. 설문 답변은 Hypofit에 저장되지 않아요.</p>
    {mutation.isError && <p role="alert">{getApiErrorMessage(mutation.error, "처리하지 못했어요. 다시 시도해 주세요.")}</p>}
    {linkError && <p role="alert">{linkError}</p>}
    {state === "confirmed" ? <p>참여 완료</p> : state === "withdrawn" ? <p>참여 취소</p> : <>
      {state === "submitted" ? <p>제출을 알렸어요. 모집자가 확인하고 있어요.</p> : <>
        <Button disabled={unavailable || mutation.isPending} onClick={() => mutation.mutate("open")}>
          {post.status !== "open" ? "모집 종료" : post.external_action_available === false ? "설문 링크 준비 중" : state === "opened" ? "설문 다시 열기" : "설문 참여하기"}
        </Button>
        {state === "opened" && <ConfirmActionButton disabled={unavailable || mutation.isPending} title="설문을 제출했나요?"
          description="Google Forms에서 답변을 제출한 뒤 알려주세요." confirmLabel="제출 알리기" onConfirm={() => mutation.mutate("submit")}>
          제출 알리기
        </ConfirmActionButton>}
      </>}
      {(state === "opened" || state === "submitted") && <ConfirmActionButton disabled={mutation.isPending}
        title="설문 참여를 취소할까요?" description="취소한 설문에는 다시 참여할 수 없어요."
        confirmLabel="참여 취소" onConfirm={() => mutation.mutate("withdraw")}>
        참여 취소
      </ConfirmActionButton>}
    </>}
  </section>;
}
