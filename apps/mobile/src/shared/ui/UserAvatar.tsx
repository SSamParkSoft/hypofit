import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Image, View } from "react-native";

interface UserAvatarProps {
  iconSize: number;
  imageUrl?: string | null;
  name?: string | null;
  sizeClassName: string;
}

export function UserAvatar({ iconSize, imageUrl, name, sizeClassName }: UserAvatarProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const canRenderImage = Boolean(imageUrl && imageUrl !== failedImageUrl);
  const accessibleName = name?.trim() || "사용자";

  return (
    <View
      accessibilityLabel={`${accessibleName} 프로필 사진`}
      accessibilityRole="image"
      className={`${sizeClassName} items-center justify-center overflow-hidden rounded-full border border-hypo-border bg-hypo-brandSoft`}
    >
      {canRenderImage ? (
        <Image
          accessible={false}
          className="h-full w-full"
          onError={() => setFailedImageUrl(imageUrl ?? null)}
          resizeMode="cover"
          source={{ uri: imageUrl as string }}
        />
      ) : (
        <Feather color="#176B5D" name="user" size={iconSize} />
      )}
    </View>
  );
}
