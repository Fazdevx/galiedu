const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateOnly(value: string): boolean {
  return DATE_ONLY_RE.test(value);
}

/**
 * Convierte "YYYY-MM-DD" en una fecha a medianoche UTC.
 * Las columnas `@db.Date` de Prisma se guardan/leen en UTC, por lo que
 * parsear y formatear siempre en UTC evita el desfase de un día.
 */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Fecha -> "YYYY-MM-DD" usando componentes UTC (para inputs type=date). */
export function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Fecha local de hoy -> "YYYY-MM-DD" (para valores por defecto de formularios). */
export function todayInput(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Formatea una fecha date-only mostrándola en UTC, para que "2025-03-01"
 * se vea como 01/03/2025 en cualquier zona horaria del servidor.
 */
export function formatDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = {},
  locale = "es-PE",
): string {
  return date.toLocaleDateString(locale, { timeZone: "UTC", ...options });
}

/** Rango [start, end) en UTC para un día "YYYY-MM-DD". */
export function dayRangeUTC(dateStr: string): { start: Date; end: Date } {
  const start = parseDateOnly(dateStr);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

/** Rango [start, end) en UTC para un mes (monthIndex 0-11). */
export function monthRangeUTC(year: number, monthIndex: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, monthIndex, 1)),
    end: new Date(Date.UTC(year, monthIndex + 1, 1)),
  };
}
