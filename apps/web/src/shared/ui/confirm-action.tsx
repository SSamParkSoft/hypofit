import * as Dialog from "@radix-ui/react-dialog";
import { type ReactNode, useState } from "react";

import { Button, type ButtonProps } from "./button";

interface ConfirmActionButtonProps extends Omit<ButtonProps, "onClick"> {
  cancelLabel?: string;
  children: ReactNode;
  confirmLabel?: string;
  description: string;
  onConfirm: () => void;
  title: string;
}

export function ConfirmActionButton({
  cancelLabel = "취소",
  children,
  confirmLabel = "확인",
  description,
  disabled,
  onConfirm,
  title,
  variant = "secondary",
  ...buttonProps
}: ConfirmActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <Button disabled={disabled} variant={variant} {...buttonProps}>
          {children}
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-hypo-text/35" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-var(--app-safe-top)-var(--app-safe-bottom)-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-hypo-lg border border-hypo-border bg-hypo-surface p-5 shadow-hypo-floating focus-visible:outline-none">
          <Dialog.Title className="text-lg font-black text-hypo-text">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-hypo-text-muted">
            {description}
          </Dialog.Description>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="secondary">{cancelLabel}</Button>
            </Dialog.Close>
            <Button
              variant={variant === "danger" ? "danger" : "primary"}
              onClick={() => {
                setIsOpen(false);
                onConfirm();
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
