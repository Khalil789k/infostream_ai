"use client";

import { Button } from "@/components/ui/button";

interface FooterCtaProps {
  onGetStarted: () => void;
}

export function FooterCta({ onGetStarted }: FooterCtaProps) {
  return (
    <section className="w-full py-24 bg-gradient-to-b from-[#002253] to-[#001535] text-white text-center">
      <div className="max-w-[1400px] mx-auto px-6">
        <h2 className="text-4xl md:text-6xl font-bold mb-8">How good ideas get into the universe</h2>
        <Button 
          onClick={onGetStarted}
          className="bg-white text-[#002253] hover:bg-gray-100 rounded-full px-10 py-8 text-xl font-bold shadow-2xl transition-transform hover:scale-105"
        >
          Start for free
        </Button>
        <div className="mt-20">
          <h3 className="text-6xl md:text-9xl font-black text-white/10 tracking-tighter select-none">
            𝕀ℕ𝔽𝕆 𝕊𝕋ℝ𝔼𝔸𝕄 𝔸𝕀
          </h3>
        </div>
      </div>
    </section>
  );
}
