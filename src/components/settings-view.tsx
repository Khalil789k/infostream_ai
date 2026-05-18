'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from './ui/label';
import { 
  User, Settings, ShieldAlert, CheckCircle2, AlertTriangle, 
  RotateCcw, LogOut, ArrowLeft, Trash2, KeyRound, Loader2,
  Paintbrush, Check
} from 'lucide-react';
import { motion } from 'framer-motion';
import { changeUserPassword, clearAllDocuments, deleteUserAccount } from '@/lib/api';

type SettingsViewProps = {
  onBack: () => void;
  onLogout: () => void;
};

// Dynamic Accent Color Class Mapper
export const getAccentClasses = (color: string) => {
  switch (color) {
    case 'purple':
      return {
        text: 'text-purple-600',
        bg: 'bg-purple-600 hover:bg-purple-700',
        gradient: 'from-purple-500 to-pink-500',
        border: 'border-purple-500 focus:ring-purple-500 focus:border-purple-500',
        ring: 'ring-purple-500 focus:ring-purple-500 focus:border-purple-500',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-200 shadow-purple-50',
      };
    case 'emerald':
      return {
        text: 'text-emerald-600',
        bg: 'bg-emerald-600 hover:bg-emerald-700',
        gradient: 'from-emerald-400 to-teal-600',
        border: 'border-emerald-500 focus:ring-emerald-500 focus:border-emerald-500',
        ring: 'ring-emerald-500 focus:ring-emerald-500 focus:border-emerald-500',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-50',
      };
    case 'orange':
      return {
        text: 'text-orange-600',
        bg: 'bg-orange-600 hover:bg-orange-700',
        gradient: 'from-orange-400 to-red-500',
        border: 'border-orange-500 focus:ring-orange-500 focus:border-orange-500',
        ring: 'ring-orange-500 focus:ring-orange-500 focus:border-orange-500',
        badgeBg: 'bg-orange-50 text-orange-700 border-orange-200 shadow-orange-50',
      };
    case 'charcoal':
      return {
        text: 'text-slate-800',
        bg: 'bg-slate-800 hover:bg-slate-900',
        gradient: 'from-slate-700 to-slate-900',
        border: 'border-slate-500 focus:ring-slate-500 focus:border-slate-500',
        ring: 'ring-slate-500 focus:ring-slate-500 focus:border-slate-500',
        badgeBg: 'bg-slate-50 text-slate-700 border-slate-200 shadow-slate-50',
      };
    case 'blue':
    default:
      return {
        text: 'text-blue-600',
        bg: 'bg-blue-600 hover:bg-blue-700',
        gradient: 'from-blue-500 to-indigo-600',
        border: 'border-blue-500 focus:ring-blue-500 focus:border-blue-500',
        ring: 'ring-blue-500 focus:ring-blue-500 focus:border-blue-500',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200 shadow-blue-50',
      };
  }
};

