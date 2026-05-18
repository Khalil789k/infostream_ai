"use client";

import { User } from "@/types";
import { AuthLayout } from "./auth/auth-layout";
import { AuthForm } from "./auth/auth-form";

interface LoginProps {
  onLogin: (user: User) => void;
  initialMode?: "signin" | "signup";
}

export function Login({ onLogin, initialMode = "signin" }: LoginProps) {
  return (
    <AuthLayout>
      <AuthForm 
        initialMode={initialMode} 
        onSuccess={onLogin} 
      />
    </AuthLayout>
  );
}
