import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const args = process.argv.slice(2);
const file = args.find((arg) => !arg.startsWith("--"));
const confirmed = args.includes("--yes");

if (!file) {
  console.error("Uso: npm run db:restore -- <ruta-del-backup.json> --yes");
  process.exit(1);
}
if (!confirmed) {
  console.error("Esto BORRARÁ todos los datos actuales y los reemplazará por el backup.");
  console.error("Vuelve a ejecutar añadiendo --yes para confirmar.");
  process.exit(1);
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DIRECT_URL o DATABASE_URL en el entorno (.env).");
  process.exit(1);
}

function reviveValue(value) {
  if (value && typeof value === "object" && value.type === "Buffer" && Array.isArray(value.data)) {
    return Buffer.from(value.data);
  }
  return value;
}

async function insertOrder(client, tables) {
  const { rows } = await client.query(`
    SELECT tc.table_name AS child, ccu.table_name AS parent
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
     AND tc.constraint_schema = ccu.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
  `);

  const deps = new Map(tables.map((table) => [table, new Set()]));
  for (const { child, parent } of rows) {
    if (deps.has(child) && deps.has(parent) && child !== parent) deps.get(child).add(parent);
  }

  const sorted = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(node) {
    if (visited.has(node) || visiting.has(node)) return;
    visiting.add(node);
    for (const dependency of deps.get(node) ?? []) visit(dependency);
    visiting.delete(node);
    visited.add(node);
    sorted.push(node);
  }

  for (const table of tables) visit(table);
  return sorted;
}

async function main() {
  const absolute = path.resolve(file);
  const dump = JSON.parse(await readFile(absolute, "utf8"));
  const tables = Object.keys(dump.tables ?? {});
  if (!tables.length) throw new Error("El backup no contiene tablas.");

  const client = new Client({ connectionString });
  await client.connect();
  try {
    const order = await insertOrder(client, tables);

    await client.query("BEGIN");
    await client.query(`TRUNCATE ${tables.map((table) => `"${table}"`).join(", ")} CASCADE`);

    let totalRows = 0;
    for (const table of order) {
      const rows = dump.tables[table] ?? [];
      if (!rows.length) continue;
      const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
      const columnList = columns.map((column) => `"${column}"`).join(", ");
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");

      for (const row of rows) {
        const values = columns.map((column) => reviveValue(row[column] ?? null));
        await client.query(`INSERT INTO "${table}" (${columnList}) VALUES (${placeholders})`, values);
        totalRows += 1;
      }
    }
    await client.query("COMMIT");

    console.log(`Restauración completa desde ${path.basename(absolute)}`);
    console.log(`  Tablas: ${tables.length} | Filas: ${totalRows}`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Error al restaurar el backup:", error.message);
  process.exitCode = 1;
});
