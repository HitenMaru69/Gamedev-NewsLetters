import React from "react";

interface EditorAvatarProps {
  className?: string;
}

export default function EditorAvatar({ className = "w-12 h-12" }: EditorAvatarProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Cyber gradient matching the newsletter theme */}
        <linearGradient id="editor-cyber-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="50%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        {/* Shadow for modern depth */}
        <filter id="editor-icon-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#a855f7" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Background shape - a premium hexagonal badge */}
      <path
        d="M24 4L41 14V34L24 44L7 34V14L24 4Z"
        fill="#171717"
        stroke="url(#editor-cyber-grad)"
        strokeWidth="2.5"
        filter="url(#editor-icon-shadow)"
      />

      {/* Cyber Fountain Pen Nib + Game Controller Fusion */}
      <g transform="translate(4, 4)">
        {/* Sleek Game Controller silhouette in the background */}
        <path
          d="M32 12H8a5 5 0 0 0-5 5v3c0 2 1.5 3.5 3 3.5h.5L9 21h4l1.5 2.5c.5.5 1.2 1 2 1h1.5l1.5-2.5H23l2.5 2.5c.8 0 1.5-.5 2-1L29 21h4c1.5 0 3-1.5 3-3.5v-3a5 5 0 0 0-5-5Z"
          fill="#262626"
          stroke="url(#editor-cyber-grad)"
          strokeWidth="1.5"
          strokeOpacity="0.4"
        />

        {/* Elegant Fountain Pen Nib (Forefront) */}
        <path
          d="M20 7.5L12 25.5V31.5H28V25.5L20 7.5Z"
          fill="#1c1917"
          stroke="url(#editor-cyber-grad)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Nib Details: Breather hole and Slit */}
        <circle cx="20" cy="21" r="1.5" fill="url(#editor-cyber-grad)" />
        <line x1="20" y1="21" x2="20" y2="7.5" stroke="url(#editor-cyber-grad)" strokeWidth="1.5" />

        {/* Nib D-pad (Left) */}
        <path d="M15.5 26.5h2.5M16.75 25.25v2.5" stroke="#a3a3a3" strokeWidth="1.2" strokeLinecap="round" />

        {/* Nib Action Buttons (Right) */}
        <circle cx="23" cy="26" r="0.6" fill="#a3a3a3" stroke="none" />
        <circle cx="24.2" cy="27.2" r="0.6" fill="#a3a3a3" stroke="none" />
      </g>
    </svg>
  );
}
