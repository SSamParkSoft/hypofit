import { supabase } from "./client";

const PROFILE_IMAGE_BUCKET = "profileimage";
const MAX_PROFILE_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_PROFILE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface UploadedProfileImage {
  path: string;
  publicUrl: string;
}

export async function uploadProfileImage(
  userId: string,
  file: File,
): Promise<UploadedProfileImage> {
  if (!supabase) {
    throw new Error("Supabase 브라우저 환경 변수가 설정되지 않았습니다.");
  }

  if (!ALLOWED_PROFILE_IMAGE_TYPES.has(file.type)) {
    throw new Error("프로필 사진은 JPG, PNG, WebP 형식만 업로드할 수 있습니다.");
  }

  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error("프로필 사진은 3MB 이하만 업로드할 수 있습니다.");
  }

  const extension = getProfileImageExtension(file);
  const objectPath = `${userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const { data, error } = await supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .upload(objectPath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(PROFILE_IMAGE_BUCKET).getPublicUrl(data.path);

  return {
    path: data.path,
    publicUrl,
  };
}

function getProfileImageExtension(file: File) {
  const extensionFromName = file.name.split(".").pop()?.toLowerCase();

  if (extensionFromName && ["jpg", "jpeg", "png", "webp"].includes(extensionFromName)) {
    return extensionFromName === "jpeg" ? "jpg" : extensionFromName;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}
