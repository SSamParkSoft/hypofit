import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { usePostingDetail } from "../usePostingDetail";
import { Button } from "../../../shared/ui/button";

export function PostingImageGallery({ postId, enabled = true }: { postId: string; enabled?: boolean }) {
  const detail = usePostingDetail(enabled ? postId : null);
  const images = detail.data?.images ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const selected = images.find(image => image.id === selectedId);
  if (!enabled || !images.length) return null;
  return (
    <Dialog.Root open={Boolean(selected)} onOpenChange={open => { if (!open) setSelectedId(null); }}>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto">
        {images.map((image, index) => (
          <button key={image.id} type="button" className="h-56 w-full shrink-0 snap-start overflow-hidden rounded-xl bg-hypo-bg"
            aria-label={`${image.alt_text || `공고 이미지 ${index + 1}`} 크게 보기`}
            onClick={() => {
              if (image.url && !failedUrls.includes(image.url)) setSelectedId(image.id);
              else { setFailedUrls([]); void detail.refetch(); }
            }}>
            {image.url && !failedUrls.includes(image.url) ? <img src={image.url} alt={image.alt_text || `공고 이미지 ${index + 1}`}
              className="h-full w-full object-contain" onError={() => setFailedUrls(current => [...current, image.url!])} /> :
              <span className="text-sm text-hypo-text-muted">이미지 다시 불러오기</span>}
          </button>
        ))}
      </div>
      {images.length > 1 ? <p className="text-xs text-hypo-text-muted">이미지 {images.length}장 · 옆으로 넘겨 보세요</p> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-hypo-text/50" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-xl bg-hypo-surface p-4 pt-[max(1rem,var(--app-safe-top))] pb-[max(1rem,var(--app-safe-bottom))]">
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="text-sm font-semibold">공고 이미지</Dialog.Title>
            <Dialog.Close asChild><Button variant="ghost">닫기</Button></Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {selected?.url ? <img src={selected.url} alt={selected.alt_text || "공고 이미지"} className="mx-auto h-auto max-w-full" /> : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
