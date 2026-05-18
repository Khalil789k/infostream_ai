"use client";

import { TextInput } from '@/components/input-pages/text-input';
import { DashboardLayout } from '@/components/dashboard-layout';
import { processText as apiProcessText } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { ProcessedContent } from '@/types';

export default function TextInputPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (text: string) => {
    if (!text) {
      toast({
        variant: "destructive",
        title: "Missing Input",
        description: "Please provide content to analyze.",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await apiProcessText(text);
      const newSessionData: ProcessedContent = {
        id: result.id,
        sourceType: 'text',
        sourceText: text,
        sourceTitle: result.title,
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
        title: "Analysis Failed",
        description: error.message || "Could not process the text. Please try again.",
      });
      setIsLoading(false);
      throw error;
    }
  };

  return (
    <DashboardLayout>
      <TextInput onSubmit={handleSubmit} isProcessing={isLoading} />
    </DashboardLayout>
  );
}

