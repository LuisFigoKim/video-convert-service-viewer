"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  onLog?: (message: string) => void;
  jwtToken?: string;
}

interface BufferedRange {
  start: number;
  end: number;
}

export function VideoPlayer({ src, poster, autoPlay = false, onLog, jwtToken }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [bufferedRanges, setBufferedRanges] = useState<BufferedRange[]>([]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Time update handler
    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(video.currentTime);
      }
    };

    // Duration change handler
    const handleDurationChange = () => {
      setDuration(video.duration);
    };

    // Buffer progress handler
    const handleProgress = () => {
      if (!video.buffered || video.buffered.length === 0) return;

      const ranges: BufferedRange[] = [];
      for (let i = 0; i < video.buffered.length; i++) {
        ranges.push({
          start: video.buffered.start(i),
          end: video.buffered.end(i),
        });
      }
      setBufferedRanges(ranges);
    };

    // Add event listeners
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("loadedmetadata", handleDurationChange);
    video.addEventListener("progress", handleProgress);

    // PerformanceObserver for detailed resource tracking
    let observer: PerformanceObserver | null = null;
    if (typeof PerformanceObserver !== 'undefined') {
      observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();

        for (const entry of entries) {
          // Filter for video segments (.ts files)
          if (entry.entryType === 'resource' && entry.name.includes('.ts')) {
            // Extract path without host
            let path = entry.name;
            try {
              const urlObj = new URL(entry.name);
              path = urlObj.pathname;
            } catch {
              path = entry.name;
            }

            const duration = entry.duration.toFixed(2);
            const dnsTime = ((entry as PerformanceResourceTiming).domainLookupEnd - (entry as PerformanceResourceTiming).domainLookupStart).toFixed(2);

            // onLog?.(`[Performance] ${path} | Duration: ${duration}ms, DNS: ${dnsTime}ms`);
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });
    }

    // Check if HLS is supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        // Buffer configuration for pre-downloading segments
        maxBufferLength: 10, // Buffer up to 10 seconds ahead
        maxMaxBufferLength: 100, // Maximum buffer length (10 minutes)
        maxBufferSize: 10 * 1000 * 1000, // 60 MB buffer size
        maxBufferHole: 0.5, // Maximum gap in buffer (0.5 seconds)
        // Continue buffering even when paused
        backBufferLength: 0, // Keep all buffered data
        liveSyncDurationCount: 3, // For live streams
        liveMaxLatencyDurationCount: Infinity, // No max latency
        // Add JWT Bearer token to all HLS requests (m3u8, playlist, segments)
        xhrSetup: (xhr, url) => {
          if (jwtToken) {
            xhr.setRequestHeader("Authorization", `Bearer ${jwtToken}`);
          }
        },
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        onLog?.(`[HLS] Manifest parsed - Video ready to play`);
        if (autoPlay) {
          video.play().catch((err) => {
            console.error("Auto-play failed:", err);
            setError("Auto-play was prevented. Please click play.");
          });
        }
      });

      // Track segment loading
      hls.on(Hls.Events.FRAG_LOADING, (event, data) => {
        const sn = data.frag.sn;
        const url = data.frag.url || data.frag.relurl || '';
        const level = data.frag.level;

        // Extract path without host
        let path = url;
        try {
          const urlObj = new URL(url);
          path = urlObj.pathname;
        } catch {
          // If URL parsing fails, use the url as is
          path = url;
        }

        onLog?.(`[Loading] Segment #${sn} | ${path}`);
      });

      hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        const sn = data.frag.sn;
        const duration = data.frag.duration.toFixed(2);
        const level = data.frag.level;
        const url = data.frag.url || data.frag.relurl || '';

        // Extract path without host
        let path = url;
        try {
          const urlObj = new URL(url);
          path = urlObj.pathname;
        } catch {
          path = url;
        }

        onLog?.(`[Loaded] Segment #${sn} (${duration}s, Level ${level}) | ${path}`);
      });

      hls.on(Hls.Events.FRAG_BUFFERED, (event, data) => {
        const sn = data.frag.sn;
        onLog?.(`[Buffered] Segment #${sn} - Ready for playback`);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        // console.error("HLS error:", data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError("Network error - failed to load video");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError("Media error - trying to recover");
              hls.recoverMediaError();
              break;
            default:
              setError("Fatal error - cannot play video");
              hls.destroy();
              break;
          }
        }
      });

      return () => {
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("durationchange", handleDurationChange);
        video.removeEventListener("loadedmetadata", handleDurationChange);
        video.removeEventListener("progress", handleProgress);
        observer?.disconnect();
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS support (Safari)
      video.src = src;
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        if (autoPlay) {
          video.play().catch((err) => {
            console.error("Auto-play failed:", err);
            setError("Auto-play was prevented. Please click play.");
          });
        }
      });

      return () => {
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("durationchange", handleDurationChange);
        video.removeEventListener("loadedmetadata", handleDurationChange);
        video.removeEventListener("progress", handleProgress);
        observer?.disconnect();
      };
    } else {
      setError("HLS is not supported in this browser");
      setIsLoading(false);

      return () => {
        observer?.disconnect();
      };
    }
  }, [src, autoPlay, isDragging, onLog, jwtToken]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  };

  // Format time in MM:SS format
  const formatTime = (timeInSeconds: number): string => {
    if (!isFinite(timeInSeconds)) return "0:00";

    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Handle progress bar click/drag
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const progressBar = progressBarRef.current;
    if (!video || !progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * duration;

    video.currentTime = newTime;
    setCurrentTime(newTime);
    if(isPlaying) {
        video.play();
    } else {
        video.pause();
    }
  };

  const handleProgressMouseDown = () => {
    setIsDragging(true);
  };

  const handleProgressMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardContent className="p-0">
        <div className="relative group">
          {/* Video Element */}
          <video
            ref={videoRef}
            className="w-full aspect-video bg-black"
            poster={poster}
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-white text-lg">Loading video...</div>
            </div>
          )}

          {/* Error Overlay */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-red-500 text-center p-4">
                <p className="font-semibold mb-2">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Video Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Progress Bar */}
            <div className="mb-3">
              <div
                ref={progressBarRef}
                className="relative h-1 bg-white/30 rounded-full cursor-pointer group/progress"
                onClick={handleProgressClick}
                onMouseDown={handleProgressMouseDown}
                onMouseUp={handleProgressMouseUp}
              >
                {/* Buffered Segments */}
                {duration > 0 && bufferedRanges.map((range, index) => (
                  <div
                    key={index}
                    className="absolute top-0 h-full bg-white/50 rounded-full"
                    style={{
                      left: `${(range.start / duration) * 100}%`,
                      width: `${((range.end - range.start) / duration) * 100}%`,
                    }}
                  />
                ))}
                {/* Progress */}
                <div
                  className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
                {/* Progress Handle */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"
                  style={{ left: `${(currentTime / duration) * 100}%`, marginLeft: '-6px' }}
                />
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>

              {/* Time Display */}
              <div className="text-white text-sm font-medium">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              <div className="flex-1" />

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
              >
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
