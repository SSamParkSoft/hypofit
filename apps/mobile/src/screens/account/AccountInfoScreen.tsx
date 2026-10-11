import { useEffect, useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import type { OrganizationType, SocialAuthProvider, SocialIdentityRead } from "@hypofit/contracts";
import { getPhoneValidationError } from "@hypofit/contracts";
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
import { GlassActionButton } from "@/shared/ui/GlassActionButton";
import { TextField } from "@/shared/ui/TextField";
import {
  canEditOrganization,
  compatibilityRole,
} from "@/features/account/accountCompatibility";
import {
  formatPhoneInput,
  formatOrganizationDisplay,
} from "@/features/account/accountPresentation";
import { colors } from "@/shared/theme/tokens";

type AccountInfoMode = "view" | "editProfile";
type EditableProfileField = "name" | "bio" | "phone" | "organization";
type OrganizationOption = { label: string; value: OrganizationType };
type ProfileFieldErrors = Partial<Record<"name" | "phone" | "organizationName", string>>;
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
  const phoneError = getPhoneValidationError(phone);
  const isFieldDirty = fieldEditor === "name"
    ? name.trim() !== (appUser?.name ?? "").trim()
    : fieldEditor === "bio"
      ? (bio.trim() || null) !== (appUser?.bio ?? null)
      : fieldEditor === "phone"
        ? (phone.trim() || null) !== (appUser?.phone ?? null)
        : fieldEditor === "organization"
          && (organizationType !== (appUser?.organization_type ?? null)
            || (organizationName.trim() || null) !== (appUser?.organization_name ?? null));
  const isFieldValid = fieldEditor === "name" ? Boolean(name.trim())
    : fieldEditor === "phone" ? !phoneError
      : fieldEditor === "organization" ? !organizationType || Boolean(organizationName.trim()) : true;
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
    if (isSavingProfile || !isProfileDirty) return;
    setLocalError(null);
    setMessage(null);
    const trimmedName = name.trim();
    const trimmedOrganizationName = organizationName.trim();

    const nextErrors: ProfileFieldErrors = {};

    if (!trimmedName) nextErrors.name = "이름을 입력해 주세요.";
    if (phoneError) nextErrors.phone = phoneError;

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
    setProfileErrors({});
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

    resetForm();
    setFieldEditor(null);
  };

  const requestCloseFieldEditor = () => {
    if (isSavingField) return;
    if (!isFieldDirty) {
      closeFieldEditor();
      return;
    }
    Alert.alert("변경 내용을 저장하지 않고 나갈까요?", "입력한 내용은 저장되지 않아요.", [
      { style: "cancel", text: "계속 수정" },
      { style: "destructive", text: "나가기", onPress: closeFieldEditor },
    ]);
  };

  const handleFieldSave = async () => {
    if (!fieldEditor || isSavingField || !isFieldDirty) {
      return;
    }

    setLocalError(null);
    const trimmedName = name.trim();
    const trimmedOrganizationName = organizationName.trim();

    if (fieldEditor === "name" && !trimmedName) {
      setLocalError("이름을 입력해 주세요.");
      return;
    }

    if (fieldEditor === "phone" && phoneError) {
      setProfileErrors({ phone: phoneError });
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
      setMessage("변경 내용을 저장했어요.");
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
      if (isSavingProfile) return;
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
      glassHeaderControls
      onBack={handleBack}
      right={
        mode === "view" ? (
          <GlassActionButton
            accessibilityLabel="기본 정보 전체 수정"
            size="compact"
            onPress={() => startEditProfile()}
          >
            전체 수정
          </GlassActionButton>
        ) : null
      }
    >
      {mode === "view" ? (
        <View className="-mx-4 gap-7 px-4 pb-3">
          <View>
            <SectionLabel>기본 정보</SectionLabel>
            <AccountGroup>
              <AccountInfoRow label="이름" value={appUser?.name ?? "불러오는 중"} onPress={() => openFieldEditor("name")} />
              <AccountInfoRow label="한줄소개" isEmpty={!appUser?.bio} value={appUser?.bio || "입력하지 않았어요"} onPress={() => openFieldEditor("bio")} />
              <AccountInfoRow label="전화번호" isEmpty={!appUser?.phone} showDivider={supportsOrganization} value={appUser?.phone || "입력하지 않았어요"} onPress={() => openFieldEditor("phone")} />
              {supportsOrganization ? (
                <AccountInfoRow
                  label="소속"
                  isEmpty={!appUser?.organization_type}
                  showDivider={false}
                  value={formatOrganizationDisplay(appUser?.organization_type, appUser?.organization_name) ?? "없음"}
                  onPress={() => openFieldEditor("organization")}
                />
              ) : null}
            </AccountGroup>
          </View>

          <View>
            <SectionLabel>계정</SectionLabel>
            <AccountGroup><AccountInfoRow label="이메일" showDivider={false} value={appUser?.email ?? "불러오는 중"} /></AccountGroup>
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

          {message ? <Text className="px-1 pt-2 text-xs font-black text-hypo-brandStrong">{message}</Text> : null}
          {localError || errorMessage ? (
            <Text className="px-1 text-xs font-bold leading-[19px] text-hypo-danger">{localError ?? errorMessage}</Text>
          ) : null}
        </View>
      ) : (
        <View className="-mx-4 gap-5 px-4 pb-3">
          <View className="gap-3">
            <TextField
              autoFocus={editTarget === "name"}
              editable={!isSavingProfile}
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
              editable={!isSavingProfile}
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
              editable={!isSavingProfile}
              errorMessage={phoneError}
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
                        key={option.value ?? "none"}
                        accessibilityRole="button"
                        disabled={isSavingProfile}
                        accessibilityState={{ selected }}
                        className={`min-h-10 flex-1 items-center justify-center rounded-full px-3 ${
                          selected ? "bg-hypo-brandSoft" : "bg-transparent"
                        }`}
                        onPress={() => {
                          setOrganizationType(option.value);
                          if (!option.value) {
                            setOrganizationName("");
                          }
                          setProfileErrors((current) => ({ ...current, organizationName: undefined }));
                        }}
                      >
                        <Text className={`text-[13px] font-black ${selected ? "text-hypo-brandStrong" : "text-hypo-muted"}`}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {organizationType ? (
                  <TextField
                    autoFocus={editTarget === "organization"}
                    editable={!isSavingProfile}
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
                  <Text className="text-xs font-medium leading-5 text-hypo-text-secondary">공고에 소속이 표시되지 않아요.</Text>
                )}
              </View>
            ) : null}
          </View>

          {localError || errorMessage ? (
            <Text className="px-1 text-xs font-bold leading-[19px] text-hypo-danger">{localError ?? errorMessage}</Text>
          ) : null}

          <View className="gap-2.5 pt-1">
            <GlassActionButton
              busy={isSavingProfile}
              disabled={isSavingProfile || !isProfileDirty || Boolean(phoneError)}
              onPress={() => void handleSave()}
            >
              {isSavingProfile ? "저장 중" : "저장하기"}
            </GlassActionButton>
          </View>
        </View>
      )}
      <FieldEditorModal
        error={localError}
        isSaving={isSavingField}
        canSave={isFieldDirty && isFieldValid}
        onChangeBio={setBio}
        onChangeName={setName}
        onChangeOrganizationName={setOrganizationName}
        onChangeOrganizationType={setOrganizationType}
        onChangePhone={(next) => setPhone(formatPhoneInput(next))}
        onClose={requestCloseFieldEditor}
        onSave={() => void handleFieldSave()}
        target={fieldEditor}
        bio={bio}
        name={name}
        organizationName={organizationName}
        organizationType={organizationType}
        phone={phone}
        phoneError={phoneError}
      />
    </AppScreen>
  );
}

