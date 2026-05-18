"use client";

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Play, Pause, Volume2, VolumeX, Download, Subtitles, Loader2 } from 'lucide-react';
import { Progress } from './ui/progress';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getVideoCaptions, dubVideo } from '@/lib/api';

type VideoPlayerProps = {
  videoUrl?: string; // URL to video file (if available)
  originalVideoUrl?: string; // URL to original video
  dubbedVideoUrl?: string; // URL to dubbed video
  videoFile?: File; // Video file object (if available)
  captions?: Array<{
    text: string;
    start: number;
    end: number;
    duration: number;
  }>;
  captionsSrt?: string;
  captionsVtt?: string;
  title?: string;
  showControls?: boolean;
  documentId?: string; // Document ID for on-demand loading
  onOperationChange?: (operation: 'none' | 'dubbing' | 'captions') => void;
};

export function VideoPlayer({
  videoUrl,
  originalVideoUrl,
  dubbedVideoUrl,
  videoFile,
  captions = [],
  captionsSrt,
  captionsVtt,
  title,
  showControls = true,
  documentId,
  onOperationChange,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false);
  const [currentCaption, setCurrentCaption] = useState<string>('');
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);
  const [videoMode, setVideoMode] = useState<'original' | 'dubbed'>('original');
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // On-demand loading states
  const [loadedCaptions, setLoadedCaptions] = useState(captions);
  const [loadedCaptionsSrt, setLoadedCaptionsSrt] = useState(captionsSrt);
  const [loadedCaptionsVtt, setLoadedCaptionsVtt] = useState(captionsVtt);
  const [loadedDubbedUrl, setLoadedDubbedUrl] = useState(dubbedVideoUrl);
  const [loadingCaptions, setLoadingCaptions] = useState(false);
  const [loadingDub, setLoadingDub] = useState(false);
  const [dubProgress, setDubProgress] = useState(0);
  const [captionProgress, setCaptionProgress] = useState(0);
  const [operationInProgress, setOperationInProgress] = useState<'none' | 'dubbing' | 'captions'>('none');

  // Notify parent of operation status
  useEffect(() => {
    onOperationChange?.(operationInProgress);
  }, [operationInProgress, onOperationChange]);

  // Set default mode to dubbed if available
  useEffect(() => {
    if (dubbedVideoUrl) {
      setVideoMode('dubbed');
    }
  }, [dubbedVideoUrl]);

  // Create object URL from file if provided
  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [videoFile]);

  // Get auth token for video requests
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  };

  // Determine video source based on mode
  const getVideoSource = () => {
    if (videoFile) {
      return videoObjectUrl;
    }
    if (videoUrl) {
      return videoUrl;
    }
    // Use API base URL for server videos
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const token = getAuthToken();
    
    // Helper to construct URL with token
    const constructUrl = (url: string | undefined) => {
      if (!url) return null;
      // If URL is already absolute, use it as is
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return token ? `${url}${url.includes('?') ? '&' : '?'}token=${token}` : url;
      }
      // If URL is relative, prepend API base URL
      const baseUrl = url.startsWith('/') ? `${API_BASE_URL}${url}` : `${API_BASE_URL}/${url}`;
      return token ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}token=${token}` : baseUrl;
    };
    
    // If dubbed mode is selected and dubbed video exists, use it
    if (videoMode === 'dubbed' && (loadedDubbedUrl || dubbedVideoUrl)) {
      return constructUrl(loadedDubbedUrl || dubbedVideoUrl);
    }
    // If original mode or dubbed not available, use original
    if (originalVideoUrl) {
      return constructUrl(originalVideoUrl);
    }
    return null;
  };

  const videoSource = getVideoSource();

  // Update video source when mode changes
  useEffect(() => {
    if (videoRef.current && videoSource) {
      setIsLoading(true);
      setVideoError(null);
      // Reset caption when switching videos
      setCurrentCaption('');
      const currentTime = videoRef.current.currentTime || 0;
      const wasPlaying = !videoRef.current.paused;
      videoRef.current.pause();
      videoRef.current.src = videoSource;
      videoRef.current.load();
      
      // Restore position and play state after video loads
      const handleLoadedMetadata = () => {
        if (videoRef.current) {
          setIsLoading(false);
          const newTime = Math.min(currentTime, videoRef.current.duration);
          videoRef.current.currentTime = newTime;
          // Update caption immediately after seeking
          if (showCaptions && loadedCaptions.length > 0) {
            const caption = loadedCaptions.find(
              (cap) => newTime >= (cap.start - 0.1) && newTime <= (cap.end + 0.1)
            );
            setCurrentCaption(caption?.text || '');
          }
          if (wasPlaying) {
            videoRef.current.play().catch(() => {});
          }
        }
      };
      
      const handleError = () => {
        setIsLoading(false);
        if (videoRef.current) {
          const error = videoRef.current.error;
          if (error) {
            let errorMessage = 'Failed to load video. ';
            switch (error.code) {
              case error.MEDIA_ERR_ABORTED:
                errorMessage += 'Video loading was aborted.';
                break;
              case error.MEDIA_ERR_NETWORK:
                errorMessage += 'Network error occurred. Please check your connection.';
                break;
              case error.MEDIA_ERR_DECODE:
                errorMessage += 'Video decoding error. The file may be corrupted.';
                break;
              case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage += 'Video format not supported or file not found.';
                break;
              default:
                errorMessage += 'Unknown error occurred.';
            }
            setVideoError(errorMessage);
          } else {
            setVideoError('Failed to load video. The file may not be available.');
          }
        }
      };
      
      videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
      videoRef.current.addEventListener('error', handleError, { once: true });
      
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
          videoRef.current.removeEventListener('error', handleError);
        }
      };
    }
  }, [videoSource, videoMode]);

  // Load captions on-demand
  const handleLoadCaptions = async () => {
    if (!documentId) {
      if (loadedCaptions.length > 0) {
        setShowCaptions(!showCaptions);
      }
      return;
    }
    
    // Prevent if another operation is in progress
    if (operationInProgress !== 'none' && operationInProgress !== 'captions') {
      return;
    }
    
    // If already loaded, just toggle
    if (loadedCaptions.length > 0) {
      setShowCaptions(!showCaptions);
      return;
    }
    
    setOperationInProgress('captions');
    setLoadingCaptions(true);
    setCaptionProgress(0);
    
    try {
      // Simulate progress (since backend doesn't support streaming progress yet)
      const progressInterval = setInterval(() => {
        setCaptionProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 500);
      
      const result = await getVideoCaptions(documentId);
      
      clearInterval(progressInterval);
      setCaptionProgress(100);
      
      setLoadedCaptions(result.captions);
      setLoadedCaptionsSrt(result.captionsSrt);
      setLoadedCaptionsVtt(result.captionsVtt);
      setShowCaptions(true);
      
      // Reset progress after a moment
      setTimeout(() => {
        setCaptionProgress(0);
      }, 1000);
    } catch (error: any) {
      console.error('Failed to load captions:', error);
      alert('Failed to load captions: ' + error.message);
      setCaptionProgress(0);
    } finally {
      setLoadingCaptions(false);
      setOperationInProgress('none');
    }
  };

  // Load dubbed video on-demand
  const handleLoadDub = async () => {
    if (!documentId) {
      if (loadedDubbedUrl) {
        setVideoMode('dubbed');
      }
      return;
    }
    
    // Prevent if another operation is in progress
    if (operationInProgress !== 'none' && operationInProgress !== 'dubbing') {
      return;
    }
    
    // If already loaded, just switch mode
    if (loadedDubbedUrl) {
      setVideoMode('dubbed');
      return;
    }
    
    setOperationInProgress('dubbing');
    setLoadingDub(true);
    setDubProgress(0);
    
    try {
      // Simulate progress (since backend doesn't support streaming progress yet)
      const progressInterval = setInterval(() => {
        setDubProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 5;
        });
      }, 1000);
      
      const result = await dubVideo(documentId, 'female');
      
      clearInterval(progressInterval);
      setDubProgress(100);
      
      setLoadedDubbedUrl(result.dubbedVideoUrl);
      setVideoMode('dubbed');
      
      // Reset progress after a moment
      setTimeout(() => {
        setDubProgress(0);
      }, 1000);
    } catch (error: any) {
      console.error('Failed to dub video:', error);
      alert('Failed to dub video: ' + error.message);
      setDubProgress(0);
    } finally {
      setLoadingDub(false);
      setOperationInProgress('none');
    }
  };

  // Update current caption based on video time - use timeupdate event for better sync
  useEffect(() => {
    if (!showCaptions || loadedCaptions.length === 0) {
      setCurrentCaption('');
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    const updateCaption = () => {
      const time = video.currentTime;
      if (isNaN(time) || time < 0) return;
      
      // Find the caption that matches the current time
      // Use a small tolerance for better matching
      const tolerance = 0.1;
      const caption = loadedCaptions.find(
        (cap) => {
          const start = cap.start || 0;
          const end = cap.end || 0;
          // Check if current time is within the caption's time range (with tolerance)
          return time >= (start - tolerance) && time <= (end + tolerance);
        }
      );
      
      if (caption && caption.text) {
        setCurrentCaption(caption.text);
      } else {
        setCurrentCaption('');
      }
    };

    // Use both timeupdate and seeking events for better sync
    video.addEventListener('timeupdate', updateCaption);
    video.addEventListener('seeked', updateCaption);
    video.addEventListener('play', updateCaption);
    
    // Also check immediately
    updateCaption();

    return () => {
      video.removeEventListener('timeupdate', updateCaption);
      video.removeEventListener('seeked', updateCaption);
      video.removeEventListener('play', updateCaption);
    };
  }, [loadedCaptions, showCaptions]);

  // Auto-hide controls overlay on mobile/idle hover when playing
  useEffect(() => {
    let timeoutId: any;
    if (isPlaying && isHovered) {
      timeoutId = setTimeout(() => {
        setIsHovered(false);
      }, 3500);
    }
    return () => clearTimeout(timeoutId);
  }, [isPlaying, isHovered]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handlePlayerClick = () => {
    // On mobile touchscreens, show controls first on tap instead of instantly pausing the video
    if (isPlaying && !isHovered) {
      setIsHovered(true);
      return;
    }
    handlePlayPause();
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && e.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = x / rect.width;
      const newTime = percent * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadCaptions = (format: 'srt' | 'vtt') => {
    const content = format === 'srt' ? captionsSrt : captionsVtt;
    if (!content) return;

    const blob = new Blob([content], {
      type: format === 'srt' ? 'text/plain' : 'text/vtt',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'captions'}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!videoSource) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Video Player</CardTitle>
          <CardDescription>
            {dubbedVideoUrl || originalVideoUrl 
              ? 'Video is being processed. Please wait...' 
              : 'Video file not available for playback.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {dubbedVideoUrl || originalVideoUrl
              ? 'Video is loading. If it doesn\'t appear, please refresh the page or try again later.'
              : 'Video processing completed. Captions are available for download below.'}
          </p>
          {(captionsSrt || captionsVtt) && (
            <div className="flex gap-2">
              {captionsSrt && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadCaptions('srt')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download SRT
                </Button>
              )}
              {captionsVtt && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadCaptions('vtt')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download WebVTT
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-2 border-gray-400 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title || 'Video Player'}</CardTitle>
          </div>
          <div className="flex gap-2">
            {originalVideoUrl && (
              <Button
                variant={videoMode === 'original' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVideoMode('original')}
                className="text-xs"
              >
                Original
              </Button>
            )}
            {(loadedDubbedUrl || dubbedVideoUrl || documentId) && (
              <div className="flex flex-col gap-1">
                <Button
                  variant={videoMode === 'dubbed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleLoadDub}
                  disabled={loadingDub || (operationInProgress !== 'none' && operationInProgress !== 'dubbing')}
                  className="text-xs"
                >
                  {loadingDub ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Dubbing...
                    </>
                  ) : (
                    'Urdu Dub'
                  )}
                </Button>
                {loadingDub && dubProgress > 0 && (
                  <div className="w-full">
                    <Progress value={dubProgress} className="h-1" />
                    <p className="text-xs text-gray-500 mt-0.5">{Math.round(dubProgress)}%</p>
                  </div>
                )}
              </div>
            )}
            {documentId && (
              <div className="flex flex-col gap-1">
                <Button
                  variant={showCaptions ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleLoadCaptions}
                  disabled={loadingCaptions || (operationInProgress !== 'none' && operationInProgress !== 'captions')}
                  className="text-xs"
                >
                  {loadingCaptions ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Subtitles className="h-3 w-3 mr-1" />
                      Urdu Captions
                    </>
                  )}
                </Button>
                {loadingCaptions && captionProgress > 0 && (
                  <div className="w-full">
                    <Progress value={captionProgress} className="h-1" />
                    <p className="text-xs text-gray-500 mt-0.5">{Math.round(captionProgress)}%</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Video Player */}
        <div 
          className="relative w-full bg-black rounded-lg overflow-hidden cursor-pointer" 
          style={{ maxHeight: '400px' }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handlePlayerClick}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <div className="text-white text-center">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{ 
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative mb-4"
                >
                  {/* Pulsing background rings */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl bg-white opacity-20"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.2, 0, 0.2],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut"
                    }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-2xl bg-white opacity-15"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.15, 0, 0.15],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: 0.3
                    }}
                  />
                  {/* Logo */}
                  <motion.div
                    className="relative w-12 h-12 flex items-center justify-center"
                    animate={{
                      y: [0, -6, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Image
                      src="/logo.svg"
                      alt="Loading"
                      width={48}
                      height={48}
                      className="w-full h-full object-contain"
                      priority
                    />
                  </motion.div>
                </motion.div>
                <p>Loading video...</p>
              </div>
            </div>
          )}
          {videoError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
              <div className="text-white text-center p-4 max-w-md">
                <p className="text-red-400 mb-2">⚠️ {videoError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setVideoError(null);
                    if (videoRef.current) {
                      videoRef.current.load();
                    }
                  }}
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}
          <video
            ref={videoRef}
            src={videoSource || undefined}
            className="w-full h-auto max-h-[400px]"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            playsInline
            preload="auto"
          >
            Your browser does not support the video tag.
          </video>

          {/* Custom Caption Overlay */}
          {showCaptions && currentCaption && (
            <div 
              className={cn(
                "absolute left-0 right-0 flex justify-center pointer-events-none z-20 px-4 transition-all duration-300 ease-in-out",
                // Keep captions much lower on the screen so they don't block video content
                (showControls && (!isPlaying || isHovered)) ? "bottom-[80px]" : "bottom-4"
              )}
            >
              <div className="bg-black/60 backdrop-blur-sm text-white px-4 py-1.5 rounded-md max-w-[90%] text-center">
                <p 
                  className="text-sm sm:text-base font-medium leading-snug" 
                  dir="rtl"
                >
                  {currentCaption}
                </p>
              </div>
            </div>
          )}

          {/* Custom Controls Overlay */}
          {showControls && (!isPlaying || isHovered) && (
            <div 
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 transition-opacity duration-300"
              onClick={(e) => e.stopPropagation()} // Prevent clicking controls from pausing video
            >
              {/* Progress Bar */}
              <div
                className="w-full h-2 bg-white/20 rounded-full mb-3 cursor-pointer"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePlayPause}
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>

                <div className="flex items-center gap-2 flex-1">
                  <span className="text-white text-sm">
                    {formatTime(currentTime)}
                  </span>
                  <span className="text-white/60 text-sm">/</span>
                  <span className="text-white/60 text-sm">
                    {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
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
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-20 hidden sm:block"
                  />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCaptions(!showCaptions)}
                  className={cn(
                    "text-white hover:bg-white/20",
                    showCaptions && "bg-white/20"
                  )}
                  title="Toggle Captions"
                >
                  <Subtitles className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}

