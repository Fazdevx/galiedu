import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DIRECT_URL o DATABASE_URL en el entorno (.env).");
  process.exit(1);
}

const EXCLUDED_TABLES = new Set(["_prisma_migrations"]);

function redactUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.username) parsed.username = "***";
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    return "(url no válida)";
  }
}

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const { rows } = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
    );
    const tables = rows.map((row) => row.tablename).filter((name) => !EXCLUDED_TABLES.has(name));

    const dump = {
      createdAt: new Date().toISOString(),
      database: redactUrl(connectionString),
      tables: {},
    };

    for (const table of tables) {
      const result = await client.query(`SELECT * FROM "${table}"`);
      dump.tables[table] = result.rows;
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dir = path.join(process.cwd(), "backups");
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `galiedu-${stamp}.json`);
    await writeFile(file, JSON.stringify(dump, null, 2), "utf8");

    const totalRows = Object.values(dump.tables).reduce((sum, rowsForTable) => sum + rowsForTable.length, 0);
    console.log(`Backup listo: ${path.relative(process.cwd(), file)}`);
    console.log(`  Tablas: ${tables.length} | Filas: ${totalRows}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Error al generar el backup:", error.message);
  process.exitCode = 1;
});
