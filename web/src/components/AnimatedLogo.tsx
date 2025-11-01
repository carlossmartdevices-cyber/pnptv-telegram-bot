import React from 'react';
import './AnimatedLogo.css';

interface AnimatedLogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'light' | 'dark';
  animate?: boolean;
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({
  className = '',
  size = 'medium',
  variant = 'light',
  animate = true
}) => {
  const sizeClasses = {
    small: 'pnptv-logo--small',
    medium: 'pnptv-logo--medium', 
    large: 'pnptv-logo--large'
  };

  const variantClasses = {
    light: 'pnptv-logo--light',
    dark: 'pnptv-logo--dark'
  };

  return (
    <div 
      className={`pnptv-logo ${sizeClasses[size]} ${variantClasses[variant]} ${animate ? 'pnptv-logo--animated' : ''} ${className}`}
    >
      <svg
        viewBox="0 0 800 400"
        className="pnptv-logo__svg"
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
            <rect x="620" y="120" width="40" height="4" className="pnptv-logo__stripe pnptv-logo__stripe--1" />
            <rect x="625" y="140" width="30" height="4" className="pnptv-logo__stripe pnptv-logo__stripe--2" />
            <rect x="630" y="160" width="20" height="4" className="pnptv-logo__stripe pnptv-logo__stripe--3" />
            <rect x="625" y="180" width="30" height="4" className="pnptv-logo__stripe pnptv-logo__stripe--4" />
            <rect x="620" y="200" width="40" height="4" className="pnptv-logo__stripe pnptv-logo__stripe--5" />
            <rect x="625" y="220" width="30" height="4" className="pnptv-logo__stripe pnptv-logo__stripe--6" />
            <rect x="630" y="240" width="20" height="4" className="pnptv-logo__stripe pnptv-logo__stripe--7" />
            <rect x="625" y="260" width="30" height="4" className="pnptv-logo__stripe pnptv-logo__stripe--8" />
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
            <stop offset="0%" stopColor="#6A40A7" className="pnptv-logo__gradient-start" />
            <stop offset="100%" stopColor="#DF00FF" className="pnptv-logo__gradient-end" />
          </linearGradient>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>
    </div>
  );
};

export default AnimatedLogo;