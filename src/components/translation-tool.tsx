"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "./ui/scroll-area";

import { translateText as apiTranslateText } from '@/lib/api';

const languages = [
  { value: "Urdu", label: "Urdu" },
];


export function TranslationTool({ 
  textToTranslate, 
  documentId,
  initialTranslatedText = ''
}: { 
  textToTranslate: string;
  documentId?: string;
  initialTranslatedText?: string;
}) {
  const [targetLanguage, setTargetLanguage] = useState(initialTranslatedText ? 'Urdu' : '');
  const [translatedText, setTranslatedText] = useState(initialTranslatedText);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleTranslate = async () => {
    if (!targetLanguage) {
      toast({
        variant: "destructive",
        title: "No Language Selected",
        description: "Please select a language to translate to.",
      });
      return;
    }
    setIsLoading(true);
    setTranslatedText('');
    try {
      // Pass documentId to update existing document instead of creating new one
      const result = await apiTranslateText(textToTranslate, targetLanguage, documentId);
      setTranslatedText(result.translatedText);
      toast({
        variant: "default",
        title: "Translation Saved",
        description: "Translation has been saved to your session.",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Translation Failed",
        description: "Could not translate the text. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-2 border-gray-500 shadow-xl bg-white">
      <CardHeader>
        <CardTitle>Translate Content</CardTitle>
        <CardDescription>Translate the material into another language.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select onValueChange={setTargetLanguage} value={targetLanguage}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map(lang => (
                <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleTranslate} disabled={isLoading || !targetLanguage}>
            {isLoading ? "Translating..." : "Translate"}
          </Button>
        </div>
        {(isLoading || translatedText) && (
          <Card className="bg-gray-50 border-2 border-gray-400 shadow-md">
            <CardHeader>
                <CardTitle>Translation to {targetLanguage}</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-80">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm text-gray-600">Translating...</p>
                            </div>
                        </div>
                    ) : (
                        <p className="whitespace-pre-wrap font-serif text-lg">{translatedText}</p>
                    )}
                </ScrollArea>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
