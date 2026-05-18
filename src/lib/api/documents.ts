import { getApiUrl, getAuthHeaders, handleResponse } from './client';
import { ProcessedDocument } from '@/types/api';

export async function getUserDocuments(): Promise<{ success: boolean; documents: ProcessedDocument[] }> {
  const response = await fetch(`${getApiUrl()}/api/documents`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function getDocument(documentId: string): Promise<{ success: boolean; document: ProcessedDocument }> {
  const response = await fetch(`${getApiUrl()}/api/documents/${documentId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function deleteDocument(documentId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${getApiUrl()}/api/documents/${documentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function processDocumentSummary(documentId: string): Promise<{ success: boolean; summary: string; cached: boolean }> {
  const response = await fetch(`${getApiUrl()}/api/documents/${documentId}/process/summary`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function processDocumentKeywords(documentId: string): Promise<{ success: boolean; keywords: string; cached: boolean }> {
  const response = await fetch(`${getApiUrl()}/api/documents/${documentId}/process/keywords`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function processDocumentNotes(documentId: string): Promise<{ success: boolean; notes: string; cached: boolean }> {
  const response = await fetch(`${getApiUrl()}/api/documents/${documentId}/process/notes`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function processDocumentAll(documentId: string): Promise<{ success: boolean; summary: string; keywords: string; notes: string }> {
  const response = await fetch(`${getApiUrl()}/api/documents/${documentId}/process/all`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function clearAllDocuments(): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${getApiUrl()}/api/documents/clear`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse<{ success: boolean; message: string }>(response);
}
