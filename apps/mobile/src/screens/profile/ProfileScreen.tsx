import { useEffect, useState, type ReactNode } from "react";
import { ActionSheetIOS, Alert, Image, Platform, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/features/auth/AuthProvider";
import { getSupabaseClient } from "@/shared/api/supabase";
import { AppScreen } from "@/shared/ui/AppScreen";
import { appVersion, companyName, compatibilityRole, formatOrganizationDisplay } from "./profileUtils";

const profileImagePickerOptions: ImagePicker.ImagePickerOptions = {
  allowsEditing: true,
  aspect: [1, 1],
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.85,
};

export function ProfileScreen() {
  const params = useLocalSearchParams<{ toast?: string }>();
  const { appUser, updateCurrentUser, user } = useAuth();
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [visibleToast, setVisibleToast] = useState<"feedback_submitted" | null>(null);
  const displayName = appUser?.name ?? user?.email?.split("@")[0] ?? "사용자";
  const organizationDisplay = formatOrganizationDisplay(appUser?.organization_type, appUser?.organization_name);

  useEffect(() => {
    if (params.toast !== "feedback_submitted") {
      return;
    }

    setVisibleToast("feedback_submitted");
    const timeout = setTimeout(() => {
      setVisibleToast(null);
      router.setParams({ toast: undefined });
    }, 2300);

    return () => clearTimeout(timeout);
  }, [params.toast]);

  async function handleProfileImagePress() {
    if (!appUser || isUploadingProfileImage) {
      return;
    }

    const pickFromLibrary = () => void pickAndUploadProfileImage("library");
    const takePhoto = () => void pickAndUploadProfileImage("camera");

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          cancelButtonIndex: 0,
          options: ["취소", "사진 촬영", "사진 보관함"],
          title: "프로필 사진 변경",
        },
        (buttonIndex) => {
          if (buttonIndex === 1) takePhoto();
          if (buttonIndex === 2) pickFromLibrary();
        },
      );
      return;
    }

    Alert.alert("프로필 사진 변경", undefined, [
      { style: "cancel", text: "취소" },
      { text: "사진 촬영", onPress: takePhoto },
      { text: "사진 보관함", onPress: pickFromLibrary },
    ]);
  }

  async function pickAndUploadProfileImage(source: "camera" | "library") {
    if (!appUser) return;

    try {
      setIsUploadingProfileImage(true);

      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("권한이 필요해요", "프로필 사진을 바꾸려면 사진 접근 권한을 허용해 주세요.");
        return;
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(profileImagePickerOptions)
          : await ImagePicker.launchImageLibraryAsync(profileImagePickerOptions);

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const extension = getImageExtension(asset.uri);
      const contentType = asset.mimeType ?? `image/${extension === "jpg" ? "jpeg" : extension}`;
      const imagePath = `${appUser.id}/profile-${Date.now()}.${extension}`;
      const response = await fetch(asset.uri);
      const imageBlob = await response.blob();
      const supabase = getSupabaseClient();
      const { error } = await supabase.storage.from("profileimage").upload(imagePath, imageBlob, {
        cacheControl: "3600",
        contentType,
        upsert: true,
      });

      if (error) {
        throw error;
      }

      const { data } = supabase.storage.from("profileimage").getPublicUrl(imagePath);

      await updateCurrentUser({
        name: appUser.name,
        bio: appUser.bio,
        phone: appUser.phone,
        organization_type: appUser.organization_type,
        organization_name: appUser.organization_name,
        role: compatibilityRole,
        profile_image_path: imagePath,
        profile_image_url: data.publicUrl,
      });
    } catch (error) {
      Alert.alert("사진을 바꾸지 못했어요", error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.");
    } finally {
      setIsUploadingProfileImage(false);
    }
  }

  return (
    <AppScreen
      bottomPaddingClassName="pb-24"
      contentClassName="flex-1"
      safeAreaEdges={["top", "left", "right"]}
      scrollContentContainerStyle={{ flexGrow: 1 }}
      showHeader={false}
      title="프로필"
    >
      <View className="flex-1 gap-5">
        <View className="px-1 pb-1 pt-2">
          <View className="flex-row items-start gap-3.5">
            <Pressable
              accessibilityLabel="프로필 사진 변경"
              accessibilityRole="button"
              disabled={isUploadingProfileImage}
              hitSlop={8}
              onPress={handleProfileImagePress}
            >
              <ProfileAvatar
                iconSize={27}
                isUploading={isUploadingProfileImage}
                sizeClassName="h-[64px] w-[64px]"
                user={appUser}
              />
              <View className="absolute -bottom-0.5 -right-0.5 size-6 items-center justify-center rounded-full border border-hypo-bg bg-hypo-brand">
                <Feather color="#FFFFFF" name="camera" size={13} />
              </View>
            </Pressable>
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center justify-between gap-3">
                <Text numberOfLines={1} className="min-w-0 flex-1 text-xl font-bold text-hypo-text">
                  {displayName}
                </Text>
                <Pressable
                  accessibilityLabel="프로필 편집"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => router.push("/(tabs)/profile/account")}
                >
                  <Text className="text-[13px] font-semibold text-hypo-brand">프로필 편집</Text>
                </Pressable>
              </View>
              <Text numberOfLines={1} className="mt-1 text-sm font-bold text-hypo-muted">
                {appUser?.email ?? user?.email ?? "계정 정보를 불러오는 중"}
              </Text>
              {organizationDisplay ? (
                <View className="mt-2 flex-row items-center gap-1.5">
                  <Feather
                    color="#176B5D"
                    name={appUser?.organization_type === "company" ? "briefcase" : "users"}
                    size={13}
                    strokeWidth={2.4}
                  />
                  <Text numberOfLines={1} className="min-w-0 flex-1 text-xs font-semibold text-hypo-brand">
                    {organizationDisplay}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View className="gap-5">
          <MenuSection title="내 정보">
            <MenuRow icon="user" label="계정 정보" onPress={() => router.push("/(tabs)/profile/account")} />
          </MenuSection>

          <MenuSection title="설정">
            <MenuRow icon="bell" label="알림 안내" onPress={() => router.push("/(tabs)/profile/notifications")} />
            <MenuRow icon="sun" label="보기 설정" onPress={() => router.push("/(tabs)/profile/appearance")} />
          </MenuSection>

          <MenuSection title="기타">
            <MenuRow
              icon="volume-2"
              label="공지사항"
              onPress={() => router.push({ pathname: "/notice", params: { returnTo: "/(tabs)/profile" } })}
            />
            <MenuRow
              icon="message-square"
              label="피드백 남기기"
              onPress={() => router.push({ pathname: "/support/feedback", params: { returnTo: "/(tabs)/profile" } })}
            />
            <MenuRow
              icon="help-circle"
              label="문의하기"
              onPress={() => router.push({ pathname: "/support", params: { returnTo: "/(tabs)/profile" } })}
            />
            <MenuRow
              icon="flag"
              label="신고하기"
              onPress={() => router.push({ pathname: "/support/report", params: { returnTo: "/(tabs)/profile" } })}
            />
          </MenuSection>

          <MenuSection title="정보">
            <MenuRow icon="shield" label="개인정보 처리방침" onPress={() => router.push({ pathname: "/legal/privacy", params: { returnTo: "/(tabs)/profile" } })} />
            <MenuRow icon="file-text" label="이용약관" onPress={() => router.push({ pathname: "/legal/terms", params: { returnTo: "/(tabs)/profile" } })} />
          </MenuSection>
        </View>

        {user ? (
      <View className="items-center px-2 pt-1">
            <View className="items-center">
              <Text className="text-[11px] font-bold text-[#8A9387]">Hypofit v{appVersion}</Text>
              <Text className="mt-0.5 text-[11px] font-bold text-[#8A9387]">© 2026 {companyName}</Text>
            </View>
          </View>
        ) : null}
      </View>
      {visibleToast === "feedback_submitted" ? <ProfileToast /> : null}
    </AppScreen>
  );
}

function ProfileToast() {
  return (
    <View pointerEvents="none" className="absolute inset-x-4 top-[42%] z-50 items-center">
      <View className="max-w-[300px] rounded-[18px] border border-hypo-border bg-white px-5 py-4 shadow-lg">
        <Text className="text-center text-[15px] font-black text-hypo-text">피드백이 접수됐어요</Text>
        <Text className="mt-1 text-center text-xs font-bold leading-[18px] text-hypo-muted">소중한 의견 감사합니다.</Text>
      </View>
    </View>
  );
}

function MenuSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <View className="-mx-4 border-t border-hypo-border px-4 pt-4">
      <Text className="pb-1.5 text-[12px] font-black text-[#8A9387]">{title}</Text>
      <View>{children}</View>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className="min-h-[44px] flex-row items-center gap-3 bg-hypo-bg py-2"
      onPress={onPress}
    >
      <Feather color="#1D2522" name={icon} size={18} strokeWidth={2.5} />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-[15px] font-semibold text-hypo-text">
          {label}
        </Text>
      </View>
      <ChevronIcon />
    </Pressable>
  );
}

