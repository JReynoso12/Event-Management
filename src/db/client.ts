import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var -- keep pool across HMR in dev
  var __eventflowPool: Pool | undefined;
}

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!global.__eventflowPool) {
    global.__eventflowPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
    });
  }
  return global.__eventflowPool;
}

export function getDb() {
  const pool = getPool();
  if (!pool) return null;
  return drizzle(pool, { schema });
}

export type Db = NonNullable<ReturnType<typeof getDb>>;
