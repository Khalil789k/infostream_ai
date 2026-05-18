"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, Globe, Sparkles, ArrowRight, ExternalLink, CheckCircle2, HelpCircle, Maximize2, Minimize2, Info, Zap, FileText, Languages, BookOpen, Lightbulb, AlertCircle, X, Video, Play, Clock, User, Volume2, Captions } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ProcessingAnimation } from '@/components/loading-states';
import { useProgress } from '@/hooks/use-progress';

type UrlInputProps = {
  onSubmit: (url: string, title: string) => Promise<string | undefined>;
  isProcessing: boolean;
};

// Video platform domains
const VIDEO_PLATFORMS = [
  'youtube.com', 'youtu.be',
  'vimeo.com',
  'dailymotion.com',
  'twitter.com', 'x.com',
  'facebook.com', 'fb.watch',
  'instagram.com',
  'tiktok.com'
];

const getPlatformInfo = (url: string): { name: string; icon: string; isVideo: boolean } => {
  try {
    const urlObj = new URL(url.toLowerCase());
    const hostname = urlObj.hostname.replace('www.', '').replace('m.', '');
    
    const platformMap: Record<string, { name: string; icon: string }> = {
      'youtube.com': { name: 'YouTube', icon: 'youtube' },
      'youtu.be': { name: 'YouTube', icon: 'youtube' },
      'vimeo.com': { name: 'Vimeo', icon: 'vimeo' },
      'dailymotion.com': { name: 'Dailymotion', icon: 'dailymotion' },
      'twitter.com': { name: 'Twitter/X', icon: 'twitter' },
      'x.com': { name: 'Twitter/X', icon: 'twitter' },
      'facebook.com': { name: 'Facebook', icon: 'facebook' },
      'fb.watch': { name: 'Facebook', icon: 'facebook' },
      'instagram.com': { name: 'Instagram', icon: 'instagram' },
      'tiktok.com': { name: 'TikTok', icon: 'tiktok' }
    };
    
    for (const [domain, info] of Object.entries(platformMap)) {
      if (hostname.includes(domain)) {
        return { ...info, isVideo: true };
      }
    }
    
    return { name: 'Web Page', icon: 'globe', isVideo: false };
  } catch {
    return { name: 'Web Page', icon: 'globe', isVideo: false };
  }
};

const isVideoUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url.toLowerCase());
    const hostname = urlObj.hostname.replace('www.', '').replace('m.', '');
    
    for (const platform of VIDEO_PLATFORMS) {
      if (hostname.includes(platform)) {
        return true;
      }
    }
    
    // Check for direct video URLs
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.m4v'];
    const pathLower = urlObj.pathname.toLowerCase();
    return videoExtensions.some(ext => pathLower.endsWith(ext));
  } catch {
    return false;
  }
};

