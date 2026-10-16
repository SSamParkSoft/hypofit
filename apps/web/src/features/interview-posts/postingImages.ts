import { apiRequest } from "../../shared/api/client";
import { supabase } from "../../shared/supabase/client";

export interface PostingUpload {
  id: string;
  path: string;
  token: string;
}

export const postingImagesApi = {
  reserve(accessToken: string, altText: string) {
    return apiRequest<PostingUpload>("/api/v1/posting-images/uploads", {
      accessToken, method: "POST", body: JSON.stringify({ mime_type: "image/jpeg", alt_text: altText }),
    });
  },
  async upload(plan: PostingUpload, blob: Blob) {
    if (!supabase) throw new Error("이미지 저장소에 연결하지 못했어요.");
    const { error } = await supabase.storage.from("posting-images").uploadToSignedUrl(plan.path, plan.token, blob, { contentType: "image/jpeg" });
    if (error) throw new Error("이미지를 올리지 못했어요. 다시 시도해 주세요.");
  },
  complete(id: string, accessToken: string) {
    return apiRequest<{ id: string }>(`/api/v1/posting-images/${id}/complete`, { accessToken, method: "POST" });
  },
  cancel(id: string, accessToken: string) {
    return apiRequest<void>(`/api/v1/posting-images/${id}`, { accessToken, method: "DELETE" });
  },
};

export async function preparePostingImage(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png'].includes(file.type)) throw new Error("JPG 또는 PNG 이미지를 선택해 주세요.");
  if (file.size > 25 * 1024 * 1024) throw new Error("25MB 이하의 이미지를 선택해 주세요.");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width > 8192 || bitmap.height > 8192 || bitmap.width * bitmap.height > 12_000_000) {
      throw new Error("이미지 해상도를 줄여 다시 선택해 주세요.");
    }
    const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("이미지를 처리하지 못했어요.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size > 3 * 1024 * 1024) throw new Error("이미지 크기를 줄여 다시 선택해 주세요. 한 장당 3MB까지 올릴 수 있어요.");
    return blob;
  } finally {
    bitmap.close();
  }
}
