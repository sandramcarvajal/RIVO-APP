import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  // En desarrollo, esto podría fallar si no hay DB configurada, pero para arquitecura es necesario.
  console.warn("DATABASE_URL is not defined. Database operations may fail.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost") && !process.env.DATABASE_URL.includes("127.0.0.1")
    ? { rejectUnauthorized: false }
    : undefined,
});

// Handle unexpected errors on idle clients to prevent Node crashes
pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client', err);
});

export const db = drizzle(pool, { schema, logger: true });
