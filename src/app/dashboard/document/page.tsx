"use client";

import { DocumentInput } from '@/components/input-pages/document-input';
import { DashboardLayout } from '@/components/dashboard-layout';
import { processDocument } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { ProcessedContent } from '@/types';

export default function DocumentInputPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (file: File, fileName: string) => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a document file.",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await processDocument(file);
      const newSessionData: ProcessedContent = {
        id: result.id,
        sourceType: 'file',
        sourceText: result.text,
        sourceTitle: result.title || fileName,
        summary: result.summary,
        keywords: result.keywords,
        notes: result.notes,
        createdAt: new Date().toISOString(),
      };
      
      // Return result ID so the child component can smoothly finish the animation before navigating
      return result.id;
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

  return (
    <DashboardLayout>
      <DocumentInput onSubmit={handleSubmit} isProcessing={isLoading} />
    </DashboardLayout>
  );
}

