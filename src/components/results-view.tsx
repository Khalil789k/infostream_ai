"use client";

import { useState } from "react";
import type { ProcessedContent } from "@/types";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Chatbot } from "./chatbot";
import { TranslationTool } from "./translation-tool";
import { VideoPlayer } from "./video-player";
import { ArrowLeft, BookText, FileText, Languages, MessageCircle, Video, ChevronDown, ChevronUp, FileIcon, Link as LinkIcon, Type } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  processDocumentSummary, 
  processDocumentKeywords, 
  processDocumentNotes, 
  processDocumentAll 
} from "@/lib/api";
import { Progress } from "./ui/progress";

import { SummaryCard } from "./results/summary-card";
import { NotesCard } from "./results/notes-card";
import { OriginalContentCard } from "./results/original-content-card";

type ResultsViewProps = {
  content: ProcessedContent;
  onNewSession: () => void;
};

export function ResultsView({ content, onNewSession }: ResultsViewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [processingStates, setProcessingStates] = useState<Record<string, boolean>>({});
  const [processedContent, setProcessedContent] = useState<ProcessedContent>(content);
  const [statusMessages, setStatusMessages] = useState<Record<string, { type: 'success' | 'error'; message: string } | null>>({});
  const [globalProgress, setGlobalProgress] = useState(0);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [videoOperation, setVideoOperation] = useState<'none' | 'dubbing' | 'captions'>('none');

  const isAnyTaskProcessing = Object.values(processingStates).some(state => state) || videoOperation !== 'none';

  const hasChatContent = !!processedContent.sourceText;
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) newSet.delete(section);
      else newSet.add(section);
      return newSet;
    });
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(type);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {}
  };

  const handleProcess = async (type: 'summary' | 'keywords' | 'notes' | 'all') => {
    if (!content.id || isAnyTaskProcessing) return;
    
    setProcessingStates(prev => ({ ...prev, [type]: true }));
    setStatusMessages(prev => ({ ...prev, [type]: null }));
    setActiveTask(type);
    setGlobalProgress(10); // Start progress
    
    // Simulate progress movement (since backend is synchronous for now)
    const progressInterval = setInterval(() => {
      setGlobalProgress(prev => (prev < 90 ? prev + Math.random() * 5 : prev));
    }, 500);

    try {
      let result;
      switch(type) {
        case 'summary': result = await processDocumentSummary(content.id); break;
        case 'keywords': result = await processDocumentKeywords(content.id); break;
        case 'notes': result = await processDocumentNotes(content.id); break;
        case 'all': result = await processDocumentAll(content.id); break;
      }
      
      setGlobalProgress(100);
      setTimeout(() => {
        if (type === 'all') {
          setProcessedContent(prev => ({ ...prev, ...result }));
        } else {
          setProcessedContent(prev => ({ ...prev, [type]: (result as any)[type] }));
        }
      }, 500);
      
      setStatusMessages(prev => ({ 
        ...prev, 
        [type]: { type: 'success', message: `${type.charAt(0).toUpperCase() + type.slice(1)} completed!` } 
      }));
    } catch (error: any) {
      setGlobalProgress(0);
      setStatusMessages(prev => ({ 
        ...prev, 
        [type]: { type: 'error', message: error.message || `Could not process ${type}` } 
      }));
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setProcessingStates(prev => ({ ...prev, [type]: false }));
        setActiveTask(null);
        setGlobalProgress(0);
      }, 1000);
    }
  };

  const SectionButton = ({ id, icon: Icon, label, colorConfig }: any) => {
    const isExpanded = expandedSections.has(id);
    const IconComponent = Icon;
    return (
      <button
        onClick={() => toggleSection(id)}
        disabled={isAnyTaskProcessing}
        className={`flex items-center gap-3 px-6 py-4 rounded-xl border-2 transition-all duration-300 ${
          isAnyTaskProcessing ? 'opacity-50 cursor-not-allowed border-gray-200' : 
          isExpanded
            ? `${colorConfig.gradient} text-white ${colorConfig.borderColor} shadow-lg`
            : 'bg-white text-gray-900 border-2 border-gray-500 hover:border-gray-600 hover:shadow-xl'
        }`}
      >
        <IconComponent className={`h-5 w-5 ${isExpanded ? 'text-white' : colorConfig.iconColor}`} />
        <span className="font-semibold">{label}</span>
        {isExpanded ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
      </button>
    );
  };

  return (
    <div className="min-h-screen w-full bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-gray-100 pb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={onNewSession}
              disabled={isAnyTaskProcessing}
              className="rounded-full border-gray-500 hover:bg-gray-50 h-10 w-10 shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 
              className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight break-words max-w-full line-clamp-2"
              title={content.sourceTitle}
            >
              {content.sourceTitle}
            </h1>
          </div>
          
          <AnimatePresence>
            {isAnyTaskProcessing && activeTask && (
              <motion.div 
                key="processing-banner"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-end gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 shadow-sm min-w-[280px]"
              >
                <div className="flex items-center gap-3 w-full justify-between">
                   <div className="flex items-center gap-2">
                     <div className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                     <span className="text-sm font-bold text-blue-700 uppercase tracking-widest">
                       AI {activeTask} Task Active
                     </span>
                   </div>
                   <span className="text-xs font-mono font-bold text-blue-500 bg-white px-2 py-0.5 rounded-md border border-blue-100">
                     {Math.round(globalProgress)}%
                   </span>
                </div>
                <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                    animate={{ width: `${globalProgress}%` }}
                    transition={{ type: "spring", stiffness: 50 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Video Player */}
        {content.sourceType === 'video' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
             <VideoPlayer
                originalVideoUrl={content.originalVideoUrl}
                dubbedVideoUrl={content.dubbedVideoUrl}
                captions={content.captions}
                captionsSrt={content.captionsSrt}
                captionsVtt={content.captionsVtt}
                title={content.sourceTitle}
                documentId={content.id}
                onOperationChange={setVideoOperation}
              />
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <SectionButton 
            id="original" icon={content.sourceType === 'video' ? Video : content.sourceType === 'url' ? LinkIcon : content.sourceType === 'file' ? FileIcon : Type}
            label="Original" colorConfig={{ gradient: 'bg-gradient-to-r from-gray-600 to-gray-700', iconColor: 'text-gray-600', borderColor: 'border-gray-500' }}
          />
          <SectionButton 
            id="summary" icon={BookText} label="Summary"
            colorConfig={{ gradient: 'bg-gradient-to-r from-blue-500 to-blue-600', iconColor: 'text-blue-600', borderColor: 'border-blue-500' }}
          />
          <SectionButton 
            id="keywords" icon={FileText} label="Notes"
            colorConfig={{ gradient: 'bg-gradient-to-r from-green-500 to-green-600', iconColor: 'text-green-600', borderColor: 'border-green-500' }}
          />
          {hasChatContent && (
            <SectionButton 
              id="chatbot" icon={MessageCircle} label="Chat"
              colorConfig={{ gradient: 'bg-gradient-to-r from-indigo-500 to-indigo-600', iconColor: 'text-indigo-600', borderColor: 'border-indigo-500' }}
            />
          )}
          {processedContent.sourceText && (
            <SectionButton 
              id="translate" icon={Languages} label="Translate"
              colorConfig={{ gradient: 'bg-gradient-to-r from-pink-500 to-pink-600', iconColor: 'text-pink-600', borderColor: 'border-pink-500' }}
            />
          )}
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          <AnimatePresence>
            {expandedSections.has('original') && (
              <motion.div 
                key="original-section"
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: "auto", opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }} 
                transition={{ duration: 0.3 }} 
                className="overflow-hidden"
              >
                <OriginalContentCard
                  sourceType={content.sourceType}
                  sourceText={processedContent.sourceText}
                  sourceUrl={processedContent.sourceUrl}
                  frameText={processedContent.frameText}
                  onCopy={(txt) => copyToClipboard(txt, 'original')}
                  copied={copiedText === 'original'}
                />
              </motion.div>
            )}

            {expandedSections.has('summary') && (
              <motion.div 
                key="summary-section"
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: "auto", opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }} 
                transition={{ duration: 0.3 }} 
                className="overflow-hidden"
              >
                <SummaryCard
                  summary={processedContent.summary}
                  isProcessing={processingStates.summary}
                  onGenerate={() => handleProcess('summary')}
                  onCopy={(txt) => copyToClipboard(txt, 'summary')}
                  copied={copiedText === 'summary'}
                  status={statusMessages.summary}
                />
              </motion.div>
            )}

            {expandedSections.has('keywords') && (
              <motion.div 
                key="keywords-section"
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: "auto", opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }} 
                transition={{ duration: 0.3 }} 
                className="overflow-hidden"
              >
                <div className="grid md:grid-cols-2 gap-6">
                   {/* We could use a KeywordsCard here too, using NotesCard for now as placeholder for both in this layout */}
                   <NotesCard
                      notes={processedContent.notes}
                      isProcessing={processingStates.notes}
                      onGenerate={() => handleProcess('notes')}
                      onCopy={(txt) => copyToClipboard(txt, 'notes')}
                      copied={copiedText === 'notes'}
                      status={statusMessages.notes}
                   />
                   <NotesCard
                      notes={processedContent.keywords}
                      isProcessing={processingStates.keywords}
                      onGenerate={() => handleProcess('keywords')}
                      onCopy={(txt) => copyToClipboard(txt, 'keywords')}
                      copied={copiedText === 'keywords'}
                      status={statusMessages.keywords}
                   />
                </div>
              </motion.div>
            )}

            {expandedSections.has('chatbot') && (
              <motion.div 
                key="chatbot-section"
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: "auto", opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }} 
                transition={{ duration: 0.3 }} 
                className="overflow-hidden"
              >
                <Card className="border-2 border-gray-500 shadow-xl bg-white p-6">
                  <Chatbot documentContent={processedContent.sourceText} title={processedContent.sourceTitle} documentType={processedContent.sourceType} />
                </Card>
              </motion.div>
            )}

            {expandedSections.has('translate') && (
              <motion.div 
                key="translate-section"
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: "auto", opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }} 
                transition={{ duration: 0.3 }} 
                className="overflow-hidden"
              >
                <Card className="border-2 border-gray-500 shadow-xl bg-white p-6">
                  <TranslationTool 
                    textToTranslate={processedContent.sourceText || ''} 
                    documentId={processedContent.id} 
                    initialTranslatedText={processedContent.translatedText} 
                  />
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
