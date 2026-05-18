import { getApiUrl, getAuthHeaders, handleResponse } from './client';
import { AuthResponse, User, UserStats } from '@/types/api';

export async function register(email: string, password: string, displayName?: string): Promise<{ success: boolean; email: string; message: string }> {
  const response = await fetch(`${getApiUrl()}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName }),
  });

  return handleResponse<{ success: boolean; email: string; message: string }>(response);
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${getApiUrl()}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await handleResponse<AuthResponse>(response);
  
  if (typeof window !== 'undefined' && data.token) {
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }
  
  return data;
}

export async function googleLogin(idToken: string): Promise<AuthResponse> {
  const response = await fetch(`${getApiUrl()}/api/auth/google-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  const data = await handleResponse<AuthResponse>(response);
  
  if (typeof window !== 'undefined' && data.token) {
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }
  
  return data;
}

export async function verifyOtp(email: string, otp: string): Promise<AuthResponse> {
  const response = await fetch(`${getApiUrl()}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });

  const data = await handleResponse<AuthResponse>(response);
  
  if (typeof window !== 'undefined' && data.token) {
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }
  
  return data;
}

export async function resendOtp(email: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${getApiUrl()}/api/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse<{ success: boolean; message: string }>(response);
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${getApiUrl()}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse<{ success: boolean; message: string }>(response);
}

export async function resetPassword(email: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${getApiUrl()}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, newPassword }),
  });
  return handleResponse<{ success: boolean; message: string }>(response);
}

export async function getCurrentUser(): Promise<{ success: boolean; user: User }> {
  const response = await fetch(`${getApiUrl()}/api/auth/me`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function updateUserProfile(data: { displayName?: string; photoURL?: string }): Promise<{ success: boolean; message: string; user: User }> {
  const response = await fetch(`${getApiUrl()}/api/user/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  const result = await handleResponse<{ success: boolean; message: string; user: User }>(response);
  if (typeof window !== 'undefined' && result.user) {
    localStorage.setItem('user', JSON.stringify(result.user));
  }
  return result;
}

export async function getUserStats(): Promise<{ success: boolean; stats: UserStats }> {
  const response = await fetch(`${getApiUrl()}/api/user/stats`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function changeUserPassword(data: { currentPassword: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${getApiUrl()}/api/user/password`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<{ success: boolean; message: string }>(response);
}

export async function deleteUserAccount(): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${getApiUrl()}/api/user/delete`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const result = await handleResponse<{ success: boolean; message: string }>(response);
  if (typeof window !== 'undefined' && result.success) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }
  return result;
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }
}