function ProfileAvatar({
  iconSize,
  isUploading,
  sizeClassName,
  user,
}: {
  iconSize: number;
  isUploading: boolean;
  sizeClassName: string;
  user?: { profile_image_url?: string | null; name?: string | null } | null;
}) {
  if (user?.profile_image_url) {
    return (
      <View className={`${sizeClassName} overflow-hidden rounded-full border border-hypo-border bg-hypo-brandSoft`}>
        <Image
          accessibilityLabel={`${user.name ?? "사용자"} 프로필 사진`}
          className="h-full w-full"
          source={{ uri: user.profile_image_url }}
          resizeMode="cover"
        />
        {isUploading ? <View className="absolute inset-0 bg-white/45" /> : null}
      </View>
    );
  }

  return (
    <View className={`${sizeClassName} items-center justify-center overflow-hidden rounded-full border border-hypo-border bg-hypo-brandSoft`}>
      <Feather color="#176B5D" name="user" size={iconSize} />
      {isUploading ? <View className="absolute inset-0 bg-white/45" /> : null}
    </View>
  );
}

function ChevronIcon() {
  return <View className="h-2.5 w-2.5 rotate-[45deg] border-r-2 border-t-2 border-hypo-text" />;
}

function getImageExtension(uri: string) {
  const extension = uri.split("?")[0]?.split(".").pop()?.toLowerCase();

  if (extension === "png" || extension === "webp") {
    return extension;
  }

  return "jpg";
}
