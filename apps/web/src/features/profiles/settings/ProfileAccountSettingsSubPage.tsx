import { LogOut, Trash2 } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";

import { useAuth } from "../../auth/useAuth";
import { useSignOutToLanding } from "../../auth/useSignOutToLanding";
import { useSocialAuthIdentities } from "../../auth/social/useSocialAuthIdentities";
import { useSocialIdentityLinking } from "../../auth/social/useSocialIdentityLinking";
import { ProfileAvatarUploader } from "../components/ProfileAvatarUploader";
import { ProfileIdentityPreview } from "../components/ProfileIdentityPreview";
import type { AppUser, OrganizationType } from "../../../shared/api/types";
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
import {
  getSocialProviderDefinition,
  type SocialProviderId,
} from "../../auth/social/model/providerRegistry";

type AccountInfoMode = "view" | "editProfile";

export function ProfileAccountSettingsSubPage({ appUser }: { appUser: AppUser | null }) {
  const { isSyncing, syncCurrentUser, user } = useAuth();
  const signOutToLanding = useSignOutToLanding();
  const socialIdentitiesQuery = useSocialAuthIdentities();
  const socialIdentityLinking = useSocialIdentityLinking();
  const canEditOrganization = Boolean(appUser?.id ?? user?.id);
  const [mode, setMode] = useState<AccountInfoMode>("view");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageMessage, setImageMessage] = useState<string | null>(null);
  const title = mode === "editProfile" ? "기본 정보 수정" : "계정 정보";
  const description =
    mode === "editProfile"
      ? canEditOrganization
        ? "이름, 한줄소개, 연락처와 소속 정보를 수정합니다."
        : "이름, 한줄소개, 연락처를 수정합니다."
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
          className="border-t border-hypo-border px-4 py-3.5 text-xs font-semibold text-hypo-text-muted sm:px-5"
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
        role: appUser?.role ?? "both",
        profile_image_path: uploaded.path,
        profile_image_url: uploaded.publicUrl,
        organization_type: appUser?.organization_type ?? null,
        organization_name: appUser?.organization_name ?? null,
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
      <div className="grid min-w-0 gap-5">
        <ProfileSettingsHeader
          action={
            mode === "view" ? (
              <Button className="min-h-10 px-4" size="sm" variant="secondary" onClick={() => setMode("editProfile")}>
                수정하기
              </Button>
            ) : undefined
          }
          description={description}
          onBack={mode === "view" ? undefined : handleBack}
          title={title}
        />

        {mode === "view" ? (
          <ProfileIdentityPreview appUser={appUser} fallbackEmail={user?.email} />
        ) : null}

        <AccountInfoForm
          appUser={appUser}
          canEditOrganization={canEditOrganization}
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
              icon={LogOut}
              label="로그아웃"
              onClick={() => void signOutToLanding()}
            />
            <ProfileSettingsActionRow
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
  canEditOrganization,
  mode,
  onModeChange,
  profilePhotoContent,
}: {
  appUser: AppUser | null;
  canEditOrganization: boolean;
  mode: AccountInfoMode;
  onModeChange: (mode: AccountInfoMode) => void;
  profilePhotoContent: ReactNode;
}) {
  const { errorMessage, updateCurrentUser } = useAuth();
  const [name, setName] = useState(appUser?.name ?? "");
  const [bio, setBio] = useState(appUser?.bio ?? "");
  const [phone, setPhone] = useState(appUser?.phone ?? "");
  const [organizationType, setOrganizationType] = useState<OrganizationType | null>(
    appUser?.organization_type ?? null,
  );
  const [organizationName, setOrganizationName] = useState(appUser?.organization_name ?? "");
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
    setOrganizationType(appUser?.organization_type ?? null);
    setOrganizationName(appUser?.organization_name ?? "");
    setLocalError(null);
  }, [
    appUser?.bio,
    appUser?.name,
    appUser?.organization_name,
    appUser?.organization_type,
    appUser?.phone,
    mode,
  ]);

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
    setOrganizationType(appUser?.organization_type ?? null);
    setOrganizationName(appUser?.organization_name ?? "");
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

    const normalizedOrganization = normalizeOrganizationInput({
      canEditOrganization,
      currentName: appUser?.organization_name ?? null,
      currentType: appUser?.organization_type ?? null,
      draftName: organizationName,
      draftType: organizationType,
    });

    const organizationError =
      "error" in normalizedOrganization ? normalizedOrganization.error : null;
    if (organizationError) {
      setLocalError(organizationError);
      return;
    }

    try {
      setIsSavingProfile(true);
      await updateCurrentUser({
        name: trimmedName,
        bio: bio.trim() || null,
        phone: phone.trim() || null,
        role: appUser?.role ?? "both",
        organization_type: normalizedOrganization.organizationType,
        organization_name: normalizedOrganization.organizationName,
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
        {canEditOrganization ? (
          <ProfileSettingsInfoRow
            label="소속"
            value={formatOrganizationSummary(
              appUser?.organization_type ?? null,
              appUser?.organization_name ?? null,
            )}
          />
        ) : null}
        {localMessage ? (
          <p className="border-t border-hypo-border px-4 py-3.5 text-xs font-bold text-hypo-brand sm:px-5" role="status">
            {localMessage}
          </p>
        ) : null}
      </ProfileSettingsSection>
    );
  }

  if (mode === "editProfile") {
    return (
      <ProfileSettingsSection title="수정할 정보">
        <form className="grid gap-5 p-4 sm:p-5" onSubmit={(event) => void handleSubmit(event)}>
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

          {canEditOrganization ? (
            <>
              <Field label="소속 유형" hint="모집글과 프로필에 함께 표시됩니다.">
                <div className="grid gap-2 sm:grid-cols-2">
                  {organizationOptions.map((option) => {
                    const isSelected = organizationType === option.value;

                    return (
                      <button
                        key={option.value}
                        aria-pressed={isSelected}
                        className={cn(
                          "flex min-h-11 items-center justify-center rounded-hypo-md border px-3 text-sm font-semibold transition-[border-color,background-color,color]",
                          isSelected
                            ? "border-hypo-brand bg-hypo-brand-soft text-hypo-brand-strong"
                            : "border-hypo-border bg-hypo-surface text-hypo-text-muted hover:border-hypo-brand/30 hover:text-hypo-text",
                        )}
                        type="button"
                        onClick={() => setOrganizationType(option.value)}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="팀 또는 회사 이름" hint="예: 콘텐츠럭, Hypofit Team">
                <TextInput
                  maxLength={100}
                  placeholder="팀명 또는 회사명을 입력해주세요"
                  value={organizationName}
                  onChange={(event) => setOrganizationName(event.target.value)}
                />
              </Field>

              {organizationType || organizationName.trim() ? (
                <div className="-mt-2 flex justify-end">
                  <button
                    className="text-sm font-semibold text-hypo-text-muted transition-colors hover:text-hypo-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
                    type="button"
                    onClick={() => {
                      setOrganizationType(null);
                      setOrganizationName("");
                    }}
                  >
                    소속 정보 지우기
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

          {localMessage || localError || errorMessage ? (
            <p
              className={cn(
                "rounded-hypo-md border px-3 py-2.5 text-xs font-bold",
                localError || errorMessage
                  ? "border-hypo-danger/10 bg-hypo-danger-soft text-hypo-danger"
                  : "border-hypo-brand/10 bg-hypo-brand-soft text-hypo-brand",
              )}
              role={localError || errorMessage ? "alert" : "status"}
            >
              {localError ?? errorMessage ?? localMessage}
            </p>
          ) : null}

          <ProfileSettingsFormActionRow>
            <Button
              className="min-h-10 sm:min-w-[112px]"
              disabled={isSavingProfile}
              type="button"
              variant="secondary"
              onClick={resetProfileForm}
            >
              취소
            </Button>
            <Button className="min-h-10 sm:min-w-[128px]" disabled={isSavingProfile} type="submit">
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

const organizationOptions: Array<{ label: string; value: OrganizationType }> = [
  { label: "팀", value: "team" },
  { label: "회사", value: "company" },
];

function normalizeOrganizationInput({
  canEditOrganization,
  currentName,
  currentType,
  draftName,
  draftType,
}: {
  canEditOrganization: boolean;
  currentName: string | null;
  currentType: OrganizationType | null;
  draftName: string;
  draftType: OrganizationType | null;
}) {
  if (!canEditOrganization) {
    return {
      organizationName: currentName,
      organizationType: currentType,
    };
  }

  const trimmedName = draftName.trim();

  if (!trimmedName && !draftType) {
    return {
      organizationName: null,
      organizationType: null,
    };
  }

  if (trimmedName.length > 100) {
    return {
      error: "팀 또는 회사 이름은 100자까지 입력할 수 있어요.",
    };
  }

  if (!draftType) {
    return {
      error: "팀인지 회사인지 선택해주세요.",
    };
  }

  if (!trimmedName) {
    return {
      error: "팀 또는 회사 이름을 입력해주세요.",
    };
  }

  return {
    organizationName: trimmedName,
    organizationType: draftType,
  };
}

function formatOrganizationSummary(
  organizationType: OrganizationType | null,
  organizationName: string | null,
) {
  const trimmedName = organizationName?.trim();

  if (!organizationType || !trimmedName) {
    return "미등록";
  }

  return `${organizationType === "team" ? "팀" : "회사"} · ${trimmedName}`;
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
    provider: SocialProviderId;
    status: "active" | "revocation_pending" | "revoked";
  }>;
  isError: boolean;
  isLoading: boolean;
  linkableProviders: Array<{ provider: SocialProviderId }>;
  linkingFeedback: string | null;
  onLinkProvider: (provider: SocialProviderId) => void;
  pendingProvider: SocialProviderId | null;
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
            provider={identity.provider}
            status={identity.status}
          />
        ))
      )}
      {disconnectedProviders.length ? (
        <div className="grid gap-2 border-t border-hypo-border px-4 py-4 sm:grid-cols-2 sm:px-5">
          {disconnectedProviders.map(({ provider }) => {
            const definition = getSocialProviderDefinition(provider);
            const isPending = pendingProvider === provider;

            return (
              <Button
                key={provider}
                className="min-h-10 justify-start gap-2.5 border-hypo-border bg-hypo-bg px-3.5 text-left"
                disabled={pendingProvider !== null}
                size="sm"
                type="button"
                variant="secondary"
                onClick={() => onLinkProvider(provider)}
              >
                <SocialProviderMark compact provider={provider} />
                <span>{isPending ? "연결 중" : `${definition.label} 연결하기`}</span>
              </Button>
            );
          })}
        </div>
      ) : null}
      {linkingFeedback ? (
        <ProfileSettingsTextBlock>{linkingFeedback}</ProfileSettingsTextBlock>
      ) : null}
    </ProfileSettingsSection>
  );
}

function LoginMethodRow({
  detail,
  provider,
  status,
}: {
  detail: string;
  provider: SocialProviderId;
  status: "active" | "revocation_pending" | "revoked";
}) {
  const definition = getSocialProviderDefinition(provider);

  return (
    <div className="flex min-h-[68px] items-center gap-3.5 border-t border-hypo-border px-4 py-3.5 first:border-t-0 sm:px-5">
      <SocialProviderMark provider={provider} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-hypo-text">{definition.label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-hypo-text-muted">{detail}</span>
      </span>
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
          status === "active" && "bg-hypo-brand-soft text-hypo-brand",
          status === "revocation_pending" && "bg-hypo-bg text-hypo-text-soft",
          status === "revoked" && "bg-hypo-danger-soft text-hypo-danger",
        )}
      >
        {getLoginMethodStatusLabel(status)}
      </span>
    </div>
  );
}

function SocialProviderMark({
  compact = false,
  provider,
}: {
  compact?: boolean;
  provider: SocialProviderId;
}) {
  const definition = getSocialProviderDefinition(provider);

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden",
        compact ? "size-7 rounded-lg" : "size-9 rounded-[10px]",
        provider === "apple" && "bg-[#111111]",
        provider === "google" && "border border-hypo-border bg-white",
        provider === "kakao" && "bg-[#FEE500]",
        provider === "naver" && "bg-[#03A94D]",
      )}
      data-social-provider={provider}
    >
      <img
        alt=""
        aria-hidden="true"
        className={cn(
          "object-contain",
          provider === "google"
            ? compact
              ? "size-4"
              : "size-5"
            : compact
              ? "size-7"
              : "size-9",
        )}
        src={definition.iconPath}
      />
    </span>
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
