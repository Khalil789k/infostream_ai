"use client";

import { UrlInput } from '@/components/input-pages/url-input';
import { DashboardLayout } from '@/components/dashboard-layout';
import { processUrl } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { QueueProgressOverlay } from '@/components/QueueProgressOverlay';

export default function UrlInputPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [deferredResolve, setDeferredResolve] = useState<((id: string) => void) | null>(null);
  const [deferredReject, setDeferredReject] = useState<((err: any) => void) | null>(null);

  const handleSubmit = async (url: string, title: string): Promise<string> => {
    if (!url) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a valid URL.",
      });
      throw new Error("Please provide a valid URL.");
    }
    
    setIsLoading(true);
    try {
      toast({
        variant: "default",
        title: "Processing URL",
        description: "Submitting request to task queue...",
      });
      
      const result = await processUrl(url);
      
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
        title: "URL Processing Failed",
        description: error.message || "Could not process the URL. Please try again.",
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
      description: "URL content processed successfully!",
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
      description: "URL processing request was cancelled.",
    });
    if (deferredReject) {
      deferredReject(new Error("Request was cancelled."));
    }
  };

  return (
    <DashboardLayout>
      <UrlInput onSubmit={handleSubmit} isProcessing={isLoading && !activeTaskId} />
      {activeTaskId && (
        <QueueProgressOverlay
          taskId={activeTaskId}
          taskType="url"
          onComplete={handleQueueComplete}
          onCancel={handleQueueCancel}
        />
      )}
    </DashboardLayout>
  );
}
