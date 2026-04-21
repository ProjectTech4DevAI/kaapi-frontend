"use client";

import { useState, useEffect, useRef } from "react";
import { colors } from "@/app/lib/colors";

interface AudioPlayerFromUrlProps {
  signedUrl: string;
  isPlaying: boolean;
  onPlayToggle: () => void;
  sampleName?: string;
}

export default function AudioPlayerFromUrl({
  signedUrl,
  isPlaying,
  onPlayToggle,
  sampleName,
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

        {sampleName && (
          <div
            className="flex-1 font-medium"
            style={{ color: colors.text.primary }}
          >
            {sampleName}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div
        className="h-0.5 rounded-full overflow-hidden mt-1.5"
        style={{ backgroundColor: colors.border }}
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
    </div>
  );
}
