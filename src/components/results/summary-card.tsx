"use client";

import { motion, AnimatePresence } from "framer-motion";
import { BookText, Copy, Check, Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SummaryCardProps {
  summary?: string;
  isProcessing: boolean;
  onGenerate: () => void;
  onCopy: (text: string) => void;
  copied: boolean;
  status: { type: 'success' | 'error'; message: string } | null;
}

export function SummaryCard({ 
  summary, 
  isProcessing, 
  onGenerate, 
  onCopy, 
  copied,
  status 
}: SummaryCardProps) {
  return (
    <Card className="border-2 border-gray-500 shadow-xl bg-white h-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BookText className="h-5 w-5 text-blue-600" />
            Summary
          </h3>
          <div className="flex items-center gap-2">
            {summary && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCopy(summary)}
                className="border-gray-500 shadow-sm"
              >
                {copied ? (
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copy
              </Button>
            )}
            {!summary && (
              <Button
                size="sm"
                onClick={onGenerate}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading Model...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Summary
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {isProcessing && (
          <div className="mb-6 space-y-2">
            <div className="flex justify-between text-sm font-medium text-blue-600">
              <span>Generating AI Summary...</span>
              <span>Processing</span>
            </div>
            <div className="h-2 w-full bg-blue-50 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-blue-600"
                initial={{ width: "0%" }}
                animate={{ width: "90%" }}
                transition={{ duration: 5, ease: "linear" }}
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
                status.type === 'success'
                  ? 'bg-green-50 border-2 border-green-200'
                  : 'bg-red-50 border-2 border-red-200'
              }`}
            >
              {status.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <p className={`text-sm font-medium ${
                status.type === 'success' ? 'text-green-700' : 'text-red-700'
              }`}>
                {status.message}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {summary ? (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6 pb-8">
              {summary.split('\n').map((line, index) => {
                const trimmed = line.trim();
                if (!trimmed && !line.startsWith('---')) return null;

                // Main Headings (## Heading)
                if (line.startsWith('## ')) {
                  const title = line.replace('## ', '');
                  return (
                    <div key={index} className="relative mt-8 first:mt-2">
                      <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full" />
                      <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-transparent p-3 rounded-r-xl">
                        <Sparkles className="h-6 w-6 text-blue-600 animate-pulse" />
                        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight uppercase">
                          {title}
                        </h2>
                      </div>
                    </div>
                  );
                }
                
                // Sub Headings (### Subheading)
                if (line.startsWith('### ')) {
                  return (
                    <div key={index} className="flex items-center gap-2 mt-6 mb-2 text-indigo-700">
                      <div className="p-1 bg-indigo-100 rounded-lg">
                        <BookText className="h-4 w-4" />
                      </div>
                      <h3 className="text-lg font-bold">
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
                      whileHover={{ x: 5 }}
                      className="group flex items-start gap-4 my-3 pl-4 p-3 bg-white border border-transparent hover:border-blue-100 hover:shadow-md rounded-2xl transition-all"
                    >
                      <div className="mt-1.5 flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                        <div className="h-2 w-2 rounded-full bg-blue-600 group-hover:bg-white" />
                      </div>
                      <div className="text-gray-700 leading-relaxed font-medium text-[17px]">
                        {content.split('**').map((part, i) => 
                          i % 2 === 1 ? <strong key={i} className="text-indigo-900 font-bold bg-indigo-50 px-1 rounded">{part}</strong> : part
                        )}
                      </div>
                    </motion.div>
                  );
                }

                // Horizontal Line
                if (line.startsWith('---')) {
                  return (
                    <div key={index} className="relative py-8">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-dashed border-gray-200"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-white px-4 text-sm text-gray-400 font-medium">End of Section</span>
                      </div>
                    </div>
                  );
                }

                // Paragraph with Bold Support
                if (trimmed) {
                  return (
                    <p key={index} className="text-gray-700 leading-relaxed my-5 text-lg pl-2 border-l-4 border-blue-50">
                      {trimmed.split('**').map((part, i) => 
                        i % 2 === 1 ? <strong key={i} className="text-blue-900 font-bold underline decoration-blue-200 underline-offset-4">{part}</strong> : part
                      )}
                    </p>
                  );
                }

                return null;
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <div className="text-center">
              <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Summary not generated yet</p>
              <Button onClick={onGenerate} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Now"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
