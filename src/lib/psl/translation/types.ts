export type TokenRole = "subject" | "object" | "verb" | "negation" | "question" | "unknown";

export interface TranslationToken {
  token: string;
  role: TokenRole;
}

export interface TranslationResult {
  original: string;
  glossSyntax: string;
  animationQueue: string[];
}
