'use client';

import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { Button } from '@/components/ui/button';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Transition show={open}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-950/40" />
        </TransitionChild>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <DialogTitle className="text-lg font-black text-slate-900">{title}</DialogTitle>
            <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>
            <div className="mt-6 flex justify-start gap-3">
              <Button variant="danger" onClick={onConfirm}>
                {confirmLabel}
              </Button>
              <Button variant="secondary" onClick={onClose}>
                انصراف
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </Transition>
  );
}
