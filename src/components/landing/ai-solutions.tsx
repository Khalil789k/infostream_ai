"use client";

import { Sparkles, UploadCloud, Brain, CheckCircle2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AiSolutionsProps {
  onGetStarted: () => void;
}

const AI_FEATURES = [
  { icon: Sparkles, title: "AI-Generated Summaries", description: "Start with AI-powered content generation using specialized models" },
  { icon: UploadCloud, title: "Upload Any Format", description: "Transform PDFs, documents, videos, and web URLs" },
  { icon: Brain, title: "Smart Processing", description: "Extract keywords, generate notes, and answer questions" },
];

export function AiSolutions({ onGetStarted }: AiSolutionsProps) {
  return (
    <>
      <section className="w-full py-20 bg-blue-50">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h3 className="text-3xl font-bold mb-4">Get started with AI</h3>
            <p className="text-lg text-gray-600 mb-8">Create amazing study materials in seconds with our AI-powered suite.</p>
            <div className="space-y-4">
              {AI_FEATURES.map((f, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/50 transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <f.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{f.title}</h4>
                    <p className="text-sm text-gray-600">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold mb-6">Skip the blank page.</h3>
            <ul className="space-y-4 mb-8">
              {['Upload PDFs, videos, or URLs', 'AI summarization & keyword extraction', 'Multi-language voice dubbing', 'RAG-powered chatbot with references'].map((text, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-gray-600">{text}</span>
                </li>
              ))}
            </ul>
            <Button onClick={onGetStarted} className="bg-blue-600 hover:bg-blue-700 rounded-full px-8 py-6 text-lg">Start for free</Button>
          </div>
        </div>
      </section>

      <section className="w-full py-20 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h3 className="text-3xl font-bold mb-6">Edit with AI, instantly.</h3>
            <div className="space-y-4 mb-8">
              {['Instantly extract keywords', 'Enhance content with AI suggestions', 'Collaborate in real-time'].map((text, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-orange-500" />
                  <span className="text-gray-600">{text}</span>
                </div>
              ))}
            </div>
            <Button onClick={onGetStarted} className="bg-orange-500 hover:bg-orange-600 rounded-full px-8 py-6 text-lg">Start for free</Button>
          </div>
          <div className="relative rounded-2xl overflow-hidden shadow-2xl">
            <img src="https://img.freepik.com/free-vector/flat-design-rebranding-illustration_23-2149481432.jpg?w=1480" alt="Edit AI" className="w-full h-auto" />
          </div>
        </div>
      </section>
    </>
  );
}
