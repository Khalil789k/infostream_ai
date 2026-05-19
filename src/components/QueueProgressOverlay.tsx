"use client";

import React, { useEffect, useState } from 'react';
import { getQueueStatus, cancelQueueTask } from '@/lib/api/process';
import { Loader2, AlertCircle, XCircle, ArrowRight, UserCheck, ShieldAlert } from 'lucide-react';
import { Button } from './ui/button';

interface QueueProgressOverlayProps {
  taskId: string;
  onComplete: (result: any) => void;
  onCancel: () => void;
  taskType?: string;
}

export function QueueProgressOverlay({
  taskId,
  onComplete,
  onCancel,
  taskType = "AI Task"
}: QueueProgressOverlayProps) {
  const [status, setStatus] = useState<'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'>('queued');
  const [position, setPosition] = useState<number>(1);
  const [totalQueued, setTotalQueued] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [dots, setDots] = useState<string>('...');

  // Heartbeat animation dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '.' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Poll status
  useEffect(() => {
    let active = true;
    const pollInterval = setInterval(async () => {
      if (!taskId || !active) return;
      try {
        const response = await getQueueStatus(taskId);
        if (!active) return;

        setStatus(response.status);
        setPosition(response.position);
        setTotalQueued(response.total_queued);

        if (response.status === 'completed') {
          clearInterval(pollInterval);
          onComplete(response.result);
        } else if (response.status === 'failed') {
          clearInterval(pollInterval);
          setErrorMsg(response.error || "Execution failed.");
        } else if (response.status === 'cancelled') {
          clearInterval(pollInterval);
          onCancel();
        }
      } catch (err) {
        console.error("Queue status polling failed:", err);
      }
    }, 1500);

    return () => {
      active = false;
      clearInterval(pollInterval);
    };
  }, [taskId, onComplete, onCancel]);

  // Keep status in ref so unmount cleanup reads the latest value without re-triggering the effect on every status transition
  const statusRef = React.useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Page Exit Prevention (beforeunload) and actual component unmount auto-cancellation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Warning: AI processing is active. Leaving the page will cancel your request and release your spot in the queue.";
      
      // Attempt best effort cancellation using synchronous beacon
      try {
        const cancelUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/process/queue/cancel/${taskId}`;
        navigator.sendBeacon(cancelUrl);
      } catch (err) {
        console.error(err);
      }
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Auto-cancel request on actual component unmount if it's still running/queued
      if (statusRef.current === 'queued' || statusRef.current === 'processing') {
        cancelQueueTask(taskId).catch(console.error);
      }
    };
  }, [taskId]);

  const handleCancelClick = async () => {
    try {
      await cancelQueueTask(taskId);
      onCancel();
    } catch (err) {
      console.error("Failed to cancel task:", err);
      onCancel(); // Force cancel on client side
    }
  };

  const getTaskName = () => {
    switch (taskType) {
      case 'video': return 'Video Transcription & Analytics';
      case 'document': return 'Document Context Extraction';
      case 'url': return 'URL Scraper & Video Downloader';
      case 'all_features': return 'Generating Summaries, Keywords & Notes';
      case 'summary': return 'Generating AI Summary';
      case 'notes': return 'Generating Interactive Study Notes';
      case 'captions': return 'Generating Speech-synchronized Urdu Captions';
      case 'translation': return 'Urdu Neural Translation';
      case 'dubbing': return 'Synchronized Voice Dubbing Engine';
      default: return taskType;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 transition-all duration-300 animate-in fade-in">
      <div className="relative max-w-lg w-full bg-slate-900 border-2 border-black rounded-2xl p-8 shadow-[0_0_50px_-12px_rgba(139,92,246,0.3)] flex flex-col items-center text-center overflow-hidden">
        {/* Decorative Glowing Neural Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-slate-950/0 to-slate-950/0 pointer-events-none" />

        {/* Heading */}
        <div className="z-10 flex flex-col items-center">
          <div className="flex items-center space-x-2 bg-violet-950/50 border border-violet-800/50 text-violet-300 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
            <span>AI Request in Progress</span>
          </div>

          <h3 className="text-xl font-bold text-white mb-2 leading-snug">
            {getTaskName()}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mb-8 leading-relaxed">
            Exactly one request is processed globally at a time to prevent server crashes and optimize AI speeds.
          </p>
        </div>

        {/* Dynamic State Display */}
        <div className="z-10 w-full bg-slate-950/60 border border-slate-800 rounded-xl p-6 mb-6 flex flex-col items-center relative">
          {status === 'queued' || status === 'processing' ? (
            <>
              {/* Queue Circle Animation */}
              <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
                <div className={`absolute inset-0 rounded-full border-4 border-t-transparent animate-spin ${status === 'processing' ? 'border-emerald-400' : 'border-violet-500'}`} />
                <div className="flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold text-white">
                    {status === 'processing' ? "Active" : `#${position}`}
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black">
                    {status === 'processing' ? "Processing" : "In Queue"}
                  </span>
                </div>
              </div>

              <div className="w-full flex items-center justify-between text-sm text-slate-400 px-2">
                <span>Active Server Worker</span>
                <span className={`font-bold flex items-center space-x-1 animate-pulse ${status === 'processing' ? 'text-emerald-400' : 'text-violet-400'}`}>
                  <span>{status === 'processing' ? "Executing Task" : "Occupied"}</span>
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3 mb-2">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${status === 'processing' ? 'bg-emerald-500 w-full' : 'bg-violet-500'}`} 
                  style={status === 'processing' ? {} : { width: `${Math.max(10, Math.min(100, 100 - (position - 1) * 20))}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-2 px-2">
                {status === 'processing' 
                  ? "Server has claimed your task! Powering AI neural models (Whisper, BART Summarizer, and Opus Neural Dubber)..." 
                  : position === 1 
                    ? "You are next! Standing by to initialize AI models..." 
                    : `Waiting for ${position - 1} task(s) ahead to finish...`}
              </p>
            </>
          ) : status === 'failed' ? (
            <>
              <XCircle className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
              <span className="text-lg font-bold text-rose-400 mb-1">Processing Failed</span>
              <p className="text-xs text-rose-300 bg-rose-950/20 border border-rose-900/30 p-3 rounded-lg max-w-sm">
                {errorMsg}
              </p>
            </>
          ) : (
            <>
              <Loader2 className="w-12 h-12 text-slate-500 animate-spin mb-4" />
              <span className="text-sm text-slate-400">Finalizing content pipeline...</span>
            </>
          )}
        </div>

        {/* Strict Page Exit Warning Card */}
        <div className="z-10 w-full bg-amber-950/20 border border-amber-900/30 rounded-xl px-4 py-3.5 mb-8 flex items-start space-x-3 text-left">
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-400">Page Navigation Lock Active</h4>
            <p className="text-[10px] text-amber-200/80 leading-relaxed mt-0.5">
              Please do not navigate away, reload, or close this tab. Leaving the screen will automatically cancel your task to free up AI resources for other users.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="z-10 w-full flex items-center justify-center">
          <Button
            variant="destructive"
            onClick={handleCancelClick}
            className="w-full sm:w-auto px-6 py-5 border-2 border-black bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm tracking-wide rounded-xl shadow-[4px_4px_0px_#000] active:translate-y-0.5 active:shadow-[2px_2px_0px_#000] transition-all flex items-center justify-center space-x-2"
          >
            <XCircle className="w-4 h-4" />
            <span>Cancel & Leave Queue</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
