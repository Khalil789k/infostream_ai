"use client";

const DEVELOPERS = [
  { name: "Khalil Ahmad", role: "Lead Developer", description: "Passionate about AI-powered learning solutions.", avatar: "KA" },
  { name: "Muhammad Nawaz Qasim", role: "Developer", description: "Focused on seamless UX and NLP tech.", avatar: "MN" },
  { name: "Attique Ur Rehman", role: "Developer", description: "Dedicated to robust backend systems.", avatar: "AU" },
  { name: "Aqeel Ur Rehman", role: "Developer", description: "Optimizing AI performance and deployment.", avatar: "AQ" },
];

export function DevelopersSection() {
  return (
    <section className="w-full py-24 bg-blue-50 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 flex items-center justify-center">
        <span className="text-9xl font-bold">INFO STREAM AI</span>
      </div>
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 relative z-10">
        <h2 className="text-4xl font-bold text-center mb-16">About the Developers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {DEVELOPERS.map((dev, i) => (
            <div key={i} className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm transition-transform hover:-translate-y-1">
              <p className="text-gray-600 mb-6 italic">"{dev.description}"</p>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">{dev.avatar}</div>
                <div>
                  <p className="font-bold text-gray-900">{dev.name}</p>
                  <p className="text-sm text-gray-500">{dev.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
