/**
 * Loader - Reusable circular loader component
 * Matches the design system with smooth animations
 */

import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullScreen?: boolean;
}

export default function Loader({ size = 'md', message, fullScreen = false }: LoaderProps) {
  const sizeMap = {
    sm: 20,
    md: 32,
    lg: 48,
  };

  const spinnerSize = sizeMap[size];

  const loaderContent = (
    <div className="flex flex-col items-center justify-center gap-3">
      {/* Circular Spinner */}
      <div
        style={{
          width: `${spinnerSize}px`,
          height: `${spinnerSize}px`,
          border: '3px solid #e5e5e5',
          borderTopColor: '#171717',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      {/* Message */}
      {message && (
        <p
          className="text-sm font-medium"
          style={{
            color: '#737373',
          }}
        >
          {message}
        </p>
      )}
      {/* CSS Animation */}
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="w-full h-screen flex items-center justify-center"
        style={{ backgroundColor: '#fafafa' }}
      >
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
}

/**
 * LoaderBox - Loader inside a bordered container
 */
export function LoaderBox({ message, size = 'md' }: { message?: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div
      className="border rounded-lg p-8 text-center"
      style={{
        backgroundColor: '#ffffff',
        borderColor: '#e5e5e5',
      }}
    >
      <Loader size={size} message={message} />
    </div>
  );
}
