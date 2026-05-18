"use client";

import { User } from 'lucide-react';
import { motion } from 'framer-motion';

type ProfileCardsProps = {
  onProfileClick: () => void;
};

export function ProfileCards({ onProfileClick }: ProfileCardsProps) {
  return (
    <div className="w-full flex flex-col h-full">
      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        onClick={onProfileClick}
        className="bg-white rounded-xl p-5 border-2 border-gray-400 shadow-lg hover:shadow-xl cursor-pointer transition-all duration-200 group hover:border-gray-500"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              Profile
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">View your profile</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

