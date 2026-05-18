"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, UploadCloud, X, Sparkles, CheckCircle2, HelpCircle, Maximize2, Minimize2, Info, Zap, Languages, BookOpen, Lightbulb, ArrowRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ProcessingAnimation } from '@/components/loading-states';
import { useProgress } from '@/hooks/use-progress';
import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

type DocumentInputProps = {
  onSubmit: (file: File, fileName: string) => Promise<string | undefined>;
  isProcessing: boolean;
};

export function DocumentInput({ onSubmit, isProcessing }: DocumentInputProps) {
  const [docFile, setDocFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { progress, currentStep, stepProgress, start, complete, reset } = useProgress({ 
    type: 'document', 
    duration: 30000,
    onComplete: () => reset()
  });

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let file: File | null = null;
    if ('dataTransfer' in e) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      file = e.dataTransfer.files?.[0] || null;
    } else {
      file = e.target.files?.[0] || null;
    }

    if (!file) return;

    const maxSizeMB = 10;
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a PDF or Word document (.pdf, .doc, .docx).");
      setTimeout(() => setError(null), 5000);
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Please upload a file smaller than ${maxSizeMB}MB.`);
      setTimeout(() => setError(null), 5000);
      return;
    }

    setError(null);
    setDocFile(file);
  };

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement | HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragover" || e.type === "dragenter") {
      setIsDragOver(true);
    } else if (e.type === "dragleave" || e.type === "drop") {
      setIsDragOver(false);
    }
  };

  const handleAnalyze = async () => {
    if (!docFile) return;
    
    setError(null);
    start();
    try {
      const shortTitle = docFile.name.substring(0, docFile.name.lastIndexOf('.')) || docFile.name;
      const resultId = await onSubmit(docFile, shortTitle);
      if (resultId) {
        await complete();
        router.push(`/dashboard/results/${resultId}`);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
      reset();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleClear = () => {
    setDocFile(null);
    setPageCount(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileType = (type: string) => {
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('wordprocessingml') || type.includes('msword')) return 'Word';
    return 'Document';
  };

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toUpperCase() || 'DOC';
  };

  const maxSizeMB = 10;
  const fileSizeMB = docFile ? (docFile.size / (1024 * 1024)).toFixed(2) : '0';
  const sizePercentage = docFile ? ((docFile.size / (maxSizeMB * 1024 * 1024)) * 100) : 0;
  const isNearLimit = docFile ? docFile.size > maxSizeMB * 1024 * 1024 * 0.9 : false;

  if (isProcessing) {
    return <ProcessingAnimation type="document" progress={progress} currentStep={currentStep} stepProgress={stepProgress} />;
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
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center shadow-2xl">
                <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
            </motion.div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-2 sm:mb-4 px-2">
              Document Analysis
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto px-2">
              Upload PDF or Word documents to extract text, generate summaries, and create study notes with AI
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
                  className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 sm:p-6 shadow-lg border-2 border-green-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
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
                        <strong className="text-gray-900">Step 1:</strong> Click the upload area or drag & drop your document (PDF, DOC, or DOCX)
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-gray-900">Step 2:</strong> Review your document details (maximum 10MB)
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-gray-900">Step 3:</strong> Click "Process Document with AI" to extract text and generate analysis
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-gray-900">Step 4:</strong> Get AI-generated summaries, keywords, notes, and translations
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-green-200">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-gray-900">Tip:</strong> Supported formats: PDF, DOC, DOCX. Maximum file size: 10MB. Text extraction works best with clear, readable documents.
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
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
          >
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </motion.div>
            )}

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-4 sm:p-6 shadow-xl border-2 border-gray-400"
        >
          {docFile ? (
                <div className="space-y-4">
                  {/* File Info */}
                  <div className="bg-gray-50 rounded-xl p-4 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-green-100">
                          <FileText className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-base sm:text-lg">{docFile.name}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {getFileType(docFile.type)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {getFileExtension(docFile.name)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {formatFileSize(docFile.size)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* File Size Progress */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>File Size Usage</span>
                        <span className={isNearLimit ? 'text-red-600 font-semibold' : ''}>
                          {fileSizeMB} MB / {maxSizeMB} MB
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            isNearLimit ? 'bg-red-500' : sizePercentage > 70 ? 'bg-yellow-500' : 'bg-green-600'
                          }`}
                          style={{ width: `${Math.min(sizePercentage, 100)}%` }}
                        />
                </div>
                </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-gray-200">
                  <Button 
                    onClick={handleAnalyze} 
                    disabled={isProcessing}
                        className="flex-1 h-12 sm:h-14 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-bold text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl group"
                  >
                        <span className="flex items-center justify-center gap-3">
                          <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
                          Process Document with AI
                          <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                        className="h-12 border-2 border-gray-500 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl shadow-sm" 
                        onClick={handleClear} 
                    disabled={isProcessing}
                  >
                        <Trash2 className="mr-2 h-4 w-4"/> Remove
                  </Button>
                </div>
              </div>
                </div>
          ) : (
            <label
              htmlFor="doc-upload"
              className={cn(
                    "relative flex h-64 sm:h-80 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-all duration-300",
                isDragOver
                  ? "border-green-500 bg-green-50 shadow-xl scale-[1.02]"
                  : "border-gray-500 bg-gray-100 hover:border-green-500 hover:bg-green-50/50 hover:shadow-xl"
              )}
              onDragOver={handleDragEvents}
              onDragEnter={handleDragEvents}
              onDragLeave={handleDragEvents}
              onDrop={(e) => handleFileSelection(e)}
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-6 rounded-full bg-gradient-to-r from-green-500 to-green-600 mb-6 shadow-lg"
              >
                    <UploadCloud className="h-12 w-12 sm:h-16 sm:w-16 text-white" />
              </motion.div>
                  <p className="font-bold text-gray-900 text-lg sm:text-xl mb-2">Drag & drop your document</p>
                  <p className="text-gray-600 mb-6 text-sm sm:text-base">or click to browse</p>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
                <FileText className="h-4 w-4 text-green-600" />
                    <span className="text-xs sm:text-sm font-medium text-gray-700">
                  .pdf, .doc, .docx up to 10MB
                </span>
              </div>
              <Input
                    ref={fileInputRef}
                id="doc-upload"
                type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => handleFileSelection(e)}
                disabled={isProcessing}
                className="absolute h-full w-full opacity-0 cursor-pointer"
              />
            </label>
          )}
        </motion.div>
          </div>

          {/* Sidebar - Right Section */}
          <div className="lg:col-span-4 space-y-4 sm:space-y-6">
            {/* What You'll Get Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  What You'll Get
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Text Extraction</h4>
                      <p className="text-xs sm:text-sm text-gray-600">Extract all text from PDF and Word documents</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">AI Summary</h4>
                      <p className="text-xs sm:text-sm text-gray-600">Comprehensive summaries of your content</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Study Notes</h4>
                      <p className="text-xs sm:text-sm text-gray-600">Organized notes for easy review</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Languages className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Translation</h4>
                      <p className="text-xs sm:text-sm text-gray-600">Multi-language translation support</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Document Stats Card */}
            {docFile && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 sm:p-6 text-white shadow-md"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Info className="h-5 w-5" />
                  <h3 className="text-lg font-bold">Document Information</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-green-100 text-sm sm:text-base">File Size</span>
                    <span className="font-bold text-base sm:text-lg">{formatFileSize(docFile.size)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-green-100 text-sm sm:text-base">Format</span>
                    <span className="font-bold text-base sm:text-lg">{getFileType(docFile.type)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-green-100 text-sm sm:text-base">Extension</span>
                    <span className="font-bold text-base sm:text-lg">{getFileExtension(docFile.name)}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-green-400/30">
                    <div className="flex justify-between items-center">
                      <span className="text-green-100 text-sm sm:text-base">Est. Processing</span>
                      <span className="font-bold text-base sm:text-lg">1-2 min</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Quick Tips Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Quick Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-600 mt-1.5 flex-shrink-0" />
                    <p>Supported formats: PDF, DOC, DOCX</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-600 mt-1.5 flex-shrink-0" />
                    <p>Maximum file size: 10MB for optimal performance</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-600 mt-1.5 flex-shrink-0" />
                    <p>Text extraction works best with clear, readable documents</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-600 mt-1.5 flex-shrink-0" />
                    <p>Scanned PDFs may require OCR for text extraction</p>
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
