/**
 * ComingSoon - Reusable component for features under construction
 * Features a coffee brewing theme to match Kaapi branding
 */

"use client"
import { useRouter } from 'next/navigation';
import { colors } from '@/app/lib/colors';

interface ComingSoonProps {
  featureName: string;
  description?: string;
}

export default function ComingSoon({ featureName, description }: ComingSoonProps) {
  const router = useRouter();

  return (
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: colors.bg.secondary }}>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          {/* Coffee Cup Animation */}
          <div className="mb-8 relative inline-block">
            <div
              className="text-8xl animate-bounce"
              style={{
                animationDuration: '2s',
                animationIterationCount: 'infinite'
              }}
            >
              ☕
            </div>
            {/* Steam animation */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4">
              <div
                className="text-3xl opacity-60"
                style={{
                  animation: 'steam 3s ease-in-out infinite'
                }}
              >
                ～
              </div>
            </div>
          </div>

          {/* Main Message */}
          <h1
            className="text-3xl font-bold mb-4"
            style={{
              color: colors.text.primary,
              letterSpacing: '-0.02em'
            }}
          >
            {featureName}
          </h1>

          <div
            className="inline-block px-4 py-2 rounded-full mb-6"
            style={{
              backgroundColor: '#fef3c7',
              borderWidth: '1px',
              borderColor: '#fde68a'
            }}
          >
            <p
              className="text-sm font-semibold"
              style={{ color: '#92400e' }}
            >
              🚧 Being Brewed
            </p>
          </div>

          <p
            className="text-lg mb-8"
            style={{ color: colors.text.secondary }}
          >
            {description || "This feature is currently being crafted with care. Check back soon for something amazing!"}
          </p>

          {/* Fun fact */}
          <div
            className="border rounded-lg p-4 mb-8"
            style={{
              backgroundColor: colors.bg.primary,
              borderColor: colors.border
            }}
          >
            <p
              className="text-xs font-semibold mb-1"
              style={{ color: colors.text.primary }}
            >
              ☕ Kaapi Fact
            </p>
            <p
              className="text-sm"
              style={{ color: colors.text.secondary }}
            >
              Great features, like great coffee, take time to brew to perfection.
            </p>
          </div>

          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="px-6 py-3 rounded-md text-sm font-medium"
            style={{
              backgroundColor: colors.accent.primary,
              color: colors.bg.primary,
              border: 'none',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.accent.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.accent.primary;
            }}
          >
            ← Go Back
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes steam {
          0%, 100% {
            transform: translateY(0) translateX(-50%) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-20px) translateX(-50%) scale(1.5);
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  );
}
