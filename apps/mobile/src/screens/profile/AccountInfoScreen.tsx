import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { SocialAuthProvider, SocialAuthProviderCapability, SocialIdentityRead } from "@hypofit/contracts";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  getPublicMobileSocialProviders,
  getSocialAuthErrorMessage,
  getSocialIdentityLabel,
  getSocialIdentityStatusLabel,
  loadSocialAuthCapabilities,
  loadSocialIdentities,
  socialProviderLabels,
  startSocialIdentityLink,
} from "@/features/auth/social/socialAuthService";
import { goBackOrReplaceFallback } from "@/shared/navigation/backNavigation";
import { AppScreen } from "@/shared/ui/AppScreen";
import { TextField } from "@/shared/ui/TextField";
import { formatPhoneInput } from "./profileUtils";

type AccountInfoMode = "view" | "editProfile";

export function AccountInfoScreen() {
  const { accessToken, appUser, errorMessage, updateCurrentUser } = useAuth();
  const [mode, setMode] = useState<AccountInfoMode>("view");
  const [name, setName] = useState(appUser?.name ?? "");
  const [bio, setBio] = useState(appUser?.bio ?? "");
  const [phone, setPhone] = useState(appUser?.phone ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [identities, setIdentities] = useState<SocialIdentityRead[]>([]);
  const [socialCapabilities, setSocialCapabilities] = useState<SocialAuthProviderCapability[]>([]);
  const [isLoadingIdentities, setIsLoadingIdentities] = useState(false);
  const [pendingSocialProvider, setPendingSocialProvider] = useState<SocialAuthProvider | null>(null);
  const visibleSocialCapabilities = useMemo(
    () =>
      getPublicMobileSocialProviders(socialCapabilities).filter(
        (capability) =>
          !identities.some(
            (identity) => identity.provider === capability.provider && identity.status !== "revoked",
          ),
      ),
    [identities, socialCapabilities],
  );

  useEffect(() => {
    if (!accessToken || mode !== "view") {
      return;
    }

    let isMounted = true;
    setIsLoadingIdentities(true);

    void Promise.all([loadSocialIdentities(accessToken), loadSocialAuthCapabilities()])
      .then(([nextIdentities, capabilities]) => {
        if (isMounted) {
          setIdentities(nextIdentities);
          setSocialCapabilities(capabilities.providers);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIdentities([]);
          setSocialCapabilities([]);
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
  }, [appUser?.bio, appUser?.name, appUser?.phone, mode]);

  const resetForm = () => {
    setName(appUser?.name ?? "");
    setBio(appUser?.bio ?? "");
    setPhone(appUser?.phone ?? "");
    setLocalError(null);
    setMode("view");
  };

  const handleSave = async () => {
    setLocalError(null);
    setMessage(null);
    const trimmedName = name.trim();

    if (!trimmedName) {
      setLocalError("이름을 입력해 주세요.");
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
                <InfoRow
                  key={`${identity.provider}-${identity.linked_at}`}
                  label={identity.provider.toUpperCase()}
                  value={`${getSocialIdentityLabel(identity)} · ${getSocialIdentityStatusLabel(identity)}`}
                />
              ))
            ) : (
              <Text className="py-2 text-sm font-bold text-hypo-muted">연결된 소셜 로그인은 아직 없어요.</Text>
            )}
            {visibleSocialCapabilities.map((capability) => (
              <Pressable
                key={capability.provider}
                accessibilityRole="button"
                disabled={pendingSocialProvider !== null}
                className="min-h-[50px] flex-row items-center justify-between gap-4 py-2.5"
                onPress={() => void handleSocialIdentityLink(capability.provider)}
              >
                <Text className="text-sm font-black text-hypo-text">
                  {socialProviderLabels[capability.provider]}
                </Text>
                <Text className="text-sm font-black text-hypo-brand">
                  {pendingSocialProvider === capability.provider ? "연결 중" : "연결하기"}
                </Text>
              </Pressable>
            ))}
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
  return <Text className="mb-1 px-1 text-xs font-black text-[#8A9387]">{children}</Text>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-h-[50px] flex-row items-center justify-between gap-4 py-2.5">
      <Text className="shrink-0 text-sm font-black text-[#8A9387]">{label}</Text>
      <Text numberOfLines={2} className="min-w-0 flex-1 text-right text-sm font-bold text-hypo-text">
        {value}
      </Text>
    </View>
  );
}
