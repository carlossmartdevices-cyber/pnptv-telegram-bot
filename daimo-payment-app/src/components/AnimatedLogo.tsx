import React from 'react';

interface AnimatedLogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'light' | 'dark' | 'brand';
  animate?: boolean;
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({
  className = '',
  size = 'medium',
  variant = 'light',
  animate = true
}) => {
  const sizeClasses = {
    small: 'w-32 h-16',
    medium: 'w-48 h-24', 
    large: 'w-64 h-32'
  };

  const colorClasses = {
    light: 'text-white',
    dark: 'text-gray-800',
    brand: 'text-purple-600'
  };

  return (
    <div className={`inline-block relative ${sizeClasses[size]} ${colorClasses[variant]} ${className}`}>
      <style jsx>{`
        .pnptv-logo__letter {
          opacity: 0;
          transform: translateY(20px);
        }

        .pnptv-logo__path {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          filter: drop-shadow(0 0 8px rgba(223, 0, 255, 0.3));
        }

        ${animate ? `
        .pnptv-logo--animated .pnptv-logo__letter {
          animation: letterFadeIn 1s ease-out forwards;
        }

        .pnptv-logo--animated .pnptv-logo__path {
          animation: pathDraw 2s ease-out forwards;
        }

        .pnptv-logo--animated .pnptv-logo__letter--1 { animation-delay: 0.2s; }
        .pnptv-logo--animated .pnptv-logo__letter--1 .pnptv-logo__path { animation-delay: 0.3s; }
        .pnptv-logo--animated .pnptv-logo__letter--2 { animation-delay: 0.4s; }
        .pnptv-logo--animated .pnptv-logo__letter--2 .pnptv-logo__path { animation-delay: 0.5s; }
        .pnptv-logo--animated .pnptv-logo__letter--3 { animation-delay: 0.6s; }
        .pnptv-logo--animated .pnptv-logo__letter--3 .pnptv-logo__path { animation-delay: 0.7s; }
        .pnptv-logo--animated .pnptv-logo__letter--4 { animation-delay: 0.8s; }
        .pnptv-logo--animated .pnptv-logo__letter--4 .pnptv-logo__path { animation-delay: 0.9s; }
        .pnptv-logo--animated .pnptv-logo__letter--5 { animation-delay: 1.0s; }
        .pnptv-logo--animated .pnptv-logo__letter--5 .pnptv-logo__path { animation-delay: 1.1s; }

        .pnptv-logo__exclamation {
          opacity: 0;
          transform: scale(0);
        }

        .pnptv-logo--animated .pnptv-logo__exclamation {
          animation: exclamationPop 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) 1.5s forwards;
        }

        .pnptv-logo--animated .pnptv-logo__dot {
          animation: dotPulse 2s ease-in-out 2s infinite;
        }

        .pnptv-logo__stripe {
          opacity: 0;
          transform: scaleX(0);
          transform-origin: center;
        }

        .pnptv-logo--animated .pnptv-logo__stripe {
          animation: stripeExpand 0.6s ease-out forwards;
        }

        .pnptv-logo--animated .pnptv-logo__stripe--1 { animation-delay: 1.2s; }
        .pnptv-logo--animated .pnptv-logo__stripe--2 { animation-delay: 1.25s; }
        .pnptv-logo--animated .pnptv-logo__stripe--3 { animation-delay: 1.3s; }
        .pnptv-logo--animated .pnptv-logo__stripe--4 { animation-delay: 1.35s; }
        .pnptv-logo--animated .pnptv-logo__stripe--5 { animation-delay: 1.4s; }
        .pnptv-logo--animated .pnptv-logo__stripe--6 { animation-delay: 1.45s; }
        .pnptv-logo--animated .pnptv-logo__stripe--7 { animation-delay: 1.5s; }
        .pnptv-logo--animated .pnptv-logo__stripe--8 { animation-delay: 1.55s; }

        .pnptv-logo__path--v {
          stroke: url(#pnptv-gradient);
        }

        .pnptv-logo--animated .pnptv-logo__path--v {
          animation: pathDrawGradient 2s ease-out 1.1s forwards, gradientShift 3s ease-in-out 3s infinite;
        }
        ` : ''}

        @keyframes letterFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pathDraw {
          from { stroke-dashoffset: 1000; }
          to { stroke-dashoffset: 0; }
        }

        @keyframes pathDrawGradient {
          from { stroke-dashoffset: 1000; }
          to { stroke-dashoffset: 0; }
        }

        @keyframes exclamationPop {
          from { opacity: 0; transform: scale(0); }
          60% { transform: scale(1.2); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes dotPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }

        @keyframes stripeExpand {
          from { opacity: 0; transform: scaleX(0); }
          to { opacity: 1; transform: scaleX(1); }
        }

        @keyframes gradientShift {
          0%, 100% { filter: hue-rotate(0deg); }
          50% { filter: hue-rotate(30deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .pnptv-logo--animated .pnptv-logo__letter,
          .pnptv-logo--animated .pnptv-logo__path,
          .pnptv-logo--animated .pnptv-logo__exclamation,
          .pnptv-logo--animated .pnptv-logo__stripe,
          .pnptv-logo--animated .pnptv-logo__dot {
            animation: none;
          }
          
          .pnptv-logo__letter { opacity: 1; transform: translateY(0); }
          .pnptv-logo__path { stroke-dasharray: none; stroke-dashoffset: 0; }
          .pnptv-logo__exclamation { opacity: 1; transform: scale(1); }
          .pnptv-logo__stripe { opacity: 1; transform: scaleX(1); }
        }
      `}</style>
      
      <div className={animate ? 'pnptv-logo--animated' : ''}>
        <svg
          viewBox="0 0 800 400"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Letter P (First) */}
          <g className="pnptv-logo__letter pnptv-logo__letter--1">
            <path
              d="M 40 80 L 40 320 M 40 80 L 140 80 Q 190 80 190 130 Q 190 180 140 180 L 40 180"
              fill="none"
              stroke="currentColor"
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pnptv-logo__path"
            />
          </g>

          {/* Letter N */}
          <g className="pnptv-logo__letter pnptv-logo__letter--2">
            <path
              d="M 230 80 L 230 320 M 230 80 L 330 320 M 330 80 L 330 320"
              fill="none"
              stroke="currentColor"
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pnptv-logo__path"
            />
          </g>

          {/* Letter P (Second) */}
          <g className="pnptv-logo__letter pnptv-logo__letter--3">
            <path
              d="M 370 80 L 370 320 M 370 80 L 470 80 Q 520 80 520 130 Q 520 180 470 180 L 370 180"
              fill="none"
              stroke="currentColor"
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pnptv-logo__path"
            />
          </g>

          {/* Letter T with animated striping */}
          <g className="pnptv-logo__letter pnptv-logo__letter--4">
            <path
              d="M 560 80 L 720 80 M 640 80 L 640 320"
              fill="none"
              stroke="currentColor"
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pnptv-logo__path"
            />
            {/* Animated stripes for the T */}
            <g className="pnptv-logo__stripes">
              <rect x="620" y="120" width="40" height="4" fill="currentColor" className="pnptv-logo__stripe pnptv-logo__stripe--1" />
              <rect x="625" y="140" width="30" height="4" fill="currentColor" className="pnptv-logo__stripe pnptv-logo__stripe--2" />
              <rect x="630" y="160" width="20" height="4" fill="currentColor" className="pnptv-logo__stripe pnptv-logo__stripe--3" />
              <rect x="625" y="180" width="30" height="4" fill="currentColor" className="pnptv-logo__stripe pnptv-logo__stripe--4" />
              <rect x="620" y="200" width="40" height="4" fill="currentColor" className="pnptv-logo__stripe pnptv-logo__stripe--5" />
              <rect x="625" y="220" width="30" height="4" fill="currentColor" className="pnptv-logo__stripe pnptv-logo__stripe--6" />
              <rect x="630" y="240" width="20" height="4" fill="currentColor" className="pnptv-logo__stripe pnptv-logo__stripe--7" />
              <rect x="625" y="260" width="30" height="4" fill="currentColor" className="pnptv-logo__stripe pnptv-logo__stripe--8" />
            </g>
          </g>

          {/* Letter V with gradient effect */}
          <g className="pnptv-logo__letter pnptv-logo__letter--5">
            <path
              d="M 760 80 L 820 320 M 880 80 L 820 320"
              fill="none"
              stroke="currentColor"
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pnptv-logo__path pnptv-logo__path--v"
            />
          </g>

          {/* Exclamation mark */}
          <g className="pnptv-logo__exclamation">
            <circle
              cx="920"
              cy="290"
              r="12"
              fill="currentColor"
              className="pnptv-logo__dot"
            />
            <path
              d="M 920 80 L 920 240"
              fill="none"
              stroke="currentColor"
              strokeWidth="24"
              strokeLinecap="round"
              className="pnptv-logo__exclamation-line"
            />
          </g>

          {/* Gradient definitions */}
          <defs>
            <linearGradient id="pnptv-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6A40A7" />
              <stop offset="100%" stopColor="#DF00FF" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};

export default AnimatedLogo;