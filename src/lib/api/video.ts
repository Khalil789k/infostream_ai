import { getApiUrl, getAuthHeaders, handleResponse } from './client';
import { VideoCaptionsResponse, VideoDubResponse } from '@/types/api';

export async function getVideoCaptions(documentId: string): Promise<VideoCaptionsResponse> {
  const response = await fetch(`${getApiUrl()}/api/video/${documentId}/captions`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function dubVideo(documentId: string, voice: 'female' | 'male' = 'female'): Promise<VideoDubResponse> {
  const response = await fetch(`${getApiUrl()}/api/video/${documentId}/dub`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ voice }),
  });
  return handleResponse(response);
}

export function getOriginalVideoUrl(videoId: string, filename: string): string {
  const token = localStorage.getItem('auth_token');
  return `${getApiUrl()}/api/video/original/${videoId}/${filename}?token=${token}`;
}

export function getDubbedVideoUrl(videoId: string, filename: string): string {
  const token = localStorage.getItem('auth_token');
  return `${getApiUrl()}/api/video/dubbed/${videoId}/${filename}?token=${token}`;
}
