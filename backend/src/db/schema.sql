-- Enable pgvector extension for similarity search
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL DEFAULT 'default_user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default user if not exists
INSERT INTO users (id, username) 
VALUES ('00000000-0000-0000-0000-000000000001', 'default_user')
ON CONFLICT (username) DO NOTHING;

-- 2. Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Vector Embeddings Table for Semantic Memory (384-dimensional for sentence-transformers/all-MiniLM-L6-v2)
CREATE TABLE IF NOT EXISTS message_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(384),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create HNSW or IVFFlat index for similarity search
CREATE INDEX IF NOT EXISTS message_embeddings_vector_idx 
ON message_embeddings USING hnsw (embedding vector_cosine_ops);

-- 5. Stored Procedure for Semantic Vector Search
CREATE OR REPLACE FUNCTION match_user_messages(
    query_embedding vector(384),
    target_user_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    match_threshold FLOAT DEFAULT 0.3,
    match_count INT DEFAULT 5,
    exclude_session_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    message_id UUID,
    session_id UUID,
    content TEXT,
    similarity FLOAT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        me.id,
        me.message_id,
        me.session_id,
        me.content,
        1 - (me.embedding <=> query_embedding) AS similarity,
        me.created_at
    FROM message_embeddings me
    WHERE me.user_id = target_user_id
      AND me.role = 'user'
      AND (exclude_session_id IS NULL OR me.session_id != exclude_session_id)
      AND (1 - (me.embedding <=> query_embedding)) >= match_threshold
    ORDER BY me.embedding <=> query_embedding ASC
    LIMIT match_count;
END;
$$;

-- 6. Documents Table for RAG Analyzer
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) DEFAULT 'txt',
    content TEXT NOT NULL,
    word_count INT DEFAULT 0,
    chunk_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Document Chunks Table with Vector Embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    chunk_content TEXT NOT NULL,
    embedding vector(384),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Index on document_chunks embedding
CREATE INDEX IF NOT EXISTS document_chunks_vector_idx 
ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- 8. Stored Procedure for Document Chunk Similarity Search
CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding vector(384),
    target_document_id UUID,
    match_count INT DEFAULT 5,
    match_threshold FLOAT DEFAULT 0.15
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    chunk_index INT,
    chunk_content TEXT,
    similarity FLOAT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.chunk_index,
        dc.chunk_content,
        1 - (dc.embedding <=> query_embedding) AS similarity,
        dc.created_at
    FROM document_chunks dc
    WHERE dc.document_id = target_document_id
      AND (1 - (dc.embedding <=> query_embedding)) >= match_threshold
    ORDER BY dc.embedding <=> query_embedding ASC
    LIMIT match_count;
END;
$$;

