"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, register, googleLogin, User } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User as UserIcon, AlertCircle, Eye, EyeOff, X, ArrowLeft } from "lucide-react";

interface AuthFormProps {
  initialMode: "signin" | "signup";
  onSuccess: (user: User) => void;
}

export function AuthForm({ initialMode, onSuccess }: AuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Google Simulated Authentication State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [customGoogleName, setCustomGoogleName] = useState("");
  const [showCustomGoogleForm, setShowCustomGoogleForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "signup") {
        await register(email, password, name);
        router.push("/login");
      } else {
        const res = await login(email, password);
        onSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async (email: string, displayName?: string) => {
    setLoading(true);
    setError(null);
    setShowGoogleModal(false);
    try {
      const res = await googleLogin(email, displayName);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || "Google Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmail.trim()) return;
    handleGoogleAuth(customGoogleEmail, customGoogleName || undefined);
  };

  return (
    <div className="w-full">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">
        {mode === "signin" ? "Welcome back" : "Create account"}
      </h1>

      <button
        type="button"
        onClick={() => setShowGoogleModal(true)}
        className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-full transition-all shadow-lg mb-6"
      >
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-6.887 4.114-4.68 0-8.486-3.856-8.486-8.514s3.806-8.514 8.486-8.514c2.203 0 4.17.804 5.7 2.378l3.186-3.186C18.17 1.343 15.39 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.756 0 11.76-4.757 11.76-11.76 0-.742-.08-1.503-.23-2.185H12.24z"/>
        </svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-gray-400 text-sm">or email</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <AnimatePresence mode="wait">
          {mode === "signup" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Label className="text-sm font-bold text-gray-700">Full Name</Label>
              <div className="relative mt-2">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" className="pl-12 h-14 rounded-xl border-2" required />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <Label className="text-sm font-bold text-gray-700">Email Address</Label>
          <div className="relative mt-2">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" className="pl-12 h-14 rounded-xl border-2" required />
          </div>
        </div>

        <div>
          <Label className="text-sm font-bold text-gray-700">Password</Label>
          <div className="relative mt-2">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="px-12 h-14 rounded-xl border-2" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3 text-red-600">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full h-14 bg-gray-900 hover:bg-gray-800 rounded-xl text-lg font-bold">
          {loading ? "Processing..." : mode === "signin" ? "Sign In" : "Register"}
        </Button>
      </form>

      <p className="mt-8 text-center text-gray-600">
        {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-blue-600 font-bold hover:underline">
          {mode === "signin" ? "Sign up" : "Sign in"}
        </button>
      </p>

      {/* Google Simulated Selector Modal */}
      <AnimatePresence>
        {showGoogleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-900"
            >
              {/* Top border colored stripe */}
              <div className="h-1.5 bg-gradient-to-r from-red-500 via-yellow-400 to-blue-500" />
              
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-6.887 4.114-4.68 0-8.486-3.856-8.486-8.514s3.806-8.514 8.486-8.514c2.203 0 4.17.804 5.7 2.378l3.186-3.186C18.17 1.343 15.39 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.756 0 11.76-4.757 11.76-11.76 0-.742-.08-1.503-.23-2.185H12.24z"/>
                    </svg>
                    <span className="font-bold text-gray-900 text-lg">Sign in with Google</span>
                  </div>
                  <button 
                    onClick={() => {
                      setShowGoogleModal(false);
                      setShowCustomGoogleForm(false);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <form onSubmit={handleCustomGoogleSubmit} className="space-y-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Enter your Google Account email to securely authenticate with <strong className="text-gray-900">Info Stream AI</strong>.
                  </p>

                  <div>
                    <Label className="text-xs font-bold text-gray-700">Google Email Address</Label>
                    <Input
                      type="email"
                      value={customGoogleEmail}
                      onChange={(e) => setCustomGoogleEmail(e.target.value)}
                      placeholder="yourname@gmail.com"
                      className="h-12 mt-1.5 rounded-xl border-2 pl-4 text-sm"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-gray-700">Display Name</Label>
                    <Input
                      type="text"
                      value={customGoogleName}
                      onChange={(e) => setCustomGoogleName(e.target.value)}
                      placeholder="John Doe"
                      className="h-12 mt-1.5 rounded-xl border-2 pl-4 text-sm"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold mt-2 shadow-md"
                  >
                    Connect & Sign In
                  </Button>
                </form>

                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                  <span>Info Stream Local OAuth v1.0</span>
                  <a href="#" className="hover:underline">Privacy Policy</a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
