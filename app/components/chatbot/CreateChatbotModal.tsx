"use client";

import { useState } from "react";
import { Button, Field, Modal } from "@/app/components/ui";
import {
  CHATBOT_NAME_MAX_LENGTH,
  DEFAULT_CHATBOT_NAME,
} from "@/app/lib/constants";

interface CreateChatbotModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export default function CreateChatbotModal({
  open,
  onClose,
  onCreate,
}: CreateChatbotModalProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (isSubmitting) return;
    setName("");
    onClose();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onCreate(name.trim() || DEFAULT_CHATBOT_NAME);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New Chatbot"
      maxWidth="max-w-md"
    >
      <div className="px-6 pb-6 space-y-4">
        <Field
          label="Name"
          value={name}
          onChange={setName}
          placeholder={DEFAULT_CHATBOT_NAME}
          maxLength={CHATBOT_NAME_MAX_LENGTH}
          autoFocus
        />
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
