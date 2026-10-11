import { pgTable, uuid, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 1. Users Table
export const users = pgTable('users', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  username: varchar('username', { length: 255 }).notNull().default('User'),
  email: varchar('email', { length: 255 }).unique(),
  passwordHash: text('password_hash'),
  avatarUrl: text('avatar_url'),
  provider: varchar('provider', { length: 50 }).default('local'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 2. Chat Sessions Table
export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull().default('New Conversation'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 3. Messages Table
export const messages = pgTable('messages', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  sessionId: uuid('session_id').references(() => chatSessions.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 4. Documents Table (RAG Knowledge Base)
export const documents = pgTable('documents', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  fileType: varchar('file_type', { length: 50 }).default('txt'),
  content: text('content').notNull(),
  wordCount: integer('word_count').default(0),
  chunkCount: integer('chunk_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 5. Document Chunks Table
export const documentChunks = pgTable('document_chunks', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  chunkContent: text('chunk_content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