const generateShortTitle = (url: string): string => {
  try {
    const cleanedUrl = url.trim();
    const urlObj = new URL(cleanedUrl);
    
    // Custom beautiful parser for Wikipedia URLs
    if (urlObj.hostname.includes('wikipedia.org')) {
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const article = pathParts[pathParts.length - 1];
      if (article) {
        const decoded = decodeURIComponent(article).split('http')[0].replace(/[\-_]/g, ' ').trim();
        const words = decoded.substring(0, 40).split(' ').filter(Boolean);
        if (words.length > 0) {
          return words.slice(0, 4).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
      }
    }

    const pathParts = urlObj.pathname.slice(1).split('/');
    const lastPart = pathParts[pathParts.length - 1] || urlObj.hostname;
    // Clean up underscores, hyphens, and prevent nested URL strings
    const cleaned = lastPart.split('http')[0].replace(/[\-_]/g, ' ').replace(/\.[^/.]+$/, '').trim();
    const words = cleaned.split(' ').filter(Boolean);
    
    let title = words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    
    // If the title is empty, too long, or still resembles a URL, fallback to clean hostname
    if (!title || title.length > 40 || title.toLowerCase().includes('http') || title.toLowerCase().includes('www')) {
      title = urlObj.hostname.replace('www.', '');
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }
    
    return title;
  } catch (e) {
    return "Web Content";
  }
};

export function UrlInput({ onSubmit, isProcessing }: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [urlDomain, setUrlDomain] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [platformInfo, setPlatformInfo] = useState<{ name: string; icon: string; isVideo: boolean } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const { progress, currentStep, stepProgress, start, complete, reset } = useProgress({ 
    type: isVideo ? 'video' : 'url', 
    duration: isVideo ? 60000 : 20000,
    onComplete: () => reset()
  });

  useEffect(() => {
    if (url && isValidUrl(url)) {
      try {
        const urlObj = new URL(url);
        setUrlDomain(urlObj.hostname);
        const video = isVideoUrl(url);
        setIsVideo(video);
        setPlatformInfo(getPlatformInfo(url));
      } catch {
        setUrlDomain(null);
        setIsVideo(false);
        setPlatformInfo(null);
      }
    } else {
      setUrlDomain(null);
      setIsVideo(false);
      setPlatformInfo(null);
    }
  }, [url]);

  const handleSubmit = async () => {
    if (!url.trim()) return;
    
    setErrorMessage(null);
    start();
    try {
      const shortTitle = generateShortTitle(url);
      const resultId = await onSubmit(url, shortTitle);
      if (resultId) {
        await complete();
        router.push(`/dashboard/results/${resultId}`);
      }
    } catch (error: any) {
      setErrorMessage(error.message || "An unexpected error occurred. Please try again.");
      reset();
    }
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleClear = () => {
    setUrl('');
    setUrlDomain(null);
    setIsVideo(false);
    setPlatformInfo(null);
  };

  const getUrlType = (urlString: string) => {
    try {
      const urlObj = new URL(urlString);
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) return 'YouTube';
      if (urlObj.hostname.includes('vimeo.com')) return 'Vimeo';
      if (urlObj.hostname.includes('medium.com')) return 'Medium';
      if (urlObj.hostname.includes('wikipedia.org')) return 'Wikipedia';
      if (urlObj.hostname.includes('github.com')) return 'GitHub';
      if (urlObj.hostname.includes('twitter.com') || urlObj.hostname.includes('x.com')) return 'Twitter/X';
      if (urlObj.hostname.includes('tiktok.com')) return 'TikTok';
      if (urlObj.hostname.includes('instagram.com')) return 'Instagram';
      if (urlObj.hostname.includes('facebook.com') || urlObj.hostname.includes('fb.watch')) return 'Facebook';
      if (urlObj.hostname.includes('dailymotion.com')) return 'Dailymotion';
      if (urlObj.hostname.includes('news')) return 'News';
      if (urlObj.hostname.includes('blog')) return 'Blog';
      return 'Web Page';
    } catch {
      return 'Web Page';
    }
  };

  if (isProcessing) {
    return <ProcessingAnimation type={isVideo ? "video" : "url"} progress={progress} currentStep={currentStep} stepProgress={stepProgress} />;
  }

  const urlValid = url.trim() && isValidUrl(url);

  return (
    <div className={`min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 ${isFullscreen ? 'fixed inset-0 z-50 overflow-auto' : ''}`}>
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 md:py-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-xs sm:text-sm"
        >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Hero Section */}
          <div className="text-center mb-6 sm:mb-8">
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="inline-block mb-4"
            >
              <div className={`h-16 w-16 sm:h-20 sm:w-20 rounded-2xl flex items-center justify-center shadow-2xl ${
                isVideo 
                  ? 'bg-gradient-to-br from-red-600 to-pink-700' 
                  : 'bg-gradient-to-br from-orange-600 to-red-700'
              }`}>
                {isVideo ? (
                  <Video className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                ) : (
                <Link className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                )}
              </div>
            </motion.div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-2 sm:mb-4 px-2">
              {isVideo ? 'Video URL Analysis' : 'Web URL Analysis'}
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto px-2">
              {isVideo 
                ? 'Paste a video URL to extract transcription, generate Urdu dubbing, summaries, and more'
                : 'Enter any web URL to extract content, generate summaries, and create study notes with AI'
              }
            </p>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Main Form - Left Section */}
          <div className="lg:col-span-8 space-y-4 sm:space-y-6">
            {/* Instructions Card */}
            <AnimatePresence>
              {showInstructions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`rounded-2xl p-4 sm:p-6 shadow-lg border-2 ${
                    isVideo 
                      ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
                      : 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <HelpCircle className={`h-5 w-5 flex-shrink-0 ${isVideo ? 'text-red-600' : 'text-orange-600'}`} />
                      <h3 className="text-lg font-bold text-gray-900">How to Use</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowInstructions(false)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-3 text-sm sm:text-base text-gray-700">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-gray-900">Step 1:</strong> {isVideo 
                          ? 'Paste a video URL from YouTube, Vimeo, TikTok, Twitter, etc.'
                          : 'Enter or paste a valid web URL (must start with http:// or https://)'
                        }
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-gray-900">Step 2:</strong> {isVideo
                          ? 'The system will automatically detect the video platform'
                          : 'Verify the URL is valid (green checkmark will appear)'
                        }
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-gray-900">Step 3:</strong> Click "Analyze {isVideo ? 'Video' : 'URL'} with AI" to start processing
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-gray-900">Step 4:</strong> {isVideo
                          ? 'Get transcription, Urdu translation, Urdu dubbing, and summaries'
                          : 'Get AI-generated summaries, keywords, notes, and translations'
                        }
                      </div>
                    </div>
                    <div className={`mt-4 pt-4 border-t ${isVideo ? 'border-red-200' : 'border-orange-200'}`}>
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-gray-900">Tip:</strong> {isVideo
                            ? 'Supported platforms: YouTube, Vimeo, TikTok, Twitter/X, Instagram, Facebook, Dailymotion. Maximum video length: 10 minutes.'
                            : 'Works with articles, blog posts, documentation, and most web pages. Make sure the URL is publicly accessible.'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!showInstructions && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInstructions(true)}
                className="w-full sm:w-auto"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Show Instructions
              </Button>
            )}

            {/* Error Message */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
              >
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{errorMessage}</p>
              </motion.div>
            )}

            {/* URL Input Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-4 sm:p-6 shadow-xl border-2 border-gray-400"
        >
              <div className="space-y-4">
            {/* URL Input */}
            <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="url-input" className="text-base sm:text-lg font-semibold text-gray-900">
                      {isVideo ? 'Video URL' : 'Website URL'} <span className="text-red-500">*</span>
              </Label>
                    {urlValid && (
                      <Badge variant="default" className={`text-xs ${isVideo ? 'bg-red-600' : 'bg-green-600'}`}>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {isVideo ? 'Video Detected' : 'Valid URL'}
                      </Badge>
                    )}
                  </div>
              <div className="relative">
                    {isVideo ? (
                      <Video className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                    ) : (
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    )}
                <Input 
                  id="url-input"
                  type="url"
                      placeholder={isVideo ? "https://youtube.com/watch?v=..." : "https://example.com/article"}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isProcessing}
                      className={`h-12 sm:h-14 pl-12 pr-12 text-base bg-gray-50 border-2 text-gray-900 placeholder:text-gray-400 rounded-xl shadow-sm ${
                        isVideo 
                          ? 'border-red-500 focus:border-red-600 focus:ring-red-600'
                          : 'border-gray-500 focus:border-orange-600 focus:ring-orange-600'
                      }`}
                  onKeyDown={(e) => {
                        if (e.key === 'Enter' && urlValid) {
                      handleSubmit();
                    }
                  }}
                />
                    {urlValid && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                        className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${
                          isVideo ? 'text-red-600 hover:text-red-700' : 'text-orange-600 hover:text-orange-700'
                        }`}
                        title="Open in new tab"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </a>
                )}
              </div>
              {url && !isValidUrl(url) && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>Please enter a valid URL starting with http:// or https://</span>
                    </div>
                  )}
                  {urlValid && urlDomain && (
                    <div className={`flex items-center gap-2 text-sm p-3 rounded-lg border ${
                      isVideo 
                        ? 'text-red-700 bg-red-50 border-red-200' 
                        : 'text-gray-600 bg-gray-50 border-gray-200'
                    }`}>
                      {isVideo ? (
                        <Video className="h-4 w-4 text-red-600 flex-shrink-0" />
                      ) : (
                      <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      )}
                      <span>{isVideo ? 'Platform' : 'Domain'}: <strong className="text-gray-900">{platformInfo?.name || urlDomain}</strong></span>
                      <Badge variant="outline" className={`ml-auto text-xs ${isVideo ? 'border-red-300 text-red-700' : ''}`}>
                        {getUrlType(url)}
                      </Badge>
                    </div>
              )}
            </div>
            
            {/* Submit Button */}
            <Button 
              onClick={handleSubmit} 
                  disabled={isProcessing || !urlValid}
                  className={`w-full h-12 sm:h-14 font-bold text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl group disabled:opacity-50 disabled:cursor-not-allowed ${
                    isVideo 
                      ? 'bg-gradient-to-r from-red-600 to-pink-700 hover:from-red-700 hover:to-pink-800 text-white'
                      : 'bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white'
                  }`}
            >
                  <span className="flex items-center justify-center gap-3">
                    <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
                    Analyze {isVideo ? 'Video' : 'URL'} with AI
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
                {!urlValid && url && (
                  <p className="text-xs sm:text-sm text-red-600 text-center">
                    Please enter a valid URL to continue
                  </p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Sidebar - Right Section */}
          <div className="lg:col-span-4 space-y-4 sm:space-y-6">
            {/* What You'll Get Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  What You'll Get
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isVideo ? (
                    <>
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Transcription</h4>
                          <p className="text-xs sm:text-sm text-gray-600">AI-powered video transcription using Whisper</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                          <Languages className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Urdu Translation</h4>
                          <p className="text-xs sm:text-sm text-gray-600">Full transcription translated to Urdu</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <Volume2 className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Urdu Dubbing</h4>
                          <p className="text-xs sm:text-sm text-gray-600">Human-like Urdu voice synced with video</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <Captions className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Urdu Captions</h4>
                          <p className="text-xs sm:text-sm text-gray-600">SRT and VTT caption files in Urdu</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base">AI Summary</h4>
                          <p className="text-xs sm:text-sm text-gray-600">Comprehensive video summary and notes</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Content Extraction</h4>
                      <p className="text-xs sm:text-sm text-gray-600">Extract all text content from web pages</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">AI Summary</h4>
                      <p className="text-xs sm:text-sm text-gray-600">Comprehensive summaries of web content</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Study Notes</h4>
                      <p className="text-xs sm:text-sm text-gray-600">Organized notes for easy review</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Languages className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Translation</h4>
                      <p className="text-xs sm:text-sm text-gray-600">Multi-language translation support</p>
                    </div>
                  </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* URL Info Card */}
            {urlValid && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`rounded-2xl p-4 sm:p-6 text-white shadow-md ${
                  isVideo
                    ? 'bg-gradient-to-br from-red-500 to-red-600'
                    : 'bg-gradient-to-br from-orange-500 to-orange-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-4">
                  {isVideo ? <Video className="h-5 w-5" /> : <Info className="h-5 w-5" />}
                  <h3 className="text-lg font-bold">{isVideo ? 'Video Information' : 'URL Information'}</h3>
                </div>
                <div className="space-y-3">
                  {platformInfo && (
                    <div className="flex justify-between items-center">
                      <span className={isVideo ? "text-red-100 text-sm sm:text-base" : "text-orange-100 text-sm sm:text-base"}>
                        {isVideo ? 'Platform' : 'Domain'}
                      </span>
                      <span className="font-bold text-base sm:text-lg truncate ml-2">{platformInfo.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className={isVideo ? "text-red-100 text-sm sm:text-base" : "text-orange-100 text-sm sm:text-base"}>Type</span>
                    <span className="font-bold text-base sm:text-lg">{getUrlType(url)}</span>
                  </div>
                  <div className={`mt-4 pt-4 border-t ${isVideo ? 'border-red-400/30' : 'border-orange-400/30'}`}>
                    <div className="flex justify-between items-center">
                      <span className={isVideo ? "text-red-100 text-sm sm:text-base" : "text-orange-100 text-sm sm:text-base"}>Est. Processing</span>
                      <span className="font-bold text-base sm:text-lg">{isVideo ? '2-5 min' : '1-3 min'}</span>
                    </div>
                  </div>
          </div>
        </motion.div>
            )}

            {/* Quick Tips Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Quick Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-xs sm:text-sm text-gray-600">
                  {isVideo ? (
                    <>
                      <div className="flex items-start gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-red-600 mt-1.5 flex-shrink-0" />
                        <p>Supported: YouTube, Vimeo, TikTok, Twitter/X, Instagram, Facebook</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-red-600 mt-1.5 flex-shrink-0" />
                        <p>Maximum video length: 10 minutes</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-red-600 mt-1.5 flex-shrink-0" />
                        <p>Video must be publicly accessible</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-red-600 mt-1.5 flex-shrink-0" />
                        <p>Urdu dubbing uses natural human-like voice</p>
                      </div>
                    </>
                  ) : (
                    <>
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-600 mt-1.5 flex-shrink-0" />
                    <p>Works with articles, blog posts, and documentation</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-600 mt-1.5 flex-shrink-0" />
                    <p>URL must be publicly accessible (no login required)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-600 mt-1.5 flex-shrink-0" />
                    <p>Make sure URL starts with http:// or https://</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-600 mt-1.5 flex-shrink-0" />
                    <p>Click the external link icon to preview the page</p>
                  </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Supported Platforms Card (for video URLs) */}
            {isVideo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Play className="h-5 w-5 text-red-500" />
                    Supported Platforms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'YouTube', color: 'bg-red-100 text-red-700' },
                      { name: 'Vimeo', color: 'bg-blue-100 text-blue-700' },
                      { name: 'TikTok', color: 'bg-pink-100 text-pink-700' },
                      { name: 'Twitter/X', color: 'bg-sky-100 text-sky-700' },
                      { name: 'Instagram', color: 'bg-purple-100 text-purple-700' },
                      { name: 'Facebook', color: 'bg-blue-100 text-blue-700' },
                    ].map((platform) => (
                      <Badge key={platform.name} variant="outline" className={`${platform.color} text-xs py-1`}>
                        {platform.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
