"use client";

import { motion } from "framer-motion";

const FEATURES = [
  {
    title: "Text Summarization",
    description: "Automatically generate concise summaries of long articles, research papers, and study materials.",
    image: "https://img.freepik.com/free-vector/hand-drawn-essay-illustration_23-2150268421.jpg?w=1060",
  },
  {
    title: "Keyword Extraction",
    description: "Extract important keywords and terms using TF-IDF and RAKE methods for better retention.",
    image: "https://img.freepik.com/premium-vector/keyword-research-illustration-concept_108061-1847.jpg?w=1060",
  },
  {
    title: "Notes Generation",
    description: "Create structured and easy-to-understand notes from study materials automatically.",
    image: "https://img.freepik.com/free-vector/hand-drawn-essay-illustration_23-2150315303.jpg?w=1060",
  },
  {
    title: "AI Chatbot Q/A",
    description: "Intelligent question-answering with Retrieval-Augmented Generation (RAG) and proper references.",
    image: "https://img.freepik.com/free-vector/hand-drawn-flat-design-npl-illustration_23-2149246003.jpg?w=1060",
  },
  {
    title: "Video Transcription",
    description: "Convert lecture videos to text using OpenAI Whisper with multi-language caption support.",
    image: "https://img.freepik.com/free-vector/podcast-social-media-concept_23-2148642673.jpg?w=1060",
  },
  {
    title: "Voice Dubbing",
    description: "Add voice dubbing to videos using gTTS for enhanced auditory learning.",
    image: "https://img.freepik.com/free-vector/podcast-concept-illustration_52683-53645.jpg?w=1060",
  },
  {
    title: "Multi-format Support",
    description: "Process PDFs, Word docs, web links, and videos through a unified extraction system.",
    image: "https://img.freepik.com/free-vector/hand-drawn-web-developers_23-2148815976.jpg?w=1060",
  },
  {
    title: "Semantic Search",
    description: "Fast semantic search using FAISS vector database and SentenceTransformers.",
    image: "https://img.freepik.com/free-vector/gradient-career-cushioning-illustration_52683-140257.jpg?w=1060",
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="flex flex-col pt-12 md:pt-24 bg-[#84C1FA] relative justify-center items-center w-full pb-12 md:pb-24">
      <div className="w-full max-w-[1400px] mx-auto px-4 lg:px-8">
        <div className="hidden md:grid grid-cols-2 gap-4">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.02 }}
              className="bg-white rounded-2xl p-8 flex items-center gap-6 h-[220px] transition-all cursor-pointer shadow-md"
            >
              <div className="w-48 h-32 rounded-xl overflow-hidden flex-shrink-0">
                <img src={feature.image} alt={feature.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-[#38383C] mb-2">{feature.title}</h3>
                <p className="text-sm text-[#66666B] leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile View */}
        <div className="md:hidden flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-4">
          {FEATURES.map((feature, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 flex-shrink-0 w-[80vw] h-[350px] shadow-lg">
              <img src={feature.image} alt={feature.title} className="w-full h-40 object-cover rounded-xl mb-4" />
              <h3 className="text-lg font-bold text-[#38383C] mb-2">{feature.title}</h3>
              <p className="text-sm text-[#66666B]">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
