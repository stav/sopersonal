import { retrieveFromLocal } from "@/lib/corpus/local-search";
import { embedQuery } from "@/lib/embeddings/client";
import { createServerClient } from "@/lib/supabase/client";

interface Chunk {
  content: string;
  document_title: string;
  similarity: number;
}

const SIMILARITY_THRESHOLD = 0.3;
const MAX_CHUNKS = 5;
const MAX_CONTEXT_CHARS = 4000;

export async function retrieveContext(query: string): Promise<string | undefined> {
  if (!query.trim()) return undefined;

  // Try Supabase vector search first
  const supabaseContext = await retrieveFromSupabase(query);
  if (supabaseContext) return supabaseContext;

  // Fall back to local corpus keyword search
  return retrieveFromLocal(query, MAX_CONTEXT_CHARS);
}

async function retrieveFromSupabase(query: string): Promise<string | undefined> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const voyageKey = process.env.VOYAGE_API_KEY;
  if (!supabaseUrl || !supabaseKey || !voyageKey) return undefined;

  const embedding = await embedQuery(query);
  if (!embedding) return undefined;

  const supabase = createServerClient();
  const { data: chunks, error } = await supabase.rpc("search_chunks", {
    query_embedding: embedding,
    match_threshold: SIMILARITY_THRESHOLD,
    match_count: MAX_CHUNKS,
  });

  if (error || !chunks?.length) return undefined;

  let totalChars = 0;
  const selected: Chunk[] = [];

  for (const chunk of chunks as Chunk[]) {
    if (totalChars + chunk.content.length > MAX_CONTEXT_CHARS) break;
    selected.push(chunk);
    totalChars += chunk.content.length;
  }

  if (selected.length === 0) return undefined;

  return selected
    .map(
      (chunk, i) =>
        `[Source ${i + 1}: ${chunk.document_title}]\n${chunk.content}`
    )
    .join("\n\n---\n\n");
}
