"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export function LoadingSpinner({ 
  message = "Loading...", 
  delay = 450 
}: { 
  message?: string; 
  delay?: number; 
}) {
  const [shouldShow, setShouldShow] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const timer = setTimeout(() => setShouldShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!shouldShow) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center min-h-[400px] w-full"
    >
      <motion.div
        className="mb-6 relative"
      >
        {/* Transparent Processing Illustration with premium floating animation */}
        <motion.div
          className="relative w-36 h-36 flex items-center justify-center"
          animate={{
            y: [-8, 8, -8],
            scale: [0.97, 1.03, 0.97],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Image
            src="/process.jpeg"
            alt="Processing Content"
            width={144}
            height={144}
            className="w-full h-full object-cover rounded-2xl shadow-md border border-gray-100"
            priority
          />
        </motion.div>
      </motion.div>
      <motion.p 
        className="text-gray-600 font-semibold tracking-wide text-sm animate-pulse"
        animate={{
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {message}
      </motion.p>
    </motion.div>
  );
}
