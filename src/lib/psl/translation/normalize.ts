export function normalizeEnglishInput(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\?]/g, "")
    .trim();
}

export function sanitizeToken(token: string): string {
  return token.replace(/[^\w]/g, "").trim();
}
