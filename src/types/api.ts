export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  token: string;
}

export interface UserStats {
  totalDocuments: number;
  textDocuments: number;
  videoDocuments: number;
  urlDocuments: number;
  fileDocuments: number;
  totalWords: number;
  totalChars: number;
  memberSince: string;
  lastActive: string;
}

export interface ProcessedDocument {
  id: string;
  userId: string;
  title: string;
  sourceType: string;
  sourceText: string;
  sourceTitle: string;
  summary?: string;
  keywords?: string;
  notes?: string;
  translatedText?: string;
  frameText?: string;
  sourceUrl?: string;
  fileName?: string;
  videoId?: string;
  originalVideoUrl?: string;
  dubbedVideoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessTextResponse {
  success: boolean;
  summary: string;
  keywords: string;
  notes: string;
  title: string;
  id?: string;
}

export interface ProcessDocumentResponse {
  success: boolean;
  text: string;
  summary: string;
  keywords: string;
  notes: string;
  title: string;
  id?: string;
}

export interface ProcessUrlResponse {
  success: boolean;
  text: string;
  summary: string;
  keywords: string;
  notes: string;
  title: string;
  id?: string;
  isVideo?: boolean;
  platform?: string;
  transcription?: string;
  urduTranscription?: string;
  captions?: Array<{
    text: string;
    start: number;
    end: number;
    duration: number;
  }>;
  captionsSrt?: string;
  captionsVtt?: string;
  detectedLanguage?: string;
  videoDuration?: number;
  videoId?: string;
  originalVideoUrl?: string;
  dubbedVideoUrl?: string;
  frameText?: string;
}

export interface ProcessVideoResponse {
  success: boolean;
  transcription: string;
  urduTranscription: string;
  summary: string;
  keywords: string;
  notes: string;
  title: string;
  captions: Array<{
    text: string;
    start: number;
    end: number;
    duration: number;
  }>;
  captionsSrt: string;
  captionsVtt: string;
  detectedLanguage: string;
  videoDuration: number;
  videoId?: string;
  originalVideoUrl?: string;
  dubbedVideoUrl?: string;
  frameText?: string;
  id?: string;
}

export interface TranslateResponse {
  success: boolean;
  translatedText: string;
  documentId?: string;
}

export interface ChatbotResponse {
  success: boolean;
  answer: string;
  references: string[];
}

export interface Chat {
  id: string;
  userId: string;
  title: string;
  documentType?: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'bot';
  content: string;
  references?: string[];
  createdAt: string;
}

export interface ChatWithMessages extends Chat {
  messages: Message[];
  documentContent?: string;
}

export interface VideoCaptionsResponse {
  success: boolean;
  captions: Array<{
    text: string;
    start: number;
    end: number;
    duration: number;
  }>;
  captionsSrt: string;
  captionsVtt: string;
}

export interface VideoDubResponse {
  success: boolean;
  dubbedVideoUrl: string;
  message: string;
}

export interface UrlCheckResponse {
  success: boolean;
  isVideo: boolean;
  platform: string;
  icon: string;
  videoInfo?: {
    title: string;
    duration: number;
    uploader: string;
    thumbnail: string;
  };
}
