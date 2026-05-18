"use client";

import { VideoInput } from '@/components/input-pages/video-input';
import { DashboardLayout } from '@/components/dashboard-layout';
import { processVideo } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { ProcessedContent } from '@/types';

export default function VideoInputPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (file: File, fileName: string) => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a video file.",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      toast({
        variant: "default",
        title: "Processing Video",
        description: "This may take a few minutes. Please wait...",
      });
      
      const result = await processVideo(file);
      const newSessionData: ProcessedContent = {
        id: result.id,
        sourceType: 'video',
        sourceText: result.transcription || result.urduTranscription || '',
        sourceTitle: result.title || fileName,
        summary: result.summary,
        keywords: result.keywords,
        notes: result.notes,
        transcription: result.transcription,
        urduTranscription: result.urduTranscription,
        captions: result.captions,
        captionsSrt: result.captionsSrt,
        captionsVtt: result.captionsVtt,
        videoDuration: result.videoDuration,
        detectedLanguage: result.detectedLanguage,
        videoId: result.videoId,
        originalVideoUrl: result.originalVideoUrl,
        dubbedVideoUrl: result.dubbedVideoUrl,
        createdAt: new Date().toISOString(),
      };
      
      // Return result ID so the child component can smoothly finish the animation before navigating
      return result.id;
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Video Processing Failed",
        description: error.message || "Could not process the video. Please try again.",
      });
      setIsLoading(false);
      throw error;
    }
  };

  return (
    <DashboardLayout>
      <VideoInput onSubmit={handleSubmit} isProcessing={isLoading} />
    </DashboardLayout>
  );
}

