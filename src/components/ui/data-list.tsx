"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Search, SearchX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { exportToCsv } from "@/lib/csv";

export type DataListRow = {
  id: string;
  search: string;
  node: React.ReactNode;
};

export type DataListExport = {
  filename: string;
  columns: string[];
  rows: { id: string; cells: (string | number)[] }[];
};

const DEFAULT_PAGE_SIZE = 20;

export function DataList({
  rows,
  header,
  title,
  description,
  searchable = true,
  placeholder = "Buscar…",
  emptyTitle = "Sin resultados",
  emptyDescription = "No hay registros todavía.",
  emptyColSpan = 4,
  pagination,
  exportOptions,
}: {
  rows: DataListRow[];
  header?: React.ReactNode;
  title?: string;
  description?: string;
  searchable?: boolean;
  placeholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyColSpan?: number;
  pagination?: boolean | number;
  exportOptions?: DataListExport;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [prevKey, setPrevKey] = useState("");

  const pageSize = typeof pagination === "number" ? pagination : DEFAULT_PAGE_SIZE;
  const enabled = Boolean(pagination);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => (q ? rows.filter((r) => r.search.toLowerCase().includes(q)) : rows), [rows, q]);
  const total = filtered.length;
  const totalPages = enabled ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  const resetKey = `${q}|${rows.length}`;
  if (resetKey !== prevKey) {
    setPrevKey(resetKey);
    setPage(1);
  }

  const safePage = Math.min(page, totalPages);
  const visible = enabled ? filtered.slice((safePage - 1) * pageSize, safePage * pageSize) : filtered;
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);
  const none = total === 0;

  const filteredIds = useMemo(() => new Set(filtered.map((r) => r.id)), [filtered]);
  const exportRows = useMemo(
    () => (exportOptions ? exportOptions.rows.filter((r) => filteredIds.has(r.id)).map((r) => r.cells) : []),
    [exportOptions, filteredIds],
  );

  return (
    <div className="flex flex-col gap-3">
      {title || searchable || exportOptions ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {title ? (
            <div>
              <p className="text-sm font-semibold text-gray-900">{title}</p>
              {description ? <p className="text-xs text-gray-500">{description}</p> : null}
            </div>
          ) : (
            <span />
          )}
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {searchable && rows.length > 0 ? (
              <div className="relative min-w-0 flex-1 sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={placeholder}
                  className="pl-9"
                  aria-label={placeholder}
                />
                {q ? (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-gray-400">
                    {total} resultado{total === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>
            ) : null}
            {exportOptions ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => exportToCsv(exportOptions.filename, exportOptions.columns, exportRows)}
              >
                <Download className="h-4 w-4" /> Exportar CSV
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-gray-200/80 bg-white shadow-card">
        <Table>
          {header}
          <TableBody>
            {none ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={emptyColSpan}>
                  <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
                    {q ? (
                      <SearchX className="h-8 w-8 text-gray-300" />
                    ) : (
                      <Search className="h-8 w-8 text-gray-300" />
                    )}
                    <p className="mt-1 text-sm font-medium text-gray-700">
                      {q ? "Sin coincidencias" : emptyTitle}
                    </p>
                    <p className="text-xs text-gray-400">
                      {q ? `Nada que coincida con «${query.trim()}».` : emptyDescription}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              visible.map((r) => r.node)
            )}
          </TableBody>
        </Table>
      </div>

      {enabled && totalPages > 1 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            Mostrando <span className="font-medium text-gray-700">{from}–{to}</span> de{" "}
            <span className="font-medium text-gray-700">{total}</span>
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              Página <span className="font-medium text-gray-600">{safePage}</span> de {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              aria-label="Página siguiente"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
