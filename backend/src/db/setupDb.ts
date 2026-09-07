import fs from 'fs';
import path from 'path';
import { pool } from './index';

async function setupDatabase() {
  console.log('🔄 Initializing PostgreSQL database tables and pgvector extension...');
  try {
    const possiblePaths = [
      path.join(__dirname, 'schema.sql'),
      path.join(process.cwd(), 'src', 'db', 'schema.sql'),
      path.join(process.cwd(), 'backend', 'src', 'db', 'schema.sql'),
    ];
    const schemaPath = possiblePaths.find((p) => fs.existsSync(p));
    if (!schemaPath) {
      throw new Error('schema.sql not found in standard paths');
    }
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
