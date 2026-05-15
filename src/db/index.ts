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
});

export const db = drizzle(pool, { schema, logger: true });
