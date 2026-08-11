import * as Dialog from "@radix-ui/react-dialog";

import { Button } from "../../../shared/ui/button";

interface BlockConfirmDialogProps {
  counterpartName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function BlockConfirmDialog({
  counterpartName,
  onCancel,
  onConfirm,
}: BlockConfirmDialogProps) {
  return (
    <Dialog.Root open onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-hypo-text/35" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] max-h-[calc(100dvh-var(--app-safe-top)-var(--app-safe-bottom)-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-hypo-lg border border-hypo-border bg-hypo-surface p-5 shadow-hypo-floating focus:outline-none">
          <Dialog.Title className="text-lg font-black text-hypo-text">
            {counterpartName}님을 차단할까요?
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm font-semibold leading-6 text-hypo-text-muted">
            차단하면 이 채팅방에서 새 메시지를 주고받을 수 없어요. 신고가 필요하면
            신고하기도 함께 접수해주세요.
          </Dialog.Description>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Dialog.Close asChild>
              <Button variant="secondary">취소</Button>
            </Dialog.Close>
            <Button variant="danger" onClick={onConfirm}>
              차단하기
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
