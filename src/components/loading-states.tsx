"use client";

import { motion } from 'framer-motion';
import { Sparkles, FileText, Video, Link, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

type LoadingStateProps = {
  type: 'text' | 'video' | 'document' | 'url';
  progress?: number;
  currentStep?: number;
  stepProgress?: number;
};

export function ProcessingAnimation({ type, progress = 0 }: LoadingStateProps) {
  return (
    <div className="min-h-screen w-full bg-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col items-center">
        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-full mb-8 relative"
        >
          <Image 
            src="/process_transparent.png" 
            alt="Processing" 
            width={500} 
            height={500} 
            className="object-cover w-full h-auto"
            priority
          />
        </motion.div>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Processing Your Content</h3>
        <p className="text-gray-600 mb-8 text-center">Our AI is working hard to analyze your materials</p>
        
        <div className="w-full bg-gray-100 rounded-full h-3 mb-6 overflow-hidden shadow-inner border border-gray-200">
          <motion.div
            className="bg-blue-600 h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
        
        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
          <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse"></div>
          <p className="text-sm font-semibold">
            {progress > 0 ? `${Math.round(progress)}% Complete` : 'Starting...'}
          </p>
        </div>
      </div>
    </div>
  );
}
