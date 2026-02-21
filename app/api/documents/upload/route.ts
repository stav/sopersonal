import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import type { SourceType } from "@/lib/documents/pipeline";

function detectSourceType(filename: string, mimeType: string): SourceType {
  if (mimeType === "application/pdf" || filename.endsWith(".pdf")) return "pdf";
  if (filename.endsWith(".md") || filename.endsWith(".mdx")) return "markdown";
  if (mimeType === "text/html" || filename.endsWith(".html")) return "html";
  return "text";
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const supabase = createServerClient();
    const sourceType = detectSourceType(file.name, file.type);

    // Create document record
    const { data: doc, error } = await supabase
      .from("documents")
      .insert({
        title: file.name,
        source_type: sourceType,
        file_size: file.size,
        status: "uploaded",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Store file content in Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const storagePath = `documents/${doc.id}/${file.name}`;

    const { error: storageError } = await supabase.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: file.type,
      });

    if (storageError) {
      // Clean up document record on storage failure
      await supabase.from("documents").delete().eq("id", doc.id);
      return NextResponse.json({ error: storageError.message }, { status: 500 });
    }

    // Update document with storage path
    await supabase
      .from("documents")
      .update({ storage_path: storagePath })
      .eq("id", doc.id);

    return NextResponse.json({ document: { ...doc, storage_path: storagePath } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
