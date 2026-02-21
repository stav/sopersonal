import { retrieveFromLocal } from "@/lib/corpus/local-search";

const MAX_CONTEXT_CHARS = 4000;

export async function retrieveContext(query: string): Promise<string | undefined> {
  if (!query.trim()) return undefined;

  return retrieveFromLocal(query, MAX_CONTEXT_CHARS);
}
