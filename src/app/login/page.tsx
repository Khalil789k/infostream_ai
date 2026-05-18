"use client";

import { useRouter } from "next/navigation";
import { Login } from "@/components/login";
import { User } from "@/lib/api";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = (user: User) => {
    // After successful login, redirect directly to dashboard
    window.location.href = "/dashboard";
  };

  const handleBack = () => {
    router.push("/");
  };

  useEffect(() => {
    // If already logged in (token exists), redirect to dashboard
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token) router.replace("/dashboard");
    }
  }, [router]);

  return <Login onLogin={handleLogin} onBack={handleBack} />;
}
