// Aplica las migraciones de prisma/migrations en la base remota (Turso).
// Prisma Migrate solo trabaja con archivos SQLite locales, por eso este script
// ejecuta los mismos migration.sql y registra cuáles ya se aplicaron.
//
// Uso (PowerShell):
//   $env:DATABASE_URL="libsql://<base>.turso.io"; $env:DATABASE_AUTH_TOKEN="<token>"
//   npm run db:migrar-remoto
import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL;
if (!url?.startsWith("libsql://")) {
  console.error("DATABASE_URL debe ser la URL de Turso (libsql://…). Para la base local usá `npm run db:migrate`.");
  process.exit(1);
}

const db = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
await db.execute(`CREATE TABLE IF NOT EXISTS "_migraciones_aplicadas" (
  "nombre" TEXT PRIMARY KEY,
  "aplicada_en" TEXT NOT NULL
)`);

const aplicadas = new Set((await db.execute(`SELECT "nombre" FROM "_migraciones_aplicadas"`)).rows.map((r) => r.nombre));
const carpeta = path.join(import.meta.dirname, "..", "prisma", "migrations");
const migraciones = (await readdir(carpeta, { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

let nuevas = 0;
for (const nombre of migraciones) {
  if (aplicadas.has(nombre)) continue;
  const sql = await readFile(path.join(carpeta, nombre, "migration.sql"), "utf8");
  process.stdout.write(`Aplicando ${nombre}… `);
  await db.executeMultiple(sql);
  await db.execute({
    sql: `INSERT INTO "_migraciones_aplicadas" ("nombre", "aplicada_en") VALUES (?, ?)`,
    args: [nombre, new Date().toISOString()],
  });
  console.log("ok");
  nuevas++;
}

console.log(nuevas ? `Listo: ${nuevas} migración(es) aplicada(s).` : "La base ya estaba al día.");
