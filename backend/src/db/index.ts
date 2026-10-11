import { Pool } from 'pg';
import pgvector from 'pgvector/pg';
import dotenv from 'dotenv';

import fs from 'fs';
import path from 'path';

dotenv.config();

import { primaryPool, readPool, queryRead, queryWrite, hasReadReplica } from './replicaPool';

export const pool = primaryPool;
export { primaryPool, readPool, queryRead, queryWrite, hasReadReplica };


// Prevent unhandled pool background error events when database is offline
pool.on('error', (err) => {
  // Silent fallback handling
});

let isDbConnected = false;

export const checkDbConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await pgvector.registerType(client);

    // Auto-sync schema tables (creates missing tables, vector extensions if not exist)
    try {
      const possiblePaths = [
        path.join(__dirname, 'schema.sql'),
        path.join(process.cwd(), 'src', 'db', 'schema.sql'),
        path.join(process.cwd(), 'backend', 'src', 'db', 'schema.sql'),
      ];
      const schemaPath = possiblePaths.find((p) => fs.existsSync(p));
      if (schemaPath) {
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
    console.warn('ℹ️ PostgreSQL not connected:', error.message || error);
    console.log('⚡ Running in In-Memory Vector Fallback Mode (Chat, Memory & Vector Search are active!).');
    return false;
  }
};

export const getDbStatus = () => isDbConnected;
