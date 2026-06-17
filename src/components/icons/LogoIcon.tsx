import React from "react";

interface LogoIconProps {
  className?: string;
}

export default function LogoIcon({ className = "w-5 h-5" }: LogoIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Futuristic Game Controller Silhouette */}
      <path d="M18 6H6a4 4 0 0 0-4 4v3.5a4.5 4.5 0 0 0 4.5 4.5h.5c1.5 0 2.5-1 3-2.5L11 12h2l1 3.5c.5 1.5 1.5 2.5 3 2.5h.5a4.5 4.5 0 0 0 4.5-4.5V10a4 4 0 0 0-4-4Z" />
      
      {/* Left D-pad (combining game aesthetics) */}
      <path d="M6 12h2M7 11v2" strokeWidth="1.8" />
      
      {/* Right Action Buttons */}
      <circle cx="15.5" cy="11.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="17.2" cy="12.8" r="0.8" fill="currentColor" stroke="none" />
      
      {/* Symmetrical AI Neural brain network in the center */}
      <path d="M12 7.5v2.8" strokeWidth="1.5" />
      <path d="M12 7.5c-0.8-0.8-1.8-0.4-1.8 0.6s1 1.2 1.8 1.6" strokeWidth="1.2" />
      <path d="M12 7.5c0.8-0.8 1.8-0.4 1.8 0.6s-1 1.2-1.8 1.6" strokeWidth="1.2" />
      
      {/* Connected Neural Nodes */}
      <circle cx="12" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="9.6" cy="8.2" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="14.4" cy="8.2" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}
