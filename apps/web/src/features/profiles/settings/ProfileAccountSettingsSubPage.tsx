import { LogOut, Trash2 } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";

import { useAuth } from "../../auth/useAuth";
import { useSocialAuthIdentities } from "../../auth/social/useSocialAuthIdentities";
import { useSocialIdentityLinking } from "../../auth/social/useSocialIdentityLinking";
import { ProfileAvatarUploader } from "../components/ProfileAvatarUploader";
import { ProfileIdentityPreview } from "../components/ProfileIdentityPreview";
import type { AppUser } from "../../../shared/api/types";
import { getApiErrorMessage } from "../../../shared/api/errorPresentation";
import { navigateBack } from "../../../shared/navigation/appNavigation";
import { uploadProfileImage } from "../../../shared/supabase/profileImages";
import { Button } from "../../../shared/ui/button";
import { cn } from "../../../shared/ui/cn";
import { Field, TextInput } from "../../../shared/ui/field";
import { PageLayout } from "../../../shared/ui/page";
import { profileSettingsPageMeta } from "./settingsMeta";
import {
  ProfileSettingsActionRow,
  ProfileSettingsFormActionRow,
  ProfileSettingsHeader,
  ProfileSettingsInfoRow,
  ProfileSettingsSection,
  ProfileSettingsTextBlock,
} from "./settingsPrimitives";
import { getSocialProviderDefinition } from "../../auth/social/model/providerRegistry";

type AccountInfoMode = "view" | "editProfile";

export function ProfileAccountSettingsSubPage({ appUser }: { appUser: AppUser | null }) {
  const { isSyncing, signOut, syncCurrentUser, user } = useAuth();
  const socialIdentitiesQuery = useSocialAuthIdentities();
  const socialIdentityLinking = useSocialIdentityLinking();
  const [mode, setMode] = useState<AccountInfoMode>("view");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageMessage, setImageMessage] = useState<string | null>(null);
  const title = mode === "editProfile" ? "기본 정보 수정" : "계정 정보";
  const description =
    mode === "editProfile"
      ? "이름, 한줄소개, 연락처를 수정합니다."
      : profileSettingsPageMeta.account.description;

  const handleBack = () => {
    if (mode !== "view") {
      setMode("view");
      return;
    }

    navigateBack("/profile");
  };

  const profilePhotoContent = (
    <>
      <div className="flex items-center gap-4 px-4 py-4 sm:px-5">
        <ProfileAvatarUploader
          alt={`${appUser?.name ?? "사용자"} 프로필 사진`}
          disabled={isUploadingImage || isSyncing}
          fallback={appUser?.name?.[0] ?? user?.email?.[0] ?? "H"}
          imageUrl={appUser?.profile_image_url}
          onFileSelected={(file) => void handleProfileImageSelected(file)}
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-hypo-text">프로필 사진</p>
          <p className="mt-1 text-xs leading-5 text-hypo-text-muted">
            모집글과 채팅에서 다른 사용자에게 표시됩니다.
          </p>
        </div>
      </div>
      {imageMessage ? (
        <p
          className="border-t border-hypo-border px-4 py-3 text-xs font-semibold text-hypo-text-muted sm:px-5"
          role="status"
        >
          {imageMessage}
        </p>
      ) : null}
    </>
  );

  async function handleProfileImageSelected(file: File) {
    if (!user) {
      return;
    }

    setIsUploadingImage(true);
    setImageMessage(null);

    try {
      const uploaded = await uploadProfileImage(user.id, file);
      await syncCurrentUser({
        name: appUser?.name ?? user.email?.split("@")[0] ?? "Hypofit user",
        bio: appUser?.bio ?? null,
        phone: appUser?.phone ?? null,
        role: appUser?.role ?? "respondent",
        profile_image_path: uploaded.path,
        profile_image_url: uploaded.publicUrl,
      });
      setImageMessage("프로필 사진이 저장됐어요.");
    } catch (error) {
      setImageMessage(getApiErrorMessage(error, "프로필 사진을 저장하지 못했어요."));
    } finally {
      setIsUploadingImage(false);
    }
  }

  return (
    <PageLayout className="max-w-[880px]" variant="settings-form">
      <div className="grid min-w-0 gap-4">
        <div className="border-b border-hypo-border pb-4">
          <ProfileSettingsHeader
            action={
              mode === "view" ? (
                <Button className="min-h-10" size="sm" variant="secondary" onClick={() => setMode("editProfile")}>
                  수정하기
                </Button>
              ) : undefined
            }
            description={description}
            onBack={mode === "view" ? undefined : handleBack}
            title={title}
          />
        </div>

        {mode === "view" ? (
          <ProfileIdentityPreview appUser={appUser} fallbackEmail={user?.email} />
        ) : null}

        <AccountInfoForm
          appUser={appUser}
          mode={mode}
          profilePhotoContent={profilePhotoContent}
          onModeChange={setMode}
        />

        {mode === "view" ? (
          <LoginMethodSection
            identities={socialIdentitiesQuery.data ?? []}
            isError={socialIdentitiesQuery.isError}
            isLoading={socialIdentitiesQuery.isLoading}
            linkableProviders={socialIdentityLinking.availableProviders}
            linkingFeedback={socialIdentityLinking.feedback}
            pendingProvider={socialIdentityLinking.pendingProvider}
            onLinkProvider={(provider) => void socialIdentityLinking.linkProvider(provider)}
          />
        ) : null}

        {mode === "view" ? (
          <ProfileSettingsSection title="계정 관리">
            <ProfileSettingsActionRow
              helper="현재 브라우저에서 Hypofit 계정 연결을 종료합니다."
              icon={LogOut}
              label="로그아웃"
              onClick={() => void signOut()}
            />
            <ProfileSettingsActionRow
              helper="계정과 연결된 개인정보의 삭제 범위를 확인합니다."
              href="/profile/delete-account"
              icon={Trash2}
              label="계정 삭제"
              tone="danger"
            />
          </ProfileSettingsSection>
        ) : null}
      </div>
    </PageLayout>
  );
}

