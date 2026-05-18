"use client";

import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Bot, Send, User } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { askChatbot, getChat, Message as ApiMessage } from '@/lib/api';

type Message = {
  role: 'user' | 'bot';
  content: string;
  references?: string[];
};

interface ChatbotProps {
  documentContent: string;
  chatId?: string;
  title?: string;
  documentType?: string;
  onChatCreated?: (chatId: string) => void;
}

export function Chatbot({ documentContent, chatId, title, documentType, onChatCreated }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(chatId);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasLoadedMessages, setHasLoadedMessages] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Load existing messages if chatId is provided
  useEffect(() => {
    if (chatId && !currentChatId) {
      setCurrentChatId(chatId);
    }
  }, [chatId]);

  // Initialize with welcome message only (lazy loading)
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        { role: 'bot', content: 'Hello! Ask me anything about the content of this study session.' }
      ]);
    }
  }, []);

  // Load messages on-demand when chatId is available (only once)
  const loadChatMessages = async () => {
    if (currentChatId && !hasLoadedMessages) {
      setLoadingMessages(true);
      setHasLoadedMessages(true);
      try {
        const response = await getChat(currentChatId);
        const loadedMessages: Message[] = response.chat.messages.map((msg: ApiMessage) => ({
          role: msg.role,
          content: msg.content,
          references: msg.references
        }));
        if (loadedMessages.length > 0) {
          setMessages(loadedMessages);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        // Keep welcome message on error
      } finally {
        setLoadingMessages(false);
      }
    }
  };

  // Load messages when chatId changes (on-demand, triggered when section expands)
  useEffect(() => {
    if (currentChatId && !hasLoadedMessages) {
      // Load messages when component is visible (lazy loading)
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          loadChatMessages();
        }
      }, { threshold: 0.1 });

      const element = scrollAreaRef.current;
      if (element) {
        observer.observe(element);
        return () => observer.disconnect();
      } else {
        // Fallback: load after small delay if observer not available
        const timer = setTimeout(() => {
          loadChatMessages();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [currentChatId, hasLoadedMessages]);

  useEffect(() => {
    // Using a timeout to ensure the DOM has updated before scrolling
    setTimeout(() => {
      const scrollArea = (scrollAreaRef.current as any)?.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTo({
          top: scrollArea.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 100);
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    const question = input;
    setInput('');
    setIsLoading(true);

    try {
      const result = await askChatbot(
        question, 
        documentContent,
        currentChatId,
        title || 'New Chat',
        documentType || 'text'
      );
      
      // Update chatId if a new chat was created
      if (result.chatId && result.chatId !== currentChatId) {
        setCurrentChatId(result.chatId);
        onChatCreated?.(result.chatId);
      }
      
      const botMessage: Message = { 
        role: 'bot', 
        content: result.answer,
        references: result.references
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Chatbot Error",
        description: error.message || "Could not get a response. Please try again.",
      });
      setMessages((prev) => prev.filter(msg => msg !== userMessage));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full flex flex-col h-[70vh] border-2 border-gray-500 shadow-2xl bg-white">
      <CardHeader>
        <CardTitle>AI Chatbot</CardTitle>
        <CardDescription>Ask questions about your study material.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
          {loadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{ 
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative"
                >
                  {/* Pulsing background rings */}
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-indigo-500 opacity-20"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.2, 0, 0.2],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut"
                    }}
                  />
                  {/* Logo */}
                  <motion.div
                    className="relative w-8 h-8 flex items-center justify-center"
                    animate={{
                      y: [0, -4, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Image
                      src="/logo.svg"
                      alt="Loading"
                      width={32}
                      height={32}
                      className="w-full h-full object-contain"
                      priority
                    />
                  </motion.div>
                </motion.div>
                <p className="text-sm text-gray-600">Loading messages...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
              <div key={index} className={cn("flex items-start gap-3", message.role === 'user' ? 'justify-end' : '')}>
                {message.role === 'bot' && (
                  <Avatar className="h-8 w-8 bg-primary text-primary-foreground flex-shrink-0">
                    <AvatarFallback><Bot className="h-5 w-5"/></AvatarFallback>
                  </Avatar>
                )}
                <div className={cn("rounded-lg px-4 py-2 max-w-[80%]", message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.references && message.references.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-xs font-semibold mb-1">References:</p>
                      {message.references.map((ref, idx) => (
                        <p key={idx} className="text-xs text-muted-foreground italic">• {ref}</p>
                      ))}
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                  </Avatar>
                )}
              </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 bg-primary text-primary-foreground flex-shrink-0">
                    <AvatarFallback><Bot className="h-5 w-5"/></AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg px-4 py-2 bg-muted w-3/4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="pt-4 border-t">
        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
          <Input
            id="message"
            placeholder="Type your question..."
            className="flex-1"
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
