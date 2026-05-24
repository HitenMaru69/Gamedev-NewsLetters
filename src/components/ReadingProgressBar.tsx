"use client";

import { useEffect, useState } from "react";

export default function ReadingProgressBar() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPosition = window.scrollY;
      if (scrollHeight > 0) {
        setWidth((scrollPosition / scrollHeight) * 100);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-[3px] bg-neutral-950/20 z-50 pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 transition-all duration-75"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