export function SettingsView({ onBack, onLogout }: SettingsViewProps) {
  const [email, setEmail] = useState('');
  const [accentColor, setAccentColor] = useState('blue');

  // Password settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Action status states
  const [isClearing, setIsClearing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load accent color and email on mount
  useEffect(() => {
    // Load registered email
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.email) {
          setEmail(parsed.email);
          // Load user-specific active accent theme
          const userAccentKey = `accentColor_${parsed.email}`;
          const storedAccent = localStorage.getItem(userAccentKey);
          if (storedAccent) {
            setAccentColor(storedAccent);
          } else {
            setAccentColor('blue');
          }
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  const handleSelectAccent = (color: string) => {
    setAccentColor(color);
    
    // Save to user-specific key in localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.email) {
          localStorage.setItem(`accentColor_${parsed.email}`, color);
        }
      } catch (e) {
        console.error(e);
      }
    }
    
    // Set fallback for backward compatibility
    localStorage.setItem('accentColor', color);
    
    setMessage({ type: 'success', text: `Accent color updated to ${color.toUpperCase()} successfully` });
    // Trigger global storage update to sync other components/pages instantly
    window.dispatchEvent(new Event('storage'));
    setTimeout(() => setMessage(null), 3000);
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'All password fields are required' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await changeUserPassword({ currentPassword, newPassword });
      if (response.success) {
        setMessage({ type: 'success', text: 'Password updated successfully' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to update password' });
      }
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update password' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Clear History
  const handleClearHistory = async () => {
    const confirm = window.confirm("Are you sure you want to clear your entire processing history? This will delete all transcribed documents and messages permanently.");
    if (!confirm) return;

    setIsClearing(true);
    try {
      const response = await clearAllDocuments();
      if (response.success) {
        setMessage({ type: 'success', text: 'All processed documents and history cleared successfully' });
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to clear history' });
      }
      setTimeout(() => setMessage(null), 4000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error occurred while clearing history' });
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setIsClearing(false);
    }
  };

  // Delete Account
  const handleDeleteAccount = async () => {
    const firstConfirm = window.confirm("WARNING: You are about to permanently delete your account. This will completely wipe your profile, documents, chat sessions, and all historical records from our database. This action is irreversible. Proceed?");
    if (!firstConfirm) return;

    const secondConfirm = window.prompt("To confirm deletion, please type DELETE below:");
    if (secondConfirm !== "DELETE") {
      alert("Confirmation failed. Account deletion canceled.");
      return;
    }

    setIsDeleting(true);
    try {
      const response = await deleteUserAccount();
      if (response.success) {
        alert("Your account has been deleted successfully. Goodbye!");
        onLogout();
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to delete account' });
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error occurred while deleting account' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  // Get active styling tokens
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">System Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Configure account security preferences and manage your data history</p>
        </div>
        <Button 
          variant="outline" 
          onClick={onBack}
          className="self-start sm:self-auto border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700 font-semibold"
        >
          Back to Dashboard
        </Button>
      </motion.div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 p-4 rounded-xl flex items-start gap-3 border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          )}
          <p className="text-sm font-medium">{message.text}</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Accent Themes & Security (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Accent Color Customization Card */}
          <Card className="border-gray-300 shadow-md rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-gray-50 border-b border-gray-200 pt-5 pb-4">
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Paintbrush className={`h-5 w-5 ${activeAccent.text}`} />
                UI Accent Colors
              </CardTitle>
              <CardDescription>Choose an accent theme color to customize your interactive dashboard buttons and icons</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              {/* Workspace Personalization Guide */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/60 text-gray-700 space-y-1.5 leading-relaxed">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Workspace Customization Guide</h4>
                <p className="text-xs text-gray-600 font-medium">
                  Selecting a dynamic theme color instantly updates all primary action buttons, active sidebar icons, input field highlights, and card accents in real-time. This personalization stays synchronized across your entire dashboard, settings panel, and profile statistics without needing a page refresh.
                </p>
              </div>

              {/* Accent Color Picker Grid */}
              <div className="space-y-4">
                <Label className="text-sm font-bold text-gray-800">Select Accent Color Theme</Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {[
                    { id: 'blue', name: 'Classic Blue', css: 'bg-gradient-to-br from-blue-500 to-indigo-600', ring: 'ring-blue-500' },
                    { id: 'purple', name: 'Royal Purple', css: 'bg-gradient-to-br from-purple-500 to-pink-500', ring: 'ring-purple-500' },
                    { id: 'emerald', name: 'Emerald Green', css: 'bg-gradient-to-br from-emerald-400 to-teal-600', ring: 'ring-emerald-500' },
                    { id: 'orange', name: 'Vibrant Orange', css: 'bg-gradient-to-br from-orange-400 to-red-500', ring: 'ring-orange-500' },
                    { id: 'charcoal', name: 'Sleek Charcoal', css: 'bg-gradient-to-br from-slate-700 to-slate-900', ring: 'ring-slate-500' },
                  ].map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => handleSelectAccent(color.id)}
                      className={`h-16 rounded-xl relative flex flex-col items-center justify-center text-white font-bold transition-all shadow border border-white/10 ${color.css} hover:scale-105 ${
                        accentColor === color.id 
                          ? `ring-4 ${color.ring} ring-offset-2 scale-105` 
                          : ''
                      }`}
                    >
                      <span className="text-xs font-extrabold tracking-tight">{color.name}</span>
                      {accentColor === color.id && (
                        <div className="absolute top-1 right-1 bg-white/20 p-0.5 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Change Password Settings Card */}
          <Card className="border-gray-300 shadow-md rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-gray-50 border-b border-gray-200 pt-5 pb-4">
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <KeyRound className={`h-5 w-5 ${activeAccent.text}`} />
                Security Settings
              </CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password" className="text-sm font-semibold text-gray-700">Current Password</Label>
                  <input 
                    type="password" 
                    id="current-password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={`w-full h-11 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 ${activeAccent.ring} transition-all font-sans text-gray-800 text-sm`}
                    placeholder="Enter current password"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-sm font-semibold text-gray-700">New Password</Label>
                    <input 
                      type="password" 
                      id="new-password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`w-full h-11 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 ${activeAccent.ring} transition-all font-sans text-gray-800 text-sm`}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-sm font-semibold text-gray-700">Confirm New Password</Label>
                    <input 
                      type="password" 
                      id="confirm-password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full h-11 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 ${activeAccent.ring} transition-all font-sans text-gray-800 text-sm`}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className={`text-white font-semibold rounded-xl px-6 transition-all mt-2 ${activeAccent.bg}`}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Updating...
                    </span>
                  ) : 'Change Password'}
                </Button>
              </form>
            </CardContent>
          </Card>

        </div>

        {/* Right Column: Account Management (1/3 width) */}
        <div className="space-y-6">
          
          {/* History Clean Settings Card */}
          <Card className="border-gray-300 shadow-md rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-gray-50 border-b border-gray-200 pt-5 pb-4">
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <RotateCcw className={`h-5 w-5 ${activeAccent.text}`} />
                Data History
              </CardTitle>
              <CardDescription>Reset your workspace and delete processed items</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                Clearing your history will instantly erase all analyzed document records, saved files, and transcribed chat lists. Your active account profile remains completely untouched.
              </p>
              <Button 
                onClick={handleClearHistory} 
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl py-6 transition-all flex items-center justify-center gap-2"
                disabled={isClearing}
              >
                {isClearing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Clearing...
                  </span>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" /> Clear All History
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone Settings Card */}
          <Card className="border-gray-300 shadow-md rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-red-50 border-b border-red-200 pt-5 pb-4">
              <CardTitle className="text-lg font-bold text-red-700 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-600" />
                Danger Zone
              </CardTitle>
              <CardDescription className="text-red-600/80">Irreversible account management actions</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                Deleting your account will permanently purge your user profile, documents, and chat databases. This action is irreversible and immediate.
              </p>
              <Button 
                onClick={handleDeleteAccount} 
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl py-6 transition-all flex items-center justify-center gap-2"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
                  </span>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" /> Delete Account
                  </>
                )}
              </Button>
              
              <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                <span className="text-xs text-gray-500">Need to exit?</span>
                <Button 
                  onClick={onLogout} 
                  variant="ghost" 
                  className="text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl font-bold flex items-center gap-2 p-2 h-auto"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
