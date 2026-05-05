"use client";

import { AudioFile, Language } from "@/app/lib/types/speechToText";
import { CheckLineIcon, CloseIcon } from "@/app/components/icons";
import Select from "@/app/components/Select";
import AudioPlayer from "@/app/components/speech-to-text/AudioPlayer";

interface AudioFileItemProps {
  audioFile: AudioFile;
  index: number;
  isPlaying: boolean;
  languages: Language[];
  formatFileSize: (bytes: number) => string;
  onPlayToggle: () => void;
  onRemove: () => void;
  onUpdateLanguage: (languageId: number) => void;
  onUpdateGroundTruth: (groundTruth: string) => void;
}

export default function AudioFileItem({
  audioFile,
  index,
  isPlaying,
  languages,
  formatFileSize,
  onPlayToggle,
  onRemove,
  onUpdateLanguage,
  onUpdateGroundTruth,
}: AudioFileItemProps) {
  const uploaded = !!audioFile.fileId;

  return (
    <div className="rounded-lg overflow-hidden bg-bg-primary shadow-sm">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-medium bg-bg-secondary text-text-secondary">
              {index + 1}
            </span>
            <span className="text-sm font-medium truncate text-text-primary">
              {audioFile.name}
            </span>
            <span className="text-xs shrink-0 text-text-secondary">
              {formatFileSize(audioFile.size)}
            </span>
            {uploaded ? (
              <CheckLineIcon className="w-3.5 h-3.5 shrink-0 text-status-success" />
            ) : (
              <div className="w-3 h-3 border-2 border-accent-primary border-t-transparent rounded-full animate-spin shrink-0" />
            )}
          </div>
          <button
            onClick={onRemove}
            className="p-1 rounded shrink-0 text-text-secondary"
            aria-label="Remove audio sample"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <AudioPlayer
          audioBase64={audioFile.base64}
          mediaType={audioFile.mediaType}
          isPlaying={isPlaying}
          onPlayToggle={onPlayToggle}
        />

        <div className="mt-3 flex items-start gap-3">
          <div className="shrink-0 w-[120px]">
            <label className="block text-[10px] font-medium mb-1 uppercase tracking-wide text-text-secondary">
              Language
            </label>
            <Select
              value={audioFile.languageId}
              onChange={(e) => onUpdateLanguage(Number(e.target.value))}
              options={languages.map((lang) => ({
                value: String(lang.id),
                label: lang.name,
              }))}
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-medium mb-1 uppercase tracking-wide text-text-secondary">
              Ground Truth
            </label>
            <textarea
              value={audioFile.groundTruth}
              onChange={(e) => onUpdateGroundTruth(e.target.value)}
              placeholder={
                uploaded ? "Expected transcription..." : "Uploading..."
              }
              disabled={!uploaded}
              rows={2}
              className={`w-full px-2 py-1.5 border rounded-md text-xs border-border resize-y ${
                uploaded
                  ? "bg-bg-primary text-text-primary cursor-text"
                  : "bg-bg-secondary text-text-secondary cursor-not-allowed opacity-60"
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
