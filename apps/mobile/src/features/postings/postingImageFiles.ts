import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import type { ImagePickerAsset } from "expo-image-picker";
import type { PostingDraftImage } from "./postingCreationDraft";
import { postingImagesApi } from "./postingImagesApi";

const MAX_BYTES = 3 * 1024 * 1024;

export async function prepareLocalPostingImage(asset: ImagePickerAsset, userId: string): Promise<PostingDraftImage> {
  // Do not load the new native module until the server capability exposes photo selection.
  const { ImageManipulator, SaveFormat } = await import("expo-image-manipulator");
  if (asset.fileSize && asset.fileSize > 25 * 1024 * 1024) throw new Error("25MB 이하의 이미지를 선택해 주세요.");
  const context = ImageManipulator.manipulate(asset.uri);
  const ratio = Math.min(1, 2560 / Math.max(asset.width, asset.height));
  if (ratio < 1) context.resize({ width: Math.max(1, Math.round(asset.width * ratio)), height: Math.max(1, Math.round(asset.height * ratio)) });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
  const source = new File(result.uri);
  if (source.size > MAX_BYTES) {
    source.delete();
    throw new Error("이미지 크기를 줄여 다시 선택해 주세요. 한 장당 3MB까지 올릴 수 있어요.");
  }
  const directory = new Directory(Paths.document, "posting-image-drafts", userId);
  directory.create({ intermediates: true, idempotent: true });
  const localId = Crypto.randomUUID();
  const target = new File(directory, `${localId}.jpg`);
  await source.copy(target);
  source.delete();
  return { localId, localUri: target.uri };
}

export function removeLocalPostingImage(image: PostingDraftImage, userId: string) {
  const allowedPrefix = new Directory(Paths.document, "posting-image-drafts", userId).uri.replace(/\/+$/, "") + "/";
  if (image.localUri?.startsWith(allowedPrefix)) {
    const file = new File(image.localUri);
    if (file.exists) file.delete();
  }
}

/** Persist each successful step, so retrying an interrupted publish reuses completed assets. */
export async function uploadPostingDraftImages(
  images: PostingDraftImage[],
  accessToken: string,
  onProgress: (images: PostingDraftImage[]) => Promise<void>,
): Promise<PostingDraftImage[]> {
  const prepared = images.map(image => ({ ...image }));
  for (let index = 0; index < prepared.length; index++) {
    const image = prepared[index];
    if (image.imageId) continue;
    if (image.uploadId) {
      try {
        const complete = await postingImagesApi.complete(image.uploadId, accessToken);
        image.imageId = complete.id;
        await onProgress([...prepared]);
        continue;
      } catch (error) {
        if (image.uploaded) throw error;
        // No upload success was recorded. Cancel the unfinished reservation before retrying with a new token.
        await postingImagesApi.cancel(image.uploadId, accessToken);
        image.uploadId = undefined;
      }
    }
    if (!image.localUri || !new File(image.localUri).exists) throw new Error("저장한 이미지를 찾지 못했어요. 해당 이미지를 다시 선택해 주세요.");
    const bytes = await new File(image.localUri).arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) throw new Error("이미지는 한 장당 3MB 이하로 올려 주세요.");
    const plan = await postingImagesApi.reserve(accessToken, "image/jpeg", image.altText);
    image.uploadId = plan.id;
    await onProgress([...prepared]);
    await postingImagesApi.upload(plan, bytes);
    image.uploaded = true;
    await onProgress([...prepared]);
    const complete = await postingImagesApi.complete(plan.id, accessToken);
    image.imageId = complete.id;
    await onProgress([...prepared]);
  }
  return prepared;
}
