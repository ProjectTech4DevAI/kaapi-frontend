"use client";

import { AudioFile, Language } from "@/app/lib/types/speechToText";
import { useAuth } from "@/app/lib/context/AuthContext";
import { Button, Field, InfoTooltip } from "@/app/components";
import Select from "@/app/components/Select";
import { MusicNoteIcon, PlusIcon } from "@/app/components/icons";
import AudioFileItem from "./AudioFileItem";

interface CreateSTTDatasetFormProps {
  datasetName: string;
  setDatasetName: (name: string) => void;
  datasetDescription: string;
  setDatasetDescription: (desc: string) => void;
  datasetLanguageId: number;
  setDatasetLanguageId: (id: number) => void;
  audioFiles: AudioFile[];
  setAudioFiles: React.Dispatch<React.SetStateAction<AudioFile[]>>;
  playingFileId: string | null;
  setPlayingFileId: (id: string | null) => void;
  handleAudioFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  triggerAudioUpload: () => void;
  removeAudioFile: (id: string) => void;
  updateGroundTruth: (id: string, groundTruth: string) => void;
  updateFileLanguage: (id: string, languageId: number) => void;
  formatFileSize: (bytes: number) => string;
  isCreating: boolean;
  handleCreateDataset: () => void;
  languages: Language[];
}

export default function CreateSTTDatasetForm({
  datasetName,
  setDatasetName,
  datasetDescription,
  setDatasetDescription,
  datasetLanguageId,
  setDatasetLanguageId,
  audioFiles,
  setAudioFiles,
  playingFileId,
  setPlayingFileId,
  handleAudioFileSelect,
  triggerAudioUpload,
  removeAudioFile,
  updateGroundTruth,
  updateFileLanguage,
  formatFileSize,
  isCreating,
  handleCreateDataset,
  languages,
}: CreateSTTDatasetFormProps) {
  const { isAuthenticated } = useAuth();

  const isCreateDisabled =
    isCreating || !datasetName.trim() || audioFiles.length === 0;
  const uploadedCount = audioFiles.filter((f) => f.fileId).length;

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Create New Dataset
        </h2>
        <p className="text-xs mt-0.5 text-text-secondary">
          Add audio samples that will be transcribed during evaluation
        </p>
      </div>

      <Field
        label="Name *"
        value={datasetName}
        onChange={setDatasetName}
        placeholder="e.g., English Podcast Dataset"
      />

      <Field
        label="Description"
        value={datasetDescription}
        onChange={setDatasetDescription}
        placeholder="Optional description"
      />

      <div>
        <label className="text-xs font-medium mb-1.5 text-text-secondary">
          <span className="inline-flex items-center gap-1">
            Language *
            <InfoTooltip
              text={
                <>
                  <div className="font-semibold mb-1">Default Language</div>
                  <p className="leading-relaxed">
                    This is the default language applied to all samples in the
                    dataset. You can override the language for individual
                    samples in the audio files section below.
                  </p>
                </>
              }
            />
          </span>
        </label>
        <Select
          value={datasetLanguageId}
          onChange={(e) => {
            const newId = Number(e.target.value);
            setDatasetLanguageId(newId);
            setAudioFiles((prev) =>
              prev.map((f) => ({ ...f, languageId: newId })),
            );
          }}
          options={languages.map((lang) => ({
            value: String(lang.id),
            label: lang.name,
          }))}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-text-secondary">
            Audio Samples *
          </label>
        </div>

        <input
          id="audio-upload"
          type="file"
          accept=".mp3,.wav,.m4a,.ogg,.flac,.webm"
          multiple
          onChange={handleAudioFileSelect}
          className="hidden"
        />

        {audioFiles.length === 0 ? (
          <div
            onClick={isAuthenticated ? triggerAudioUpload : undefined}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors border-border bg-bg-primary ${
              isAuthenticated
                ? "cursor-pointer hover:bg-bg-secondary"
                : "cursor-not-allowed opacity-50"
            }`}
          >
            <MusicNoteIcon className="w-8 h-8 mx-auto mb-2 text-text-secondary" />
            <p className="text-xs font-medium mb-1 text-text-primary">
              {isAuthenticated
                ? "Click to upload audio samples"
                : "Add an API key to upload"}
            </p>
            <p className="text-xs text-text-secondary">
              MP3, WAV, M4A, OGG, FLAC, WebM
            </p>
          </div>
        ) : (
          <div>
            <div className="space-y-3 max-h-[400px] overflow-auto">
              {audioFiles.map((audioFile, idx) => (
                <AudioFileItem
                  key={audioFile.id}
                  audioFile={audioFile}
                  index={idx}
                  isPlaying={playingFileId === audioFile.id}
                  languages={languages}
                  formatFileSize={formatFileSize}
                  onPlayToggle={() =>
                    setPlayingFileId(
                      playingFileId === audioFile.id ? null : audioFile.id,
                    )
                  }
                  onRemove={() => removeAudioFile(audioFile.id)}
                  onUpdateLanguage={(languageId) =>
                    updateFileLanguage(audioFile.id, languageId)
                  }
                  onUpdateGroundTruth={(groundTruth) =>
                    updateGroundTruth(audioFile.id, groundTruth)
                  }
                />
              ))}
            </div>

            <button
              onClick={isAuthenticated ? triggerAudioUpload : undefined}
              className={`flex items-center gap-1 text-xs font-medium mt-2 ${
                isAuthenticated
                  ? "text-accent-primary cursor-pointer"
                  : "text-text-secondary cursor-not-allowed"
              }`}
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Add more samples
              <span className="text-text-secondary">
                ({uploadedCount}/{audioFiles.length} uploaded)
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          variant="ghost"
          size="md"
          onClick={() => {
            setDatasetName("");
            setDatasetDescription("");
            setDatasetLanguageId(languages[0]?.id ?? datasetLanguageId);
            setAudioFiles([]);
            setPlayingFileId(null);
          }}
          disabled={isCreating}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleCreateDataset}
          disabled={isCreateDisabled}
        >
          {isCreating ? (
            <>
              <div className="w-4 h-4 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
              Creating...
            </>
          ) : (
            "Create Dataset"
          )}
        </Button>
      </div>
    </div>
  );
}
