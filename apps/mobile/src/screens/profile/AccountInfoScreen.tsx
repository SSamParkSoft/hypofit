import { useEffect, useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { OrganizationType, SocialAuthProvider, SocialIdentityRead } from "@hypofit/contracts";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  getPublicMobileSocialProviderIds,
  getSocialAuthErrorMessage,
  getSocialIdentityEmailLabel,
  getSocialIdentityStatusLabel,
  loadSocialIdentities,
  socialProviderLabels,
  startSocialIdentityLink,
} from "@/features/auth/social/socialAuthService";
import { goBackOrReplaceFallback } from "@/shared/navigation/backNavigation";
import { AppScreen } from "@/shared/ui/AppScreen";
import { TextField } from "@/shared/ui/TextField";
import {
  canEditOrganization,
  compatibilityRole,
  formatPhoneInput,
  getOrganizationTypeLabel,
} from "./profileUtils";

type AccountInfoMode = "view" | "editProfile";
type EditableProfileField = "name" | "bio" | "phone" | "organization";
type OrganizationOption = { label: string; value: OrganizationType };
type ProfileFieldErrors = Partial<Record<"name" | "organizationName", string>>;
type FeatherIconName = ComponentProps<typeof Feather>["name"];

const organizationOptions: OrganizationOption[] = [
  { label: "팀", value: "team" },
  { label: "회사", value: "company" },
];
const organizationSelectionOptions: Array<{ label: string; value: OrganizationType | null }> = [
  { label: "없음", value: null },
  ...organizationOptions,
];

