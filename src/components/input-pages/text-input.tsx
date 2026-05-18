"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Type, Sparkles, FileText, BookOpen, Lightbulb, Zap, ArrowRight, X, CheckCircle2, AlertCircle, Copy, Trash2, Maximize2, Minimize2, Save, HelpCircle, Clock, Target, TrendingUp, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ProcessingAnimation } from '@/components/loading-states';
import { useProgress } from '@/hooks/use-progress';

type TextInputProps = {
  onSubmit: (text: string) => Promise<string | undefined>;
  isProcessing: boolean;
};

export function TextInput({ onSubmit, isProcessing }: TextInputProps) {
  const [text, setText] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const { progress, currentStep, stepProgress, start, complete, reset } = useProgress({ 
    type: 'text', 
    duration: 15000,
    onComplete: () => reset()
  });

  // Auto-save to localStorage
  useEffect(() => {
    if (text) {
      localStorage.setItem('textInput_draft', JSON.stringify({ text }));
      setLastSaved(new Date());
    }
  }, [text]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('textInput_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.text) setText(parsed.text);
      } catch (e) {
        console.error('Error loading draft:', e);
      }
    }
  }, []);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    
    setErrorMessage(null);
    start();
    try {
      const resultId = await onSubmit(text);
      if (resultId) {
        localStorage.removeItem('textInput_draft');
        await complete();
        router.push(`/dashboard/results/${resultId}`);
      }
    } catch (error: any) {
      setErrorMessage(error.message || "An unexpected error occurred. Please try again.");
      reset();
    }
  };

  const handleClear = () => {
    setText('');
    localStorage.removeItem('textInput_draft');
    textareaRef.current?.focus();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const charCount = text.length;
  const paragraphCount = text.trim().split(/\n\n/).filter(Boolean).length;
  const sentenceCount = text.trim().split(/[.!?]+/).filter(Boolean).length;
  const maxChars = 50000;
  const charPercentage = (charCount / maxChars) * 100;
  const isNearLimit = charCount > maxChars * 0.9;
  const readingTime = Math.ceil(wordCount / 200);
  const isValid = text.trim().length >= 10 && wordCount >= 10;

  if (isProcessing) {
    return <ProcessingAnimation type="text" progress={progress} currentStep={currentStep} stepProgress={stepProgress} />;
  }

  return (
    <div className={`min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 ${isFullscreen ? 'fixed inset-0 z-50 overflow-auto' : ''}`}>
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 md:py-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4 mb-4">
            <div className="flex items-center gap-2">
              {lastSaved && (
                <Badge variant="outline" className="text-xs sm:text-sm">
                  <Save className="h-3 w-3 mr-1" />
                  Saved {lastSaved.toLocaleTimeString()}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-xs sm:text-sm"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>

        {/* Hero Section */}
          <div className="text-center mb-6 sm:mb-8">
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
              className="inline-block mb-4"
          >
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-2xl">
                <Type className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            </div>
          </motion.div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-2 sm:mb-4 px-2">
            Text Analysis
          </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto px-2">
            Transform your text into comprehensive summaries, key insights, and study notes with AI
          </p>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Main Form - Left Section */}
          <div className="lg:col-span-8 space-y-4 sm:space-y-6">
            {/* Instructions Card */}
            <AnimatePresence>
              {showInstructions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 sm:p-6 shadow-lg border-2 border-blue-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <h3 className="text-lg font-bold text-gray-900">How to Use</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowInstructions(false)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-3 text-sm sm:text-base text-gray-700">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-gray-900">Step 1:</strong> Paste or type your text content in the text area (minimum 10 words required)
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-gray-900">Step 2:</strong> Review your content stats on the right panel
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-gray-900">Step 3:</strong> Click "Analyze Text with AI" to generate comprehensive analysis
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-gray-900">Tip:</strong> Your content is automatically saved as you type. You can paste articles, notes, research papers, or any text material up to 50,000 characters.
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!showInstructions && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInstructions(true)}
                className="w-full sm:w-auto"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Show Instructions
              </Button>
            )}

            {/* Error Message */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
              >
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{errorMessage}</p>
              </motion.div>
            )}

            {/* Text Input Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-4 sm:p-6 shadow-xl border-2 border-gray-400"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                <Label htmlFor="text-input" className="text-base sm:text-lg font-semibold text-gray-900">
                  Content <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    {wordCount} words
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {charCount.toLocaleString()} chars
                  </Badge>
                  {isNearLimit && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Near limit
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Character Limit Progress Bar */}
              {charCount > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Character Usage</span>
                    <span className={isNearLimit ? 'text-red-600 font-semibold' : ''}>
                      {charCount.toLocaleString()} / {maxChars.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isNearLimit ? 'bg-red-500' : charCount > maxChars * 0.7 ? 'bg-yellow-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(charPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <Textarea
                ref={textareaRef}
                id="text-input"
                placeholder="Paste your text content here... You can paste articles, notes, research papers, or any text material you want to analyze. Minimum 10 words required."
                className={`${isFullscreen ? 'min-h-[60vh]' : 'min-h-[300px] sm:min-h-[400px]'} text-base bg-gray-50 border-2 border-gray-500 text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-blue-600 resize-y rounded-xl font-sans shadow-sm`}
                value={text}
                onChange={(e) => {
                  if (e.target.value.length <= maxChars) {
                    setText(e.target.value);
                  }
                }}
                disabled={isProcessing}
                maxLength={maxChars}
              />
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    disabled={!text}
                    className="text-xs sm:text-sm"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClear}
                    disabled={!text}
                    className="text-xs sm:text-sm text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{paragraphCount} paragraph{paragraphCount !== 1 ? 's' : ''}</span>
                  <span className="text-gray-300">•</span>
                  <span>{sentenceCount} sentence{sentenceCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button 
                onClick={handleSubmit} 
                disabled={isProcessing || !isValid}
                className="w-full h-12 sm:h-14 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center justify-center gap-3">
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
                  Analyze Text with AI
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
              {!isValid && (
                <p className="text-xs sm:text-sm text-red-600 mt-2 text-center">
                  {!text.trim() ? 'Please enter content' : wordCount < 10 ? 'Content must be at least 10 words' : ''}
                </p>
              )}
            </motion.div>
          </div>

          {/* Sidebar - Right Section */}
          <div className="lg:col-span-4 space-y-4 sm:space-y-6">
            {/* What You'll Get Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                What You'll Get
                </CardTitle>
              </CardHeader>
              <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">AI Summary</h4>
                      <p className="text-xs sm:text-sm text-gray-600">Concise overview of your content</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Key Insights</h4>
                      <p className="text-xs sm:text-sm text-gray-600">Important keywords and takeaways</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Study Notes</h4>
                      <p className="text-xs sm:text-sm text-gray-600">Organized notes for easy review</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">AI Chatbot</h4>
                      <p className="text-xs sm:text-sm text-gray-600">Ask questions about your content</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Stats Card */}
            {text && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 sm:p-6 text-white shadow-md"
              >
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-5 w-5" />
                  <h3 className="text-lg font-bold">Content Statistics</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-100" />
                      <span className="text-blue-100 text-sm sm:text-base">Words</span>
                    </div>
                    <span className="font-bold text-lg sm:text-xl">{wordCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Type className="h-4 w-4 text-blue-100" />
                      <span className="text-blue-100 text-sm sm:text-base">Characters</span>
                    </div>
                    <span className="font-bold text-lg sm:text-xl">{charCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-100" />
                      <span className="text-blue-100 text-sm sm:text-base">Paragraphs</span>
                    </div>
                    <span className="font-bold text-lg sm:text-xl">{paragraphCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-100" />
                      <span className="text-blue-100 text-sm sm:text-base">Sentences</span>
                    </div>
                    <span className="font-bold text-lg sm:text-xl">{sentenceCount}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-blue-400/30">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-100" />
                        <span className="text-blue-100 text-sm sm:text-base">Est. Reading</span>
                      </div>
                      <span className="font-bold text-base sm:text-lg">{readingTime} min</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-400/30">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-100" />
                        <span className="text-blue-100 text-sm sm:text-base">Avg. Word Length</span>
                      </div>
                      <span className="font-bold text-base sm:text-lg">
                        {wordCount > 0 ? (charCount / wordCount).toFixed(1) : '0'} chars
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Quick Tips Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Quick Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                    <p>Paste content from any source - articles, notes, research papers</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                    <p>Your work is automatically saved as you type</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                    <p>Title will be auto-generated from your content</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                    <p>Maximum 50,000 characters for optimal performance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
