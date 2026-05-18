"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  onLogin: () => void;
  onGetStarted: () => void;
}

export function Navbar({ onLogin, onGetStarted }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md shadow-sm transition-all duration-300">
      <div className="w-full max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-[#002253]">INFO STREAM AI</span>
          </motion.div>

          <div className="hidden md:flex items-center gap-4">
            <Button 
              variant="outline" 
              className="text-sm font-semibold text-gray-700 border-gray-300 hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50/30 rounded-full px-5 py-2 h-9 transition-all duration-200" 
              onClick={onLogin}
            >
              Log in
            </Button>
            <Button 
              onClick={onGetStarted} 
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2 h-9 rounded-full font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            >
              Start for free
            </Button>
          </div>

          <button
            className="md:hidden flex flex-col justify-center items-center gap-1.5 p-2 w-10 h-10"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <div className="relative w-6 h-4 flex items-center justify-center">
                <span className="absolute block w-6 h-0.5 bg-gray-900 transform rotate-45 transition-transform duration-300"></span>
                <span className="absolute block w-6 h-0.5 bg-gray-900 transform -rotate-45 transition-transform duration-300"></span>
              </div>
            ) : (
              <>
                <span className="block w-6 h-0.5 bg-gray-900 transition-all duration-300"></span>
                <span className="block w-6 h-0.5 bg-gray-900 transition-all duration-300"></span>
              </>
            )}
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden w-full bg-gradient-to-b from-white to-sky-200 overflow-hidden border-b border-gray-100 shadow-lg"
          >
            <div className="px-4 sm:px-6 py-4 space-y-3">
              <Button onClick={onGetStarted} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full text-base font-bold py-3 shadow-md">Start for free</Button>
              <Button onClick={onLogin} className="w-full bg-white hover:bg-blue-50 text-gray-800 border border-gray-300 hover:border-blue-600 hover:text-blue-600 rounded-full text-base font-bold py-3 transition-colors">Log in</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
