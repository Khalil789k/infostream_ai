"use client";

import { DocumentInput } from '@/components/input-pages/document-input';
import { DashboardLayout } from '@/components/dashboard-layout';
import { processDocument } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { QueueProgressOverlay } from '@/components/QueueProgressOverlay';

export default function DocumentInputPage() {
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
        description: "Please select a document file.",
      });
      throw new Error("Please select a document file.");
    }
    
    setIsLoading(true);
    try {
      toast({
        variant: "default",
        title: "Processing Document",
        description: "Submitting request to task queue...",
      });
      
      const result = await processDocument(file);
      
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
        title: "Document Processing Failed",
        description: error.message || "Could not process the document. Please try again.",
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
      description: "Document processed successfully!",
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
      description: "Document processing request was cancelled.",
    });
    if (deferredReject) {
      deferredReject(new Error("Request was cancelled."));
    }
  };

  return (
    <DashboardLayout>
      <DocumentInput onSubmit={handleSubmit} isProcessing={isLoading && !activeTaskId} />
      {activeTaskId && (
        <QueueProgressOverlay
          taskId={activeTaskId}
          taskType="document"
          onComplete={handleQueueComplete}
          onCancel={handleQueueCancel}
        />
      )}
    </DashboardLayout>
  );
}
