"use client";

import { useState, useEffect, useRef } from "react";
import WaveformVisualizer from "./WaveformVisualizer";

interface AudioPlayerProps {
  audioBase64: string;
  mediaType: string;
  isPlaying: boolean;
  onPlayToggle: () => void;
}

export default function AudioPlayer({
  audioBase64,
  mediaType,
  isPlaying,
  onPlayToggle,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const audioSrc = `data:${mediaType};base64,${audioBase64}`;

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

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <audio ref={audioRef} src={audioSrc} preload="metadata" />

      <div className="flex items-center gap-2">
        <button
          onClick={onPlayToggle}
          className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 cursor-pointer ${
            isPlaying
              ? "bg-accent-primary text-white"
              : "bg-bg-secondary text-text-primary"
          }`}
        >
          {isPlaying ? (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          {/* eslint-disable react-hooks/refs -- accessing ref in render for waveform display */}
          <WaveformVisualizer
            audioElement={audioRef.current}
            isPlaying={isPlaying}
            height={32}
          />
          {/* eslint-enable react-hooks/refs */}
        </div>

        <span className="text-xs tabular-nums shrink-0 text-text-secondary">
          {isPlaying ? formatTime(currentTime) : formatTime(duration)}
        </span>
      </div>

      <div className="h-0.5 rounded-full overflow-hidden mt-1 bg-border">
        <div
          className="h-full rounded-full bg-accent-primary transition-[width] duration-100 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
