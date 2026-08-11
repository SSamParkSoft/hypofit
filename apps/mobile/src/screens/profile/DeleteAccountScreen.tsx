import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import type { TextInput as TextInputType } from "react-native";
import { router } from "expo-router";
import {
  useConfirmMyAccountDeletion,
  useCreateAccountDeletionRequest,
  useResendMyAccountDeletionCode,
  useVerifyMyAccountDeletionRequest,
} from "@/features/account-deletion/useAccountDeletionMutations";
import { useAuth } from "@/features/auth/AuthProvider";
import { type AccountDeletionRequest, type AccountDeletionVerification } from "@/shared/api/accountDeletion";
import { ApiError } from "@/shared/api/client";
import { AppScreen, SectionCard } from "@/shared/ui/AppScreen";
import { InlineLink } from "@/shared/ui/InlineLink";
import { PrimaryButton } from "@/shared/ui/PrimaryButton";
import { supportEmail } from "./profileUtils";

const otpLength = 6;
const resendCooldownSeconds = 90;

export function DeleteAccountScreen() {
  const { accessToken, signOut } = useAuth();
  const inputRef = useRef<TextInputType>(null);
  const createRequest = useCreateAccountDeletionRequest(accessToken);
  const verifyRequest = useVerifyMyAccountDeletionRequest(accessToken);
  const resendCode = useResendMyAccountDeletionCode(accessToken);
  const confirmDeletion = useConfirmMyAccountDeletion(accessToken);
  const [request, setRequest] = useState<AccountDeletionRequest | null>(null);
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletionAuthorization, setDeletionAuthorization] = useState<string | null>(null);
  const [deletionAuthorizationExpiresAt, setDeletionAuthorizationExpiresAt] = useState<string | null>(null);
  const otpDigits = useMemo(() => buildOtpDigits(otp), [otp]);
  const isSending = createRequest.isPending;
  const isVerifying = verifyRequest.isPending;
  const isResending = resendCode.isPending;
  const isDeleting = confirmDeletion.isPending;
  const isVerified = Boolean(deletionAuthorization);
  const shouldShowVerificationCard = Boolean(request);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const handleOtpChange = (nextValue: string) => {
    setOtp(normalizeOtp(nextValue));
    setError(null);
  };

  const handleSendCode = async () => {
    setError(null);
    setMessage(null);

    if (!accessToken) {
      setError("로그인한 상태에서만 계정을 삭제할 수 있어요.");
      return;
    }

    setOtp("");
    setDeletionAuthorization(null);
    setDeletionAuthorizationExpiresAt(null);

    try {
      const nextRequest = await createRequest.mutateAsync({ reason: null });
      applyRequestState(nextRequest);
      const deliveryError = getDeliveryErrorMessage(nextRequest, "send");
      if (deliveryError) {
        setError(deliveryError);
      } else {
        setMessage(getSendCodeMessage(nextRequest));
      }
      focusOtpInput(inputRef);
    } catch (requestError) {
      setError(getCreateRequestErrorMessage(requestError));
    }
  };

  const handleVerify = async () => {
    setError(null);
    setMessage(null);

    if (!request) {
      setError("먼저 인증번호를 받아 주세요.");
      return;
    }

    const normalizedOtp = normalizeOtp(otp);
    if (normalizedOtp.length !== otpLength) {
      setError("인증번호 6자리를 입력해 주세요.");
      return;
    }

    try {
      const verification = await verifyRequest.mutateAsync({
        request_id: request.id,
        code: normalizedOtp,
      });
      applyVerificationState(verification);
    } catch (verificationError) {
      setError(getVerifyRequestErrorMessage(verificationError));
    }
  };

  const handleResend = async () => {
    setError(null);
    setMessage(null);

    if (!request) {
      setError("먼저 인증번호를 받아 주세요.");
      return;
    }

    try {
      const nextRequest = await resendCode.mutateAsync({ request_id: request.id });
      setOtp("");
      setDeletionAuthorization(null);
      setDeletionAuthorizationExpiresAt(null);
      applyRequestState(nextRequest);
      const deliveryError = getDeliveryErrorMessage(nextRequest, "resend");
      if (deliveryError) {
        setError(deliveryError);
      } else {
        setMessage(getResendCodeMessage(nextRequest));
      }
      focusOtpInput(inputRef);
    } catch (resendError) {
      setError(getResendRequestErrorMessage(resendError));
    }
  };

  const requestDeletionConfirmation = () => {
    if (!request || !deletionAuthorization) {
      setError("인증번호를 먼저 확인해 주세요.");
      return;
    }

    Alert.alert(
      "정말 계정을 삭제하시겠어요?",
      "계정과 프로필 정보가 삭제돼요. 같은 이메일로 다시 가입할 수 있지만 이전 신청, 채팅, 모집 기록은 복구되지 않아요.",
      [
        { style: "cancel", text: "취소" },
        {
          style: "destructive",
          text: "삭제하기",
          onPress: () => {
            void handleConfirmDeletion();
          },
        },
      ],
    );
  };

  const handleConfirmDeletion = async () => {
    setError(null);
    setMessage(null);

    if (!request || !deletionAuthorization) {
      setError("인증번호를 먼저 확인해 주세요.");
      return;
    }

    if (isDeletionAuthorizationExpired(deletionAuthorizationExpiresAt)) {
      setDeletionAuthorization(null);
      setDeletionAuthorizationExpiresAt(null);
      setError("삭제 확인 시간이 지나서 인증번호를 다시 확인해 주세요.");
      return;
    }

    try {
      await confirmDeletion.mutateAsync({
        request_id: request.id,
        deletion_authorization: deletionAuthorization,
        confirm: true,
      });
      await signOut();
      router.replace({ pathname: "/(auth)/login", params: { toast: "account_deleted" } });
    } catch (deleteError) {
      const nextError = getConfirmDeletionErrorMessage(deleteError);
      if (shouldResetDeletionAuthorization(deleteError)) {
        setDeletionAuthorization(null);
        setDeletionAuthorizationExpiresAt(null);
      }
      setError(nextError);
    }
  };

  function applyRequestState(nextRequest: AccountDeletionRequest) {
    setRequest(nextRequest);
    setCooldown(getCooldownSeconds(nextRequest.verification_resend_available_at));
  }

  function applyVerificationState(verification: AccountDeletionVerification) {
    setRequest(verification.request);
    setDeletionAuthorization(verification.deletion_authorization);
    setDeletionAuthorizationExpiresAt(verification.deletion_authorization_expires_at);
    setCooldown(getCooldownSeconds(verification.request.verification_resend_available_at));
    setMessage("이메일 인증이 끝났어요. 마지막으로 한 번 더 확인한 뒤 계정을 삭제할게요.");
  }

  return (
    <AppScreen
      backTo="/(tabs)/profile"
      title="계정 삭제"
      description="삭제 후 다시 가입해도 이전 기록은 복구되지 않아요."
    >
      <SectionCard>
        <View className="gap-4 p-4">
          <View className="gap-2">
            <Text className="text-base font-black text-hypo-text">삭제 전에 확인해 주세요</Text>
            <Text className="text-sm font-bold leading-[22px] text-hypo-muted">
              계정과 프로필 식별 정보는 삭제 또는 익명화돼요. 다만 신청, 모집글, 채팅, 신고처럼 분쟁 대응과 서비스 안전에 필요한 최소 기록은 개인정보처리방침에 따라 분리 보관될 수 있어요.
            </Text>
          </View>

          <View className="gap-2 rounded-[16px] bg-hypo-bg px-3.5 py-3">
            <NoticeLine text="삭제가 완료되면 같은 이메일로 새 계정을 만들 수 있어요." />
            <NoticeLine text="새 계정에는 이전 신청, 채팅, 모집 기록이 복구되지 않아요." />
            <NoticeLine text="프로필 사진과 직접 식별 정보는 삭제 또는 익명화돼요." />
            <NoticeLine text="진행 중인 신청과 채팅 기록은 분쟁 대응을 위해 일부 보관될 수 있어요." />
          </View>

          <View className="rounded-[16px] border border-hypo-danger/15 bg-hypo-dangerSoft px-3.5 py-3">
            <Text className="text-xs font-black leading-5 text-hypo-danger">
              인증번호를 확인한 뒤에 마지막으로 한 번 더 삭제 여부를 물어볼게요.
            </Text>
          </View>

          {!shouldShowVerificationCard ? <FeedbackMessage error={error} message={message} /> : null}

          {!shouldShowVerificationCard ? (
            <PrimaryButton disabled={isSending} onPress={() => void handleSendCode()}>
              {isSending ? "보내는 중" : "인증번호 받기"}
            </PrimaryButton>
          ) : null}
        </View>
      </SectionCard>

      {shouldShowVerificationCard ? (
        <SectionCard title={isVerified ? "삭제 확인" : "이메일 인증"}>
          <View className="gap-4 p-4">
            {isVerified ? (
              <>
                <View className="gap-2">
                  <Text className="text-base font-black text-hypo-text">이메일 인증이 끝났어요</Text>
                  <Text className="text-sm font-bold leading-[22px] text-hypo-muted">
                    삭제를 진행하면 이전 신청, 채팅, 모집 기록은 복구되지 않아요. 인증 후 5분 안에 삭제를 완료해 주세요.
                  </Text>
                </View>

                <View className="gap-2 rounded-[16px] bg-hypo-bg px-3.5 py-3">
                  <NoticeLine text="삭제를 완료하면 같은 이메일로 새 계정을 다시 만들 수 있어요." />
                  <NoticeLine text="삭제 확인 시간이 지나면 인증번호를 다시 확인해야 해요." />
                </View>

                <FeedbackMessage error={error} message={message} />

                <PrimaryButton
                  className="bg-hypo-danger"
                  disabled={isDeleting}
                  onPress={requestDeletionConfirmation}
                >
                  {isDeleting ? "삭제하는 중" : "계정 삭제 확정하기"}
                </PrimaryButton>
                <InlineLink disabled={isResending || cooldown > 0} onPress={() => void handleResend()}>
                  {isResending ? "다시 보내는 중" : cooldown > 0 ? `${cooldown}초 후 인증번호 다시 받기` : "인증번호 다시 받기"}
                </InlineLink>
              </>
            ) : (
              <>
                <View className="gap-2">
                  <Text className="text-base font-black text-hypo-text">메일로 보낸 인증번호를 입력해 주세요</Text>
                  <Text className="text-sm font-bold leading-[21px] text-hypo-muted">
                    {request?.email ?? "가입한 이메일 주소"}
                  </Text>
                </View>

                <Pressable
                  accessibilityLabel="인증번호 입력"
                  accessibilityRole="button"
                  className="relative"
                  onPress={() => inputRef.current?.focus()}
                >
                  <View className="flex-row justify-between gap-2">
                    {otpDigits.map((digit, index) => {
                      const isFocused = otp.length === index || (index === otpLength - 1 && otp.length === otpLength);

                      return (
                        <View
                          key={`${index}-${digit || "empty"}`}
                          className={`h-[56px] flex-1 items-center justify-center rounded-[16px] border ${
                            isFocused
                              ? "border-hypo-brand bg-hypo-brandSoft"
                              : digit
                                ? "border-[#D7D9D2] bg-hypo-surface"
                                : "border-hypo-border bg-[#F8F6F0]"
                          }`}
                        >
                          <Text
                            className="text-[24px] leading-[31px] text-hypo-text"
                            style={{ fontFamily: "HypofitSansBold" }}
                          >
                            {digit}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  <TextInput
                    ref={inputRef}
                    autoComplete="one-time-code"
                    autoFocus
                    caretHidden
                    className="absolute inset-0 opacity-0"
                    keyboardType="number-pad"
                    maxLength={otpLength}
                    textContentType="oneTimeCode"
                    value={otp}
                    onChangeText={handleOtpChange}
                    onSubmitEditing={() => void handleVerify()}
                  />
                </Pressable>

                <FeedbackMessage error={error} message={message} />

                <PrimaryButton disabled={isVerifying || otp.length !== otpLength} onPress={() => void handleVerify()}>
                  {isVerifying ? "확인하는 중" : "인증하기"}
                </PrimaryButton>
                <InlineLink disabled={isResending || cooldown > 0} onPress={() => void handleResend()}>
                  {isResending ? "다시 보내는 중" : cooldown > 0 ? `${cooldown}초 후 다시 받기` : "인증번호 다시 받기"}
                </InlineLink>
              </>
            )}
          </View>
        </SectionCard>
      ) : null}

      <Text className="px-1 text-xs font-bold leading-5 text-hypo-muted">
        로그인할 수 없는 계정 삭제는 {supportEmail}로 문의하거나 공개 계정 삭제 페이지를 이용해 주세요.
      </Text>
    </AppScreen>
  );
}

function FeedbackMessage({ error, message }: { error: string | null; message: string | null }) {
  if (message) {
    return (
      <View className="rounded-[14px] bg-hypo-brandSoft px-3 py-2.5">
        <Text className="text-[13px] font-bold leading-[19px] text-hypo-brand">{message}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="rounded-[14px] bg-hypo-dangerSoft px-3 py-2.5">
        <Text className="text-[13px] font-bold leading-[19px] text-hypo-danger">{error}</Text>
      </View>
    );
  }

  return null;
}

function NoticeLine({ text }: { text: string }) {
  return (
    <View className="flex-row gap-2">
      <Text className="mt-0.5 text-xs font-black text-hypo-brand">•</Text>
      <Text className="min-w-0 flex-1 text-xs font-bold leading-5 text-hypo-muted">{text}</Text>
    </View>
  );
}

function normalizeOtp(value: string) {
  return value.replace(/\D/g, "").slice(0, otpLength);
}

function buildOtpDigits(value: string) {
  return Array.from({ length: otpLength }, (_, index) => value[index] ?? "");
}

function focusOtpInput(inputRef: RefObject<TextInputType | null>) {
  setTimeout(() => {
    inputRef.current?.focus();
  }, 50);
}

function getCooldownSeconds(value?: string | null) {
  if (!value) {
    return resendCooldownSeconds;
  }

  const remainingMilliseconds = new Date(value).getTime() - Date.now();
  if (Number.isNaN(remainingMilliseconds) || remainingMilliseconds <= 0) {
    return 0;
  }

  return Math.min(resendCooldownSeconds, Math.ceil(remainingMilliseconds / 1000));
}

function getSendCodeMessage(request: AccountDeletionRequest) {
  if (__DEV__ && request.debug_verification_code) {
    return `개발용 인증번호는 ${request.debug_verification_code}예요.`;
  }

  if (request.result === "verification_code_recently_sent") {
    return "최근에 인증번호를 보냈어요. 메일함을 먼저 확인해 주세요.";
  }

  return "인증번호를 메일로 보냈어요.";
}

function getResendCodeMessage(request: AccountDeletionRequest) {
  if (__DEV__ && request.debug_verification_code) {
    return `새 개발용 인증번호는 ${request.debug_verification_code}예요.`;
  }

  return "인증번호를 다시 보냈어요.";
}

function getDeliveryErrorMessage(request: AccountDeletionRequest, mode: "send" | "resend") {
  if (__DEV__ && request.debug_verification_code) {
    return null;
  }

  if (request.result === "verification_email_not_configured") {
    return "인증 메일 설정이 아직 준비되지 않았어요. 고객지원에 문의해 주세요.";
  }

  if (request.result === "verification_email_failed") {
    return mode === "resend"
      ? "인증번호 메일을 다시 보내지 못했어요. 잠시 후 다시 시도해 주세요."
      : "인증번호 메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.";
  }

  return null;
}

function getCreateRequestErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return "이미 비활성화된 계정이에요.";
    }

    if (error.status === 429) {
      return "최근에 인증번호를 보냈어요. 메일함을 먼저 확인해 주세요.";
    }
  }

  return error instanceof Error ? error.message : "인증번호를 보내지 못했어요.";
}

function getVerifyRequestErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return "인증번호를 다시 확인해 주세요.";
    }

    if (error.status === 410) {
      return "인증번호가 만료됐어요. 다시 받아서 입력해 주세요.";
    }

    if (error.status === 429) {
      return "시도 횟수가 많아요. 인증번호를 다시 받아서 시도해 주세요.";
    }

    if (error.status === 409) {
      return "인증번호를 다시 받아서 확인해 주세요.";
    }
  }

  return error instanceof Error ? error.message : "인증번호를 확인하지 못했어요.";
}

function getResendRequestErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 429) {
    return "잠시 후에 인증번호를 다시 받을 수 있어요.";
  }

  return error instanceof Error ? error.message : "인증번호를 다시 보내지 못했어요.";
}

function getConfirmDeletionErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 400 || error.status === 409 || error.status === 410) {
      return "삭제 확인 시간이 지나서 인증번호를 다시 확인해 주세요.";
    }
  }

  return error instanceof Error ? error.message : "계정을 삭제하지 못했어요.";
}

function shouldResetDeletionAuthorization(error: unknown) {
  return error instanceof ApiError && (error.status === 400 || error.status === 409 || error.status === 410);
}

function isDeletionAuthorizationExpired(value: string | null) {
  if (!value) {
    return false;
  }

  const expirationTime = new Date(value).getTime();
  return !Number.isNaN(expirationTime) && expirationTime <= Date.now();
}
