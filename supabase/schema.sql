-- Enable pgvector extension
create extension if not exists vector;

-- Documents table
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_type text not null check (source_type in ('pdf', 'markdown', 'html', 'text')),
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'ready', 'error')),
  storage_path text,
  file_size integer,
  chunk_count integer,
  error_message text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Chunks table with vector embeddings
create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  content text not null,
  chunk_index integer not null,
  embedding vector(1024),
  created_at timestamp with time zone default now()
);

-- Index for vector similarity search
create index if not exists chunks_embedding_idx
  on chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Index for document lookups
create index if not exists chunks_document_id_idx on chunks(document_id);

-- Similarity search function
create or replace function search_chunks(
  query_embedding vector(1024),
  match_threshold float default 0.3,
  match_count int default 5
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  chunk_index integer,
  document_title text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    c.id,
    c.document_id,
    c.content,
    c.chunk_index,
    d.title as document_title,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  join documents d on d.id = c.document_id
  where d.status = 'ready'
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger documents_updated_at
  before update on documents
  for each row execute function update_updated_at();

-- Storage bucket for documents (run in Supabase dashboard or via API)
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', false);
