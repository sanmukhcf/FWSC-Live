import React from 'react';

interface ScoreGaugeProps {
  score: number;
  status: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  size?: 'sm' | 'md' | 'lg';
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, status, size = 'md' }) => {
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'Excellent': return '#10B981'; // Emerald
      case 'Good': return '#F29627'; // Brand Orange
      case 'Fair': return '#F59E0B'; // Amber
      case 'Poor': return '#EF4444'; // Red
      case 'Critical': return '#DC2626'; // Dark Red
      default: return '#F29627';
    }
  };

  const color = getStatusColor(status);
  const radius = size === 'lg' ? 64 : size === 'md' ? 48 : 36;
  const stroke = size === 'lg' ? 10 : size === 'md' ? 8 : 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative inline-flex items-center justify-center">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            stroke="#E5E5E5"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Score progress circle */}
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s ease-in-out' }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>

        {/* Center Score Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`font-['Poppins'] font-extrabold text-[#000000] leading-none ${size === 'lg' ? 'text-4xl' : size === 'md' ? 'text-2xl' : 'text-lg'}`}>
            {score}
          </span>
          <span className="text-[10px] text-[#777777] font-semibold uppercase tracking-wider mt-0.5">
            / 100
          </span>
        </div>
      </div>

      <div className="mt-2 text-center">
        <span
          className="inline-block px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider"
          style={{ backgroundColor: `${color}15`, color: color }}
        >
          {status}
        </span>
      </div>
    </div>
  );
};
