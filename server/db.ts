// server/db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

const client = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  // Se INVECE usi il Transaction Pooler, aggiungi:
  // prepare: false, // PgBouncer in transaction mode non supporta PREPARE
});

export const db = drizzle(client, { schema });
export { client as pool };
