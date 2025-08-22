// server/scripts/db-init.ts

/**
 * Database initialization script
 * - Pinga il DB con retry/timeout
 * - Verifica la presenza delle tabelle minime
 * - Se mancano, tenta "drizzle-kit push" (se disponibile nell'ambiente)
 * - Non chiama process.exit: lascia gestire l'esito al chiamante
 */

import { execSync } from "child_process";
import { db } from "../db";
import { sql } from "drizzle-orm";

type Row = Record<string, any>;

function asRows(result: any): Row[] {
  // drizzle/db.execute con postgres-js di solito restituisce un array di row objects
  if (Array.isArray(result)) return result as Row[];
  if (result && Array.isArray(result.rows)) return result.rows as Row[];
  return [];
}

export async function initializeDatabase(): Promise<void> {
  console.log("🗄️ Initializing database...");

  try {
    // ──────────────────────────────────────────────────────────
    // 1) Ping DB con retry e timeout
    // ──────────────────────────────────────────────────────────
    console.log("📡 Testing database connection...");

    const maxRetries = 3;
    const timeoutMs = 5_000;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await Promise.race([
          db.execute(sql`select 1`),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Database connection timeout")), timeoutMs)
          ),
        ]);
        console.log("✅ Database connection successful");
        break;
      } catch (err) {
        lastError = err;
        console.log(
          `📡 Database connection attempt ${attempt}/${maxRetries} failed:`,
          (err as Error)?.message || err
        );
        if (attempt === maxRetries) throw lastError;
        await new Promise((r) => setTimeout(r, 1_000));
      }
    }

    // ──────────────────────────────────────────────────────────
    // 2) Verifica tabelle richieste
    // ──────────────────────────────────────────────────────────
    const requiredTables = [
      "users",
      "topics",
      "content",
      "user_preferences",
      "daily_drops",
      "content_topics",
      "user_submissions",
      "user_profile_vectors",
      "feeds",
    ];

    const tablesResult = await db.execute(sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
    `);

    const existingTables = asRows(tablesResult).map((r) => r.table_name);
    const missingTables = requiredTables.filter((t) => !existingTables.includes(t));

    if (missingTables.length > 0) {
      console.log(`🔧 Missing tables detected: ${missingTables.join(", ")}`);
      console.log("⚡ Attempting to run database migrations with drizzle-kit...");

      // ────────────────────────────────────────────────────────
      // 3) Prova le migrations (se drizzle-kit è disponibile)
      //    Nota: su Render in produzione potresti non avere devDependencies
      // ────────────────────────────────────────────────────────
      try {
        // Usa npx così non devi avere uno script dedicato
        execSync("npx drizzle-kit push --force", {
          stdio: "inherit",
          env: process.env,
        });
        console.log("✅ Database migrations completed");
      } catch (migrationError: any) {
        console.error("❌ Migration failed (drizzle-kit non disponibile o errore in migrazione).");
        console.error("   Dettaglio:", migrationError?.message || migrationError);
        console.error("   Suggerimenti:");
        console.error("   - Esegui le migrazioni dal tuo ambiente locale: npx drizzle-kit push");
        console.error("   - Oppure includi drizzle-kit nelle dipendenze di runtime se vuoi farlo in produzione");
        // Non rilanciare qui: verifichiamo di nuovo se le tabelle ora ci sono (potresti averle create esternamente)
      }
    } else {
      console.log("✅ All required tables exist");
    }

    // ──────────────────────────────────────────────────────────
    // 4) Verifica finale
    // ──────────────────────────────────────────────────────────
    const finalTablesResult = await db.execute(sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
    `);
    const finalTables = asRows(finalTablesResult).map((r) => r.table_name);
    const stillMissing = requiredTables.filter((t) => !finalTables.includes(t));

    if (stillMissing.length > 0) {
      throw new Error(
        `Critical: Required tables still missing after migration attempt: ${stillMissing.join(", ")}`
      );
    }

    console.log("🎉 Database initialization completed successfully");
  } catch (error) {
    console.error("💥 Database initialization failed:", error);
    throw error; // lascia che il chiamante gestisca (senza terminare il processo)
  }
}

/**
 * Gestione errori DB da riusare nei caller senza terminare il processo
 */
export function handleDatabaseError(error: any): void {
  const msg = String(error?.message || "");
  if (msg.includes("does not exist") || (error && error.code === "42P01")) {
    console.error("❌ Database table does not exist");
    console.error("🔧 Suggested fixes:");
    console.error("   1. Esegui le migrazioni: npx drizzle-kit push");
    console.error("   2. Controlla la variabile DATABASE_URL");
    console.error("   3. Verifica permessi e connettività del database");
  }
  throw error;
}

/**
 * Esecuzione “CLI” opzionale: se lanci direttamente questo file (buildato),
 * esegue initializeDatabase senza chiamare process.exit.
 *
 * Esempio:
 *   node dist/scripts/db-init.js
 */
declare const require: any;
declare const module: any;

if (typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) {
  initializeDatabase()
    .then(() => console.log("[db-init] done"))
    .catch((err) => {
      console.error("[db-init] failed:", err);
      // Non fare process.exit: imposta solo exitCode se proprio serve quando lanci manualmente
      process.exitCode = 1;
    });
}
