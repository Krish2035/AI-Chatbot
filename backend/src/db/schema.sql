-- Enable pgvector extension for similarity search
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table with Authentication Support
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) NOT NULL DEFAULT 'User',
    email VARCHAR(255) UNIQUE,
    password_hash TEXT,
    avatar_url TEXT,
    provider VARCHAR(50) DEFAULT 'local',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Backward compatibility columns migration if table already exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'local';
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Insert default user if not exists
INSERT INTO users (id, username, email) 
VALUES ('00000000-0000-0000-0000-000000000001', 'default_user', 'guest@neurochat.local')
ON CONFLICT (id) DO NOTHING;


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

-- 9. Performance & Search Indexes for Ultra-Fast Queries
CREATE INDEX IF NOT EXISTS idx_messages_session_created ON messages (session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated ON chat_sessions (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_chunks_doc ON document_chunks (document_id, chunk_index);

-- 10. GIN Full-Text Search Indexes for instant keyword & conversation search
CREATE INDEX IF NOT EXISTS idx_messages_fts ON messages USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_document_chunks_fts ON document_chunks USING gin(to_tsvector('english', chunk_content));

-- 11. Stored Function for Full-Text Search across User's Chat Messages
CREATE OR REPLACE FUNCTION search_messages_fts(
    target_user_id UUID,
    search_query TEXT,
    limit_count INT DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    session_id UUID,
    role VARCHAR(20),
    content TEXT,
    rank REAL,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
AS $$
    SELECT 
        m.id,
        m.session_id,
        m.role,
        m.content,
        ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', search_query)) AS rank,
        m.created_at
    FROM messages m
    JOIN chat_sessions s ON s.id = m.session_id
    WHERE s.user_id = target_user_id
      AND to_tsvector('english', m.content) @@ plainto_tsquery('english', search_query)
    ORDER BY rank DESC, m.created_at DESC
    LIMIT limit_count;
$$;


