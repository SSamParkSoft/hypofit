import { Button } from "../../../shared/ui/button";
import { TextInput } from "../../../shared/ui/field";
import type { usePostingImageEditor } from "./usePostingImageEditor";

export function PostingImageEditor({ editor, disabled }: {
  editor: ReturnType<typeof usePostingImageEditor>; disabled: boolean;
}) {
  if (!editor.enabled && !editor.images.length) return null;
  return (
    <section className="grid gap-3 lg:col-span-2" aria-label="공고 이미지">
      <div className="flex justify-between gap-3 text-sm font-semibold">
        <h3>이미지 · 선택</h3><span>{editor.images.length} / 3</span>
      </div>
      <p className="text-xs leading-5 text-hypo-text-muted">첫 번째 이미지가 대표 이미지예요. JPG·PNG, 한 장당 3MB까지 올릴 수 있어요.</p>
      <div className="flex gap-3 overflow-x-auto">
        {editor.images.map((image, index) => (
          <div key={image.localId} className="w-36 shrink-0 space-y-1">
            <img src={image.preview} alt={image.altText || `공고 이미지 ${index + 1}`} className="h-28 w-full rounded-lg bg-hypo-bg object-contain" />
            <p className="text-xs text-hypo-text-muted">{index === 0 ? "대표 이미지" : `이미지 ${index + 1}`}</p>
            <div className="flex gap-1">
              {index > 0 ? <Button size="sm" variant="ghost" disabled={disabled} onClick={() => editor.setImages(current => [image, ...current.filter(item => item.localId !== image.localId)])}>대표로</Button> : null}
              <Button size="sm" variant="ghost" disabled={disabled} onClick={() => editor.remove(image)}>제거</Button>
            </div>
            <TextInput aria-label={`이미지 ${index + 1} 설명`} placeholder="이미지 설명 (선택)" maxLength={200}
              disabled={disabled || Boolean(image.imageId || image.uploadId)} value={image.altText}
              onChange={event => editor.setImages(current => current.map(item => item.localId === image.localId ? { ...item, altText: event.target.value } : item))} />
          </div>
        ))}
      </div>
      {editor.images.length < 3 ? <label className="grid min-h-11 gap-2 text-sm text-hypo-brand">
        이미지 추가
        <input type="file" accept="image/jpeg,image/png" multiple disabled={disabled || !editor.enabled}
          onChange={event => { void editor.add(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
      </label> : null}
      {editor.error ? <p role="alert" className="text-sm text-hypo-danger">{editor.error}</p> : null}
    </section>
  );
}