function AccountInfoForm({
  appUser,
  mode,
  onModeChange,
  profilePhotoContent,
}: {
  appUser: AppUser | null;
  mode: AccountInfoMode;
  onModeChange: (mode: AccountInfoMode) => void;
  profilePhotoContent: ReactNode;
}) {
  const { errorMessage, updateCurrentUser } = useAuth();
  const [name, setName] = useState(appUser?.name ?? "");
  const [bio, setBio] = useState(appUser?.bio ?? "");
  const [phone, setPhone] = useState(appUser?.phone ?? "");
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (mode !== "view") {
      return;
    }

    setName(appUser?.name ?? "");
    setBio(appUser?.bio ?? "");
    setPhone(appUser?.phone ?? "");
    setLocalError(null);
  }, [appUser?.bio, appUser?.name, appUser?.phone, mode]);

  useEffect(() => {
    if (mode === "editProfile") {
      setLocalMessage(null);
      setLocalError(null);
    }
  }, [mode]);

  const resetProfileForm = () => {
    setName(appUser?.name ?? "");
    setBio(appUser?.bio ?? "");
    setPhone(appUser?.phone ?? "");
    setLocalError(null);
    onModeChange("view");
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    setLocalMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setLocalError("이름을 입력해주세요.");
      return;
    }

    try {
      setIsSavingProfile(true);
      await updateCurrentUser({
        name: trimmedName,
        bio: bio.trim() || null,
        phone: phone.trim() || null,
        role: appUser?.role ?? "respondent",
      });
      setLocalMessage("계정 정보가 저장됐어요.");
      onModeChange("view");
    } catch (error) {
      setLocalError(getApiErrorMessage(error, "계정 정보를 저장하지 못했어요."));
    } finally {
      setIsSavingProfile(false);
    }
  }

  if (mode === "view") {
    return (
      <ProfileSettingsSection title="기본 정보">
        {profilePhotoContent}
        <ProfileSettingsInfoRow label="이름" value={appUser?.name ?? "-"} />
        <ProfileSettingsInfoRow label="한줄소개" value={appUser?.bio ?? "미등록"} />
        <ProfileSettingsInfoRow label="이메일" value={appUser?.email ?? "-"} />
        <ProfileSettingsInfoRow label="전화번호" value={appUser?.phone ?? "미등록"} />
        {localMessage ? (
          <p className="border-t border-hypo-border px-4 py-3 text-xs font-bold text-hypo-brand" role="status">
            {localMessage}
          </p>
        ) : null}
      </ProfileSettingsSection>
    );
  }

  if (mode === "editProfile") {
    return (
      <ProfileSettingsSection title="기본 정보 수정">
        <form className="grid gap-4 p-4 sm:p-5" onSubmit={(event) => void handleSubmit(event)}>
          <Field label="이름">
            <TextInput
              autoComplete="name"
              maxLength={100}
              minLength={1}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>

          <Field label="이메일" hint="이메일 변경은 현재 지원하지 않습니다.">
            <TextInput disabled value={appUser?.email ?? ""} />
          </Field>

          <Field label="한줄소개" hint="채팅 프로필에 표시됩니다.">
            <TextInput
              maxLength={120}
              placeholder="예: 운동 루틴을 만드는 초기 창업자"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
            />
          </Field>

          <Field label="전화번호" hint="숫자만 입력해도 010-1234-5678 형식으로 저장됩니다.">
            <TextInput
              autoComplete="tel"
              inputMode="tel"
              maxLength={13}
              placeholder="010-1234-5678"
              value={phone}
              onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
            />
          </Field>

          {localMessage || localError || errorMessage ? (
            <p
              className={cn(
                "rounded-hypo-lg px-3 py-2 text-xs font-bold",
                localError || errorMessage ? "bg-hypo-danger-soft text-hypo-danger" : "bg-hypo-brand-soft text-hypo-brand",
              )}
              role={localError || errorMessage ? "alert" : "status"}
            >
              {localError ?? errorMessage ?? localMessage}
            </p>
          ) : null}

          <ProfileSettingsFormActionRow>
            <Button
              className="min-h-11 sm:min-w-[112px]"
              disabled={isSavingProfile}
              type="button"
              variant="secondary"
              onClick={resetProfileForm}
            >
              취소
            </Button>
            <Button className="min-h-11 sm:min-w-[128px]" disabled={isSavingProfile} type="submit">
              {isSavingProfile ? "저장 중" : "저장하기"}
            </Button>
          </ProfileSettingsFormActionRow>
        </form>
      </ProfileSettingsSection>
    );
  }
}

