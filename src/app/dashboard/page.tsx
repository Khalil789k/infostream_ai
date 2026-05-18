"use client";

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Type, Video, FileText, Link, ArrowRight, Languages } from 'lucide-react';
import { HistoryList } from '@/components/history-list';
import { UserNav } from '@/components/user-nav';
import { getCurrentUser, logout as apiLogout, type User } from '@/lib/api';

const inputTypes = [
  {
    id: 'text',
    icon: Type,
    title: 'Text',
    route: '/dashboard/text',
    color: 'blue',
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    id: 'video',
    icon: Video,
    title: 'Video',
    route: '/dashboard/video',
    color: 'purple',
    gradient: 'from-purple-500 to-purple-600',
  },
  {
    id: 'document',
    icon: FileText,
    title: 'Document',
    route: '/dashboard/document',
    color: 'green',
    gradient: 'from-green-500 to-green-600',
  },
  {
    id: 'url',
    icon: Link,
    title: 'URL',
    route: '/dashboard/url',
    color: 'orange',
    gradient: 'from-orange-500 to-orange-600',
  }
];

// Dynamic Accent Color Class Mapper
const getAccentClasses = (color: string) => {
  switch (color) {
    case 'purple':
      return { text: 'text-purple-600', bg: 'bg-purple-600 hover:bg-purple-700' };
    case 'emerald':
      return { text: 'text-emerald-600', bg: 'bg-emerald-600 hover:bg-emerald-700' };
    case 'orange':
      return { text: 'text-orange-600', bg: 'bg-orange-600 hover:bg-orange-700' };
    case 'charcoal':
      return { text: 'text-slate-800', bg: 'bg-slate-800 hover:bg-slate-900' };
    case 'blue':
    default:
      return { text: 'text-blue-600', bg: 'bg-blue-600 hover:bg-blue-700' };
  }
};

export default function DashboardHome() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [accentColor, setAccentColor] = useState('blue');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
          try {
            const response = await getCurrentUser();
            setUser(response.user);
          } catch (error) {
            console.error('Error loading user:', error);
          }
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };
    loadUser();

    // Load stored accent theme
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.email) {
          const storedAccent = localStorage.getItem(`accentColor_${parsed.email}`);
          if (storedAccent) {
            setAccentColor(storedAccent);
          } else {
            setAccentColor('blue');
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Listen for local profile updates and sync state instantly
    const handleStorageChange = () => {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUser(parsed);
          
          if (parsed.email) {
            const storedAccent = localStorage.getItem(`accentColor_${parsed.email}`);
            if (storedAccent) {
              setAccentColor(storedAccent);
            } else {
              setAccentColor('blue');
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleLogout = () => {
    apiLogout();
    setUser(null);
    router.push('/');
  };

  const activeAccent = getAccentClasses(accentColor);

  return (
    <div className="min-h-screen w-full bg-slate-50/50">
      {/* Premium Sticky Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo / Brand Name */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/dashboard')}>
            <span className="text-xl font-bold tracking-tight text-[#002253]">INFO STREAM AI</span>
          </div>

          {/* Welcome Message & User Profile Nav */}
          <div className="flex items-center gap-4">
            {user && (
              <span className="hidden sm:inline-block text-sm font-semibold text-gray-700">
                Welcome back, <span className={`font-extrabold transition-all duration-300 ${activeAccent.text}`}>{user.displayName || user.email.split('@')[0]}</span>
              </span>
            )}
            
            <div className="h-6 w-px bg-gray-200 hidden sm:block" />

            {user && (
              <UserNav 
                user={user} 
                onSettingsSelect={() => router.push('/dashboard/settings')} 
                onProfileSelect={() => router.push('/dashboard/profile')} 
                onLogout={handleLogout} 
              />
            )}
          </div>

        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-14">
        {/* Simple Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12 md:mb-16"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 sm:mb-4">
            Create New Analysis
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 px-2">
            Choose how you want to provide your content
          </p>
        </motion.div>

        {/* Input Type Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {inputTypes.map((type, index) => {
            const Icon = type.icon;
            return (
              <motion.div
                key={type.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push(type.route)}
                className={`group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br ${type.gradient} p-4 sm:p-6 md:p-8 cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300`}
              >
                <div className="flex flex-col items-center justify-center text-center text-white">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-3 md:mb-4 group-hover:bg-white/30 transition-colors backdrop-blur-sm">
                    <Icon className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl font-bold mb-1 sm:mb-2">{type.title}</h3>
                  <div className="flex items-center gap-1 sm:gap-2 text-white/90 text-xs sm:text-sm">
                    <span>Start</span>
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                
                {/* Hover effect */}
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.div>
            );
          })}
        </div>

        {/* Tools and History Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 sm:mt-12 md:mt-16 w-full"
        >
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:items-stretch w-full">
            {/* Pakistan Sign Language Card */}
            <div 
              onClick={() => router.push('/dashboard/psl')}
              className="bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-900 rounded-2xl border-2 border-indigo-400 shadow-2xl w-full lg:flex-[2] lg:max-w-2xl min-h-[300px] p-6 sm:p-8 md:p-10 cursor-pointer group relative overflow-hidden flex flex-col justify-between transition-all duration-500 hover:scale-[1.01] hover:shadow-indigo-200/50"
            >
              {/* Background decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32 group-hover:bg-white/20 transition-colors" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/20 blur-2xl rounded-full -ml-16 -mb-16" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/30 group-hover:scale-110 transition-transform">
                    <Languages className="h-6 w-6 text-white" />
                  </div>
                  <div className="px-3 py-1 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">New Feature</span>
                  </div>
                </div>

                <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight leading-tight">
                  Pakistan Sign <br /> Language Interpreter
                </h2>
                <p className="text-blue-100 text-sm sm:text-base md:text-lg leading-relaxed max-w-md font-medium opacity-90">
                  Experience real-time text-to-PSL translation with our advanced 3D avatar. Bridge the communication gap instantly.
                </p>
              </div>

              <div className="relative z-10 mt-8 flex items-center justify-between">
                <div className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-xl font-black text-sm shadow-xl group-hover:bg-indigo-50 transition-colors">
                  TRY INTERPRETER
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="hidden sm:flex -space-x-3">
                   {[1,2,3].map(i => (
                     <div key={i} className="w-10 h-10 rounded-full border-2 border-indigo-500 bg-indigo-400/30 backdrop-blur-sm flex items-center justify-center text-white text-xs font-bold">
                       {i}
                     </div>
                   ))}
                </div>
              </div>
            </div>

            {/* History Section */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border-2 border-gray-400 shadow-xl w-full lg:flex-1 lg:max-w-lg lg:h-fit">
              <div className="mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Your History</h2>
                <p className="text-gray-600 text-xs sm:text-sm md:text-base">Access and manage your recent analysis sessions</p>
              </div>
              <HistoryList />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
