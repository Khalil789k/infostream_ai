"use client";

import { LandingPage } from "@/components/landing-page";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useState, useEffect } from "react";
import { getCurrentUser, logout as apiLogout, User } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function Home() {
  // user: holds the logged-in user object or null
  const [user, setUser] = useState<User | null>(null);

  // loading: shows a skeleton loader while checking session or during login/logout
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // useEffect runs once on mount to check for a stored session
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if token exists in localStorage
        const token = localStorage.getItem("auth_token");
        const storedUser = localStorage.getItem("user");
        
        if (token && storedUser) {
          // Verify token is still valid by fetching current user
          try {
            const response = await getCurrentUser();
            setUser(response.user);
          } catch (error) {
            // Token is invalid, clear storage
            localStorage.removeItem("auth_token");
            localStorage.removeItem("user");
          }
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // If user exists, redirect to dashboard
  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // handleLogin: called when Login component signals success (onLogin prop)
  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  // handleLogout: clears the session and returns to the login screen.
  const handleLogout = () => {
    setLoading(true);
    apiLogout();
    setUser(null);
    setLoading(false);
  };

  // Render a loading spinner while 'loading' is true
  if (loading || user) {
    return <LoadingSpinner message={user ? "Redirecting..." : "Loading..."} />;
  }

  // Otherwise render the Landing page by default
  // Start for free -> /signup, Log in -> /login
  return <LandingPage onGetStarted={() => router.push('/signup')} onLogin={() => router.push('/login')} />;
}