export function AccountInfoScreen() {
  const { accessToken, appUser, errorMessage, signOut, updateCurrentUser } = useAuth();
  const [mode, setMode] = useState<AccountInfoMode>("view");
  const [editTarget, setEditTarget] = useState<EditableProfileField | null>(null);
  const [fieldEditor, setFieldEditor] = useState<EditableProfileField | null>(null);
  const [name, setName] = useState(appUser?.name ?? "");
  const [bio, setBio] = useState(appUser?.bio ?? "");
  const [phone, setPhone] = useState(appUser?.phone ?? "");
  const [organizationType, setOrganizationType] = useState<OrganizationType | null>(appUser?.organization_type ?? null);
  const [organizationName, setOrganizationName] = useState(appUser?.organization_name ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [profileErrors, setProfileErrors] = useState<ProfileFieldErrors>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingField, setIsSavingField] = useState(false);
  const [identities, setIdentities] = useState<SocialIdentityRead[]>([]);
  const [isLoadingIdentities, setIsLoadingIdentities] = useState(false);
  const [pendingSocialProvider, setPendingSocialProvider] = useState<SocialAuthProvider | null>(null);
  const supportsOrganization = canEditOrganization(appUser?.role);
  const isProfileDirty = useMemo(
    () =>
      name.trim() !== (appUser?.name ?? "").trim() ||
      (bio.trim() || null) !== (appUser?.bio ?? null) ||
      (phone.trim() || null) !== (appUser?.phone ?? null) ||
      organizationType !== (appUser?.organization_type ?? null) ||
      (organizationName.trim() || null) !== (appUser?.organization_name ?? null),
    [appUser?.bio, appUser?.name, appUser?.organization_name, appUser?.organization_type, appUser?.phone, bio, name, organizationName, organizationType, phone],
  );
  const visibleSocialProviders = useMemo(
    () =>
      getPublicMobileSocialProviderIds().filter(
        (provider) =>
          !identities.some(
            (identity) => identity.provider === provider && identity.status !== "revoked",
          ),
      ),
    [identities],
  );

  useEffect(() => {
    if (!accessToken || mode !== "view") {
      return;
    }

    let isMounted = true;
    setIsLoadingIdentities(true);

    void loadSocialIdentities(accessToken)
      .then((nextIdentities) => {
        if (isMounted) {
          setIdentities(nextIdentities);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIdentities([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingIdentities(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken, mode]);

  useEffect(() => {
    if (mode !== "view") {
      return;
    }

    setName(appUser?.name ?? "");
    setBio(appUser?.bio ?? "");
    setPhone(appUser?.phone ?? "");
    setOrganizationType(appUser?.organization_type ?? null);
    setOrganizationName(appUser?.organization_name ?? "");
  }, [appUser?.bio, appUser?.name, appUser?.organization_name, appUser?.organization_type, appUser?.phone, mode]);

  const resetForm = () => {
    setName(appUser?.name ?? "");
    setBio(appUser?.bio ?? "");
    setPhone(appUser?.phone ?? "");
    setOrganizationType(appUser?.organization_type ?? null);
    setOrganizationName(appUser?.organization_name ?? "");
    setLocalError(null);
    setProfileErrors({});
    setEditTarget(null);
    setMode("view");
  };

  const handleSave = async () => {
    setLocalError(null);
    setMessage(null);
    const trimmedName = name.trim();
    const trimmedOrganizationName = organizationName.trim();

    const nextErrors: ProfileFieldErrors = {};

    if (!trimmedName) nextErrors.name = "이름을 입력해 주세요.";

    let nextOrganizationType = appUser?.organization_type ?? null;
    let nextOrganizationName = appUser?.organization_name ?? null;

    if (supportsOrganization) {
      if (organizationType && !trimmedOrganizationName) {
        nextErrors.organizationName = "팀이나 회사 이름을 입력해 주세요.";
      }

      if (!organizationType && trimmedOrganizationName) {
        nextErrors.organizationName = "소속 유형을 선택해 주세요.";
      }

      nextOrganizationType = organizationType;
      nextOrganizationName = trimmedOrganizationName || null;
    }

    if (Object.keys(nextErrors).length > 0) {
      setProfileErrors(nextErrors);
      return;
    }

    try {
      setIsSavingProfile(true);
      await updateCurrentUser({
        name: trimmedName,
        bio: bio.trim() || null,
        phone: phone.trim() || null,
        organization_type: nextOrganizationType,
        organization_name: nextOrganizationName,
        role: compatibilityRole,
      });
      setMessage("계정 정보가 저장됐어요.");
      setEditTarget(null);
      setMode("view");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "계정 정보를 저장하지 못했어요.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const startEditProfile = (target: EditableProfileField = "name") => {
    setMessage(null);
    setLocalError(null);
    setProfileErrors({});
    setEditTarget(target);
    setMode("editProfile");
  };

  const openFieldEditor = (target: EditableProfileField) => {
    setMessage(null);
    setLocalError(null);
    setName(appUser?.name ?? "");
    setBio(appUser?.bio ?? "");
    setPhone(appUser?.phone ?? "");
    setOrganizationType(appUser?.organization_type ?? null);
    setOrganizationName(appUser?.organization_name ?? "");
    setFieldEditor(target);
  };

  const closeFieldEditor = () => {
    if (isSavingField) {
      return;
    }

    setLocalError(null);
    setFieldEditor(null);
  };

  const handleFieldSave = async () => {
    if (!fieldEditor) {
      return;
    }

    setLocalError(null);
    const trimmedName = name.trim();
    const trimmedOrganizationName = organizationName.trim();

    if (fieldEditor === "name" && !trimmedName) {
      setLocalError("이름을 입력해 주세요.");
      return;
    }

    if (fieldEditor === "organization") {
      if (organizationType && !trimmedOrganizationName) {
        setLocalError("팀이나 회사 이름을 입력해 주세요.");
        return;
      }

      if (!organizationType && trimmedOrganizationName) {
        setLocalError("팀인지 회사인지 먼저 선택해 주세요.");
        return;
      }
    }

    try {
      setIsSavingField(true);
      await updateCurrentUser({
        name: fieldEditor === "name" ? trimmedName : appUser?.name ?? "",
        bio: fieldEditor === "bio" ? bio.trim() || null : appUser?.bio ?? null,
        phone: fieldEditor === "phone" ? phone.trim() || null : appUser?.phone ?? null,
        organization_type: fieldEditor === "organization" ? organizationType : appUser?.organization_type ?? null,
        organization_name: fieldEditor === "organization" ? trimmedOrganizationName || null : appUser?.organization_name ?? null,
        role: compatibilityRole,
      });
      setMessage(`${getFieldEditorTitle(fieldEditor)}을 저장했어요.`);
      setFieldEditor(null);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "계정 정보를 저장하지 못했어요.");
    } finally {
      setIsSavingField(false);
    }
  };

  const handleSocialIdentityLink = async (provider: SocialAuthProvider) => {
    if (!accessToken || pendingSocialProvider) {
      return;
    }

    setLocalError(null);
    setMessage(null);
    setPendingSocialProvider(provider);

    try {
      const result = await startSocialIdentityLink(provider, accessToken, "/(tabs)/profile/account");
      if (result.status === "cancelled") {
        setMessage("로그인 방법 연결을 취소했어요.");
        return;
      }

      if (result.status === "completed") {
        setIdentities(await loadSocialIdentities(accessToken));
        setMessage(`${socialProviderLabels[provider]} 로그인을 연결했어요.`);
      }
    } catch (error) {
      setLocalError(getSocialAuthErrorMessage(error, "로그인 방법을 연결하지 못했어요."));
    } finally {
      setPendingSocialProvider(null);
    }
  };

  const handleBack = () => {
    if (mode === "editProfile") {
      confirmDiscardEdits();
      return;
    }

    goBackOrReplaceFallback("/(tabs)/profile");
  };

  const confirmDiscardEdits = () => {
    if (!isProfileDirty) {
      resetForm();
      return;
    }

    Alert.alert("변경 내용을 저장하지 않고 나갈까요?", "입력한 내용은 저장되지 않아요.", [
      { style: "cancel", text: "계속 수정" },
      { style: "destructive", text: "나가기", onPress: resetForm },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert("로그아웃할까요?", "이 기기에서 로그인 정보가 삭제돼요.", [
      { style: "cancel", text: "취소" },
      {
        style: "destructive",
        text: "로그아웃",
        onPress: () => {
          void signOut().then(() => router.replace("/(auth)/login"));
        },
      },
    ]);
  };

  const title = mode === "editProfile" ? "기본 정보 수정" : "계정 정보";

  return (
    <AppScreen
      backTo="/(tabs)/profile"
      keyboardAvoiding={mode !== "view"}
      title={title}
      onBack={handleBack}
      right={
        mode === "view" ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => startEditProfile()}
          >
            <Text className="text-sm font-black text-hypo-brand">수정</Text>
          </Pressable>
        ) : null
      }
    >
      {mode === "view" ? (
        <View className="-mx-4 gap-7 px-4 pb-3">
          <View>
            <SectionLabel>기본 정보</SectionLabel>
            <AccountGroup>
              <AccountInfoRow icon="user" label="이름" value={appUser?.name ?? "-"} onPress={() => openFieldEditor("name")} />
              <AccountInfoRow icon="edit-3" label="한줄소개" value={appUser?.bio ?? "미등록"} onPress={() => openFieldEditor("bio")} />
              <AccountInfoRow icon="phone" label="전화번호" showDivider={supportsOrganization} value={appUser?.phone ?? "미등록"} onPress={() => openFieldEditor("phone")} />
              {supportsOrganization ? (
                <>
                  <AccountInfoRow
                    icon="briefcase"
                    label="소속 유형"
                    value={getOrganizationTypeLabel(appUser?.organization_type) ?? "미등록"}
                    onPress={() => openFieldEditor("organization")}
                  />
                  <AccountInfoRow
                    icon="users"
                    label="팀·회사명"
                    showDivider={false}
                    value={appUser?.organization_name ?? "미등록"}
                    onPress={() => openFieldEditor("organization")}
                  />
                </>
              ) : null}
            </AccountGroup>
          </View>

          <View>
            <SectionLabel>계정</SectionLabel>
            <AccountGroup><AccountInfoRow icon="mail" label="이메일" showDivider={false} value={appUser?.email ?? "-"} /></AccountGroup>
          </View>

          <View>
            <SectionLabel>연결된 로그인</SectionLabel>
            <AccountGroup>
              {isLoadingIdentities ? (
                <Text className="px-4 py-4 text-sm font-medium text-hypo-text-secondary">불러오는 중이에요.</Text>
              ) : (
                <>
                  {identities.map((identity) => (
                    <LinkedSocialIdentityRow identity={identity} key={`${identity.provider}-${identity.linked_at}`} />
                  ))}
                  {visibleSocialProviders.map((provider) => (
                    <SocialProviderLinkRow
                      disabled={pendingSocialProvider !== null}
                      isPending={pendingSocialProvider === provider}
                      key={provider}
                      provider={provider}
                      onPress={() => void handleSocialIdentityLink(provider)}
                    />
                  ))}
                  {!identities.length && !visibleSocialProviders.length ? (
                    <Text className="px-4 py-4 text-sm font-medium text-hypo-text-secondary">
                      연결된 로그인 방법이 없어요.
                    </Text>
                  ) : null}
                </>
              )}
            </AccountGroup>
          </View>

          <View>
            <SectionLabel>계정 관리</SectionLabel>
            <AccountGroup>
              <AccountActionRow icon="log-out" label="로그아웃" onPress={handleSignOut} />
              <AccountActionRow icon="user-x" label="계정 탈퇴" showDivider={false} tone="danger" onPress={() => router.push("/(tabs)/profile/delete-account")} />
            </AccountGroup>
          </View>

          {message ? <Text className="px-1 pt-2 text-xs font-black text-hypo-brand">{message}</Text> : null}
          {localError || errorMessage ? (
            <Text className="px-1 text-xs font-bold leading-[19px] text-hypo-danger">{localError ?? errorMessage}</Text>
          ) : null}
        </View>
      ) : (
        <View className="-mx-4 gap-5 px-4 pb-3">
          <Text className="text-[13px] leading-5 text-hypo-text-secondary">변경한 내용은 저장해야 반영돼요.</Text>
          <View className="gap-3">
            <TextField
              autoFocus={editTarget === "name"}
              errorMessage={profileErrors.name}
              inputRadiusClassName="rounded-[16px]"
              label="이름"
              labelRight={<Text className="text-[12px] font-medium text-hypo-text-metadata">{name.length}/100</Text>}
              maxLength={100}
              value={name}
              onChangeText={(next) => {
                setName(next);
                setProfileErrors((current) => ({ ...current, name: undefined }));
              }}
            />
            <TextField
              autoFocus={editTarget === "bio"}
              inputRadiusClassName="rounded-[16px]"
              label="한줄소개 (선택)"
              labelRight={<Text className="text-[12px] font-medium text-hypo-text-metadata">{bio.length}/120</Text>}
              maxLength={120}
              placeholder="어떤 일을 하는지 한 문장으로 소개해 주세요"
              value={bio}
              onChangeText={setBio}
            />
            <TextField
              autoFocus={editTarget === "phone"}
              inputRadiusClassName="rounded-[16px]"
              label="전화번호"
              labelRight={<Text className="text-[12px] font-medium text-hypo-text-metadata">선택</Text>}
              autoComplete="tel"
              keyboardType="phone-pad"
              maxLength={13}
              placeholder="010-0000-0000"
              textContentType="telephoneNumber"
              value={phone}
              onChangeText={(next) => setPhone(formatPhoneInput(next))}
            />
            {supportsOrganization ? (
              <View className="gap-3 pt-1">
                <View className="gap-1">
                  <Text className="text-[13px] font-bold text-hypo-text">소속 정보 (선택)</Text>
                  <Text className="text-xs font-medium text-hypo-muted">내가 만든 공고에 함께 표시돼요.</Text>
                </View>
                <View className="flex-row rounded-full border border-hypo-border bg-hypo-surface p-1">
                  {organizationSelectionOptions.map((option) => {
                    const selected = organizationType === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        className={`min-h-10 flex-1 items-center justify-center rounded-full px-3 ${
                          selected ? "bg-hypo-brand" : "bg-transparent"
                        }`}
                        onPress={() => {
                          setOrganizationType(option.value);
                          if (!option.value) {
                            setOrganizationName("");
                          }
                          setProfileErrors((current) => ({ ...current, organizationName: undefined }));
                        }}
                      >
                        <Text className={`text-[13px] font-black ${selected ? "text-white" : "text-hypo-muted"}`}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {organizationType ? (
                  <TextField
                    autoFocus={editTarget === "organization"}
                    errorMessage={profileErrors.organizationName}
                    inputRadiusClassName="rounded-[16px]"
                    label={organizationType === "company" ? "회사명" : "팀명"}
                    maxLength={100}
                    placeholder={organizationType === "company" ? "예: 콘텐츠럭" : "예: 프로덕트 팀"}
                    value={organizationName}
                    onChangeText={(next) => {
                      setOrganizationName(next);
                      setProfileErrors((current) => ({ ...current, organizationName: undefined }));
                    }}
                  />
                ) : (
                  <Text className="text-xs font-medium leading-5 text-hypo-text-secondary">소속 정보를 삭제하려면 ‘없음’을 선택하세요.</Text>
                )}
              </View>
            ) : null}
          </View>

          {localError || errorMessage ? (
            <Text className="px-1 text-xs font-bold leading-[19px] text-hypo-danger">{localError ?? errorMessage}</Text>
          ) : null}

          <View className="gap-2.5 pt-1">
            <Pressable
              accessibilityRole="button"
              disabled={isSavingProfile || !isProfileDirty}
              className={`min-h-[52px] items-center justify-center rounded-[14px] ${isSavingProfile || !isProfileDirty ? "bg-hypo-brandSoft" : "bg-hypo-brand"}`}
              onPress={() => void handleSave()}
            >
              <Text className={`text-[15px] font-semibold ${isSavingProfile || !isProfileDirty ? "text-hypo-text-metadata" : "text-white"}`}>
                {isSavingProfile ? "저장 중" : "저장"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSavingProfile}
              className="min-h-[52px] items-center justify-center rounded-[14px] border border-hypo-border bg-hypo-surface"
              onPress={confirmDiscardEdits}
            >
              <Text className="text-[15px] font-semibold text-hypo-text">취소</Text>
            </Pressable>
          </View>
        </View>
      )}
      <FieldEditorModal
        error={localError}
        isSaving={isSavingField}
        onChangeBio={setBio}
        onChangeName={setName}
        onChangeOrganizationName={setOrganizationName}
        onChangeOrganizationType={setOrganizationType}
        onChangePhone={(next) => setPhone(formatPhoneInput(next))}
        onClose={closeFieldEditor}
        onSave={() => void handleFieldSave()}
        target={fieldEditor}
        bio={bio}
        name={name}
        organizationName={organizationName}
        organizationType={organizationType}
        phone={phone}
      />
    </AppScreen>
  );
}

function FieldEditorModal({
  bio,
  error,
  isSaving,
  name,
  onChangeBio,
  onChangeName,
  onChangeOrganizationName,
  onChangeOrganizationType,
  onChangePhone,
  onClose,
  onSave,
  organizationName,
  organizationType,
  phone,
  target,
}: {
  bio: string;
  error: string | null;
  isSaving: boolean;
  name: string;
  onChangeBio: (value: string) => void;
  onChangeName: (value: string) => void;
  onChangeOrganizationName: (value: string) => void;
  onChangeOrganizationType: (value: OrganizationType | null) => void;
  onChangePhone: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  organizationName: string;
  organizationType: OrganizationType | null;
  phone: string;
  target: EditableProfileField | null;
}) {
  if (!target) {
    return null;
  }

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 justify-center bg-black/35 px-5">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="rounded-[20px] bg-hypo-surface px-5 py-5">
          <Text className="text-[20px] font-bold text-hypo-text">{getFieldEditorTitle(target)} 수정</Text>
          <View className="mt-5 gap-4">
            {target === "name" ? <TextField autoFocus label="이름" maxLength={100} value={name} onChangeText={onChangeName} /> : null}
            {target === "bio" ? (
              <TextField autoFocus label="한줄소개" maxLength={120} placeholder="예: 운동 루틴을 만드는 초기 창업자" value={bio} onChangeText={onChangeBio} />
            ) : null}
            {target === "phone" ? (
              <TextField autoFocus keyboardType="phone-pad" label="전화번호" maxLength={13} placeholder="010-1234-5678" value={phone} onChangeText={onChangePhone} />
            ) : null}
            {target === "organization" ? (
              <>
                <View className="flex-row rounded-xl border border-hypo-border bg-hypo-bg p-1">
                  {organizationSelectionOptions.map((option) => {
                    const selected = organizationType === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        className={`min-h-11 flex-1 items-center justify-center rounded-[10px] px-3 ${selected ? "bg-hypo-brand" : "bg-transparent"}`}
                        onPress={() => {
                          onChangeOrganizationType(option.value);
                          if (!option.value) {
                            onChangeOrganizationName("");
                          }
                        }}
                      >
                        <Text className={`text-[14px] font-semibold ${selected ? "text-white" : "text-hypo-text-secondary"}`}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {organizationType ? (
                  <TextField
                    autoFocus
                    label={organizationType === "company" ? "회사명" : "팀명"}
                    maxLength={100}
                    placeholder={organizationType === "company" ? "예: 콘텐츠럭" : "예: 프로덕트 팀"}
                    value={organizationName}
                    onChangeText={onChangeOrganizationName}
                  />
                ) : (
                  <Text className="text-[13px] leading-5 text-hypo-text-secondary">소속 정보를 삭제하려면 ‘없음’을 선택하세요.</Text>
                )}
              </>
            ) : null}
            {error ? <Text className="text-[13px] font-medium leading-5 text-hypo-danger">{error}</Text> : null}
          </View>
          <View className="mt-6 flex-row gap-2.5">
            <Pressable accessibilityRole="button" className="min-h-[52px] flex-1 items-center justify-center rounded-xl border border-hypo-border bg-hypo-surface" disabled={isSaving} onPress={onClose}>
              <Text className="text-[15px] font-semibold text-hypo-text">취소</Text>
            </Pressable>
            <Pressable accessibilityRole="button" className={`min-h-[52px] flex-1 items-center justify-center rounded-xl ${isSaving ? "bg-hypo-brandSoft" : "bg-hypo-brand"}`} disabled={isSaving} onPress={onSave}>
              <Text className={`text-[15px] font-semibold ${isSaving ? "text-hypo-brand" : "text-white"}`}>{isSaving ? "저장 중" : "저장"}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function getFieldEditorTitle(target: EditableProfileField): string {
  if (target === "name") return "이름";
  if (target === "bio") return "한줄소개";
  if (target === "phone") return "전화번호";
  return "소속 정보";
}

function SectionLabel({ children }: { children: string }) {
  return <Text className="mb-2 px-0.5 text-[13px] font-semibold text-hypo-text-secondary">{children}</Text>;
}

function AccountGroup({ children }: { children: React.ReactNode }) {
  return <View className="overflow-hidden rounded-2xl border border-hypo-border bg-hypo-surface">{children}</View>;
}

function AccountInfoRow({
  icon,
  label,
  onPress,
  showDivider = true,
  value,
}: {
  icon: FeatherIconName;
  label: string;
  onPress?: () => void;
  showDivider?: boolean;
  value: string;
}) {
  const content = (
    <>
      <Feather color="#657069" name={icon} size={20} />
      <Text className="min-w-0 flex-1 text-[15px] font-semibold text-hypo-text">{label}</Text>
      <Text numberOfLines={1} className="max-w-[52%] text-right text-[15px] font-medium text-hypo-text-secondary">
        {value}
      </Text>
      {onPress ? <Feather color="#69736D" name="chevron-right" size={18} /> : null}
    </>
  );

  const className = `min-h-[56px] flex-row items-center gap-3 px-4 ${showDivider ? "border-b border-[#DCE4DF]" : ""}`;

  if (!onPress) {
    return <View className={className}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={`${label} 수정`}
      accessibilityRole="button"
      className={className}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
    >
      {content}
    </Pressable>
  );
}

function LinkedSocialIdentityRow({ identity }: { identity: SocialIdentityRead }) {
  const provider = socialProviderLabels[identity.provider];
  const email = getSocialIdentityEmailLabel(identity);
  const status = getSocialIdentityStatusLabel(identity);

  return (
    <View className="min-h-[64px] flex-row items-center gap-3 border-b border-[#DCE4DF] px-4">
      <SocialProviderMark provider={identity.provider} />
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-semibold text-hypo-text">{provider}</Text>
        {email ? (
          <Text numberOfLines={1} className="mt-0.5 text-[13px] leading-[18px] text-hypo-text-secondary">
            {email}
          </Text>
        ) : null}
      </View>
      <Text className="shrink-0 text-[14px] font-semibold text-hypo-brand">{status}</Text>
    </View>
  );
}

function SocialProviderLinkRow({
  disabled,
  isPending,
  onPress,
  provider,
}: {
  disabled: boolean;
  isPending: boolean;
  onPress: () => void;
  provider: SocialAuthProvider;
}) {
  return (
    <Pressable
      accessibilityLabel={`${socialProviderLabels[provider]} 로그인 ${isPending ? "연결 중" : "연결하기"}`}
      accessibilityRole="button"
      disabled={disabled}
      className="min-h-[64px] flex-row items-center gap-3 border-b border-[#DCE4DF] px-4"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: disabled && !isPending ? 0.45 : pressed ? 0.72 : 1 })}
    >
      <SocialProviderMark provider={provider} />
      <Text className="min-w-0 flex-1 text-[15px] font-semibold text-hypo-text">{socialProviderLabels[provider]}</Text>
      <Text className="shrink-0 text-[14px] font-semibold text-hypo-brand">{isPending ? "연결 중" : "연결하기"}</Text>
      <Feather color="#69736D" name="chevron-right" size={18} />
    </Pressable>
  );
}

function AccountActionRow({
  icon,
  label,
  onPress,
  showDivider = true,
  tone = "default",
}: {
  icon: FeatherIconName;
  label: string;
  onPress: () => void;
  showDivider?: boolean;
  tone?: "default" | "danger";
}) {
  const color = tone === "danger" ? "#D94A4A" : "#18211C";

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      className={`min-h-[56px] flex-row items-center gap-3 px-4 ${showDivider ? "border-b border-[#DCE4DF]" : ""}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
    >
      <Feather color={color} name={icon} size={20} />
      <Text className={`min-w-0 flex-1 text-[15px] font-semibold ${tone === "danger" ? "text-hypo-danger" : "text-hypo-text"}`}>
        {label}
      </Text>
      <Feather color="#69736D" name="chevron-right" size={18} />
    </Pressable>
  );
}

function SocialProviderMark({ provider }: { provider: SocialAuthProvider }) {
  return (
    <View className="h-7 w-7 items-center justify-center overflow-hidden rounded-md">
      <Image accessibilityIgnoresInvertColors className="h-full w-full" resizeMode="contain" source={socialProviderIconSources[provider]} />
    </View>
  );
}

const socialProviderIconSources = {
  apple: require("../../../assets/social-auth/apple-logo.png"),
  google: require("../../../assets/social-auth/google.png"),
  kakao: require("../../../assets/social-auth/kakao.png"),
  naver: require("../../../assets/social-auth/naver.png"),
} as const;
