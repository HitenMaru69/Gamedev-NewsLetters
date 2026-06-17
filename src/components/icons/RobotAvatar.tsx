import React from "react";

interface RobotAvatarProps {
  className?: string;
  glowColor?: string;
}

export default function RobotAvatar({ className = "w-12 h-12", glowColor = "#22d3ee" }: RobotAvatarProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Modern cyber gradient matching the purple-pink-orange newsletter branding */}
        <linearGradient id="robot-cyber-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="60%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        {/* Glow effect for screen */}
        <radialGradient id="robot-screen-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#09090b" />
        </radialGradient>
        {/* SVG filter for the glowing eyes */}
        <filter id="robot-neon-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Upper Antenna / Receiver */}
      <line x1="24" y1="12" x2="24" y2="5" stroke="url(#robot-cyber-grad)" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="24" cy="4.5" r="3.2" fill="#f59e0b" filter="url(#robot-neon-glow)" />

      {/* Side Ears / Receivers */}
      <rect x="3.5" y="20" width="4.5" height="12" rx="2.25" fill="url(#robot-cyber-grad)" />
      <rect x="40" y="20" width="4.5" height="12" rx="2.25" fill="url(#robot-cyber-grad)" />
      <path d="M4 26h4M40 26h4" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.25" />

      {/* Outer Helmet / Head Frame */}
      <rect
        x="8"
        y="12"
        width="32"
        height="28"
        rx="8"
        fill="#171717"
        stroke="url(#robot-cyber-grad)"
        strokeWidth="2.5"
      />

      {/* Visor / Inner Screen */}
      <rect
        x="12"
        y="16"
        width="24"
        height="18"
        rx="5"
        fill="url(#robot-screen-glow)"
        stroke="#262626"
        strokeWidth="1.5"
      />

      {/* Glowing Neon Eyes */}
      <ellipse cx="18" cy="22.5" rx="2.5" ry="1.5" fill={glowColor} filter="url(#robot-neon-glow)" />
      <ellipse cx="30" cy="22.5" rx="2.5" ry="1.5" fill={glowColor} filter="url(#robot-neon-glow)" />

      {/* Sleek digital smile */}
      <path
        d="M20 28c1 1.2 7 1.2 8 0"
        stroke="url(#robot-cyber-grad)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Subtle Cheek LEDs */}
      <circle cx="14" cy="27.5" r="0.75" fill="#ec4899" />
      <circle cx="34" cy="27.5" r="0.75" fill="#ec4899" />
    </svg>
  );
}
