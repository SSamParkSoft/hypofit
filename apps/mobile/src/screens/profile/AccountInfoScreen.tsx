import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
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
  formatOrganizationDisplay,
  formatPhoneInput,
  getOrganizationTypeLabel,
} from "./profileUtils";

type AccountInfoMode = "view" | "editProfile";
type OrganizationOption = { label: string; value: OrganizationType };

const organizationOptions: OrganizationOption[] = [
  { label: "팀", value: "team" },
  { label: "회사", value: "company" },
];

export function AccountInfoScreen() {
  const { accessToken, appUser, errorMessage, signOut, updateCurrentUser } = useAuth();
  const [mode, setMode] = useState<AccountInfoMode>("view");
  const [name, setName] = useState(appUser?.name ?? "");
  const [bio, setBio] = useState(appUser?.bio ?? "");
  const [phone, setPhone] = useState(appUser?.phone ?? "");
  const [organizationType, setOrganizationType] = useState<OrganizationType | null>(appUser?.organization_type ?? null);
  const [organizationName, setOrganizationName] = useState(appUser?.organization_name ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [identities, setIdentities] = useState<SocialIdentityRead[]>([]);
  const [isLoadingIdentities, setIsLoadingIdentities] = useState(false);
  const [pendingSocialProvider, setPendingSocialProvider] = useState<SocialAuthProvider | null>(null);
  const supportsOrganization = canEditOrganization(appUser?.role);
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
    setMode("view");
  };

  const handleSave = async () => {
    setLocalError(null);
    setMessage(null);
    const trimmedName = name.trim();
    const trimmedOrganizationName = organizationName.trim();

    if (!trimmedName) {
      setLocalError("이름을 입력해 주세요.");
      return;
    }

    let nextOrganizationType = appUser?.organization_type ?? null;
    let nextOrganizationName = appUser?.organization_name ?? null;

    if (supportsOrganization) {
      if (organizationType && !trimmedOrganizationName) {
        setLocalError("팀이나 회사 이름을 입력해 주세요.");
        return;
      }

      if (!organizationType && trimmedOrganizationName) {
        setLocalError("팀인지 회사인지 먼저 선택해 주세요.");
        return;
      }

      nextOrganizationType = organizationType;
      nextOrganizationName = trimmedOrganizationName || null;
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
      setMode("view");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "계정 정보를 저장하지 못했어요.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const startEditProfile = () => {
    setMessage(null);
    setLocalError(null);
    setMode("editProfile");
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
      resetForm();
      return;
    }

    goBackOrReplaceFallback("/(tabs)/profile");
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
            onPress={startEditProfile}
          >
            <Text className="text-sm font-black text-hypo-brand">수정</Text>
          </Pressable>
        ) : null
      }
    >
      {mode === "view" ? (
        <View className="-mx-4 gap-5 px-4">
          <View>
            <SectionLabel>기본 정보</SectionLabel>
            <InfoRow label="이름" value={appUser?.name ?? "-"} />
            <InfoRow label="한줄소개" value={appUser?.bio ?? "미등록"} />
            <InfoRow label="전화번호" value={appUser?.phone ?? "미등록"} />
            {supportsOrganization ? (
              <>
                <InfoRow label="소속 유형" value={getOrganizationTypeLabel(appUser?.organization_type) ?? "미등록"} />
                <InfoRow label="팀·회사명" value={appUser?.organization_name ?? "미등록"} />
              </>
            ) : null}
          </View>

          <View className="border-t border-hypo-border pt-4">
            <SectionLabel>로그인 정보</SectionLabel>
            <InfoRow label="이메일" value={appUser?.email ?? "-"} />
          </View>

          <View className="border-t border-hypo-border pt-4">
            <SectionLabel>로그인 방법</SectionLabel>
            {isLoadingIdentities ? (
              <Text className="py-2 text-sm font-bold text-hypo-muted">불러오는 중</Text>
            ) : identities.length ? (
              identities.map((identity) => (
                <LinkedSocialIdentityRow
                  identity={identity}
                  key={`${identity.provider}-${identity.linked_at}`}
                />
              ))
            ) : (
              <Text className="py-2 text-sm font-bold text-hypo-muted">연결된 소셜 로그인은 아직 없어요.</Text>
            )}
            {visibleSocialProviders.map((provider) => (
              <Pressable
                key={provider}
                accessibilityRole="button"
                disabled={pendingSocialProvider !== null}
                className="min-h-[50px] flex-row items-center justify-between gap-4 py-2.5"
                onPress={() => void handleSocialIdentityLink(provider)}
              >
                <Text className="text-sm font-black text-hypo-text">
                  {socialProviderLabels[provider]}
                </Text>
                <Text className="text-sm font-black text-hypo-brand">
                  {pendingSocialProvider === provider ? "연결 중" : "연결하기"}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="border-t border-hypo-border pt-4">
            <SectionLabel>계정 관리</SectionLabel>
            <Pressable
              accessibilityRole="button"
              className="min-h-[50px] flex-row items-center justify-between gap-4 py-2.5"
              onPress={() => router.push("/(tabs)/profile/delete-account")}
            >
              <Text className="text-sm font-semibold text-hypo-danger">계정 삭제</Text>
              <Text className="text-[13px] text-hypo-textSoft">›</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              className="min-h-[50px] flex-row items-center justify-between gap-4 py-2.5"
              onPress={handleSignOut}
            >
              <Text className="text-sm font-semibold text-hypo-text">로그아웃</Text>
              <Text className="text-[13px] text-hypo-textSoft">›</Text>
            </Pressable>
          </View>

          {message ? <Text className="px-1 pt-2 text-xs font-black text-hypo-brand">{message}</Text> : null}
          {localError || errorMessage ? (
            <Text className="px-1 text-xs font-bold leading-[19px] text-hypo-danger">{localError ?? errorMessage}</Text>
          ) : null}
        </View>
      ) : (
        <View className="-mx-4 gap-4 px-4">
          <View className="gap-3">
            <TextField label="이름" maxLength={100} value={name} onChangeText={setName} />
            <TextField
              label="한줄소개"
              maxLength={120}
              placeholder="예: 운동 루틴을 만드는 초기 창업자"
              value={bio}
              onChangeText={setBio}
            />
            <TextField
              label="전화번호"
              keyboardType="phone-pad"
              maxLength={13}
              placeholder="010-1234-5678"
              value={phone}
              onChangeText={(next) => setPhone(formatPhoneInput(next))}
            />
            {supportsOrganization ? (
              <View className="gap-3 pt-1">
                <View className="gap-1">
                  <Text className="text-[13px] font-bold text-hypo-text">소속 정보</Text>
                  <Text className="text-xs font-medium text-hypo-muted">내가 만든 공고에 함께 표시돼요.</Text>
                </View>
                <View className="flex-row rounded-full border border-hypo-border bg-hypo-surface p-1">
                  {organizationOptions.map((option) => {
                    const selected = organizationType === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        className={`min-h-10 flex-1 items-center justify-center rounded-full px-3 ${
                          selected ? "bg-hypo-brand" : "bg-transparent"
                        }`}
                        onPress={() => setOrganizationType((current) => (current === option.value ? null : option.value))}
                      >
                        <Text className={`text-[13px] font-black ${selected ? "text-white" : "text-hypo-muted"}`}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TextField
                  label="팀·회사명"
                  maxLength={100}
                  placeholder="예: 콘텐츠럭"
                  value={organizationName}
                  onChangeText={setOrganizationName}
                />
                {formatOrganizationDisplay(organizationType, organizationName) ? (
                  <Pressable
                    accessibilityRole="button"
                    className="self-end px-1 py-1"
                    onPress={() => {
                      setOrganizationType(null);
                      setOrganizationName("");
                    }}
                  >
                    <Text className="text-xs font-black text-hypo-muted">소속 정보 지우기</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>

          {localError || errorMessage ? (
            <Text className="px-1 text-xs font-bold leading-[19px] text-hypo-danger">{localError ?? errorMessage}</Text>
          ) : null}

          <View className="flex-row items-center justify-end gap-3 px-1">
            <Pressable
              accessibilityRole="button"
              disabled={isSavingProfile}
              className="min-h-11 min-w-[84px] items-center justify-center rounded-full bg-hypo-brandSoft px-4"
              onPress={resetForm}
            >
              <Text className="text-[13px] font-black text-hypo-brand">취소</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSavingProfile}
              className={`min-h-11 min-w-[84px] items-center justify-center rounded-full px-4 ${
                isSavingProfile ? "bg-hypo-brandSoft" : "bg-hypo-brand"
              }`}
              onPress={() => void handleSave()}
            >
              <Text className={`text-[13px] font-black ${isSavingProfile ? "text-hypo-brand" : "text-white"}`}>
                {isSavingProfile ? "저장 중" : "저장"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </AppScreen>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text className="mb-1 px-1 text-xs font-semibold text-hypo-text-metadata">{children}</Text>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-h-[48px] flex-row items-start gap-4 py-2">
      <Text className="w-24 shrink-0 pt-0.5 text-sm font-semibold text-hypo-text-metadata">{label}</Text>
      <Text className="min-w-0 flex-1 text-right text-sm font-semibold leading-5 text-hypo-text">
        {value}
      </Text>
    </View>
  );
}

function LinkedSocialIdentityRow({ identity }: { identity: SocialIdentityRead }) {
  const provider = socialProviderLabels[identity.provider];
  const email = getSocialIdentityEmailLabel(identity);
  const status = getSocialIdentityStatusLabel(identity);

  return (
    <View className="min-h-[52px] py-2.5">
      <View className="flex-row items-center justify-between gap-4">
        <Text className="min-w-0 flex-1 text-sm font-semibold text-hypo-text">{provider}</Text>
        <Text className="shrink-0 text-[13px] font-medium text-hypo-text-metadata">{status}</Text>
      </View>
      {email ? (
        <Text numberOfLines={1} className="mt-1 text-[13px] leading-[18px] text-hypo-text-secondary">
          {email}
        </Text>
      ) : null}
    </View>
  );
}
