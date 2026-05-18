"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Sparkles, Loader2, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NotesCardProps {
  notes?: string;
  isProcessing: boolean;
  onGenerate: () => void;
  onCopy: (text: string) => void;
  copied: boolean;
  status: { type: 'success' | 'error'; message: string } | null;
}

export function NotesCard({ 
  notes, 
  isProcessing, 
  onGenerate, 
  onCopy, 
  copied,
  status 
}: NotesCardProps) {
  return (
    <Card className="border-2 border-gray-500 shadow-xl bg-white h-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            Study Notes
          </h3>
          <div className="flex items-center gap-2">
            {notes && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCopy(notes)}
                className="border-gray-500 shadow-sm"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                <span className="ml-2 hidden sm:inline">Copy</span>
              </Button>
            )}
            {!notes && (
              <Button size="sm" onClick={onGenerate} disabled={isProcessing} className="bg-green-600 hover:bg-green-700 text-white">
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
              </Button>
            )}
          </div>
        </div>

        {isProcessing && (
          <div className="mb-6 space-y-2">
            <div className="flex justify-between text-sm font-medium text-green-600">
              <span>Generating AI Notes...</span>
              <span>Processing</span>
            </div>
            <div className="h-2 w-full bg-green-50 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-green-600"
                initial={{ width: "0%" }}
                animate={{ width: "90%" }}
                transition={{ duration: 7, ease: "linear" }}
              />
            </div>
          </div>
        )}

        <AnimatePresence>
          {status && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                status.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              } border-2`}
            >
              {status.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-red-600" />}
              <p className="text-sm font-medium">{status.message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {notes ? (
          <ScrollArea className="h-[450px] pr-4">
            <div className="space-y-6 pb-8">
              {notes.split('\n').map((line, index) => {
                const trimmed = line.trim();
                if (!trimmed && !line.startsWith('---')) return null;

                // Main Headings (## Heading)
                if (line.startsWith('## ')) {
                  return (
                    <div key={index} className="flex items-center gap-3 mt-8 mb-4 border-b-2 border-green-100 pb-2">
                      <div className="p-2 bg-green-600 rounded-xl shadow-lg shadow-green-200">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <h2 className="text-xl font-black text-gray-900 uppercase tracking-wide">
                        {line.replace('## ', '')}
                      </h2>
                    </div>
                  );
                }
                
                // Sub Headings (### Subheading)
                if (line.startsWith('### ')) {
                  return (
                    <div key={index} className="flex items-center gap-2 mt-6 mb-3">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <h3 className="text-lg font-bold text-green-700">
                        {line.replace('### ', '')}
                      </h3>
                    </div>
                  );
                }

                // Bullet Points (•, -, *, 1., etc.)
                const bulletRegex = /^([•\-*]|\d+\.)\s+/;
                if (bulletRegex.test(trimmed)) {
                  const content = trimmed.replace(bulletRegex, '');
                  return (
                    <motion.div 
                      key={index} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="group flex items-start gap-4 my-4 p-4 bg-gradient-to-br from-white to-green-50/30 border border-green-100 rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-green-500"
                    >
                      <div className="mt-1 flex-shrink-0 h-6 w-6 rounded-lg bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs">
                         {index + 1}
                      </div>
                      <div className="text-gray-700 leading-relaxed font-medium">
                        {content.split('**').map((part, i) => 
                          i % 2 === 1 ? <strong key={i} className="text-green-900 font-extrabold bg-green-100/50 px-1 rounded">{part}</strong> : part
                        )}
                      </div>
                    </motion.div>
                  );
                }

                // Paragraph with Bold Support
                if (trimmed) {
                  return (
                    <p key={index} className="text-gray-700 leading-relaxed my-4 text-md pl-4 border-l-2 border-green-200 italic">
                      {trimmed.split('**').map((part, i) => 
                        i % 2 === 1 ? <strong key={i} className="text-green-900 font-bold">{part}</strong> : part
                      )}
                    </p>
                  );
                }

                return null;
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <div className="text-center p-4">
              <Sparkles className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-3 text-sm">Notes not generated</p>
              <Button size="sm" onClick={onGenerate} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
                Generate Notes
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
