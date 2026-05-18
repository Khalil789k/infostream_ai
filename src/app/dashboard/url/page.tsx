"use client";

import { UrlInput } from '@/components/input-pages/url-input';
import { DashboardLayout } from '@/components/dashboard-layout';
import { processUrl } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { ProcessedContent } from '@/types';

export default function UrlInputPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (url: string, title: string) => {
    if (!url) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a valid URL.",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await processUrl(url);
      
      // Check if this is a video URL response
      if (result.isVideo) {
        // Handle video URL response
        const newSessionData: ProcessedContent = {
          id: result.id,
          sourceType: 'video',
          sourceText: result.transcription || result.text,
          sourceTitle: result.title || title,
          summary: result.summary,
          keywords: result.keywords,
          notes: result.notes,
          translatedText: result.urduTranscription,
          videoId: result.videoId,
          originalVideoUrl: result.originalVideoUrl,
          dubbedVideoUrl: result.dubbedVideoUrl,
          videoDuration: result.videoDuration,
          captionsSrt: result.captionsSrt,
          captionsVtt: result.captionsVtt,
          createdAt: new Date().toISOString(),
        };
        
        toast({
          title: "Video Processed Successfully",
          description: `${result.platform || 'Video'} content processed with Urdu dubbing.`,
        });
      } else {
        // Handle regular URL response
      const newSessionData: ProcessedContent = {
        id: result.id,
        sourceType: 'url',
        sourceText: result.text,
        sourceTitle: result.title || title,
        summary: result.summary,
        keywords: result.keywords,
        notes: result.notes,
        createdAt: new Date().toISOString(),
      };
        
        toast({
          title: "URL Processed Successfully",
          description: "Web content has been extracted and analyzed.",
        });
      }
      
      // Return result ID so the child component can smoothly finish the animation before navigating
      return result.id;
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "URL Processing Failed",
        description: error.message || "Could not process the URL. Please try again.",
      });
      setIsLoading(false);
      throw error;
    }
  };

  return (
    <DashboardLayout>
      <UrlInput onSubmit={handleSubmit} isProcessing={isLoading} />
    </DashboardLayout>
  );
}
