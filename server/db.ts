import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema.ts";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL not set — using in‑memory dev mode.");
  process.env.DATABASE_URL = "postgresql://neondb_owner:npg_CZQcIwO8xPj2@ep-twilight-sun-a5e84u14.us-east-2.aws.neon.tech/neondb?sslmode=require";
}


export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('PG Pool error:', err);
});

export const db = drizzle({ client: pool, schema });