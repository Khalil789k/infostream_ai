"use client";

const DEVELOPERS = [
  { name: "Khalil Ahmad" },
  { name: "Muhammad Nawaz Qasim" },
  { name: "Attique Ur Rehman" },
  { name: "Aqeel Ur Rehman" },
];

export function DevelopersSection() {
  return (
    <section className="w-full py-20 bg-blue-50 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 flex items-center justify-center pointer-events-none">
        <span className="text-9xl font-bold">INFO STREAM AI</span>
      </div>
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 relative z-10">
        <h2 className="text-3xl font-extrabold text-center mb-12 tracking-tight text-gray-900">About the Developers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {DEVELOPERS.map((dev, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex items-center justify-center min-h-[90px] text-center">
              <p className="font-extrabold text-lg text-gray-900 tracking-tight">{dev.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
