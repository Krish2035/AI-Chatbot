import { drizzle } from 'drizzle-orm/node-postgres';
import { primaryPool } from './replicaPool';
import * as schema from './schema.drizzle';

export const db = drizzle(primaryPool, { schema });
export { schema };
