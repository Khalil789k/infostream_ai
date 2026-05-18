"use client";

import { useState, useEffect } from 'react';
import { FileText, Video, Link, Clock, Search, X, Trash2 } from 'lucide-react';
import { getUserDocuments, deleteDocument, type ProcessedDocument } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import type { ProcessedContent } from '@/types';

export function HistoryList() {
  const [sessions, setSessions] = useState<ProcessedContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await getUserDocuments();
      if (response.success && response.documents) {
        const validDocuments = response.documents.filter((doc: ProcessedDocument) => {
          if (doc.title === 'Translation' && !doc.summary && !doc.keywords && !doc.notes) {
            return false;
          }
          return true;
        });

        const convertedSessions: ProcessedContent[] = validDocuments.map((doc: ProcessedDocument) => {
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

          let transcription: string | undefined = undefined;
          let urduTranscription: string | undefined = undefined;

          if (doc.sourceType === 'video') {
            const audioMatch = doc.sourceText.match(/Audio Transcription:\s*(.*?)(?:\n\n|$)/s);
            transcription = audioMatch ? audioMatch[1].trim() : undefined;
            urduTranscription = doc.translatedText || undefined;
          } else {
            transcription = doc.translatedText || undefined;
          }

          return {
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
            createdAt: doc.createdAt,
          };
        });

        const uniqueSessions = convertedSessions.reduce((acc: ProcessedContent[], current: ProcessedContent) => {
          const existing = acc.find(s => s.sourceTitle === current.sourceTitle);
          if (!existing) {
            acc.push(current);
          } else {
            const currentDate = current.createdAt ? new Date(current.createdAt).getTime() : 0;
            const existingDate = existing.createdAt ? new Date(existing.createdAt).getTime() : 0;
            if (currentDate > existingDate) {
              const index = acc.indexOf(existing);
              acc[index] = current;
            }
          }
          return acc;
        }, []);

        uniqueSessions.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        setSessions(uniqueSessions);
      }
    } catch (error: any) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await deleteDocument(id);
      if (response.success) {
        setSessions(prev => prev.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const getIcon = (type: ProcessedContent['sourceType']) => {
    switch (type) {
      case 'video':
        return <Video className="h-5 w-5 text-purple-600" />;
      case 'file':
        return <FileText className="h-5 w-5 text-green-600" />;
      case 'url':
        return <Link className="h-5 w-5 text-orange-600" />;
      default:
        return <FileText className="h-5 w-5 text-blue-600" />;
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Unknown date';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const filteredSessions = sessions.filter(session =>
    session.sourceTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-11 text-sm border border-gray-400 focus:border-gray-500 focus:ring-1 focus:ring-gray-300 rounded-lg bg-gray-50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* History List */}
      <div className="space-y-0 w-full min-h-[280px]">
        {loading ? (
          <div className="flex items-center justify-center py-16 w-full min-h-[280px]">
            <p className="text-sm text-gray-500">Loading history...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4 w-full min-h-[280px]">
            <FileText className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-base text-gray-600 font-medium mb-1">
              {searchQuery ? 'No sessions found' : 'No sessions yet'}
            </p>
            <p className="text-sm text-gray-400">
              {searchQuery ? 'Try a different search term' : 'Start analyzing content to see your history'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 w-full max-h-[280px] min-h-[280px] overflow-y-auto scrollbar-hide">
            {filteredSessions.map((session) => (
              <div key={session.id} className="w-full">
                {deletingId === session.id ? (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-between gap-4 p-4 bg-red-50 border-2 border-red-400 rounded-lg w-full transition-all duration-200"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-red-700">Delete this session permanently?</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(session.id);
                        }}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-md shadow-sm transition-colors border border-red-700"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(null);
                        }}
                        className="px-3 py-1.5 bg-white border-2 border-gray-400 hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-md shadow-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => router.push(`/dashboard/results/${session.id}`)}
                    className="flex items-center gap-4 p-4 bg-gray-100 border-2 border-gray-400 rounded-lg hover:bg-gray-200 hover:border-blue-500 cursor-pointer transition-all duration-200 group w-full"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white border-2 border-gray-400 flex items-center justify-center group-hover:bg-gray-50 group-hover:border-blue-500 transition-colors">
                      {getIcon(session.sourceType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors mb-1">
                        {session.sourceTitle}
                      </p>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-gray-500" />
                        <span className="text-xs text-gray-600">
                          {formatDate(session.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className="text-xs px-3 py-1.5 rounded-md bg-white border-2 border-gray-400 text-gray-700 font-medium group-hover:bg-gray-50 group-hover:border-blue-500 transition-colors">
                        {session.sourceType}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(session.id);
                        }}
                        className="p-1.5 rounded-md border-2 border-transparent hover:border-red-400 hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all duration-200"
                        title="Delete session"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

