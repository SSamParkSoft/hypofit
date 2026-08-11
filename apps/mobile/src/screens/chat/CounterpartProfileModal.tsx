import { Alert, Image, Modal, Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { getRoleLabel } from "@hypofit/contracts";
import type { ChatRoom, UserSummary } from "@hypofit/contracts";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/features/auth/AuthProvider";
import { useBlockUser, useBlockedUsers, useUnblockUser } from "@/features/blocks/useBlocks";
import { ApiError } from "@/shared/api/client";

interface CounterpartProfileModalProps {
  currentUserId?: string;
  room: ChatRoom | null;
  onClose: () => void;
  onReport: (room: ChatRoom) => void;
}

export function CounterpartProfileModal({
  currentUserId,
  onClose,
  onReport,
  room,
}: CounterpartProfileModalProps) {
  const { accessToken } = useAuth();
  const insets = useSafeAreaInsets();
  const counterpart = room ? getCounterpart(room, currentUserId) : null;
  const canManageBlock = Boolean(accessToken && counterpart?.id);
  const blockedUsers = useBlockedUsers(accessToken, canManageBlock);
  const blockUser = useBlockUser(accessToken);
  const unblockUser = useUnblockUser(accessToken);

  if (!room) return null;

  const name = counterpart?.name ?? "상대방";
  const role = counterpart ? getRoleLabel(counterpart.role) : "인터뷰 상대";
  const bio = counterpart?.bio || getFallbackBio(counterpart, room);
  const interviewTitle = room.interview_post?.title ?? "인터뷰 대화";
  const activeBlock = counterpart?.id
    ? blockedUsers.data?.find((block) => block.blocked_user_id === counterpart.id)
    : undefined;
  const isBlocked = Boolean(activeBlock);
  const isBlockActionPending = blockUser.isPending || unblockUser.isPending;
  const isBlockStateLoading = canManageBlock && blockedUsers.isLoading && !blockedUsers.data;
  const blockActionLabel = isBlockStateLoading ? "차단 상태 확인 중" : isBlocked ? "차단 해제" : "차단하기";

  const handleBlockToggle = () => {
    if (!counterpart?.id) {
      Alert.alert("차단할 수 없어요", "상대 정보를 다시 확인해 주세요.");
      return;
    }

    if (isBlocked) {
      Alert.alert("차단을 해제할까요?", "다시 메시지를 주고받을 수 있어요.", [
        { style: "cancel", text: "취소" },
        {
          text: "해제하기",
          onPress: () => {
            unblockUser.mutate(counterpart.id, {
              onError: (error) => {
                Alert.alert("차단을 해제하지 못했어요", getBlockActionErrorMessage("unblock", error));
              },
            });
          },
        },
      ]);
      return;
    }

    Alert.alert("이 사용자를 차단할까요?", "차단하면 서로 메시지를 주고받을 수 없어요.", [
      { style: "cancel", text: "취소" },
      {
        style: "destructive",
        text: "차단하기",
        onPress: () => {
          blockUser.mutate(
            {
              input: { reason: null },
              userId: counterpart.id,
            },
            {
              onError: (error) => {
                Alert.alert("차단하지 못했어요", getBlockActionErrorMessage("block", error));
              },
            },
          );
        },
      },
    ]);
  };

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/35">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View
          className="rounded-t-[24px] bg-hypo-surface px-5 pt-3"
          style={{ paddingBottom: insets.bottom + 20 }}
        >
          <View className="mb-5 self-center h-1 w-10 rounded-full bg-hypo-border" />

          <View className="items-center">
            <Avatar sizeClassName="h-[74px] w-[74px]" textClassName="text-[20px]" user={counterpart} />
            <Text numberOfLines={1} className="mt-3 max-w-full text-xl font-black text-hypo-text">
              {name}
            </Text>
            <View className="mt-2 rounded-full bg-hypo-brandSoft px-3 py-1">
              <Text className="text-xs font-black text-hypo-brand">{role}</Text>
            </View>
            <Text className="mt-3 text-center text-sm font-bold leading-[21px] text-hypo-muted">
              {bio}
            </Text>
          </View>

          <View className="mt-5 rounded-[16px] border border-hypo-border bg-hypo-bg px-4 py-3">
            <Text className="text-[11px] font-black text-hypo-brand">연결된 인터뷰</Text>
            <Text numberOfLines={2} className="mt-1 text-sm font-black leading-5 text-hypo-text">
              {interviewTitle}
            </Text>
          </View>

          {isBlocked ? (
            <Text className="mt-4 text-center text-[12px] font-bold leading-4 text-hypo-danger">
              지금은 이 상대와 메시지를 주고받을 수 없어요.
            </Text>
          ) : null}

          <View className="mt-4 gap-2">
            <ActionButton
              disabled={!canManageBlock || isBlockActionPending || isBlockStateLoading}
              label={blockActionLabel}
              tone={isBlocked ? "default" : "danger"}
              onPress={handleBlockToggle}
            />
            <ActionButton label="신고하기" tone="danger" onPress={() => onReport(room)} />
            <ActionButton label="닫기" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function Avatar({
  sizeClassName,
  textClassName,
  user,
}: {
  sizeClassName: string;
  textClassName: string;
  user?: UserSummary | null;
}) {
  if (user?.profile_image_url) {
    return (
      <Image
        accessibilityLabel={`${user.name} 프로필 사진`}
        className={`${sizeClassName} overflow-hidden rounded-full border border-hypo-border bg-hypo-brandSoft`}
        source={{ uri: user.profile_image_url }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View className={`${sizeClassName} items-center justify-center overflow-hidden rounded-full border border-hypo-border bg-hypo-brandSoft`}>
      <Feather color="#176B5D" name="user" size={textClassName.includes("20") ? 30 : 22} />
    </View>
  );
}

export function getCounterpart(room: ChatRoom, currentUserId?: string): UserSummary | null | undefined {
  return currentUserId === room.founder_id ? room.respondent : room.founder;
}

function ActionButton({
  disabled,
  label,
  onPress,
  tone = "default",
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={`min-h-12 justify-center rounded-xl bg-hypo-bg px-4 ${disabled ? "opacity-45" : "opacity-100"}`}
      onPress={onPress}
    >
      <Text className={`text-center text-[15px] font-black ${tone === "danger" ? "text-hypo-danger" : "text-hypo-text"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function getAvatarInitials(name?: string | null) {
  const compact = (name ?? "H").replace(/\s+/g, "");
  const chars = Array.from(compact);
  if (chars.length === 0) return "H";
  return chars.slice(0, 2).join("");
}

function getFallbackBio(counterpart: UserSummary | null | undefined, room: ChatRoom) {
  if (!counterpart) return "인터뷰 조율을 위해 연결된 상대입니다.";
  if (counterpart.id === room.founder_id) return "모집글을 만든 창업자입니다.";
  return "인터뷰에 신청한 참여자입니다.";
}

function getBlockActionErrorMessage(action: "block" | "unblock", error: unknown) {
  if (error instanceof ApiError) {
    if (action === "block") {
      if (error.status === 400) return "내 계정은 차단할 수 없어요.";
      if (error.status === 404) return "상대 정보를 찾지 못했어요.";
    }

    if (action === "unblock" && error.status === 404) {
      return "이미 해제됐거나 차단 기록을 찾지 못했어요.";
    }
  }

  return "잠시 후 다시 시도해 주세요.";
}