function formatPhoneInput(value: string) {
  const rawDigits = value.replace(/\D/g, "");
  const digits = (rawDigits.startsWith("82") ? `0${rawDigits.slice(2)}` : rawDigits).slice(0, 11);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.startsWith("02")) {
    if (digits.length <= 6) {
      return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    }

    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function LoginMethodSection({
  identities,
  isError,
  isLoading,
  linkableProviders,
  linkingFeedback,
  onLinkProvider,
  pendingProvider,
}: {
  identities: Array<{
    email: string | null;
    provider: "apple" | "google" | "kakao" | "naver";
    status: "active" | "revocation_pending" | "revoked";
  }>;
  isError: boolean;
  isLoading: boolean;
  linkableProviders: Array<{ provider: "apple" | "google" | "kakao" | "naver" }>;
  linkingFeedback: string | null;
  onLinkProvider: (provider: "apple" | "google" | "kakao" | "naver") => void;
  pendingProvider: "apple" | "google" | "kakao" | "naver" | null;
}) {
  const connectedProviders = new Set(
    identities
      .filter((identity) => identity.status !== "revoked")
      .map((identity) => identity.provider),
  );
  const disconnectedProviders = linkableProviders.filter(
    (capability) => !connectedProviders.has(capability.provider),
  );

  return (
    <ProfileSettingsSection title="로그인 방법">
      {isLoading ? (
        <ProfileSettingsTextBlock>연결된 로그인 정보를 확인하고 있어요.</ProfileSettingsTextBlock>
      ) : isError ? (
        <ProfileSettingsTextBlock>연결된 로그인 정보를 불러오지 못했어요.</ProfileSettingsTextBlock>
      ) : identities.length === 0 ? (
        <ProfileSettingsTextBlock>연결된 소셜 로그인이 아직 없어요.</ProfileSettingsTextBlock>
      ) : (
        identities.map((identity) => (
          <LoginMethodRow
            key={`${identity.provider}-${identity.email ?? "none"}`}
            detail={identity.email ? maskLoginMethodEmail(identity.email) : "이메일 정보 없음"}
            label={getSocialProviderDefinition(identity.provider).label}
            statusLabel={getLoginMethodStatusLabel(identity.status)}
          />
        ))
      )}
      {disconnectedProviders.length ? (
        <div className="grid gap-2 border-t border-hypo-border px-4 py-4 sm:grid-cols-2">
          {disconnectedProviders.map(({ provider }) => {
            const definition = getSocialProviderDefinition(provider);
            const isPending = pendingProvider === provider;

            return (
              <Button
                key={provider}
                className="min-h-10 justify-center"
                disabled={pendingProvider !== null}
                size="sm"
                type="button"
                variant="secondary"
                onClick={() => onLinkProvider(provider)}
              >
                {isPending ? "연결 중" : `${definition.label} 연결하기`}
              </Button>
            );
          })}
        </div>
      ) : null}
      {linkingFeedback ? (
        <ProfileSettingsTextBlock>{linkingFeedback}</ProfileSettingsTextBlock>
      ) : null}
      <ProfileSettingsTextBlock>
        연결 해제는 마지막 로그인 방법 보호와 공급자 해제 계약이 준비된 뒤 제공할게요.
      </ProfileSettingsTextBlock>
    </ProfileSettingsSection>
  );
}

function LoginMethodRow({
  detail,
  label,
  statusLabel,
}: {
  detail: string;
  label: string;
  statusLabel: string;
}) {
  return (
    <div className="flex min-h-[58px] flex-col gap-2 border-t border-hypo-border px-4 py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-hypo-text">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-hypo-text-muted">{detail}</span>
      </span>
      <span className="shrink-0 rounded-full bg-hypo-bg px-2.5 py-1 text-xs font-bold text-hypo-text-soft">
        {statusLabel}
      </span>
    </div>
  );
}

function getLoginMethodStatusLabel(status: "active" | "revocation_pending" | "revoked") {
  if (status === "revocation_pending") {
    return "해제 진행 중";
  }

  if (status === "revoked") {
    return "해제됨";
  }

  return "연결됨";
}

function maskLoginMethodEmail(email: string) {
  const [localPart, domainPart] = email.split("@");

  if (!localPart || !domainPart) {
    return email;
  }

  if (localPart.length <= 2) {
    return `${localPart[0] ?? "*"}*@${domainPart}`;
  }

  return `${localPart.slice(0, 2)}***@${domainPart}`;
}
