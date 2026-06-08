"use client";

import { Modal } from "@/app/components/ui";

export interface PreviewableAttachment {
  kind: "image" | "pdf";
  name: string;
  mimeType: string;
  previewUrl?: string;
}

interface AttachmentPreviewModalProps {
  attachment: PreviewableAttachment | null;
  onClose: () => void;
}

export default function AttachmentPreviewModal({
  attachment,
  onClose,
}: AttachmentPreviewModalProps) {
  const open = !!attachment;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={attachment?.name ?? "Preview"}
      maxWidth="max-w-4xl"
      maxHeight="max-h-[90vh]"
    >
      <div className="px-6 pb-6 h-full">
        {attachment?.kind === "image" && attachment.previewUrl ? (
          <div className="flex items-center justify-center h-full">
            <img
              src={attachment.previewUrl}
              alt={attachment.name}
              className="max-w-full max-h-[75vh] object-contain rounded-lg"
            />
          </div>
        ) : attachment?.previewUrl ? (
          <iframe
            src={attachment.previewUrl}
            title={attachment.name}
            className="w-full h-[75vh] rounded-lg border border-border"
          />
        ) : (
          <p className="text-sm text-text-secondary text-center py-12">
            Preview is not available for this attachment.
          </p>
        )}
      </div>
    </Modal>
  );
}
