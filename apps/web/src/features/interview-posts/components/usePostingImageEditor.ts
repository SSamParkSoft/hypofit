import { useEffect, useRef, useState } from "react";
import { postingImagesApi, preparePostingImage } from "../postingImages";

export interface EditablePostingImage {
  localId: string;
  blob: Blob;
  preview: string;
  altText: string;
  uploadId?: string;
  uploaded?: boolean;
  imageId?: string;
}

export function usePostingImageEditor(accessToken?: string | null, enabled = false) {
  const [images, setImages] = useState<EditablePostingImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previews = useRef(new Set<string>());
  const active = useRef(true);
  useEffect(() => {
    const urls = previews.current;
    active.current = true;
    return () => { active.current = false; urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); };
  }, []);
  async function add(files: File[]) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const added: EditablePostingImage[] = [];
    try {
      for (const file of files.slice(0, 3 - images.length)) {
        const blob = await preparePostingImage(file);
        if (!active.current) return;
        const preview = URL.createObjectURL(blob);
        previews.current.add(preview);
        added.push({ localId: crypto.randomUUID(), blob, preview, altText: "" });
      }
      setImages(current => [...current, ...added]);
    } catch (error) {
      added.forEach(image => { URL.revokeObjectURL(image.preview); previews.current.delete(image.preview); });
      setError(error instanceof Error ? error.message : "이미지를 추가하지 못했어요.");
    } finally { setBusy(false); }
  }
  function remove(image: EditablePostingImage) {
    setImages(current => current.filter(item => item.localId !== image.localId));
    URL.revokeObjectURL(image.preview);
    previews.current.delete(image.preview);
    const id = image.imageId ?? image.uploadId;
    if (id && accessToken) void postingImagesApi.cancel(id, accessToken).catch(() => undefined);
  }
  async function upload(): Promise<string[]> {
    if (!images.length) return [];
    if (!accessToken || !enabled) throw new Error("이미지 기능을 사용할 수 없어요.");
    setBusy(true);
    const prepared = images.map(image => ({ ...image }));
    const save = () => setImages(prepared.map(image => ({ ...image })));
    try {
      for (const image of prepared) {
        if (!active.current) throw new Error("작성 화면을 다시 열어 주세요.");
        if (image.imageId) continue;
        if (image.uploadId) {
          try { image.imageId = (await postingImagesApi.complete(image.uploadId, accessToken)).id; save(); continue; }
          catch (error) {
            if (image.uploaded) throw error;
            await postingImagesApi.cancel(image.uploadId, accessToken);
            image.uploadId = undefined;
          }
        }
        const plan = await postingImagesApi.reserve(accessToken, image.altText);
        image.uploadId = plan.id; save();
        await postingImagesApi.upload(plan, image.blob);
        image.uploaded = true; save();
        image.imageId = (await postingImagesApi.complete(plan.id, accessToken)).id; save();
      }
      if (!active.current) throw new Error("작성 화면을 다시 열어 주세요.");
      return prepared.map(image => image.imageId!);
    } finally { setBusy(false); }
  }
  return { images, setImages, add, remove, upload, busy, error, enabled };
}
