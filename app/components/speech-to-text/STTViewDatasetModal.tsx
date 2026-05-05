"use client";

import { useState } from "react";
import {
  Language,
  STTViewDatasetModalData,
} from "@/app/lib/types/speechToText";
import { Modal } from "@/app/components";
import AudioPlayerFromUrl from "./AudioPlayerFromUrl";

interface STTViewDatasetModalProps {
  data: STTViewDatasetModalData;
  languages: Language[];
  savingSampleId: number | null;
  onClose: () => void;
  onUpdateSample: (
    sampleId: number,
    field: "ground_truth" | "language_id",
    value: string | number,
  ) => void;
  onLocalGroundTruthChange: (sampleId: number, value: string) => void;
}

export default function STTViewDatasetModal({
  data,
  languages,
  savingSampleId,
  onClose,
  onUpdateSample,
  onLocalGroundTruthChange,
}: STTViewDatasetModalProps) {
  const [viewPlayingId, setViewPlayingId] = useState<number | null>(null);

  const handleClose = () => {
    setViewPlayingId(null);
    onClose();
  };

  return (
    <Modal
      open
      onClose={handleClose}
      title={data.name}
      maxWidth="max-w-[900px]"
      maxHeight="max-h-[85vh]"
    >
      <div className="sticky top-0 bg-bg-primary border-b border-border px-6 py-3 z-10">
        <p className="text-xs text-text-secondary">
          {data.samples.length} audio samples
        </p>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-bg-secondary border-b border-border">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide sticky top-11 text-text-secondary bg-bg-secondary w-10" />
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide sticky top-11 text-text-secondary bg-bg-secondary">
              Sample
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide sticky top-11 text-text-secondary bg-bg-secondary w-[120px]">
              Language
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide sticky top-11 text-text-secondary bg-bg-secondary">
              Ground Truth
            </th>
          </tr>
        </thead>
        <tbody>
          {data.samples.map((sample, idx) => {
            const isSaving = savingSampleId === sample.id;
            return (
              <tr key={sample.id} className="border-b border-border">
                <td className="px-4 py-3 text-xs align-top text-text-secondary">
                  {idx + 1}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="space-y-1.5">
                    {sample.sample_metadata?.original_filename && (
                      <div className="text-xs font-medium truncate text-text-primary max-w-[280px]">
                        {sample.sample_metadata.original_filename}
                      </div>
                    )}
                    {sample.signed_url ? (
                      <AudioPlayerFromUrl
                        signedUrl={sample.signed_url}
                        isPlaying={viewPlayingId === sample.id}
                        onPlayToggle={() =>
                          setViewPlayingId(
                            viewPlayingId === sample.id ? null : sample.id,
                          )
                        }
                      />
                    ) : (
                      <span className="text-xs text-text-secondary">
                        No audio
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <select
                    value={sample.language_id ?? ""}
                    onChange={(e) =>
                      onUpdateSample(
                        sample.id,
                        "language_id",
                        Number(e.target.value),
                      )
                    }
                    disabled={isSaving}
                    className={`w-full px-2 py-1.5 border rounded-md text-xs bg-bg-primary border-border text-text-primary ${
                      isSaving
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                  >
                    {languages.map((lang) => (
                      <option key={lang.id} value={lang.id}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 align-top">
                  <textarea
                    value={sample.ground_truth || ""}
                    onChange={(e) =>
                      onLocalGroundTruthChange(sample.id, e.target.value)
                    }
                    onBlur={(e) =>
                      onUpdateSample(sample.id, "ground_truth", e.target.value)
                    }
                    placeholder="Enter ground truth..."
                    disabled={isSaving}
                    rows={3}
                    className={`w-full px-2 py-1.5 border rounded-md text-xs bg-bg-primary border-border text-text-primary resize-y ${
                      isSaving ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Modal>
  );
}
