/**
 * ScoreDisplay - Shows summary scores from evaluation results
 * Displays average scores from summary_scores array
 */

"use client"
import React from 'react';
import { ScoreObject } from './types';

interface ScoreDisplayProps {
  score: ScoreObject | null;
  errorMessage?: string | null;
}

export default function ScoreDisplay({ score, errorMessage }: ScoreDisplayProps) {
  // No score available
  if (!score) {
    return (
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm"
        style={{
          backgroundColor: 'hsl(0, 0%, 95%)',
          borderWidth: '1px',
          borderColor: 'hsl(0, 0%, 85%)',
          color: 'hsl(330, 3%, 49%)'
        }}
      >
        <span className="font-medium">Score:</span>
        <span>N/A</span>
        {errorMessage && (
          <span className="text-xs" style={{ color: 'hsl(8, 86%, 40%)' }}>
            (Error)
          </span>
        )}
      </div>
    );
  }

  // Handle score format with summary_scores
  if ('summary_scores' in score) {
    const summaryScores = score.summary_scores || [];

    if (summaryScores.length === 0) {
      return (
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm"
          style={{
            backgroundColor: 'hsl(0, 0%, 95%)',
            borderWidth: '1px',
            borderColor: 'hsl(0, 0%, 85%)',
            color: 'hsl(330, 3%, 49%)'
          }}
        >
          <span className="font-medium">Score:</span>
          <span>No scores available</span>
        </div>
      );
    }

    // Separate numeric and categorical scores
    const numericScores = summaryScores.filter(s => s.data_type === 'NUMERIC');
    const categoricalScores = summaryScores.filter(s => s.data_type === 'CATEGORICAL');

    // If no numeric scores at all, show a message
    if (numericScores.length === 0 && categoricalScores.length === 0) {
      return (
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm"
          style={{
            backgroundColor: 'hsl(0, 0%, 95%)',
            borderWidth: '1px',
            borderColor: 'hsl(0, 0%, 85%)',
            color: 'hsl(330, 3%, 49%)'
          }}
        >
          <span className="font-medium">Score:</span>
          <span>No numeric scores available</span>
        </div>
      );
    }

    // Display each numeric score in its own box
    return (
      <div className="inline-flex items-center gap-3">
        {numericScores.map((summary, idx) => {
          const value = summary.avg !== undefined ? summary.avg.toFixed(2) : 'N/A';
          const std = summary.std !== undefined ? summary.std.toFixed(2) : null;

          return (
            <div
              key={idx}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: '#ffffff',
                borderWidth: '1px',
                borderColor: '#e5e5e5',
                color: '#737373'
              }}
            >
              <span>{summary.name}:</span>
              <span className="font-bold" style={{ color: '#171717' }}>{value}</span>
              {std !== null && (
                <span>±{std}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback for unsupported format
  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm"
      style={{
        backgroundColor: 'hsl(0, 0%, 95%)',
        borderWidth: '1px',
        borderColor: 'hsl(0, 0%, 85%)',
        color: 'hsl(330, 3%, 49%)'
      }}
    >
      <span className="font-medium">Score:</span>
      <span>Unsupported format</span>
    </div>
  );
}
