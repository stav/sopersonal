import { createServerClient } from "@/lib/supabase/client";
import { embedDocuments } from "@/lib/embeddings/client";
import { chunkText } from "./chunker";
import { extractPdf } from "./extractors/pdf";
import { extractMarkdown } from "./extractors/markdown";
import { extractHtml } from "./extractors/html";

export type SourceType = "pdf" | "markdown" | "html" | "text";

interface IngestResult {
  documentId: string;
  chunksCreated: number;
}

export async function ingestDocument(
  documentId: string,
  content: Buffer | string,
  sourceType: SourceType,
  title: string
): Promise<IngestResult> {
  const supabase = createServerClient();

  // Update status to processing
  await supabase
    .from("documents")
    .update({ status: "processing" })
    .eq("id", documentId);

  try {
    // 1. Extract text
    let text: string;
    switch (sourceType) {
      case "pdf":
        text = await extractPdf(content as Buffer);
        break;
      case "html":
        text = extractHtml(content as string);
        break;
      case "markdown":
        text = extractMarkdown(content as string);
        break;
      case "text":
      default:
        text = typeof content === "string" ? content : content.toString("utf-8");
        break;
    }

    if (!text.trim()) {
      throw new Error("No text content extracted from document");
    }

    // 2. Chunk text
    const chunks = chunkText(text);

    // 3. Embed chunks
    const chunkTexts = chunks.map((c) => c.content);
    const embeddings = await embedDocuments(chunkTexts);

    if (!embeddings) {
      throw new Error("Failed to generate embeddings");
    }

    // 4. Store chunks with embeddings
    const chunkRows = chunks.map((chunk, i) => ({
      document_id: documentId,
      content: chunk.content,
      chunk_index: chunk.chunkIndex,
      embedding: embeddings[i],
    }));

    const { error: insertError } = await supabase
      .from("chunks")
      .insert(chunkRows);

    if (insertError) {
      throw new Error(`Failed to insert chunks: ${insertError.message}`);
    }

    // 5. Update document status
    await supabase
      .from("documents")
      .update({
        status: "ready",
        chunk_count: chunks.length,
      })
      .eq("id", documentId);

    return { documentId, chunksCreated: chunks.length };
  } catch (error) {
    await supabase
      .from("documents")
      .update({
        status: "error",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", documentId);
    throw error;
  }
}
