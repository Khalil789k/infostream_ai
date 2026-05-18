"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Image from "next/image";
import { ArrowRight, PlayCircle } from "lucide-react";

interface HeroProps {
  onGetStarted: () => void;
}

const IMAGES = [
  "https://img.freepik.com/premium-vector/all-data-concept-illustration_114360-4188.jpg?w=1060",
  "https://img.freepik.com/free-vector/content-creator-editing-video-footage-studio-editor-publishing-viral-video-social-media-multimedia-production-flat-vector-illustration-motion-design-concept-banner-landing-web-page_74855-21752.jpg?t=st=1765168856~exp=1765172456~hmac=f2c2426419d2c7ce0525bf29936914f77c67469336035227df084f5e95e74d0a&w=1480",
  "https://img.freepik.com/free-vector/organic-flat-printing-industry-illustration_23-2148909840.jpg?t=st=1765168920~exp=1765172520~hmac=88d6adba37f829c47de5be474c43508517e732668a4f0fd1682831c15db33519&w=1060"
];

export function Hero({ onGetStarted }: HeroProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDirection(1);
      setActiveImage((prev) => (prev + 1) % IMAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative z-10 w-full pt-8 pb-12 sm:pt-12 sm:pb-16 md:pt-16 md:pb-20 lg:pt-6 lg:pb-32">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="mb-6">
              <Image src="/logo.svg" alt="Logo" width={80} height={80} className="w-12 h-12 sm:w-16 sm:h-16 object-contain" priority />
            </div>
            <h1 className="mb-4 text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-[#002253]">
              Effortless AI study for <span className="text-[#002253]">summaries, notes,</span> and more
            </h1>
            <p className="mb-8 text-base sm:text-lg text-gray-600 leading-relaxed max-w-xl">
              A comprehensive AI study assistant? Easy. Detailed lecture notes? Done. Video transcriptions with translations? Complete.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button 
                onClick={onGetStarted}
                className="group relative bg-gradient-to-r from-blue-600 to-blue-700 text-white text-lg font-semibold px-8 py-3 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 overflow-hidden flex items-center justify-center gap-2"
              >
                Start for free <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <a 
                href="#features"
                className="flex items-center justify-center bg-white text-gray-800 text-lg font-semibold px-8 py-3 rounded-full border-2 border-gray-200 hover:bg-gray-50 transition-all hover:scale-105"
              >
                Explore features
              </a>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="relative w-full h-[280px] sm:h-[400px] lg:h-[500px] overflow-hidden rounded-2xl">
            <AnimatePresence custom={direction}>
              <motion.div
                key={activeImage}
                custom={direction}
                initial={{ y: direction > 0 ? "100%" : "-100%", opacity: 1 }}
                animate={{ y: "0%", opacity: 1 }}
                exit={{ y: direction > 0 ? "-100%" : "100%", opacity: 1 }}
                transition={{ type: "tween", ease: "easeInOut", duration: 0.8 }}
                className="absolute inset-0"
              >
                <Image src={IMAGES[activeImage]} alt="Hero" fill className="object-contain" priority unoptimized />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
