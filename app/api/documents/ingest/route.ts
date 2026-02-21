import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { ingestDocument, type SourceType } from "@/lib/documents/pipeline";

export async function POST(req: Request) {
  try {
    const { documentId } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: "documentId required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Fetch document record
    const { data: doc, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (error || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (doc.status === "processing") {
      return NextResponse.json({ error: "Already processing" }, { status: 409 });
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(doc.storage_path);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
    }

    // Get content as buffer or string
    const buffer = Buffer.from(await fileData.arrayBuffer());
    const content =
      doc.source_type === "pdf" ? buffer : buffer.toString("utf-8");

    const result = await ingestDocument(
      documentId,
      content,
      doc.source_type as SourceType,
      doc.title
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ingestion failed" },
      { status: 500 }
    );
  }
}
