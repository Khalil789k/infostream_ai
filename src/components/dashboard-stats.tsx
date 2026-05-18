"use client";

export function DashboardInfo() {
  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border-2 border-gray-400 shadow-xl w-full flex flex-col h-full">
      <div className="mb-6">
        <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2"></h3>
        <p className="text-gray-600 text-sm md:text-base"></p>
      </div>
      <div className="w-full flex flex-col flex-1">
        <div className="mb-6">
          <div className="relative">
            <div className="h-11 bg-gray-50 border border-gray-400 rounded-lg"></div>
          </div>
        </div>
        <div className="space-y-0 w-full min-h-[280px] flex-1">
          <div className="w-full min-h-[280px] h-full"></div>
        </div>
      </div>
    </div>
  );
}
