"use client";

import { VideoInput } from '@/components/input-pages/video-input';
import { DashboardLayout } from '@/components/dashboard-layout';
import { processVideo } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { QueueProgressOverlay } from '@/components/QueueProgressOverlay';

export default function VideoInputPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [deferredResolve, setDeferredResolve] = useState<((id: string) => void) | null>(null);
  const [deferredReject, setDeferredReject] = useState<((err: any) => void) | null>(null);

  const handleSubmit = async (file: File, fileName: string): Promise<string> => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a video file.",
      });
      throw new Error("Please select a video file.");
    }
    
    setIsLoading(true);
    try {
      toast({
        variant: "default",
        title: "Processing Video",
        description: "Submitting request to task queue...",
      });
      
      const result = await processVideo(file);
      
      if (result.queued && result.taskId) {
        return new Promise<string>((resolve, reject) => {
          setActiveTaskId(result.taskId);
          setDeferredResolve(() => resolve);
          setDeferredReject(() => reject);
        });
      } else {
        return result.id;
      }
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

  const handleQueueComplete = (finalResult: any) => {
    setActiveTaskId(null);
    toast({
      variant: "default",
      title: "Success",
      description: "Video processed successfully!",
    });
    if (deferredResolve) {
      deferredResolve(finalResult.id);
    }
  };

  const handleQueueCancel = () => {
    setActiveTaskId(null);
    setIsLoading(false);
    toast({
      variant: "destructive",
      title: "Cancelled",
      description: "Video processing request was cancelled.",
    });
    if (deferredReject) {
      deferredReject(new Error("Request was cancelled."));
    }
  };

  return (
    <DashboardLayout>
      <VideoInput onSubmit={handleSubmit} isProcessing={isLoading && !activeTaskId} />
      {activeTaskId && (
        <QueueProgressOverlay
          taskId={activeTaskId}
          taskType="video"
          onComplete={handleQueueComplete}
          onCancel={handleQueueCancel}
        />
      )}
    </DashboardLayout>
  );
}
