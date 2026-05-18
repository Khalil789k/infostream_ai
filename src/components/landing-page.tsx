"use client";

import { Navbar } from "./landing/navbar";
import { Hero } from "./landing/hero";
import { FeaturesGrid } from "./landing/features-grid";
import { AiSolutions } from "./landing/ai-solutions";
import { DevelopersSection } from "./landing/developers-section";
import { FooterCta } from "./landing/footer-cta";

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  return (
    <div className="relative min-h-screen w-full bg-white overflow-x-clip">
      <Navbar onLogin={onLogin} onGetStarted={onGetStarted} />
      
      <main>
        <Hero onGetStarted={onGetStarted} />
        
        <FeaturesGrid />
        
        <AiSolutions onGetStarted={onGetStarted} />
        
        <DevelopersSection />
        
        <FooterCta onGetStarted={onGetStarted} />
      </main>

      {/* Simple & Professional Footer */}
      <footer className="bg-[#001535] border-t border-white/10 text-white py-12 px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-left">
          {/* Brand Column */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold tracking-wider text-white">
              INFO STREAM <span className="text-[#3b82f6]">AI</span>
            </h3>
            <p className="text-white/60 text-sm leading-relaxed max-w-xs">
              A platform to transcribe video audio, summarize documents, and translate text to Pakistan Sign Language.
            </p>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="text-sm font-semibold tracking-wider text-[#3b82f6] mb-3">
              Features
            </h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Video Processing
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Sign Language Translation
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Document Summaries
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  AI Assistant
                </a>
              </li>
            </ul>
          </div>

          {/* Tech Stack Column */}
          <div>
            <h4 className="text-sm font-semibold tracking-wider text-[#3b82f6] mb-3">
              Tech Stack
            </h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>Next.js & React</li>
              <li>Python & Flask</li>
              <li>PyTorch Models</li>
              <li>PostgreSQL Database</li>
            </ul>
          </div>

          {/* Links Column */}
          <div>
            <h4 className="text-sm font-semibold tracking-wider text-[#3b82f6] mb-3">
              Links
            </h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <a href="/login" className="hover:text-white transition-colors">
                  Login
                </a>
              </li>
              <li>
                <a href="/signup" className="hover:text-white transition-colors">
                  Register
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-xs text-white/40">
          <p>© 2026 Info Stream AI. All rights reserved.</p>
          <div className="flex space-x-4 mt-3 md:mt-0">
            <span>Runs Locally</span>
            <span>&bull;</span>
            <span>Offline Processing</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
