import fs from 'fs';
import path from 'path';
import { pool } from './index';

async function setupDatabase() {
  console.log('🔄 Initializing PostgreSQL database tables and pgvector extension...');
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    const client = await pool.connect();
    try {
      await client.query(sql);
      console.log('✅ Database schema initialized successfully!');
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('❌ Error setting up database:', error.message || error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();
