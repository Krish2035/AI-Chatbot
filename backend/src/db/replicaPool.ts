import { Pool, QueryResult, QueryResultRow } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const primaryConnectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'ai_chatbot'}`;

const readReplicaConnectionString = process.env.DATABASE_READ_REPLICA_URL?.trim();

const isCloudPrimary = Boolean(
  primaryConnectionString &&
    !primaryConnectionString.includes('localhost') &&
    !primaryConnectionString.includes('127.0.0.1')
);

// Primary Database Pool (Writes + Primary Reads)
export const primaryPool = new Pool({
  connectionString: primaryConnectionString,
  ssl: isCloudPrimary ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

primaryPool.on('error', (err) => {
  // Silent fallback handling
});

// Read Replica Pool (Optional dedicated read-only replica)
let replicaPoolInstance: Pool | null = null;
if (readReplicaConnectionString) {
  const isCloudReplica = Boolean(
    !readReplicaConnectionString.includes('localhost') &&
      !readReplicaConnectionString.includes('127.0.0.1')
  );
  replicaPoolInstance = new Pool({
    connectionString: readReplicaConnectionString,
    ssl: isCloudReplica ? { rejectUnauthorized: false } : undefined,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  replicaPoolInstance.on('error', (err) => {
    console.warn('⚠️ Read Replica error event, falling back to primary pool:', err.message);
  });
}

export const readPool = replicaPoolInstance || primaryPool;
export const hasReadReplica = Boolean(replicaPoolInstance);

/**
 * Executes a write query (INSERT, UPDATE, DELETE) against the Primary DB Pool
 */
export async function queryWrite<R extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<R>> {
  return primaryPool.query<R>(text, params);
}

/**
 * Executes a read query (SELECT) against the Read Replica Pool with automatic primary fallback
 */
export async function queryRead<R extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<R>> {
  if (replicaPoolInstance) {
    try {
      return await replicaPoolInstance.query<R>(text, params);
    } catch (err: any) {
      console.warn('⚠️ Read replica query failed, falling back to primary DB:', err.message);
      return primaryPool.query<R>(text, params);
    }
  }
  return primaryPool.query<R>(text, params);
}
