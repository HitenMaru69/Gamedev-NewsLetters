"use client";

import { useEffect, useState, useRef, useMemo } from "react";

interface ArticleReaderProps {
  content: string;
}

// Helper to strip markdown formatting and keep only speakable text
function cleanMarkdownForSpeech(markdown: string): string {
  if (!markdown) return "";
  
  return markdown
    // 1. Remove code blocks completely (reading code aloud is jarring)
    .replace(/```[\s\S]*?```/g, "")
    // 2. Remove inline code backticks but keep the code text
    .replace(/`([^`]+)`/g, "$1")
    // 3. Remove image syntax ![alt](url)
    .replace(/!\[([^\]]*)\]\([^\)]+\)/g, "")
    // 4. Convert links [anchor text](url) to just the anchor text
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    // 5. Remove headers markup (e.g. #, ##, etc.)
    .replace(/#+\s+/g, "")
    // 6. Remove HTML tags if any (e.g., <br />)
    .replace(/<[^>]*>/g, "")
    // 7. Remove bold / italic symbols
    .replace(/\*\*|__/g, "")
    .replace(/\*|_/g, "")
    // 8. Remove blockquote symbols
    .replace(/^\s*>\s+/gm, "")
    // 9. Remove list indicators (e.g., - item or * item)
    .replace(/^\s*[-\*+]\s+/gm, "")
    // 10. Remove ordered list numbers
    .replace(/^\s*\d+\.\s+/gm, "")
    // 11. Normalize multiple spaces/newlines
    .replace(/\s+/g, " ")
    .trim();
}

export default function ArticleReader({ content }: ArticleReaderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [voice, setVoice] = useState<"en-US-AndrewNeural" | "en-US-EmmaMultilingualNeural">("en-US-AndrewNeural");
  const [rate, setRate] = useState(1); // Playback speed: 0.75, 1, 1.25, 1.5, 1.75, 2
  const [progress, setProgress] = useState(0); // 0 to 100
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Clean the text once
  const cleanedText = useMemo(() => {
    return cleanMarkdownForSpeech(content);
  }, [content]);

  // Audio setup and event listeners
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const onCanPlay = () => {
      setIsLoading(false);
    };

    const onWaiting = () => {
      setIsLoading(true);
    };

    const onPlaying = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    const onError = (e: Event) => {
      console.error("HTML Audio error event:", e);
      setIsLoading(false);
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audioRef.current = null;
    };
  }, []);

  // Sync playback speed rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, [rate]);

  // Sync voice changes mid-stream
  useEffect(() => {
    if (audioRef.current && isPlaying) {
      setIsLoading(true);
      const isCurrentlyPlaying = !audioRef.current.paused;
      
      audioRef.current.src = `/api/tts?voice=${voice}&text=${encodeURIComponent(cleanedText)}`;
      audioRef.current.load();
      audioRef.current.playbackRate = rate;
      
      if (isCurrentlyPlaying) {
        audioRef.current.play().catch((err) => {
          console.error("Audio playback recovery error:", err);
          setIsPlaying(false);
        });
      }
    }
  }, [voice, cleanedText]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current.src || audioRef.current.src === "") {
        setIsLoading(true);
        audioRef.current.src = `/api/tts?voice=${voice}&text=${encodeURIComponent(cleanedText)}`;
        audioRef.current.load();
      }
      
      audioRef.current.playbackRate = rate;
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error("Audio playback error:", err);
          setIsPlaying(false);
          setIsLoading(false);
        });
    }
  };

  const handleStop = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setIsLoading(false);
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    audioRef.current.currentTime = percentage * duration;
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || !isFinite(timeInSeconds)) return "0:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  if (!cleanedText) return null;

  return (
    <div className="w-full rounded-2xl bg-neutral-900/40 border border-neutral-800/80 backdrop-blur-md p-4 sm:p-5 flex flex-col gap-4 transition-all duration-300 hover:border-purple-500/20 relative overflow-hidden">
      {/* Background glow when active */}
      {isPlaying && !isLoading && (
        <div className="absolute inset-0 bg-purple-500/5 animate-pulse pointer-events-none" />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10">
        
        {/* Playback Controls & Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayPause}
            disabled={isLoading && !isPlaying}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
              isPlaying
                ? "bg-purple-600 hover:bg-purple-500 text-neutral-50 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
            } disabled:opacity-75`}
            title={isPlaying ? "Pause" : "Listen to post"}
            aria-label={isPlaying ? "Pause" : "Listen to post"}
          >
            {isLoading && !isPlaying ? (
              // Loading Spinner
              <svg className="w-4 h-4 text-neutral-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : isPlaying ? (
              // Pause Icon
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <rect x="4" y="4" width="4" height="16" rx="1" />
                <rect x="16" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              // Play Icon
              <svg className="w-4 h-4 fill-current translate-x-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {isPlaying && (
            <button
              onClick={handleStop}
              className="w-9 h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors focus:outline-none"
              title="Stop"
              aria-label="Stop"
            >
              {/* Stop Icon */}
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
            </button>
          )}

          {/* Readout Status Description */}
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
              {isLoading ? (
                "Buffering..."
              ) : isPlaying ? (
                "Listening"
              ) : (
                "Listen to this Edition"
              )}
              {isPlaying && !isLoading && (
                // Sound wave visualizer
                <span className="flex items-end gap-[2px] h-3 w-4 mb-0.5">
                  <span className="w-[2px] bg-purple-500 rounded-full animate-bounce h-2.5" style={{ animationDelay: '0.1s', animationDuration: '0.7s' }} />
                  <span className="w-[2px] bg-pink-500 rounded-full animate-bounce h-3.5" style={{ animationDelay: '0.3s', animationDuration: '0.5s' }} />
                  <span className="w-[2px] bg-amber-400 rounded-full animate-bounce h-1.5" style={{ animationDelay: '0.2s', animationDuration: '0.6s' }} />
                </span>
              )}
            </span>
            <span className="text-3xs uppercase tracking-wider text-neutral-500 font-bold mt-0.5">
              {isPlaying 
                ? `${formatTime(currentTime)} / ${formatTime(duration)}`
                : "Premium Neural Audio"}
            </span>
          </div>
        </div>

        {/* Configurations */}
        <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
          {/* Gender voice selector (Emma Neural vs Andrew Neural) */}
          <div className="flex bg-neutral-950/80 p-0.5 rounded-lg border border-neutral-800/80 text-2xs font-semibold text-neutral-400">
            <button
              onClick={() => setVoice("en-US-EmmaMultilingualNeural")}
              className={`px-3 py-1 rounded-md transition-all ${
                voice === "en-US-EmmaMultilingualNeural" 
                  ? "bg-purple-950/40 text-purple-400 font-bold border border-purple-900/30" 
                  : "hover:text-neutral-300"
              }`}
            >
              Emma (Female)
            </button>
            <button
              onClick={() => setVoice("en-US-AndrewNeural")}
              className={`px-3 py-1 rounded-md transition-all ${
                voice === "en-US-AndrewNeural" 
                  ? "bg-purple-950/40 text-purple-400 font-bold border border-purple-900/30" 
                  : "hover:text-neutral-300"
              }`}
            >
              Andrew (Male)
            </button>
          </div>

          {/* Playback speed selector */}
          <div className="flex items-center gap-1">
            <span className="text-3xs uppercase tracking-widest text-neutral-600 font-bold mr-1 sm:block hidden">Speed</span>
            <select
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="bg-neutral-950/80 border border-neutral-800/80 rounded-lg px-2 py-1 text-2xs font-semibold text-neutral-300 hover:border-neutral-700 focus:outline-none"
            >
              <option value={0.75}>0.75x</option>
              <option value={1}>1.0x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={1.75}>1.75x</option>
              <option value={2}>2.0x</option>
            </select>
          </div>
        </div>

      </div>

      {/* Seekable Progress Bar */}
      <div 
        ref={progressBarRef}
        onClick={handleProgressBarClick}
        className="w-full h-1.5 bg-neutral-950 hover:h-2 rounded-full overflow-hidden mt-1 z-10 cursor-pointer transition-all relative"
        title="Seek audio"
      >
        <div 
          className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 transition-all duration-75 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
