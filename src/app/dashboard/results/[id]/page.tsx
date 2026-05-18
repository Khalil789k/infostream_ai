"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ResultsView } from '@/components/results-view';
import { DashboardLayout } from '@/components/dashboard-layout';
import { getDocument, type ProcessedDocument } from '@/lib/api';
import type { ProcessedContent } from '@/types';

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const [content, setContent] = useState<ProcessedContent | null>(null);
  const [loading, setLoading] = useState(true);
  const documentId = params.id as string;

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        const response = await getDocument(documentId);
        if (response.success && response.document) {
          const doc = response.document;
          
          if (doc) {
            // Map database source types to frontend source types
            let sourceType: ProcessedContent['sourceType'] = 'text';
            if (doc.sourceType === 'text') {
              sourceType = 'text';
            } else if (doc.sourceType === 'pdf' || doc.sourceType === 'docx') {
              sourceType = 'file';
            } else if (doc.sourceType === 'url') {
              sourceType = 'url';
            } else if (doc.sourceType === 'video') {
              sourceType = 'video';
            }
            
            // For video, extract transcription from source_text
            let transcription: string | undefined = undefined;
            let urduTranscription: string | undefined = undefined;
            
            if (doc.sourceType === 'video') {
              const audioMatch = doc.sourceText.match(/Audio Transcription:\s*(.*?)(?:\n\n|$)/s);
              transcription = audioMatch ? audioMatch[1].trim() : undefined;
              urduTranscription = doc.translatedText || undefined;
            } else {
              transcription = doc.translatedText || undefined;
            }
            
            const processedContent: ProcessedContent = {
              id: doc.id,
              sourceType,
              sourceText: doc.sourceText,
              sourceTitle: doc.sourceTitle || doc.title,
              summary: doc.summary || undefined,
              keywords: doc.keywords || undefined,
              notes: doc.notes || undefined,
              transcription: transcription,
              urduTranscription: urduTranscription,
              videoId: doc.videoId || undefined,
              originalVideoUrl: doc.originalVideoUrl || undefined,
              dubbedVideoUrl: doc.dubbedVideoUrl || undefined,
              sourceUrl: doc.sourceUrl || undefined,
              createdAt: doc.createdAt,
            };
            
            setContent(processedContent);
          } else {
            // Document not found, redirect to dashboard
            router.push('/dashboard');
          }
        }
      } catch (error) {
        console.error('Error loading document:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      loadDocument();
    }
  }, [documentId, router]);

  const handleNewSession = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen w-full flex items-center justify-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!content) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto py-8">
          <div className="text-center py-16">
            <p className="text-gray-600 text-lg">Document not found.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ResultsView content={content} onNewSession={handleNewSession} />
    </DashboardLayout>
  );
}

