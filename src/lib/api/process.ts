import { getApiUrl, getAuthHeaders, handleResponse } from './client';
import { 
  ProcessTextResponse, 
  ProcessDocumentResponse, 
  ProcessUrlResponse, 
  ProcessVideoResponse,
  TranslateResponse,
  UrlCheckResponse
} from '@/types/api';

/**
 * Generate a short meaningful title from text content
 */
function generateTitleFromText(text: string): string {
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'Text Content';
  const words = cleaned.split(' ').filter(w => w.length > 3).slice(0, 3);
  if (words.length === 0) return 'Text Content';
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

export async function processText(text: string): Promise<ProcessTextResponse> {
  const title = generateTitleFromText(text);
  const response = await fetch(`${getApiUrl()}/api/process/text`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ text, title }),
  });
  return handleResponse(response);
}

export async function processDocument(file: File): Promise<ProcessDocumentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${getApiUrl()}/api/process/document`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: formData,
  });
  return handleResponse(response);
}

export async function processUrl(url: string): Promise<ProcessUrlResponse> {
  const response = await fetch(`${getApiUrl()}/api/process/url`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ url }),
  });
  return handleResponse(response);
}

export async function processVideo(file: File): Promise<ProcessVideoResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${getApiUrl()}/api/process/video`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: formData,
  });
  return handleResponse(response);
}

export async function checkUrlType(url: string): Promise<UrlCheckResponse> {
  const response = await fetch(`${getApiUrl()}/api/url/check`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ url }),
  });
  return handleResponse(response);
}

export async function processVideoUrl(url: string): Promise<ProcessVideoResponse> {
  const response = await fetch(`${getApiUrl()}/api/process/video-url`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ url }),
  });
  return handleResponse(response);
}

export async function translateText(text: string, targetLanguage = 'Urdu', documentId?: string): Promise<TranslateResponse> {
  const response = await fetch(`${getApiUrl()}/api/translate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ text, targetLanguage, documentId }),
  });
  return handleResponse(response);
}
