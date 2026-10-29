import React from 'react';

interface ElectricCircuitProps {
  className?: string;
  variant?: 'line' | 'card-border' | 'accent';
}

export const ElectricCircuit: React.FC<ElectricCircuitProps> = ({
  className = '',
  variant = 'line',
}) => {
  if (variant === 'line') {
    return (
      <div className={`relative w-full overflow-hidden h-2.5 pointer-events-none ${className}`} aria-hidden="true">
        {/* Copper conductor base line */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-gradient-to-r from-transparent via-amber-600/40 to-transparent" />

        {/* Pulsing SVG electric current */}
        <svg
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
          viewBox="0 0 1000 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle circuit nodes */}
          <circle cx="200" cy="5" r="2" fill="#f59e0b" opacity="0.6" />
          <circle cx="500" cy="5" r="2.5" fill="#fbbf24" opacity="0.8" />
          <circle cx="800" cy="5" r="2" fill="#f59e0b" opacity="0.6" />

          {/* Flowing electric line */}
          <line
            x1="0"
            y1="5"
            x2="1000"
            y2="5"
            stroke="url(#electricGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            className="electric-trace-line"
          />

          <defs>
            <linearGradient id="electricGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d97706" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#fef08a" stopOpacity="1" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative pointer-events-none ${className}`} aria-hidden="true">
      <div className="absolute inset-0 rounded-2xl border border-amber-400/20 electric-glow" />
    </div>
  );
};
