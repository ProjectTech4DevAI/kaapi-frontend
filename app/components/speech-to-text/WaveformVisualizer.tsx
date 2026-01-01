/**
 * WaveformVisualizer Component
 *
 * Real-time audio waveform visualization using Web Audio API
 * Shows animated frequency bars when playing, static bars when paused
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { colors } from '@/app/lib/colors';

interface WaveformVisualizerProps {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  width?: number;
  height?: number;
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

  // Initialize audio context and analyser
  const initAudioContext = useCallback(() => {
    if (!audioElement || isInitialized.current) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64; // Higher = more frequency bins, smoother visualization

      const source = audioContext.createMediaElementSource(audioElement);
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;
      isInitialized.current = true;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }, [audioElement]);

  // Draw waveform visualization
  const drawWaveform = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!isPlaying || !analyserRef.current) {
      // Draw static bars when not playing
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barCount = 16;
      const barWidth = canvas.width / barCount;
      const gap = 2;

      for (let i = 0; i < barCount; i++) {
        const barHeight = 4 + Math.random() * 4;
        ctx.fillStyle = colors.text.secondary;
        ctx.fillRect(i * barWidth + gap / 2, (canvas.height - barHeight) / 2, barWidth - gap, barHeight);
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

        // Gradient from accent to hover
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, colors.accent.primary);
        gradient.addColorStop(1, colors.accent.hover);
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - gap, barHeight);
      }
    };

    draw();
  }, [isPlaying]);

  // Initialize on first play
  useEffect(() => {
    if (isPlaying && !isInitialized.current) {
      initAudioContext();
    }
  }, [isPlaying, initAudioContext]);

  // Resume audio context if suspended
  useEffect(() => {
    if (isPlaying && audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, [isPlaying]);

  // Draw waveform when play state changes
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
      style={{ width: '100%', height: `${height}px` }}
    />
  );
}
