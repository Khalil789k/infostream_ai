'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { 
  Upload, User, BarChart3, TrendingUp, Clock, Award, Target, Zap, 
  Star, Crown, Loader2, Type, Video, Link2, FileText, CheckCircle2, Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getUserStats, updateUserProfile } from '@/lib/api';
import { getAccentClasses } from './settings-view';

type ProfileViewProps = {
  onBack: () => void;
  user: any;
};

type UserStats = {
  totalDocuments: number;
  textDocuments: number;
  videoDocuments: number;
  urlDocuments: number;
  fileDocuments: number;
  totalWords: number;
  totalChars: number;
  memberSince: string;
  lastActive: string;
};

export function ProfileView({ onBack, user }: ProfileViewProps) {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [avatarPreset, setAvatarPreset] = useState('blue');
  const [customPhotoURL, setCustomPhotoURL] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [accentColor, setAccentColor] = useState('blue');
  
  const [stats, setStats] = useState<UserStats>({
    totalDocuments: 0,
    textDocuments: 0,
    videoDocuments: 0,
    urlDocuments: 0,
    fileDocuments: 0,
    totalWords: 0,
    totalChars: 0,
    memberSince: user.createdAt || new Date().toISOString(),
    lastActive: new Date().toISOString()
  });
  
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadUserStats();
    
    // Parse photoURL preset on mount or user changes
    if (user.photoURL) {
      const presets = ['blue', 'purple', 'emerald', 'orange', 'charcoal'];
      if (presets.includes(user.photoURL)) {
        setAvatarPreset(user.photoURL);
        setCustomPhotoURL('');
      } else {
        setAvatarPreset('custom');
        setCustomPhotoURL(user.photoURL);
      }
    } else {
      setAvatarPreset('blue');
      setCustomPhotoURL('');
    }

    // Load active accent theme
    if (user && user.email) {
      const storedAccent = localStorage.getItem(`accentColor_${user.email}`);
      if (storedAccent) {
        setAccentColor(storedAccent);
      } else {
        setAccentColor('blue');
      }
    }

    // Listen for local profile/accent updates and sync state instantly
    const handleStorageChange = () => {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
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
  }, [user]);

  const loadUserStats = async () => {
    try {
      const response = await getUserStats();
      if (response.success && response.stats) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      setProfileMessage({ type: 'error', text: 'Display name cannot be empty' });
      return;
    }
    
    setIsSavingProfile(true);
    try {
      const finalPhotoURL = avatarPreset === 'custom' ? customPhotoURL.trim() : avatarPreset;
      const response = await updateUserProfile({
        displayName: displayName,
        photoURL: finalPhotoURL,
      });
      
      if (response.success) {
        setProfileMessage({ type: 'success', text: 'Profile updated successfully' });
        // Trigger storage event to sync other navbar profile avatars
        window.dispatchEvent(new Event('storage'));
        setTimeout(() => setProfileMessage(null), 3000);
      } else {
        setProfileMessage({ type: 'error', text: 'Failed to update profile' });
      }
    } catch (error: any) {
      setProfileMessage({ type: 'error', text: error.message || 'Could not update profile.' });
      setTimeout(() => setProfileMessage(null), 5000);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setProfileMessage({ type: 'error', text: 'Please select an image under 5MB' });
        setTimeout(() => setProfileMessage(null), 5000);
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        
        setIsSavingProfile(true);
        try {
          const response = await updateUserProfile({ 
            displayName: displayName, 
            photoURL: base64Data 
          });
          
          if (response.success) {
            setAvatarPreset('custom');
            setCustomPhotoURL(base64Data);
            setProfileMessage({ type: 'success', text: 'Profile picture uploaded successfully' });
            window.dispatchEvent(new Event('storage'));
            setTimeout(() => setProfileMessage(null), 3000);
          } else {
            setProfileMessage({ type: 'error', text: 'Failed to upload photo' });
          }
        } catch (error: any) {
          setProfileMessage({ type: 'error', text: error.message || 'Could not save photo.' });
          setTimeout(() => setProfileMessage(null), 5000);
        } finally {
          setIsSavingProfile(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getAccountLevel = () => {
    if (stats.totalDocuments >= 50) return { level: 'Pro', color: 'bg-purple-500', icon: Crown };
    if (stats.totalDocuments >= 20) return { level: 'Advanced', color: 'bg-blue-500', icon: Star };
    if (stats.totalDocuments >= 5) return { level: 'Active', color: 'bg-green-500', icon: Zap };
    return { level: 'Starter', color: 'bg-gray-500', icon: User };
  };

  const accountLevel = getAccountLevel();
  const LevelIcon = accountLevel.icon;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const activeAccent = getAccentClasses(accentColor);

  return (
    <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">My Profile</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your account information and view your activity statistics</p>
        </div>
        <Button 
          variant="outline" 
          onClick={onBack}
          className="self-start sm:self-auto border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700 font-semibold"
        >
          Back to Dashboard
        </Button>
      </motion.div>

      {/* Main Grid Layout (2/3 left, 1/3 right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column (2/3 width) - Forms and Activity Stats */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Profile Details Edit Card */}
          <Card className="border-gray-300 shadow-md rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-gray-50 border-b border-gray-200 pt-5 pb-4">
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <User className={`h-5 w-5 ${activeAccent.text}`} />
                Profile Details
              </CardTitle>
              <CardDescription>Update your personal information and avatar</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              
              {profileMessage && (
                <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 border ${
                  profileMessage.type === 'success' 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{profileMessage.text}</p>
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }} className="space-y-6">
                
                {/* Visual Avatar Picker / Uploader */}
                <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-gray-100">
                  {/* Current Active Preview */}
                  <div className="relative flex-shrink-0">
                    <div className="h-20 w-20 rounded-full border border-gray-200 shadow-lg flex items-center justify-center text-white overflow-hidden bg-gray-50">
                      {avatarPreset === 'custom' && customPhotoURL.trim().startsWith('data:image') ? (
                        <img 
                          src={customPhotoURL} 
                          alt="Avatar Preview" 
                          className="h-full w-full object-cover"
                        />
                      ) : avatarPreset === 'custom' && customPhotoURL.trim().startsWith('http') ? (
                        <img 
                          src={customPhotoURL} 
                          alt="Avatar Preview" 
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className={`h-full w-full flex items-center justify-center font-bold text-2xl uppercase ${
                          avatarPreset === 'blue' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
                          avatarPreset === 'purple' ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                          avatarPreset === 'emerald' ? 'bg-gradient-to-br from-emerald-400 to-teal-600' :
                          avatarPreset === 'orange' ? 'bg-gradient-to-br from-orange-400 to-red-500' :
                          avatarPreset === 'charcoal' ? 'bg-gradient-to-br from-gray-700 to-slate-900' :
                          'bg-gradient-to-br from-blue-500 to-indigo-600'
                        }`}>
                          {displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Themes / Presets */}
                  <div className="flex-1 space-y-3 w-full">
                    <Label className="text-sm font-semibold text-gray-700">Select Profile Avatar</Label>
                    <div className="flex flex-wrap items-center gap-3">
                      {[
                        { id: 'blue', css: 'bg-gradient-to-br from-blue-500 to-indigo-600' },
                        { id: 'purple', css: 'bg-gradient-to-br from-purple-500 to-pink-500' },
                        { id: 'emerald', css: 'bg-gradient-to-br from-emerald-400 to-teal-600' },
                        { id: 'orange', css: 'bg-gradient-to-br from-orange-400 to-red-500' },
                        { id: 'charcoal', css: 'bg-gradient-to-br from-gray-700 to-slate-900' },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setAvatarPreset(preset.id)}
                          className={`h-8 w-8 rounded-full ${preset.css} transition-all relative ${
                            avatarPreset === preset.id 
                              ? `ring-4 ${activeAccent.ring} ring-offset-2 scale-110 shadow-md` 
                              : 'hover:scale-105'
                          }`}
                        />
                      ))}
                      
                      {/* Direct Upload Trigger */}
                      <label 
                        htmlFor="photo-upload-profile" 
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-1 transition-all"
                      >
                        <Upload className="h-3.5 w-3.5 text-gray-500" />
                        Upload File
                      </label>
                      <input 
                        id="photo-upload-profile" 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handlePhotoUpload}
                      />

                      <button
                        type="button"
                        onClick={() => setAvatarPreset('custom')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                          avatarPreset === 'custom' 
                            ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-sm' 
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Custom URL
                      </button>
                    </div>

                    {/* Custom Image URL Field */}
                    {avatarPreset === 'custom' && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1 mt-2"
                      >
                        <input
                          type="text"
                          value={customPhotoURL}
                          onChange={(e) => setCustomPhotoURL(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-sans text-xs"
                          placeholder="Paste image URL (e.g. https://images.unsplash.com/...)"
                        />
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email Address</Label>
                    <input 
                      type="email" 
                      id="email" 
                      value={user.email}
                      disabled
                      className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-100 font-sans text-gray-500 text-sm cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400">Email cannot be changed</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="display-name" className="text-sm font-semibold text-gray-700">Display Name</Label>
                    <input 
                      type="text" 
                      id="display-name" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className={`w-full h-11 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 ${activeAccent.ring} transition-all font-sans text-gray-800 text-sm`}
                      placeholder="Enter your display name"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className={`text-white font-semibold rounded-xl px-6 transition-all ${activeAccent.bg}`}
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                    </span>
                  ) : 'Save Changes'}
                </Button>

              </form>
            </CardContent>
          </Card>

          {/* Activity Overview Card */}
          <Card className="border-gray-300 shadow-md rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-gray-50 border-b border-gray-200 pt-5 pb-4">
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <BarChart3 className={`h-5 w-5 ${activeAccent.text}`} />
                Activity Overview
              </CardTitle>
              <CardDescription>Your local content processing statistics</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center border border-blue-200 shadow-sm">
                  <div className="bg-blue-500 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 shadow">
                    <Type className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-blue-700">{stats.textDocuments}</p>
                  <p className="text-xs font-semibold text-blue-600 mt-0.5">Text</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center border border-purple-200 shadow-sm">
                  <div className="bg-purple-500 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 shadow">
                    <Video className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-purple-700">{stats.videoDocuments}</p>
                  <p className="text-xs font-semibold text-purple-600 mt-0.5">Videos</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 text-center border border-emerald-200 shadow-sm">
                  <div className="bg-emerald-500 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 shadow">
                    <Link2 className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-700">{stats.urlDocuments}</p>
                  <p className="text-xs font-semibold text-emerald-600 mt-0.5">URLs</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 text-center border border-orange-200 shadow-sm">
                  <div className="bg-orange-500 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 shadow">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-orange-700">{stats.fileDocuments}</p>
                  <p className="text-xs font-semibold text-orange-600 mt-0.5">Files</p>
                </div>
              </div>

              <Separator className="bg-gray-100" />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="bg-indigo-100 p-2 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900 leading-none">{formatNumber(stats.totalWords)}</p>
                    <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-wider">Total Words</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="bg-pink-100 p-2 rounded-lg">
                    <Target className="h-5 w-5 text-pink-600" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900 leading-none">{formatNumber(stats.totalChars)}</p>
                    <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-wider">Characters</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="bg-cyan-100 p-2 rounded-lg">
                    <Clock className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900 leading-none">{Math.round(stats.totalWords / 200)} min</p>
                    <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-wider">Reading Time</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Column (1/3 width) - Sidebar Summaries */}
        <div className="space-y-6">
          
          {/* Quick Profile Summary Card */}
          <Card className="border-gray-300 shadow-md rounded-2xl overflow-hidden bg-white">
            <div className={`h-28 bg-gradient-to-r ${activeAccent.gradient}`} />
            <CardContent className="pt-0 -mt-10 pb-6 flex flex-col items-center">
              
              {/* Profile Avatar */}
              <div className="relative">
                <div className="h-20 w-20 rounded-full border-4 border-white shadow-xl flex items-center justify-center text-white overflow-hidden bg-white">
                  {avatarPreset === 'custom' && customPhotoURL.trim().startsWith('data:image') ? (
                    <img 
                      src={customPhotoURL} 
                      alt="Avatar Preview" 
                      className="h-full w-full object-cover"
                    />
                  ) : avatarPreset === 'custom' && customPhotoURL.trim().startsWith('http') ? (
                    <img 
                      src={customPhotoURL} 
                      alt="Avatar Preview" 
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className={`h-full w-full flex items-center justify-center font-bold text-2xl uppercase ${
                      avatarPreset === 'blue' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
                      avatarPreset === 'purple' ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                      avatarPreset === 'emerald' ? 'bg-gradient-to-br from-emerald-400 to-teal-600' :
                      avatarPreset === 'orange' ? 'bg-gradient-to-br from-orange-400 to-red-500' :
                      avatarPreset === 'charcoal' ? 'bg-gradient-to-br from-gray-700 to-slate-900' :
                      'bg-gradient-to-br from-blue-500 to-indigo-600'
                    }`}>
                      {displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
              </div>
              
              <h2 className="mt-3 text-lg font-bold text-gray-900 text-center">
                {displayName || 'User'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
              
              <div className="flex items-center gap-2 mt-4">
                <Badge className={`${accountLevel.color} text-white px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-sm`}>
                  <LevelIcon className="h-3 w-3 mr-1" />
                  {accountLevel.level}
                </Badge>
                {user.is_verified && (
                  <Badge variant="outline" className="border-green-500 text-green-600 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats Sidebar Card */}
          <Card className="border-gray-300 shadow-md rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-gray-50 border-b border-gray-200 pt-5 pb-4">
              <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                <Activity className={`h-4.5 w-4.5 ${activeAccent.text}`} />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-xs font-semibold">Member Since</span>
                <span className="font-bold text-xs text-gray-800">{formatDate(stats.memberSince)}</span>
              </div>
              <Separator className="bg-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-xs font-semibold">Last Active</span>
                <span className="font-bold text-xs text-gray-800">{formatDate(stats.lastActive)}</span>
              </div>
              <Separator className="bg-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-xs font-semibold">Total Documents</span>
                <span className={`font-extrabold text-xs ${activeAccent.text}`}>{stats.totalDocuments}</span>
              </div>
              <Separator className="bg-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-xs font-semibold">Words Analyzed</span>
                <span className="font-extrabold text-xs text-emerald-600">{formatNumber(stats.totalWords)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Progress Sidebar Card */}
          <Card className="border-gray-300 shadow-md rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-gray-50 border-b border-gray-200 pt-5 pb-4">
              <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-yellow-500" />
                Account Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600 font-semibold">Progress to Next Level</span>
                  <span className="font-bold text-gray-800">
                    {stats.totalDocuments} / {stats.totalDocuments >= 50 ? '50+' : stats.totalDocuments >= 20 ? '50' : stats.totalDocuments >= 5 ? '20' : '5'}
                  </span>
                </div>
                <Progress 
                  value={
                    stats.totalDocuments >= 50 ? 100 :
                    stats.totalDocuments >= 20 ? (stats.totalDocuments / 50) * 100 :
                    stats.totalDocuments >= 5 ? (stats.totalDocuments / 20) * 100 :
                    (stats.totalDocuments / 5) * 100
                  } 
                  className="h-2 rounded-full"
                />
                <p className="text-[10px] text-gray-500 font-semibold italic mt-1 leading-normal">
                  {stats.totalDocuments >= 50 ? "You've reached the highest Pro tier!" :
                   stats.totalDocuments >= 20 ? `${50 - stats.totalDocuments} more documents to Pro` :
                   stats.totalDocuments >= 5 ? `${20 - stats.totalDocuments} more documents to Advanced` :
                   `${5 - stats.totalDocuments} more documents to Active`}
                </p>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
