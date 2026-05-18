import nlp from "compromise";
import { reorderToPslSyntax } from "./translation/grammar";
import { normalizeEnglishInput, sanitizeToken } from "./translation/normalize";
import { TranslationResult } from "./translation/types";

export function textToGloss(text: string): TranslationResult {
  if (!text.trim()) {
    return {
      original: text,
      glossSyntax: "",
      animationQueue: [],
    };
  }

  const normalized = normalizeEnglishInput(text);
  const doc = nlp(normalized);
  
  // Extract tokens and identify verbs for grammar reordering
  const tokens: string[] = doc.terms().out("array").map(t => sanitizeToken(t)).filter(Boolean);
  const verbs = new Set(doc.verbs().out("array").map(t => sanitizeToken(t)).filter(Boolean));

  // Reorder to SOV (Subject-Object-Verb)
  const orderedTokens = reorderToPslSyntax(tokens, verbs);
  
  const queue: string[] = [];
  const glossNames: string[] = [];

  orderedTokens.forEach((tToken, index) => {
    const word = tToken.token;
    glossNames.push(word.toUpperCase());
    
    // Split into letters for animation (Finger-spelling)
    const letters = word.split("");
    letters.forEach(char => {
      if (/[a-z0-9]/i.test(char)) {
        queue.push(`Letter_${char.toUpperCase()}`);
      }
    });
    
    // Add a pause between words
    if (index < orderedTokens.length - 1) {
      queue.push("Idle");
    }
  });

  return {
    original: text,
    glossSyntax: glossNames.join(" "),
    animationQueue: queue
  };
}
