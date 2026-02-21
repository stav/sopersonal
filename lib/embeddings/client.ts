const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_MODEL = "voyage-3.5-lite";

interface VoyageResponse {
  data: Array<{ embedding: number[] }>;
  usage: { total_tokens: number };
}

async function getEmbeddings(
  texts: string[],
  inputType: "document" | "query"
): Promise<number[][] | null> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: texts,
      input_type: inputType,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage API error: ${response.status} ${error}`);
  }

  const result: VoyageResponse = await response.json();
  return result.data.map((d) => d.embedding);
}

export async function embedDocuments(texts: string[]): Promise<number[][] | null> {
  // Voyage allows up to 128 texts per request
  const batchSize = 128;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const embeddings = await getEmbeddings(batch, "document");
    if (!embeddings) return null;
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

export async function embedQuery(text: string): Promise<number[] | null> {
  const embeddings = await getEmbeddings([text], "query");
  return embeddings?.[0] ?? null;
}
