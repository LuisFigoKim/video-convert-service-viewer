"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { VideoPlayer } from "@/components/video-player";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, AlertCircle, Loader2 } from "lucide-react";

export default function Home() {
  // Default demo HLS stream URL
  const defaultUrl = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

  const [inputUrl, setInputUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState(defaultUrl);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const [isValidating, setIsValidating] = useState(false);

  // Validate if URL returns valid M3U8 content
  const validateHlsUrl = async (url: string): Promise<{ valid: boolean; error?: string }> => {
    if (!url || url.trim() === "") {
      return { valid: false, error: "URL is empty" };
    }

    try {
      new URL(url); // Validate URL format
    } catch {
      return { valid: false, error: "Invalid URL format" };
    }

    try {
      const response = await fetch(url, { method: "GET" });

      if (!response.ok) {
        return { valid: false, error: `HTTP error: ${response.status}` };
      }

      const contentType = response.headers.get("content-type") || "";
      const validContentTypes = [
        "application/octet-stream",
        "application/vnd.apple.mpegurl",
        "application/x-mpegurl",
        "audio/mpegurl",
        "audio/x-mpegurl",
      ];

      const isValidContentType = validContentTypes.some(type =>
        contentType.toLowerCase().includes(type.toLowerCase())
      );

      if (!isValidContentType) {
        return {
          valid: false,
          error: `Invalid content-type: ${contentType}. Expected application/octet-stream or HLS mime type`
        };
      }

      const text = await response.text();

      // Check if content starts with #EXTM3U (M3U8 header)
      if (!text.trim().startsWith("#EXTM3U")) {
        return { valid: false, error: "Response is not a valid M3U8 playlist (missing #EXTM3U header)" };
      }

      return { valid: true };
    } catch (err) {
      return { valid: false, error: `Failed to fetch URL: ${err instanceof Error ? err.message : "Unknown error"}` };
    }
  };

  const handleLoadVideo = async () => {
    setError(null);
    setIsValidating(true);

    if (!inputUrl.trim()) {
      setError("Please enter a URL");
      setIsValidating(false);
      return;
    }

    const result = await validateHlsUrl(inputUrl);

    if (!result.valid) {
      setError(result.error || "Invalid HLS URL");
      setIsValidating(false);
      return;
    }

    // Valid HLS URL - load the video
    setVideoUrl(inputUrl);
    setError(null);
    setIsValidating(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleLoadVideo();
    }
  };

  const handleLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  const clearLogs = () => {
    setLogs([]);
  };

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Luis Video Player Demo
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            HLS Video Player with adaptive streaming
          </p>
        </div>

        {/* URL Input Card */}
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Load HLS Video</CardTitle>
              <CardDescription>
                Enter an HLS stream URL (.m3u8) to play
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    type="url"
                    placeholder="https://example.com/video.m3u8"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className={error ? "border-red-500" : ""}
                  />
                  {error && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-red-500">
                      <AlertCircle className="h-4 w-4" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
                <Button onClick={handleLoadVideo} disabled={isValidating} className="sm:w-auto">
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {isValidating ? "Validating..." : "Load Video"}
                </Button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Current URL:</strong>{" "}
                  <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-xs break-all">
                    {videoUrl}
                  </code>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Video Player */}
        <VideoPlayer key={videoUrl} src={videoUrl} onLog={handleLog} />

        {/* Segment Loading Console */}
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Segment Loading Console</CardTitle>
                  <CardDescription>
                    Real-time HLS segment download tracking
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={clearLogs}>
                  Clear Logs
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-black rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
                {logs.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    Waiting for video to load... Segments will appear here.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {logs.map((log, index) => (
                      <div
                        key={index}
                        className={`${
                          log.includes("[Loading]")
                            ? "text-yellow-400"
                            : log.includes("[Loaded]")
                            ? "text-green-400"
                            : log.includes("[Buffered]")
                            ? "text-blue-400"
                            : log.includes("[HLS]")
                            ? "text-purple-400"
                            : log.includes("[Performance]")
                            ? "text-cyan-400"
                            : "text-gray-300"
                        }`}
                      >
                        {log}
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                )}
              </div>
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  <strong>Legend:</strong>{" "}
                  <span className="text-purple-600">HLS Init</span> |{" "}
                  <span className="text-yellow-600">Loading</span> →{" "}
                  <span className="text-green-600">Loaded</span> →{" "}
                  <span className="text-blue-600">Buffered</span> |{" "}
                  <span className="text-cyan-600">Performance</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
