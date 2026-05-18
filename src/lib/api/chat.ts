import { getApiUrl, getAuthHeaders, handleResponse } from './client';
import { ChatbotResponse, Chat, ChatWithMessages } from '@/types/api';

export async function askChatbot(
  question: string, 
  documentContent: string, 
  chatId?: string,
  title?: string,
  documentType?: string
): Promise<ChatbotResponse & { chatId?: string }> {
  const response = await fetch(`${getApiUrl()}/api/chatbot/ask`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ question, documentContent, chatId, title, documentType }),
  });
  return handleResponse(response);
}

export async function getUserChats(): Promise<{ success: boolean; chats: Chat[] }> {
  const response = await fetch(`${getApiUrl()}/api/chats`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function getChat(chatId: string): Promise<{ success: boolean; chat: ChatWithMessages }> {
  const response = await fetch(`${getApiUrl()}/api/chats/${chatId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function deleteChat(chatId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${getApiUrl()}/api/chats/${chatId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}