function FieldEditorModal({
  bio,
  canSave,
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
  phoneError,
  target,
}: {
  bio: string;
  canSave: boolean;
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
  phoneError: string | null;
  target: EditableProfileField | null;
}) {
  if (!target) {
    return null;
  }

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-black/35" edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View className="flex-1 justify-center p-5">
              <Pressable
                accessible={false}
                className="absolute inset-0"
                onPress={onClose}
              />
              <View
                accessibilityViewIsModal
                className="w-full max-w-[400px] self-center rounded-[20px] bg-hypo-surface p-5"
              >
                <Text
                  accessibilityRole="header"
                  className="text-[20px] font-bold text-hypo-text"
                >
                  {getFieldEditorTitle(target)} 수정
                </Text>
                <View className="mt-5 gap-4">
                  {target === "name" ? (
                    <TextField
                      autoFocus
                      editable={!isSaving}
                      errorMessage={!name.trim() ? "이름을 입력해 주세요." : undefined}
                      label="이름"
                      maxLength={100}
                      returnKeyType="done"
                      value={name}
                      onChangeText={onChangeName}
                      onSubmitEditing={
                        canSave && !isSaving ? onSave : undefined
                      }
                    />
                  ) : null}
                  {target === "bio" ? (
                    <TextField
                      autoFocus
                      editable={!isSaving}
                      label="한줄소개 (선택)"
                      labelRight={
                        <Text className="text-xs text-hypo-text-metadata">
                          {bio.length}/120
                        </Text>
                      }
                      maxLength={120}
                      placeholder="어떤 일을 하는지 한 문장으로 소개해 주세요"
                      value={bio}
                      onChangeText={onChangeBio}
                    />
                  ) : null}
                  {target === "phone" ? (
                    <TextField
                      autoFocus
                      editable={!isSaving}
                      autoComplete="tel"
                      textContentType="telephoneNumber"
                      keyboardType="phone-pad"
                      errorMessage={phoneError}
                      label="전화번호 (선택)"
                      maxLength={13}
                      placeholder="010-0000-0000"
                      value={phone}
                      onChangeText={onChangePhone}
                    />
                  ) : null}
                  {target === "organization" ? (
                    <>
                      <View className="flex-row rounded-xl border border-hypo-border bg-hypo-bg p-1">
                        {organizationSelectionOptions.map((option) => {
                          const selected = organizationType === option.value;
                          return (
                            <Pressable
                              key={option.value ?? "none"}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                              disabled={isSaving}
                              className={`min-h-11 flex-1 items-center justify-center rounded-[10px] px-3 ${selected ? "bg-hypo-brandSoft" : "bg-transparent"}`}
                              onPress={() => {
                                onChangeOrganizationType(option.value);
                                if (!option.value) {
                                  onChangeOrganizationName("");
                                }
                              }}
                            >
                              <Text
                                className={`text-[14px] font-semibold ${selected ? "text-hypo-brandStrong" : "text-hypo-text-secondary"}`}
                              >
                                {option.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      {organizationType ? (
                        <TextField
                          autoFocus
                          editable={!isSaving}
                          errorMessage={!organizationName.trim() ? "소속 이름을 입력해 주세요." : undefined}
                          label={
                            organizationType === "company" ? "회사명" : "팀명"
                          }
                          maxLength={100}
                          placeholder={
                            organizationType === "company"
                              ? "예: 콘텐츠럭"
                              : "예: 프로덕트 팀"
                          }
                          value={organizationName}
                          onChangeText={onChangeOrganizationName}
                        />
                      ) : (
                        <Text className="text-[13px] leading-5 text-hypo-text-secondary">
                          공고에 소속이 표시되지 않아요.
                        </Text>
                      )}
                    </>
                  ) : null}
                  {error ? (
                    <Text className="text-[13px] font-medium leading-5 text-hypo-danger">
                      {error}
                    </Text>
                  ) : null}
                </View>
                <View className="mt-6 flex-row gap-2.5">
                  <GlassActionButton
                    className="flex-1"
                    disabled={isSaving}
                    onPress={onClose}
                    tone="secondary"
                  >
                    취소
                  </GlassActionButton>
                  <GlassActionButton
                    busy={isSaving}
                    className="flex-1"
                    disabled={isSaving || !canSave}
                    onPress={onSave}
                  >
                    {isSaving ? "저장 중" : "저장하기"}
                  </GlassActionButton>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  return <Text accessibilityRole="header" className="mb-2 px-1 text-[13px] font-medium text-hypo-text-secondary">{children}</Text>;
}

function AccountGroup({ children }: { children: React.ReactNode }) {
  return <View className="overflow-hidden rounded-2xl bg-hypo-surface">{children}</View>;
}

function AccountInfoRow({
  isEmpty = false,
  label,
  onPress,
  showDivider = true,
  value,
}: {
  isEmpty?: boolean;
  label: string;
  onPress?: () => void;
  showDivider?: boolean;
  value: string;
}) {
  const content = (
    <>
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-[13px] font-medium text-hypo-text-secondary">{label}</Text>
        <Text className={`text-[16px] leading-6 ${isEmpty ? "font-normal text-hypo-text-secondary" : "font-medium text-hypo-text"}`}>{value}</Text>
      </View>
      {onPress ? <Feather color={colors.textMetadata} name="chevron-right" size={18} /> : null}
    </>
  );

  const className = `min-h-[72px] flex-row items-center gap-3 px-4 py-3 ${showDivider ? "border-b border-hypo-border" : ""}`;

  if (!onPress) {
    return <View className={className}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={`${label}, ${value}, 수정`}
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
    <View className="min-h-[64px] flex-row items-center gap-3 border-b border-hypo-border px-4">
      <SocialProviderMark provider={identity.provider} />
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-semibold text-hypo-text">{provider}</Text>
        {email ? (
          <Text numberOfLines={1} className="mt-0.5 text-[13px] leading-[18px] text-hypo-text-secondary">
            {email}
          </Text>
        ) : null}
      </View>
      <Text className="shrink-0 text-[14px] font-semibold text-hypo-brandStrong">{status}</Text>
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
      className="min-h-[64px] flex-row items-center gap-3 border-b border-hypo-border px-4"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: disabled && !isPending ? 0.45 : pressed ? 0.72 : 1 })}
    >
      <SocialProviderMark provider={provider} />
      <Text className="min-w-0 flex-1 text-[15px] font-semibold text-hypo-text">{socialProviderLabels[provider]}</Text>
      <Text className="shrink-0 text-[14px] font-semibold text-hypo-brandStrong">{isPending ? "연결 중" : "연결하기"}</Text>
      <Feather color={colors.textMetadata} name="chevron-right" size={18} />
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
  const color = tone === "danger" ? "#D94A4A" : colors.text;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      className={`min-h-[56px] flex-row items-center gap-3 px-4 ${showDivider ? "border-b border-hypo-border" : ""}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
    >
      <Feather color={color} name={icon} size={20} />
      <Text className={`min-w-0 flex-1 text-[15px] font-semibold ${tone === "danger" ? "text-hypo-danger" : "text-hypo-text"}`}>
        {label}
      </Text>
      <Feather color={colors.textMetadata} name="chevron-right" size={18} />
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
