import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn(
    "[db] DATABASE_URL not set — server will run with in-memory storage. " +
    "Data will reset on each restart. Set DATABASE_URL to persist data.",
  );
}

// null when no DB — InMemoryStorage used instead
export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : (null as unknown as InstanceType<typeof Pool>);

export const db = process.env.DATABASE_URL
  ? drizzle(pool, { schema })
  : (null as unknown as ReturnType<typeof drizzle>);
