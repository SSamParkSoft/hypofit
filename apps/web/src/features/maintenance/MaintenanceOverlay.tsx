import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { MaintenanceScreen } from "./MaintenanceScreen";

export function MaintenanceOverlay({ active, children }: { active: boolean; children: ReactNode }) {
  return <>
    {children}
    <Dialog.Root open={active}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-hypo-bg" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-0 z-[100] overflow-y-auto bg-hypo-bg focus:outline-none" onEscapeKeyDown={(event) => event.preventDefault()} onInteractOutside={(event) => event.preventDefault()}>
          <Dialog.Title className="sr-only">서비스 점검 안내</Dialog.Title>
          <MaintenanceScreen />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>;
}
