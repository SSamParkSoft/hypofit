import { useMutation } from "@tanstack/react-query";
import {
  accountDeletionApi,
  type AccountDeletionConfirmInput,
  type AccountDeletionRequest,
  type AccountDeletionRequestInput,
  type AccountDeletionResendInput,
  type AccountDeletionVerification,
  type AccountDeletionVerificationInput,
} from "@/shared/api/accountDeletion";

function requireAccessToken(accessToken?: string | null): string {
  if (!accessToken) {
    throw new Error("로그인 후 이용해 주세요.");
  }

  return accessToken;
}

export function useCreateAccountDeletionRequest(accessToken?: string | null) {
  return useMutation<AccountDeletionRequest, Error, AccountDeletionRequestInput>({
    mutationFn: (input) => accountDeletionApi.createMyRequest(input, requireAccessToken(accessToken)),
  });
}

export function useVerifyMyAccountDeletionRequest(accessToken?: string | null) {
  return useMutation<AccountDeletionVerification, Error, AccountDeletionVerificationInput>({
    mutationFn: (input) => accountDeletionApi.verifyMyRequest(input, requireAccessToken(accessToken)),
  });
}

export function useResendMyAccountDeletionCode(accessToken?: string | null) {
  return useMutation<AccountDeletionRequest, Error, AccountDeletionResendInput>({
    mutationFn: (input) => accountDeletionApi.resendMyCode(input, requireAccessToken(accessToken)),
  });
}

export function useConfirmMyAccountDeletion(accessToken?: string | null) {
  return useMutation<AccountDeletionRequest, Error, AccountDeletionConfirmInput>({
    mutationFn: (input) => accountDeletionApi.confirmMyRequest(input, requireAccessToken(accessToken)),
  });
}
