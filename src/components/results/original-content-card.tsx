"use client";

import { motion } from "framer-motion";
import { Copy, Check, FileIcon, Link as LinkIcon, Type, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
interface OriginalContentCardProps {
  sourceType: string;
  sourceText: string;
  sourceUrl?: string;
  frameText?: string;
  onCopy: (text: string) => void;
  copied: boolean;
}

export function OriginalContentCard({ 
  sourceType, 
  sourceText, 
  sourceUrl,
  frameText,
  onCopy, 
  copied 
}: OriginalContentCardProps) {
  const getIcon = () => {
    switch (sourceType) {
      case 'video': return <Video className="h-5 w-5 text-gray-600" />;
      case 'url': return <LinkIcon className="h-5 w-5 text-gray-600" />;
      case 'file': return <FileIcon className="h-5 w-5 text-gray-600" />;
      default: return <Type className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <Card className="border-2 border-gray-500 shadow-xl bg-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {getIcon()}
            Original Content
          </h3>
          <div className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg">
            Read Only
          </div>
        </div>
        
        {sourceType === 'url' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Source URL</label>
              <div className="flex items-center gap-2">
                <Input
                  value={sourceUrl || ""}
                  readOnly
                  className="bg-gray-50 border-2 border-gray-300 text-gray-700 cursor-not-allowed"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sourceUrl && window.open(sourceUrl, '_blank')}
                  className="border-gray-500 shadow-sm"
                  disabled={!sourceUrl}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Open Link
                </Button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Extracted Content</label>
              <ScrollArea className="h-[400px] pr-4 border-2 border-gray-300 rounded-lg bg-gray-50 transition-all">
                <div className="p-4">
                  <p className="text-gray-900 leading-relaxed whitespace-pre-wrap font-sans text-sm">
                    {sourceText}
                  </p>
                </div>
              </ScrollArea>
            </div>
            
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {sourceText.length} total characters
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCopy(sourceText)}
                  className="border-gray-500 shadow-sm"
                >
                  {copied ? <Check className="h-4 w-4 mr-2 text-green-600" /> : <Copy className="h-4 w-4 mr-2" />}
                  Copy Extracted Text
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {sourceType === 'video' ? 'Video Transcription' : sourceType === 'file' ? 'Document Content' : 'Text Content'}
            </label>
            <ScrollArea className={`${frameText ? 'h-[250px]' : 'h-[400px]'} pr-4 border-2 border-gray-300 rounded-lg bg-gray-50 transition-all`}>
              <div className="p-4">
                <p className="text-gray-900 leading-relaxed whitespace-pre-wrap font-mono text-sm">
                  {sourceText}
                </p>
              </div>
            </ScrollArea>
            
            {sourceType === 'video' && frameText && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="mt-6"
              >
                <label className="block text-sm font-bold text-blue-700 mb-2 flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Extracted Screen Text (OCR)
                </label>
                <ScrollArea className="h-[200px] pr-4 border-2 border-blue-200 rounded-lg bg-blue-50/30">
                  <div className="p-4">
                    <p className="text-blue-900 leading-relaxed whitespace-pre-wrap font-sans text-sm italic">
                      {frameText}
                    </p>
                  </div>
                </ScrollArea>
              </motion.div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {sourceText.length + (frameText?.length || 0)} total characters
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCopy(frameText ? `${sourceText}\n\n--- Screen Text ---\n${frameText}` : sourceText)}
                  className="border-gray-500 shadow-sm"
                >
                  {copied ? <Check className="h-4 w-4 mr-2 text-green-600" /> : <Copy className="h-4 w-4 mr-2" />}
                  Copy All Content
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
