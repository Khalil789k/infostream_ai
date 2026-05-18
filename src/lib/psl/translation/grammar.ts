import type { TranslationToken } from "./types";

const STOP_WORDS = new Set([
  "is", "am", "are", "the", "a", "an", "of", "to", "in", "and",
  "will", "was", "were", "be", "do", "does", "did", "have", "has", "had"
]);

const SUBJECT_HINTS = new Set(["i", "me", "you", "we", "he", "she", "they"]);
const QUESTION_WORDS = new Set(["what", "where", "who", "how", "when", "why"]);
const NEGATIONS = new Set(["not", "no", "never"]);

/**
 * Reorders tokens to follow PSL SOV structure: 
 * Subject -> Object -> Verb -> Negation -> Question
 */
export function reorderToPslSyntax(tokens: string[], verbs: Set<string>): TranslationToken[] {
  const subjects: TranslationToken[] = [];
  const objects: TranslationToken[] = [];
  const actionVerbs: TranslationToken[] = [];
  const questions: TranslationToken[] = [];
  const negations: TranslationToken[] = [];

  for (const token of tokens) {
    if (!token || STOP_WORDS.has(token)) continue;

    if (NEGATIONS.has(token)) {
      negations.push({ token, role: "negation" });
      continue;
    }
    if (QUESTION_WORDS.has(token)) {
      questions.push({ token, role: "question" });
      continue;
    }
    if (verbs.has(token)) {
      actionVerbs.push({ token, role: "verb" });
      continue;
    }
    if (SUBJECT_HINTS.has(token)) {
      subjects.push({ token, role: "subject" });
      continue;
    }
    objects.push({ token, role: "object" });
  }

  // Reorder to Subject-Object-Verb as requested by user
  return [...subjects, ...objects, ...actionVerbs, ...negations, ...questions];
}
