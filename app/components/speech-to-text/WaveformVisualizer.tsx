/**
 * WaveformVisualizer Component
 *
 * Real-time audio waveform visualization using Web Audio API.
 * Shows animated frequency bars when playing, static bars when paused.
 */

import { useRef, useEffect, useCallback } from "react";

interface WaveformVisualizerProps {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  width?: number;
  height?: number;
}

// Canvas requires literal color strings, so we resolve theme tokens from CSS
// variables at draw time. This keeps the waveform in sync with theme changes.
function readThemeColors<K extends string>(
  entries: Record<K, string>,
): Record<K, string> {
  const result = { ...entries };
  if (typeof window === "undefined") return result;
  const styles = getComputedStyle(document.documentElement);
  (Object.keys(entries) as K[]).forEach((name) => {
    const value = styles.getPropertyValue(name).trim();
    if (value) result[name] = value;
  });
  return result;
}

export default function WaveformVisualizer({
  audioElement,
  isPlaying,
  width = 200,
  height = 32,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const isInitialized = useRef(false);

  const initAudioContext = useCallback(() => {
    if (!audioElement || isInitialized.current) return;

    try {
      const AudioContextClass =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;

      const source = audioContext.createMediaElementSource(audioElement);
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;
      isInitialized.current = true;
    } catch (error) {
      console.error("Failed to initialize audio context:", error);
    }
  }, [audioElement]);

  const drawWaveform = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const {
      "--color-border": borderColor,
      "--color-accent-primary": accentPrimary,
      "--color-accent-hover": accentHover,
    } = readThemeColors({
      "--color-border": "#e5e5e5",
      "--color-accent-primary": "#1f4496",
      "--color-accent-hover": "#173574",
    });

    if (!isPlaying || !analyserRef.current) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barCount = 40;
      const barWidth = canvas.width / barCount;
      const gap = 2;

      for (let i = 0; i < barCount; i++) {
        const wavePhase = (i / barCount) * Math.PI * 2;
        const waveHeight = Math.sin(wavePhase) * 0.5 + 0.5;
        const barHeight = 3 + waveHeight * (canvas.height * 0.6);

        ctx.fillStyle = borderColor;
        ctx.fillRect(
          i * barWidth + gap / 2,
          (canvas.height - barHeight) / 2,
          barWidth - gap,
          barHeight,
        );
      }
      return;
    }

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isPlaying) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        return;
      }

      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / bufferLength;
      const gap = 1;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        const x = i * barWidth + gap / 2;
        const y = (canvas.height - barHeight) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, accentPrimary);
        gradient.addColorStop(1, accentHover);
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - gap, barHeight);
      }
    };

    draw();
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying && !isInitialized.current) {
      initAudioContext();
    }
  }, [isPlaying, initAudioContext]);

  useEffect(() => {
    if (isPlaying && audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume();
    }
  }, [isPlaying]);

  useEffect(() => {
    drawWaveform();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, drawWaveform]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      // Canvas needs an intrinsic height; CSS scales the bitmap to container width.
      style={{ width: "100%", height: `${height}px` }}
    />
  );
}
