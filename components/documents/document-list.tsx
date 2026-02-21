"use client";

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

interface DocumentListProps {
  documents: Document[];
  onIngest: (documentId: string) => void;
  ingesting: string | null;
}

const statusColors: Record<string, string> = {
  uploaded: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  ready: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({ documents, onIngest, ingesting }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>No documents yet. Upload one above to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="rounded-xl border border-border p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-medium">{doc.title}</h3>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{doc.source_type.toUpperCase()}</span>
                {doc.file_size && <span>{formatFileSize(doc.file_size)}</span>}
                {doc.chunk_count && <span>{doc.chunk_count} chunks</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[doc.status] ?? ""}`}
              >
                {doc.status}
              </span>
              {doc.status === "uploaded" && (
                <button
                  onClick={() => onIngest(doc.id)}
                  disabled={ingesting === doc.id}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {ingesting === doc.id ? "Processing..." : "Ingest"}
                </button>
              )}
            </div>
          </div>
          {doc.error_message && (
            <p className="mt-2 text-xs text-red-500">{doc.error_message}</p>
          )}
        </div>
      ))}
    </div>
  );
}
