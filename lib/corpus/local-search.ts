import fs from "fs";
import path from "path";

const CORPUS_DIR = path.join(process.cwd(), "corpus", "transcripts");
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 200;

interface ScoredChunk {
  content: string;
  source: string;
  score: number;
}

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    chunks.push(text.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
}

function filenameToTitle(filename: string): string {
  return filename
    .replace(/\.txt$/, "")
    .replace(/-[a-zA-Z0-9_-]{11}$/, "") // strip YouTube ID
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function scoreChunk(chunk: string, keywords: string[]): number {
  const lower = chunk.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    // Count occurrences of each keyword
    let idx = 0;
    while ((idx = lower.indexOf(kw, idx)) !== -1) {
      score++;
      idx += kw.length;
    }
  }
  return score;
}

export function retrieveFromLocal(
  query: string,
  maxChars: number
): string | undefined {
  if (!fs.existsSync(CORPUS_DIR)) return undefined;

  const files = fs.readdirSync(CORPUS_DIR).filter((f) => f.endsWith(".txt"));
  if (files.length === 0) return undefined;

  // Extract keywords (3+ chars, lowercased, deduplicated)
  const stopWords = new Set([
    "the", "and", "for", "are", "but", "not", "you", "all", "can", "her",
    "was", "one", "our", "out", "has", "have", "with", "this", "that",
    "from", "they", "been", "said", "each", "will", "how", "about", "what",
    "when", "make", "like", "just", "over", "such", "them", "than", "its",
    "into", "some", "could", "other", "would", "their", "there", "should",
  ]);

  const keywords = query
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  if (keywords.length === 0) return undefined;

  const scored: ScoredChunk[] = [];

  for (const file of files) {
    const text = fs.readFileSync(path.join(CORPUS_DIR, file), "utf-8");
    const title = filenameToTitle(file);
    const chunks = chunkText(text);

    for (const chunk of chunks) {
      const score = scoreChunk(chunk, keywords);
      if (score > 0) {
        scored.push({ content: chunk.trim(), source: title, score });
      }
    }
  }

  if (scored.length === 0) return undefined;

  // Sort by score descending, take top chunks within char budget
  scored.sort((a, b) => b.score - a.score);

  let totalChars = 0;
  const selected: ScoredChunk[] = [];

  for (const chunk of scored) {
    if (totalChars + chunk.content.length > maxChars) break;
    selected.push(chunk);
    totalChars += chunk.content.length;
  }

  if (selected.length === 0) return undefined;

  return selected
    .map(
      (chunk, i) =>
        `[Source ${i + 1}: ${chunk.source}]\n${chunk.content}`
    )
    .join("\n\n---\n\n");
}
