"use client";

import Button from "@/app/components/ui/Button";
import Modal from "@/app/components/ui/Modal";
import { WarningIcon } from "@/app/components/icons";

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
}

export default function ErrorModal({
  isOpen,
  onClose,
  title = "Error",
  message,
}: ErrorModalProps) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      maxHeight="max-h-fit"
      showClose={false}
    >
      <div className="px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-status-error-bg">
            <WarningIcon className="w-6 h-6 text-status-error-text" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            <p className="text-sm mt-1 text-text-secondary whitespace-pre-wrap">
              {message}
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
        <Button variant="primary" size="md" onClick={onClose}>
          Okay
        </Button>
      </div>
    </Modal>
  );
}
