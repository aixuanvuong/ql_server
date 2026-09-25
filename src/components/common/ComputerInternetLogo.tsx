import React from 'react';

interface ComputerInternetLogoProps {
  className?: string;
  size?: number;
}

export const ComputerInternetLogo: React.FC<ComputerInternetLogoProps> = ({
  className = '',
  size = 40
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id="headerCyberCyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8"/>
          <stop offset="50%" stopColor="#06b6d4"/>
          <stop offset="100%" stopColor="#10b981"/>
        </linearGradient>
        <radialGradient id="headerBgGlow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#0f172a"/>
          <stop offset="100%" stopColor="#020617"/>
        </radialGradient>
      </defs>

      {/* Rounded Container */}
      <rect width="512" height="512" rx="112" fill="url(#headerBgGlow)"/>
      <rect width="504" height="504" x="4" y="4" rx="108" stroke="#1e293b" strokeWidth="6"/>

      {/* Internet Grid Orbit Circles */}
      <g opacity="0.45" stroke="url(#headerCyberCyan)" strokeWidth="3">
        <circle cx="256" cy="190" r="142" strokeDasharray="6 6"/>
        <ellipse cx="256" cy="190" rx="142" ry="58"/>
        <ellipse cx="256" cy="190" rx="58" ry="142"/>
      </g>

      {/* Satellite Internet Nodes */}
      <circle cx="130" cy="130" r="10" fill="#38bdf8"/>
      <circle cx="382" cy="130" r="10" fill="#10b981"/>
      <line x1="130" y1="130" x2="180" y2="150" stroke="#38bdf8" strokeWidth="4" strokeDasharray="6 6"/>
      <line x1="382" y1="130" x2="332" y2="150" stroke="#10b981" strokeWidth="4" strokeDasharray="6 6"/>

      {/* Computer Monitor Outer Frame */}
      <rect x="100" y="96" width="312" height="206" rx="20" fill="#0b1120" stroke="url(#headerCyberCyan)" strokeWidth="8"/>

      {/* Computer Screen */}
      <rect x="114" y="110" width="284" height="178" rx="12" fill="#030712"/>

      {/* Realtime Server Pulse Wave */}
      <path
        d="M 124 200 L 165 200 L 180 170 L 198 225 L 218 150 L 238 235 L 258 185 L 278 200 L 388 200"
        stroke="#10b981"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="218" cy="150" r="8" fill="#38bdf8"/>

      {/* Terminal Prompt on Screen */}
      <path d="M 128 145 L 140 155 L 128 165" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="150" y1="165" x2="175" y2="165" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round"/>

      {/* Monitor Stand */}
      <path d="M 234 302 L 222 358 L 290 358 L 278 302 Z" fill="#1e293b" stroke="#334155" strokeWidth="4"/>
      <rect x="180" y="354" width="152" height="16" rx="8" fill="#0f172a" stroke="url(#headerCyberCyan)" strokeWidth="4"/>

      {/* Internet Optical Cable from Computer */}
      <path d="M 256 370 L 256 415" stroke="url(#headerCyberCyan)" strokeWidth="7" strokeLinecap="round"/>

      {/* Internet Global Cloud / Hub Badge */}
      <g transform="translate(216, 400)">
        <circle cx="40" cy="40" r="34" fill="#0b1120" stroke="url(#headerCyberCyan)" strokeWidth="5"/>
        <ellipse cx="40" cy="40" rx="15" ry="34" stroke="#38bdf8" strokeWidth="4"/>
        <line x1="6" y1="40" x2="74" y2="40" stroke="#38bdf8" strokeWidth="4"/>
        <circle cx="40" cy="40" r="7" fill="#10b981"/>
      </g>
    </svg>
  );
};
