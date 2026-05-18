"use client";

import { motion } from "framer-motion";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const IMAGES = [
  [
    "https://img.freepik.com/free-vector/flat-design-rebranding-illustration_23-2149514467.jpg?w=1060",
    "https://img.freepik.com/premium-vector/video-editor-tiny-people-footage-editing-making-multimedia-content-production-video-maker_501813-941.jpg?w=1060",
    "https://img.freepik.com/premium-vector/smart-ai-chat-bot-communicate-with-human_36244-1219.jpg?w=1060",
  ],
  [
    "https://img.freepik.com/free-vector/business-items-composition_98292-7566.jpg?w=1060",
    "https://img.freepik.com/free-vector/sci-fi-artificial-intelligence-tech-concept-background-design_1017-50175.jpg?w=1060",
  ],
  [
    "https://img.freepik.com/free-vector/vector-document-vector-colorful-design_341269-1306.jpg?w=1060",
    "https://img.freepik.com/premium-vector/creative-template-infographic-with-post-it-pencil_281653-4922.jpg?w=1060",
    "https://img.freepik.com/free-vector/awesome-voice-user-interface-command-concept-mobile-phone-with-sound-wave-equalizer_39422-986.jpg?w=1060",
  ],
  [
    "https://img.freepik.com/premium-vector/keywords-research-seo-search-engine-optimization-bidding-search-result-page-promote-web_926199-3675559.jpg?w=1060",
    "https://img.freepik.com/free-vector/hand-drawn-translation-services-illustration_23-2151109064.jpg?w=1060",
  ],
];

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div 
      className="relative min-h-screen w-full overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #84C1FA 0%, #A8D1FF 25%, #CDDAFA 50%, #FFFFFF 100%)' }}
    >
      {/* Visual Background Cards */}
      <div className="absolute inset-0 overflow-hidden hidden lg:block opacity-50">
        <div 
          className="absolute flex gap-5"
          style={{ transform: 'rotate(-12deg)', top: '-30%', right: '0%', width: '55%', height: '180%' }}
        >
          {IMAGES.map((col, idx) => (
            <div key={idx} className="w-[200px] flex-shrink-0 h-full overflow-hidden">
              <div 
                className={`flex flex-col gap-6 ${idx % 2 === 0 ? 'animate-scroll-up' : 'animate-scroll-down'}`}
                style={{ animationDuration: '300s' }}
              >
                {[...col, ...col, ...col, ...col].map((img, i) => (
                  <div key={i} className="w-full h-[280px] rounded-2xl overflow-hidden bg-white p-3 shadow-xl">
                    <img src={img} alt="" className="w-full h-full object-cover rounded-xl" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <main className="relative z-20 h-screen overflow-y-auto flex items-center justify-center lg:justify-start">
        <div className="w-full lg:w-[50%] p-6 md:p-12 lg:p-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-[440px] mx-auto lg:mx-0">
            {children}
          </motion.div>
        </div>
      </main>

      <style jsx>{`
        @keyframes scrollUp { from { transform: translateY(0); } to { transform: translateY(-50%); } }
        @keyframes scrollDown { from { transform: translateY(-50%); } to { transform: translateY(0); } }
        .animate-scroll-up { animation: scrollUp linear infinite; }
        .animate-scroll-down { animation: scrollDown linear infinite; }
      `}</style>
    </div>
  );
}
