import { apiRequest } from "@/shared/api/client";
import { getSupabaseClient } from "@/shared/api/supabase";

type ImageUpload = { id: string; path: string; token: string };

export const postingImagesApi = {
  reserve(accessToken: string, mimeType = "image/jpeg", altText?: string) {
    return apiRequest<ImageUpload>("/api/v1/posting-images/uploads", {
      accessToken, method: "POST", body: JSON.stringify({ mime_type: mimeType, alt_text: altText }),
    });
  },
  async upload(plan: ImageUpload, bytes: ArrayBuffer) {
    const { error } = await getSupabaseClient().storage.from("posting-images")
      .uploadToSignedUrl(plan.path, plan.token, bytes, { contentType: "image/jpeg" });
    if (error) throw new Error("이미지를 올리지 못했어요. 다시 시도해 주세요.");
  },
  complete(id: string, accessToken: string) {
    return apiRequest<{ id: string }>(`/api/v1/posting-images/${id}/complete`, { accessToken, method: "POST" });
  },
  cancel(id: string, accessToken: string) {
    return apiRequest<void>(`/api/v1/posting-images/${id}`, { accessToken, method: "DELETE" });
  },
};
