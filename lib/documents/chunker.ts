export interface TextChunk {
  content: string;
  chunkIndex: number;
}

const DEFAULT_CHUNK_SIZE = 1000; // ~1000 chars ≈ ~250 tokens
const DEFAULT_CHUNK_OVERLAP = 200;

const SEPARATORS = ["\n\n", "\n", ". ", " "];

export function chunkText(
  text: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  chunkOverlap = DEFAULT_CHUNK_OVERLAP
): TextChunk[] {
  const chunks: TextChunk[] = [];

  if (!text.trim()) return chunks;

  const splits = recursiveSplit(text, chunkSize);
  let currentChunk = "";
  let chunkIndex = 0;

  for (const split of splits) {
    if (currentChunk.length + split.length > chunkSize && currentChunk.length > 0) {
      chunks.push({ content: currentChunk.trim(), chunkIndex: chunkIndex++ });

      // Keep overlap from the end of the current chunk
      const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
      currentChunk = currentChunk.slice(overlapStart) + split;
    } else {
      currentChunk += split;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({ content: currentChunk.trim(), chunkIndex: chunkIndex });
  }

  return chunks;
}

function recursiveSplit(text: string, chunkSize: number): string[] {
  if (text.length <= chunkSize) return [text];

  for (const separator of SEPARATORS) {
    const parts = text.split(separator);
    if (parts.length > 1) {
      return parts.flatMap((part, i) => {
        const withSep = i < parts.length - 1 ? part + separator : part;
        if (withSep.length > chunkSize) {
          return recursiveSplit(withSep, chunkSize);
        }
        return [withSep];
      });
    }
  }

  // If no separator works, split at chunkSize
  const result: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    result.push(text.slice(i, i + chunkSize));
  }
  return result;
}
