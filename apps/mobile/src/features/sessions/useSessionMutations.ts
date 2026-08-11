import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateInterviewReviewInput, DisputeRewardInput } from "@hypofit/contracts";
import { invalidateChatWorkflowQueries } from "@/features/chat/useChat";
import { sessionsApi, type CreateSessionInput, type MarkNoShowInput } from "@/shared/api/sessions";

function invalidateWorkflowState(
  queryClient: ReturnType<typeof useQueryClient>,
  roomId?: string | null,
) {
  void queryClient.invalidateQueries({ queryKey: ["sessions"] });
  void queryClient.invalidateQueries({ queryKey: ["applications"] });
  invalidateChatWorkflowQueries(queryClient, roomId);
}

export function useCreateSession(accessToken?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, roomId }: { input: CreateSessionInput; roomId?: string | null }) =>
      sessionsApi.create(input, accessToken).then((session) => ({ roomId, session })),
    onSuccess: ({ roomId }) => {
      invalidateWorkflowState(queryClient, roomId);
    },
  });
}

export function useCompleteSession(accessToken?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => sessionsApi.complete(sessionId, accessToken),
    onSuccess: () => {
      invalidateWorkflowState(queryClient);
    },
  });
}

export function useConfirmAttendance(accessToken?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, sessionId }: { roomId?: string | null; sessionId: string }) =>
      sessionsApi.confirmAttendance(sessionId, accessToken).then((result) => ({ result, roomId })),
    onSuccess: ({ roomId }) => {
      invalidateWorkflowState(queryClient, roomId);
    },
  });
}

export function useMarkRewardPaid(accessToken?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, sessionId }: { roomId?: string | null; sessionId: string }) =>
      sessionsApi.markRewardPaid(sessionId, accessToken).then((reward) => ({ reward, roomId })),
    onSuccess: ({ roomId }) => {
      invalidateWorkflowState(queryClient, roomId);
    },
  });
}

export function useConfirmRewardReceived(accessToken?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, sessionId }: { roomId?: string | null; sessionId: string }) =>
      sessionsApi.confirmRewardReceived(sessionId, accessToken).then((reward) => ({ reward, roomId })),
    onSuccess: ({ roomId }) => {
      invalidateWorkflowState(queryClient, roomId);
    },
  });
}

export function useDisputeReward(accessToken?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      roomId,
      sessionId,
    }: {
      input: DisputeRewardInput;
      roomId?: string | null;
      sessionId: string;
    }) => sessionsApi.disputeReward(sessionId, input, accessToken).then((reward) => ({ reward, roomId })),
    onSuccess: ({ roomId }) => {
      invalidateWorkflowState(queryClient, roomId);
    },
  });
}

export function useCreateInterviewReview(accessToken?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      roomId,
      sessionId,
    }: {
      input: CreateInterviewReviewInput;
      roomId?: string | null;
      sessionId: string;
    }) => sessionsApi.createReview(sessionId, input, accessToken).then((review) => ({ review, roomId })),
    onSuccess: ({ roomId }) => {
      invalidateWorkflowState(queryClient, roomId);
    },
  });
}

export function useMarkNoShow(accessToken?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      roomId,
      sessionId,
    }: {
      input: MarkNoShowInput;
      roomId?: string | null;
      sessionId: string;
    }) => sessionsApi.markNoShow(sessionId, input, accessToken).then((session) => ({ roomId, session })),
    onSuccess: ({ roomId }) => {
      invalidateWorkflowState(queryClient, roomId);
    },
  });
}
