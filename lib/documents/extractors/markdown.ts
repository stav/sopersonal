export function extractMarkdown(text: string): string {
  // Markdown is already text — just clean up excessive whitespace
  return text.replace(/\n{3,}/g, "\n\n").trim();
}
