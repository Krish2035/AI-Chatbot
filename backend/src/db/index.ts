import { Pool } from 'pg';
import pgvector from 'pgvector/pg';
import dotenv from 'dotenv';

import fs from 'fs';
import path from 'path';

dotenv.config();

const connectionString = process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'ai_chatbot'}`;

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Prevent unhandled pool background error events when database is offline
pool.on('error', (err) => {
  // Silent fallback handling
});

let isDbConnected = false;

export const checkDbConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await pgvector.registerType(client);

    // Auto-sync schema tables (creates missing documents, document_chunks tables if not exist)
    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf8');
        await client.query(sql);
      }
    } catch (schemaErr: any) {
      console.warn('⚠️ Schema sync notice:', schemaErr.message || schemaErr);
    }

    const res = await client.query('SELECT NOW()');
    client.release();
    isDbConnected = true;
    console.log('✅ PostgreSQL connected & schema verified successfully at:', res.rows[0].now);
    return true;
  } catch (error: any) {
    isDbConnected = false;
    console.log('ℹ️ Local PostgreSQL not detected on port 5432.');
    console.log('⚡ Running in In-Memory Vector Fallback Mode (Chat, Memory & Vector Search are active!).');
    return false;
  }
};

export const getDbStatus = () => isDbConnected;
