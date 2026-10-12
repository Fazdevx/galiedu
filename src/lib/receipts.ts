/**
 * Calcula el siguiente número de recibo correlativo por año a partir de los
 * números existentes. Formato: `B-<año>-<secuencia 4 dígitos>`.
 * Es pura y testeable; el llamador se encarga de persistir y reintentar.
 */
export function buildReceiptNumber(year: number, existing: string[]): string {
  const prefix = `B-${year}-`;
  let max = 0;
  for (const value of existing) {
    if (!value.startsWith(prefix)) continue;
    const seq = Number.parseInt(value.slice(prefix.length), 10);
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

/** Verdadero si el error es una violación de restricción única (P2002). */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
