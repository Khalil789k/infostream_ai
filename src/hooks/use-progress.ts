import { useState, useEffect, useRef } from 'react';

type ProgressOptions = {
  type: 'text' | 'video' | 'document' | 'url';
  duration?: number; // Expected duration in ms
  onComplete?: () => void;
  onStepChange?: (stepIndex: number, stepProgress: number) => void;
};

// Step ranges for each type
const stepRanges = {
  text: [
    { start: 0, end: 25, label: 'Analyzing text' },
    { start: 25, end: 50, label: 'Generating summary' },
    { start: 50, end: 75, label: 'Extracting keywords' },
    { start: 75, end: 100, label: 'Creating notes' },
  ],
  video: [
    { start: 0, end: 30, label: 'Extracting audio' },
    { start: 30, end: 60, label: 'Transcribing speech' },
    { start: 60, end: 85, label: 'Generating captions' },
    { start: 85, end: 100, label: 'Creating summary' },
  ],
  document: [
    { start: 0, end: 30, label: 'Extracting content' },
    { start: 30, end: 60, label: 'Processing text' },
    { start: 60, end: 85, label: 'Analyzing structure' },
    { start: 85, end: 100, label: 'Generating insights' },
  ],
  url: [
    { start: 0, end: 30, label: 'Fetching content' },
    { start: 30, end: 60, label: 'Extracting text' },
    { start: 60, end: 85, label: 'Processing data' },
    { start: 85, end: 100, label: 'Generating analysis' },
  ],
};

export function useProgress({ type, duration, onComplete, onStepChange }: ProgressOptions) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const steps = stepRanges[type];

  const updateStepInfo = (currentProgress: number) => {
    // Find current step
    let stepIndex = 0;
    for (let i = steps.length - 1; i >= 0; i--) {
      if (currentProgress >= steps[i].start) {
        stepIndex = i;
        break;
      }
    }

    const step = steps[stepIndex];
    const stepRange = step.end - step.start;
    const progressInStep = currentProgress - step.start;
    const stepProgressPercent = Math.min((progressInStep / stepRange) * 100, 100);

    setCurrentStep(stepIndex);
    setStepProgress(stepProgressPercent);
    onStepChange?.(stepIndex, stepProgressPercent);
  };

  const start = () => {
    setProgress(0);
    setCurrentStep(0);
    setStepProgress(0);
    startTimeRef.current = Date.now();
    
    const expectedDuration = duration || (
      type === 'video' ? 60000 : 
      type === 'document' ? 30000 : 
      type === 'url' ? 20000 : 
      15000
    );
    
    const interval = 100; // Update every 100ms

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - (startTimeRef.current || Date.now());
      let newProgress = (elapsed / expectedDuration) * 100;
      
      // Cap at 95% until API call completes
      if (newProgress >= 95) {
        newProgress = 95;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
      
      setProgress(newProgress);
      updateStepInfo(newProgress);
    }, interval);
  };

  const complete = (): Promise<void> => {
    return new Promise((resolve) => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Smoothly animate the rest of the progress bar to 100% over 800ms
      const currentProg = progress;
      const remainingProg = 100 - currentProg;
      const fastInterval = 20; // update every 20ms
      const timeToComplete = 800; // take 800ms to finish
      const stepSize = remainingProg / (timeToComplete / fastInterval);
      
      let tempProgress = currentProg;
      
      const finishInterval = setInterval(() => {
        tempProgress += stepSize;
        if (tempProgress >= 100) {
          tempProgress = 100;
          clearInterval(finishInterval);
          setProgress(100);
          setCurrentStep(steps.length - 1);
          setStepProgress(100);
          updateStepInfo(100);
          
          setTimeout(() => {
            onComplete?.();
            resolve();
          }, 300);
        } else {
          setProgress(tempProgress);
          updateStepInfo(tempProgress);
        }
      }, fastInterval);
    });
  };

  const reset = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProgress(0);
    setCurrentStep(0);
    setStepProgress(0);
    startTimeRef.current = null;
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { 
    progress, 
    currentStep, 
    stepProgress, 
    steps,
    start, 
    complete, 
    reset 
  };
}
