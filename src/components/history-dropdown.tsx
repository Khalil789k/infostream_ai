"use client";

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { History, FileText, Video, Link, Clock, Search, X } from 'lucide-react';
import { getUserDocuments, type ProcessedDocument } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import type { ProcessedContent } from '@/types';

export function HistoryDropdown() {
  const [sessions, setSessions] = useState<ProcessedContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

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

  const getIcon = (type: ProcessedContent['sourceType']) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'file':
        return <FileText className="h-4 w-4" />;
      case 'url':
        return <Link className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
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
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 border-gray-500 hover:bg-gray-50 shadow-sm">
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">History</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 bg-white border-2 border-gray-600 shadow-2xl">
        <div className="p-4 border-b-2 border-gray-400 bg-white">
          <div className="flex items-center justify-between mb-3">
            <DropdownMenuLabel className="p-0 text-base font-bold">Recent Sessions</DropdownMenuLabel>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-gray-500">Loading...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <History className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 font-medium">
                {searchQuery ? 'No sessions found' : 'No sessions yet'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {searchQuery ? 'Try a different search term' : 'Start analyzing content to see your history'}
              </p>
            </div>
          ) : (
            <div className="p-2">
              {filteredSessions.map((session) => (
                <DropdownMenuItem
                  key={session.id}
                  onClick={() => {
                    router.push(`/dashboard/results/${session.id}`);
                    setIsOpen(false);
                  }}
                  className="flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-100 focus:bg-gray-100 border-b border-gray-300 last:border-b-0"
                >
                  <div className="mt-0.5 text-gray-600">
                    {getIcon(session.sourceType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {session.sourceTitle}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {formatDate(session.createdAt)}
                      </span>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

