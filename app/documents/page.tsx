"use client";

import { useState, useEffect, useCallback } from "react";
import { UploadForm } from "@/components/documents/upload-form";
import { DocumentList } from "@/components/documents/document-list";

interface Document {
  id: string;
  title: string;
  source_type: string;
  status: string;
  chunk_count: number | null;
  file_size: number | null;
  error_message: string | null;
  created_at: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleIngest = async (documentId: string) => {
    setIngesting(documentId);
    try {
      const res = await fetch("/api/documents/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ingestion failed");
      }

      // Refresh document list
      await fetchDocuments();
    } catch (err) {
      console.error("Ingestion error:", err);
    } finally {
      setIngesting(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 safe-top">
      <h1 className="mb-6 text-xl font-bold">Documents</h1>

      <UploadForm onUploadComplete={fetchDocuments} />

      <div className="mt-6">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading...</div>
        ) : (
          <DocumentList
            documents={documents}
            onIngest={handleIngest}
            ingesting={ingesting}
          />
        )}
      </div>
    </div>
  );
}
