"use client";

import { useState, useEffect, useRef } from "react";
import { colors } from "@/app/lib/colors";

interface AudioPlayerFromUrlProps {
  signedUrl: string;
  isPlaying: boolean;
  onPlayToggle: () => void;
  sampleLabel?: string;
  durationSeconds?: number | null;
  sizeBytes?: number | null;
}

export default function AudioPlayerFromUrl({
  signedUrl,
  isPlaying,
  onPlayToggle,
  sampleLabel,
  durationSeconds,
  sizeBytes,
}: AudioPlayerFromUrlProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => onPlayToggle();

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [onPlayToggle]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(console.error);
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full">
      <audio ref={audioRef} src={signedUrl} preload="metadata" />

      <div className="flex items-center gap-3">
        <button
          onClick={onPlayToggle}
          className="w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 border-2"
          style={{
            borderColor: colors.accent.primary,
            backgroundColor: "transparent",
            color: colors.accent.primary,
          }}
        >
          {isPlaying ? (
            <svg
              className="w-2.5 h-2.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="7" y="5" width="3" height="14" />
              <rect x="14" y="5" width="3" height="14" />
            </svg>
          ) : (
            <svg
              className="w-2.5 h-2.5 ml-0.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {sampleLabel && (
          <span
            className="text-sm font-medium"
            style={{ color: colors.text.primary }}
          >
            {sampleLabel}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div
        className="h-1 rounded-full overflow-hidden mt-2"
        style={{ backgroundColor: colors.bg.secondary }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%",
            backgroundColor: colors.accent.primary,
            transition: "width 0.05s ease-out",
          }}
        />
      </div>

      {/* Meta info */}
      {(durationSeconds != null || sizeBytes != null) && (
        <div className="flex items-center gap-3 mt-1.5">
          {durationSeconds != null && (
            <span
              className="text-xs tabular-nums"
              style={{ color: colors.text.secondary }}
            >
              {durationSeconds >= 60
                ? `${Math.floor(durationSeconds / 60)}m ${Math.round(durationSeconds % 60)}s`
                : `${Math.round(durationSeconds)}s`}
            </span>
          )}
          {sizeBytes != null && (
            <span
              className="text-xs tabular-nums"
              style={{ color: colors.text.secondary }}
            >
              {formatSize(sizeBytes)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
